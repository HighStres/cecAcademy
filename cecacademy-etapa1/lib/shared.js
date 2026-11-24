const E = new TextEncoder();
const b64 = a => btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const un64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export const result=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function sameOrigin(req){return req.headers.get('Origin')===new URL(req.url).origin && (req.headers.get('Sec-Fetch-Site')||'same-origin')==='same-origin'}
export function config(env){try{const c=JSON.parse(env.CECA_CONFIG);if(typeof c.username!=='string'||!c.username||c.username.length>256||typeof c.password!=='string'||!c.password||c.password.length>256||typeof c.sessionSecret!=='string'||c.sessionSecret.length<32||typeof c.spinRootFolderId!=='string'||!/^[\w-]+$/.test(c.spinRootFolderId))return null;return c}catch{return null}}
export function ready(env){return !!config(env)}
async function key(secret){return crypto.subtle.importKey('raw',E.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function issueSession(secret,now=Date.now()){let payload=b64(E.encode(JSON.stringify({exp:now+8*60*60*1000,iat:now,nonce:b64(crypto.getRandomValues(new Uint8Array(16)))})));let sig=await crypto.subtle.sign('HMAC',await key(secret),E.encode(payload));return payload+'.'+b64(new Uint8Array(sig))}
export async function sessionValid(request,env,now=Date.now()){if(!ready(env))return false;try{let raw=(request.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-ceca=([^;]+)/)?.[1]; if(!raw || raw.length>1024)return false;let [p,s,...extra]=raw.split('.');if(extra.length||!p||!s)return false;let valid=await crypto.subtle.verify('HMAC',await key(config(env).sessionSecret),un64(s),E.encode(p));let body=JSON.parse(new TextDecoder().decode(un64(p)));return valid && Number.isSafeInteger(body.exp) && Number.isSafeInteger(body.iat) && body.iat<=now && body.exp>now && body.exp-body.iat<=8*60*60*1000}catch{return false}}
export const cookie=(value,maxAge)=>`__Host-ceca=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export async function equal(a,b){let [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',E.encode(a)),crypto.subtle.digest('SHA-256',E.encode(b))]);let x1=new Uint8Array(x),y1=new Uint8Array(y),d=0;for(let i=0;i<x1.length;i++)d|=x1[i]^y1[i];return d===0}
// Additional local burst guard only. WAF rate limiting is required: isolates do not share state.
const attempts=new Map();
export function localLimit(ip,now=Date.now()){if(attempts.size>2000){for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);if(attempts.size>2000)attempts.clear()}let a=attempts.get(ip);if(!a||a.until<now)a={count:0,until:now+60000};a.count++;attempts.set(ip,a);return a.count<=10}
