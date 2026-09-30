import {parseCookies} from "../_shared/cookies.js";
import {sha256Base64url} from "../_shared/crypto.js";
export async function onRequestGet(context){
 const value=parseCookies(context.request)["__Host-session"];
 if(!value)return Response.json({error:"unauthenticated"},{status:401,headers:{"Cache-Control":"no-store"}});
 const session=await context.env.DB.prepare("SELECT issuer,subject,email,display_name,expires_at FROM sessions WHERE id_hash=? AND expires_at>?").bind(await sha256Base64url(value),Math.floor(Date.now()/1000)).first();
 if(!session)return Response.json({error:"unauthenticated"},{status:401,headers:{"Cache-Control":"no-store"}});
 return Response.json({issuer:session.issuer,subject:session.subject,email:session.email,displayName:session.display_name},{headers:{"Cache-Control":"no-store"}});
}