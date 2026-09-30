export function parseCookies(request){const header=request.headers.get("Cookie")||"";const result={};for(const part of header.split(";")){const index=part.indexOf("=");if(index<0)continue;result[part.slice(0,index).trim()]=part.slice(index+1).trim();}return result;}
export function oauthTransactionCookie(value,maxAge=600){return `__Host-oauth-tx=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;}
export function sessionCookie(value,maxAge=28800){return `__Host-session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
export function deleteCookie(name){return `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}
