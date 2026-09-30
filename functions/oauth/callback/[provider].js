import {parseCookies,sessionCookie,deleteCookie} from "../../_shared/cookies.js";
import {randomString,sha256Base64url,timingSafeEqual} from "../../_shared/crypto.js";
import {providerConfig} from "../../_shared/providers.js";
import {validateGoogleIdToken} from "../../_shared/oidc.js";
function reject(message,status=400,extraHeaders={}){return new Response(message,{status,headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8",...extraHeaders}});}
function rejectWithCookie(message,status,cookie){const h=new Headers({"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"});h.append("Set-Cookie",cookie);return new Response(message,{status,headers:h});}
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
 const clearTx=deleteCookie("__Host-oauth-tx");
 const tokenResponse=await fetch(config.token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:new URLSearchParams({grant_type:"authorization_code",client_id:config.clientId,client_secret:config.clientSecret,code,redirect_uri:config.redirectUri,code_verifier:row.code_verifier})});
 if(!tokenResponse.ok)return rejectWithCookie("Token exchange failed. Provider response: "+await tokenResponse.text(),502,clearTx);
 const token=await tokenResponse.json();let identity;
 if(provider==="google"){
   if(!token.id_token)return rejectWithCookie("Missing Google identity token.",502,clearTx);
   try{identity=await validateGoogleIdToken(token.id_token,config.clientId,row.nonce);}catch{return rejectWithCookie("Google identity validation failed.",401,clearTx);}
 }else{
   if(!token.access_token||String(token.token_type||"").toLowerCase()!=="bearer")return rejectWithCookie("Invalid GitHub token response.",401,clearTx);
   const profileResponse=await fetch("https://api.github.com/user",{headers:{Authorization:"Bearer "+token.access_token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2026-03-10","User-Agent":"oauth-pages-lab"}});
   if(!profileResponse.ok)return rejectWithCookie("GitHub profile lookup failed.",401,clearTx);
   const profile=await profileResponse.json();if(!Number.isInteger(profile.id))return rejectWithCookie("Invalid GitHub identity.",401,clearTx);
   identity={issuer:"https://github.com",subject:String(profile.id),email:profile.email??null,displayName:profile.name??profile.login??null};
   const revoke=await fetch("https://api.github.com/applications/"+encodeURIComponent(config.clientId)+"/grant",{method:"DELETE",headers:{Authorization:"Basic "+btoa(config.clientId+":"+config.clientSecret),Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"oauth-pages-lab","Content-Type":"application/json"},body:JSON.stringify({access_token:token.access_token})});
   if(revoke.status!==204)return rejectWithCookie("GitHub authorization revocation failed.",502,clearTx);
 }
 const sessionId=randomString(32),sessionHash=await sha256Base64url(sessionId),now=Math.floor(Date.now()/1000);
 await context.env.DB.prepare("INSERT INTO sessions (id_hash,issuer,subject,email,display_name,expires_at,created_at) VALUES (?,?,?,?,?,?,?)").bind(sessionHash,identity.issuer,identity.subject,identity.email,identity.displayName,now+28800,now).run();
 const headers=new Headers({Location:context.env.PUBLIC_BASE_URL.replace(/\/$/,""),"Cache-Control":"no-store"});headers.append("Set-Cookie",clearTx);headers.append("Set-Cookie",sessionCookie(sessionId));
 return new Response(null,{status:302,headers});
}
