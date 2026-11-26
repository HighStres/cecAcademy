// Servidor de teste LOCAL do cecAcademy (não usar em produção).
// Executa as Pages Functions reais de functions/api/* em Node e simula SOMENTE a API do Google Drive:
// a "pasta raiz" contém os arquivos .mp4 de uma pasta local, servidos com Range/206 como o Drive faz.
// Não usa nenhuma credencial real: a Service Account é uma chave RSA gerada na hora.
//
// Uso:  node tools/servidor-local.mjs <pasta-com-videos> [porta]
// Login local:  usuário "teste-local"  /  senha "senha-local-teste"
// Variáveis opcionais: ATRASO_MS=150 (latência simulada do Drive por requisição)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'..'),publicDir=path.join(project,'public');
const videoDir=path.resolve(process.argv[2]||'');
const port=Number(process.argv[3]||8788),delay=Number(process.env.ATRASO_MS||0);
if(!process.argv[2]||!fs.statSync(videoDir,{throwIfNoEntry:false})?.isDirectory()){console.error('Uso: node tools/servidor-local.mjs <pasta-com-videos> [porta]');process.exit(1)}

// Árvore simulada do Drive: raiz -> "Teste local" -> vídeos da pasta; um vídeo extra fora da raiz.
const ROOT='raiz-teste-local',CAT='categoria-teste-local',FOLDER='application/vnd.google-apps.folder';
const files={[ROOT]:{name:'Raiz de teste',mimeType:FOLDER,parents:[]},[CAT]:{name:'Teste local',mimeType:FOLDER,parents:[ROOT]},'fora-da-raiz-1':{name:'Fora da biblioteca.mp4',mimeType:'video/mp4',parents:['outra-pasta'],path:null},'outra-pasta':{name:'Outra',mimeType:FOLDER,parents:[]}};
for(const f of fs.readdirSync(videoDir).filter(f=>/\.mp4$/i.test(f)).sort()){
 const id='local-'+f.replace(/\.mp4$/i,'').replace(/[^\w-]/g,'_');
 files[id]={name:f,mimeType:'video/mp4',parents:[CAT],path:path.join(videoDir,f)};
}
console.log('Vídeos simulados:',Object.entries(files).filter(([,f])=>f.path).map(([id])=>id).join(', '));

const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const der=new Uint8Array(await crypto.subtle.exportKey('pkcs8',keys.privateKey));
const env={
 CECA_CONFIG:JSON.stringify({username:'teste-local',password:'senha-local-teste',sessionSecret:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),spinRootFolderId:ROOT}),
 GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'teste-local@example.invalid',private_key:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(der).toString('base64')+'\n-----END PRIVATE KEY-----'})
};
export const driveLog=[];
const realFetch=globalThis.fetch;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
globalThis.fetch=async(url,opt={})=>{
 const u=new URL(typeof url==='string'?url:url.url);
 if(delay)await sleep(delay);
 if(u.host==='oauth2.googleapis.com'){driveLog.push('token');return Response.json({access_token:'token-local',expires_in:3600})}
 if(u.host!=='www.googleapis.com')return realFetch(url,opt);
 const h=new Headers(opt.headers);
 if(h.get('Authorization')!=='Bearer token-local')return Response.json({error:{errors:[{reason:'authError'}]}},{status:401});
 const parts=u.pathname.split('/'),id=decodeURIComponent(parts.pop());
 if(u.pathname.endsWith('/files')){ // listagem: q="'<pasta>' in parents and trashed = false"
  const parent=/'([^']+)' in parents/.exec(u.searchParams.get('q')||'')?.[1];
  const list=Object.entries(files).filter(([,f])=>f.parents.includes(parent)).map(([fid,f])=>({id:fid,name:f.name,mimeType:f.mimeType,...(f.path?{videoMediaMetadata:{}}:{})}));
  driveLog.push('list '+parent);return Response.json({files:list});
 }
 const f=files[id];
 if(!f){driveLog.push('404 '+id);return Response.json({error:{errors:[{reason:'notFound'}]}},{status:404})}
 if(u.searchParams.get('alt')!=='media'){driveLog.push('meta '+id);return Response.json({id,name:f.name,mimeType:f.mimeType,parents:f.parents,trashed:false})}
 const size=fs.statSync(f.path).size,range=h.get('Range');
 driveLog.push('media '+id+' '+(range||'(sem Range)'));
 const m=/^bytes=(\d*)-(\d*)$/.exec(range||'');
 if(!m)return new Response(Readable.toWeb(fs.createReadStream(f.path)),{status:200,headers:{'Content-Type':'video/mp4','Content-Length':String(size)}});
 let start=m[1]===''?Math.max(0,size-Number(m[2])):Number(m[1]),end=m[1]===''||m[2]===''?size-1:Math.min(Number(m[2]),size-1);
 if(start>=size)return new Response('',{status:416,headers:{'Content-Range':`bytes */${size}`}});
 return new Response(Readable.toWeb(fs.createReadStream(f.path,{start,end})),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});
};

const routes={};
for(const name of fs.readdirSync(path.join(project,'functions/api')).filter(f=>f.endsWith('.js')))routes[name.replace(/\.js$/,'')]=await import(pathToFileURL(path.join(project,'functions/api',name)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export const accessLog=[];

http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://${req.headers.host}`);
 try{
  if(url.pathname.startsWith('/api/')){
   const mod=routes[url.pathname.slice(5)],method=req.method[0]+req.method.slice(1).toLowerCase();
   const handler=mod?.['onRequest'+method]||mod?.onRequest;
   if(!handler){res.writeHead(405).end();return}
   const chunks=[];for await(const c of req)chunks.push(c);
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(', '):v);
   const request=new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
   const response=await handler({request,env});
   const out={};response.headers.forEach((v,k)=>{if(k!=='set-cookie')out[k]=v});
   const cookies=response.headers.getSetCookie?.()||[];if(cookies.length)out['set-cookie']=cookies;
   if(url.pathname==='/api/media')console.log(`media ${req.headers.range||'(sem Range)'} -> ${response.status} ${response.headers.get('content-range')||''}`);
   res.writeHead(response.status,out);
   if(!response.body){res.end();return}
   const body=Readable.fromWeb(response.body);req.on('close',()=>body.destroy());body.pipe(res);
   return;
  }
  let file=path.normalize(path.join(publicDir,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(publicDir)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(publicDir,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)res.writeHead(500);res.end()}
}).listen(port,'127.0.0.1',()=>console.log(`cecAcademy local: http://localhost:${port}/?player=teste`));
