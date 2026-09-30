import { randomString,sha256Base64url } from "../../_shared/crypto.js";
import { oauthTransactionCookie } from "../../_shared/cookies.js";
import { providerConfig } from "../../_shared/providers.js";
export async function onRequestGet(context){
 const {provider}=context.params;const config=providerConfig(provider,context.env);if(!config)return new Response("Not Found",{status:404});
 const state=randomString(32),codeVerifier=randomString(32),transactionId=randomString(32),nonce=provider==="google"?randomString(32):null;
 const expiresAt=Math.floor(Date.now()/1000)+600;
 await context.env.DB.prepare("INSERT INTO oauth_transactions (id_hash,provider,state_hash,nonce,code_verifier,expires_at) VALUES (?,?,?,?,?,?)")
 .bind(await sha256Base64url(transactionId),provider,await sha256Base64url(state),nonce,codeVerifier,expiresAt).run();
 const params=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:"code",state,code_challenge:await sha256Base64url(codeVerifier),code_challenge_method:"S256"});
 if(provider==="google"){params.set("scope","openid email profile");params.set("nonce",nonce);}
 return new Response(null,{status:302,headers:{Location:`${config.authorization}?${params}`,"Set-Cookie":oauthTransactionCookie(transactionId),"Cache-Control":"no-store"}});
}
