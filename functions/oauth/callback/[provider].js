import {parseCookies,sessionCookie} from "../../_shared/cookies.js";
import {randomString,sha256Base64url,timingSafeEqual} from "../../_shared/crypto.js";
import {providerConfig} from "../../_shared/providers.js";
import {validateGoogleIdToken} from "../../_shared/oidc.js";
function reject(message,status=400){return new Response(message,{status,headers:{"Cache-Control":"no-store"}});}
export async function onRequestGet(context){
 const provider=context.params.provider,config=providerConfig(provider,context.env);if(!config)return reject("Not Found",404);
 const url=new URL(context.request.url),error=url.searchParams.get("error"),code=url.searchParams.get("code"),state=url.searchParams.get("state");
 if(error||!code||!state)return reject("OAuth response rejected.");
 const tx=parseCookies(context.request)["__Host-oauth-tx"];if(!tx)return reject("Missing OAuth transaction cookie.");
 const txHash=await sha256Base64url(tx);
 const row=await context.env.DB.prepare("SELECT id_hash,provider,state_hash,nonce,code_verifier,expires_at FROM oauth_transactions WHERE id_hash=? AND expires_at>?").bind(txHash,Math.floor(Date.now()/1000)).first();
 if(!row||row.provider!==provider)return reject("Invalid or expired transaction.");
 if(!timingSafeEqual(await sha256Base64url(state),row.state_hash))return reject("Invalid state.");
 await context.env.DB.prepare("DELETE FROM oauth_transactions WHERE id_hash=?").bind(txHash).run();
 const tokenResponse=await fetch(config.token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,code,redirect_uri:config.redirectUri,code_verifier:row.code_verifier})});
 if(!tokenResponse.ok)return reject("Token exchange failed.");
 const token=await tokenResponse.json();let identity;
 if(provider==="google"){
   if(!token.id_token)return reject("Missing Google identity token.");
   try{identity=await validateGoogleIdToken(token.id_token,config.clientId,row.nonce);}catch{return reject("Google identity validation failed.",401);}
 }else{
   if(!token.access_token||String(token.token_type||"").toLowerCase()!=="bearer")return reject("Invalid GitHub token response.",401);
   const profileResponse=await fetch("https://api.github.com/user",{headers:{Authorization:"Bearer "+token.access_token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2026-03-10","User-Agent":"oauth-pages-lab"}});
   if(!profileResponse.ok)return reject("GitHub profile lookup failed.",401);
   const profile=await profileResponse.json();if(!Number.isInteger(profile.id))return reject("Invalid GitHub identity.",401);
   identity={issuer:"https://github.com",subject:String(profile.id),email:profile.email??null,displayName:profile.name??profile.login??null};
 }
 const sessionId=randomString(32),sessionHash=await sha256Base64url(sessionId),now=Math.floor(Date.now()/1000);
 await context.env.DB.prepare("INSERT INTO sessions (id_hash,issuer,subject,email,display_name,expires_at,created_at) VALUES (?,?,?,?,?,?,?)").bind(sessionHash,identity.issuer,identity.subject,identity.email,identity.displayName,now+28800,now).run();
 return new Response(null,{status:302,headers:{Location:context.env.PUBLIC_BASE_URL.replace(/\/$/,""),"Set-Cookie":sessionCookie(sessionId),"Cache-Control":"no-store"}});
}