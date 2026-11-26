// Streaming de videoaulas do Google Drive para o player HTML5 móvel.
// - Exige sessão válida do cecAcademy.
// - Só entrega arquivos de vídeo cuja cadeia de pastas chega à raiz configurada.
// - Encaminha Range ao Drive e devolve 206 em streaming (sem carregar o arquivo na memória).
// - O token da Service Account nunca é enviado ao navegador.
import {sessionValid,result,config} from '../../lib/shared.js';
import {access,clearTokenCache} from '../../lib/drive.js';

const API='https://www.googleapis.com/drive/v3/files/';
// Autorizações recentes ficam apenas na memória desta instância, por poucos minutos,
// para que cada Range não repita a subida de pastas no Drive. Não é cache de conteúdo.
const AUTH_TTL=10*60*1000, MAX_AUTH=500, authorized=new Map();
export function clearMediaCache(){authorized.clear()}

async function driveReason(res){try{const j=await res.json();return String(j?.error?.errors?.[0]?.reason||j?.error?.status||'')}catch{return ''}}
function driveFailure(status,reason){
 if(status===429||/rateLimit|quota/i.test(reason))return result({error:'Limite de uso do Google Drive atingido. Tente novamente em alguns minutos.',code:'drive_quota'},429);
 if(status===401)return result({error:'A autenticação da conta de serviço foi recusada pelo Google.',code:'drive_auth'},503);
 if(status===403)return result({error:'A conta de serviço não tem permissão para transmitir este vídeo.',code:'drive_forbidden'},403);
 if(status===404)return result({error:'Vídeo não encontrado ou não compartilhado com a conta de serviço.',code:'not_found'},404);
 return result({error:'O Google Drive não respondeu corretamente.',code:'drive_error'},502);
}

async function authorize(id,root,headers,now){
 const hit=authorized.get(id);
 if(hit&&hit.root===root&&hit.until>now)return {ok:true,mime:hit.mime};
 let current=id,mime='';const seen=new Set();
 for(let depth=0;depth<50;depth++){
  if(seen.has(current))break;seen.add(current);
  const res=await fetch(API+encodeURIComponent(current)+'?fields=id,mimeType,parents,trashed&supportsAllDrives=true',{headers});
  if(!res.ok){const reason=await driveReason(res);return {ok:false,response:driveFailure(res.status,reason),status:res.status}}
  const f=await res.json();
  if(f.trashed)return {ok:false,response:result({error:'Vídeo indisponível.',code:'not_found'},404)};
  if(depth===0){mime=f.mimeType||'';if(!mime.startsWith('video/'))return {ok:false,response:result({error:'Este arquivo não é um vídeo.',code:'not_video'},404)}}
  if(current===root){
   if(authorized.size>=MAX_AUTH)authorized.clear();
   authorized.set(id,{root,mime,until:now+AUTH_TTL});
   return {ok:true,mime};
  }
  if(!Array.isArray(f.parents)||f.parents.length!==1)break;
  current=f.parents[0];
 }
 return {ok:false,response:result({error:'Este vídeo não pertence à biblioteca autorizada.',code:'outside_library'},404)};
}

export async function onRequestGet({request,env}){
 if(!await sessionValid(request,env))return result({error:'Sua sessão terminou. Entre novamente.',code:'session'},401);
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^[\w-]{5,200}$/.test(id))return result({error:'Arquivo inválido.',code:'invalid'},400);
 const range=request.headers.get('Range');
 // Apenas um intervalo por requisição (o que os players de vídeo usam).
 if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return result({error:'Intervalo inválido.',code:'range'},416);
 let token;
 try{token=await access(env)}catch{return result({error:'Conta de serviço do Google não configurada ou recusada.',code:'drive_auth'},503)}
 try{
  const headers={Authorization:'Bearer '+token},root=config(env).spinRootFolderId;
  const auth=await authorize(id,root,headers,Date.now());
  if(!auth.ok){if(auth.status===401)clearTokenCache();return auth.response}
  const h={...headers};if(range)h.Range=range;
  const upstream=await fetch(API+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true',{headers:h});
  if(![200,206,416].includes(upstream.status)){
   const reason=await driveReason(upstream);
   if(upstream.status===401){clearTokenCache();authorized.delete(id)}
   return driveFailure(upstream.status,reason);
  }
  if(upstream.status===206&&!upstream.headers.get('Content-Range')){await upstream.body?.cancel();return result({error:'Resposta parcial inválida do Drive.',code:'drive_error'},502)}
  // Drive ignorou o Range: só é aceitável para "bytes=0-" (arquivo inteiro desde o início).
  if(range&&upstream.status===200&&!/^bytes=0-$/.test(range)){await upstream.body?.cancel();return result({error:'O Drive não aceitou a busca neste vídeo.',code:'range'},502)}
  const out={'Content-Type':upstream.headers.get('Content-Type')||auth.mime,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Cross-Origin-Resource-Policy':'same-origin'};
  for(const key of ['Content-Range','Content-Length']){const v=upstream.headers.get(key);if(v)out[key]=v}
  if(upstream.status===416){await upstream.body?.cancel();return new Response(null,{status:416,headers:out})}
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }catch{return result({error:'Não foi possível conectar ao Google Drive.',code:'drive_network'},503)}
}
