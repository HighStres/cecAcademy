import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,clearMediaCache} from '../functions/api/media.js';
import {issueSession} from '../lib/shared.js';
import {clearTokenCache} from '../lib/drive.js';

const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const der=new Uint8Array(await crypto.subtle.exportKey('pkcs8',keys.privateKey));
const cfg={username:'u',password:'p',sessionSecret:'abcdefghijklmnopqrstuv0123456789abcd',spinRootFolderId:'root'};
const env={CECA_CONFIG:JSON.stringify(cfg),GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'x@example.invalid',private_key:'-----BEGIN PRIVATE KEY-----\n'+btoa(String.fromCharCode(...der))+'\n-----END PRIVATE KEY-----'})};
const cookie='__Host-ceca='+await issueSession(cfg.sessionSecret);
const req=(id,{auth=true,range}={})=>new Request('https://example.test/api/media?id='+id,{headers:{...(auth?{Cookie:cookie}:{}),...(range?{Range:range}:{})}});

const tree={video1:{mimeType:'video/mp4',parents:['folder']},outside:{mimeType:'video/mp4',parents:['elsewhere']},elsewhere:{mimeType:'application/vnd.google-apps.folder',parents:[]},image1:{mimeType:'image/png',parents:['folder']},quota1:{mimeType:'video/mp4',parents:['folder']},folder:{mimeType:'application/vnd.google-apps.folder',parents:['root']},root:{mimeType:'application/vnd.google-apps.folder'}};
const body='0123456789';
let calls,original;
beforeEach(()=>{clearMediaCache();clearTokenCache();calls={token:0,meta:0,media:0};original=globalThis.fetch;
 globalThis.fetch=async(url,opt={})=>{const u=new URL(url);
  if(u.host==='oauth2.googleapis.com'){calls.token++;return Response.json({access_token:'mock',expires_in:3600})}
  assert.equal(opt.headers.Authorization,'Bearer mock');
  const id=u.pathname.split('/').pop();
  if(u.searchParams.get('alt')==='media'){calls.media++;
   if(id==='quota1')return Response.json({error:{errors:[{reason:'downloadQuotaExceeded'}]}},{status:403});
   const m=/^bytes=(\d+)-(\d*)$/.exec(opt.headers.Range||'');
   if(!m)return new Response(body,{status:200,headers:{'Content-Type':'video/mp4','Content-Length':'10'}});
   const s=+m[1],e=m[2]?Math.min(+m[2],9):9;
   if(s>9)return new Response('',{status:416,headers:{'Content-Range':'bytes */10'}});
   return new Response(body.slice(s,e+1),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':`bytes ${s}-${e}/10`,'Content-Length':String(e-s+1)}})}
  calls.meta++;
  if(!tree[id])return Response.json({error:{errors:[{reason:'notFound'}]}},{status:404});
  return Response.json({id,...tree[id]})}});
afterEach(()=>{globalThis.fetch=original});

test('sem sessão: 401 sem consultar o Drive',async()=>{const r=await onRequestGet({request:req('video1',{auth:false}),env});assert.equal(r.status,401);assert.equal(calls.token+calls.meta+calls.media,0)});
test('Range devolve 206 com Content-Range, Accept-Ranges e no-store',async()=>{const r=await onRequestGet({request:req('video1',{range:'bytes=2-5'}),env});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 2-5/10');assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal(r.headers.get('content-length'),'4');assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(await r.text(),'2345')});
test('requisições Range seguintes reaproveitam token e autorização',async()=>{for(const range of ['bytes=0-','bytes=5-','bytes=8-9']){const r=await onRequestGet({request:req('video1',{range}),env});assert.equal(r.status,206);await r.arrayBuffer()}assert.equal(calls.token,1);assert.equal(calls.meta,3);assert.equal(calls.media,3)});
test('vídeo fora da raiz: 404',async()=>{assert.equal((await onRequestGet({request:req('outside'),env})).status,404);assert.equal(calls.media,0)});
test('arquivo que não é vídeo: 404 sem baixar conteúdo',async()=>{const r=await onRequestGet({request:req('image1'),env});assert.equal(r.status,404);assert.equal((await r.json()).code,'not_video');assert.equal(calls.media,0)});
test('inexistente/sem compartilhamento: 404 com mensagem clara',async()=>{const r=await onRequestGet({request:req('missing1'),env});assert.equal(r.status,404);assert.equal((await r.json()).code,'not_found')});
test('Range múltiplo ou malformado: 416',async()=>{assert.equal((await onRequestGet({request:req('video1',{range:'bytes=0-1,3-4'}),env})).status,416);assert.equal((await onRequestGet({request:req('video1',{range:'items=0-1'}),env})).status,416)});
test('Range além do fim: 416 repassado sem corpo',async()=>{const r=await onRequestGet({request:req('video1',{range:'bytes=50-'}),env});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */10')});
test('quota do Drive excedida: 429 com mensagem',async()=>{const r=await onRequestGet({request:req('quota1',{range:'bytes=0-'}),env});assert.equal(r.status,429);assert.equal((await r.json()).code,'drive_quota')});
test('ID inválido: 400',async()=>{assert.equal((await onRequestGet({request:req('../x'),env})).status,400)});
test('Service Account ausente: 503 sem vazar detalhes',async()=>{const r=await onRequestGet({request:req('video1'),env:{CECA_CONFIG:env.CECA_CONFIG}});assert.equal(r.status,503);assert.equal((await r.json()).code,'drive_auth')});
