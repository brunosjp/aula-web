import {parseCookies,deleteCookie} from "../_shared/cookies.js";
import {sha256Base64url} from "../_shared/crypto.js";
export async function onRequestPost(context){
 const base=context.env.PUBLIC_BASE_URL?.replace(/\/$/,""),origin=context.request.headers.get("Origin");
 if(!base||origin!==base)return new Response("Invalid origin.",{status:403,headers:{"Cache-Control":"no-store"}});
 const value=parseCookies(context.request)["__Host-session"];
 if(value)await context.env.DB.prepare("DELETE FROM sessions WHERE id_hash=?").bind(await sha256Base64url(value)).run();
 return new Response(null,{status:204,headers:{"Set-Cookie":deleteCookie("__Host-session"),"Cache-Control":"no-store"}});
}