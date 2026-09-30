import { verifyRs256Jwt } from "./crypto.js";
const DISCOVERY_URL="https://accounts.google.com/.well-known/openid-configuration";
export async function validateGoogleIdToken(idToken,expectedClientId,expectedNonce){
  const parts=idToken.split(".");if(parts.length!==3)throw new Error("invalid_id_token");
  const header=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[0].replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-parts[0].length%4)%4)),c=>c.charCodeAt(0))));
  if(header.alg!=="RS256"||!header.kid)throw new Error("invalid_id_token_header");
  const discoveryResponse=await fetch(DISCOVERY_URL,{headers:{Accept:"application/json"}});if(!discoveryResponse.ok)throw new Error("oidc_discovery_failed");
  const discovery=await discoveryResponse.json();const jwksResponse=await fetch(discovery.jwks_uri,{headers:{Accept:"application/json"}});if(!jwksResponse.ok)throw new Error("jwks_fetch_failed");
  const jwks=await jwksResponse.json();const jwk=jwks.keys.find(key=>key.kid===header.kid);if(!jwk)throw new Error("unknown_signing_key");
  const {payload}=await verifyRs256Jwt(idToken,jwk);const now=Math.floor(Date.now()/1000);
  if(payload.iss!=="https://accounts.google.com")throw new Error("invalid_issuer");
  if(payload.aud!==expectedClientId)throw new Error("invalid_audience");
  if(!payload.exp||payload.exp<now)throw new Error("expired_id_token");
  if(payload.iat&&payload.iat>now+300)throw new Error("invalid_iat");
  if(payload.nonce!==expectedNonce)throw new Error("invalid_nonce");
  if(!payload.sub)throw new Error("missing_subject");
  return{issuer:"https://accounts.google.com",subject:String(payload.sub),email:payload.email??null,displayName:payload.name??null};
}
