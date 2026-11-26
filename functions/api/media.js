import {sessionValid,result,config} from '../../lib/shared.js';
import {access} from '../../lib/drive.js';
export async function onRequestGet({request,env}) {
 if(!await sessionValid(request,env)) return result({error:'Sessão expirada.'},401);
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^[\w-]{5,200}$/.test(id)) return result({error:'Arquivo inválido.'},400);
 const range=request.headers.get('Range');
 if(range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return result({error:'Intervalo inválido.'},416);
 try {
  const token=await access(env),headers={Authorization:'Bearer '+token},root=config(env).spinRootFolderId;
  let current=id,seen=new Set(),mime='';
  for(let depth=0;depth<100;depth++) {
   if(seen.has(current))return result({error:'Arquivo indisponível.'},404);seen.add(current);
   const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(current)+'?fields=id,mimeType,parents,trashed&supportsAllDrives=true';
   const res=await fetch(url,{headers});if(!res.ok)return result({error:'Arquivo indisponível ou sem autorização.'},404);
   const f=await res.json();if(f.trashed)return result({error:'Arquivo indisponível.'},404);
   if(depth===0){mime=f.mimeType||'';if(!mime.startsWith('video/'))return result({error:'Arquivo indisponível.'},404)}
   if(current===root)break;
   if(!Array.isArray(f.parents)||f.parents.length!==1)return result({error:'Arquivo fora da biblioteca.'},404);
   current=f.parents[0];
  }
  if(current!==root)return result({error:'Arquivo fora da biblioteca.'},404);
  let h={...headers};if(range)h.Range=range;
  const upstream=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true',{headers:h});
  if(![200,206,416].includes(upstream.status))return result({error:'Não foi possível obter o vídeo do Drive.'},upstream.status===403?403:502);
  if(upstream.status===206 && !upstream.headers.get('Content-Range')){await upstream.body?.cancel();return result({error:'Resposta parcial inválida.'},502)}
  if(range && upstream.status===200){await upstream.body?.cancel();return result({error:'O Drive não aceitou a busca neste vídeo.'},502)}
  const out={'Content-Type':upstream.headers.get('Content-Type')||mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'};
  for(const key of ['Content-Range','Accept-Ranges','Content-Length']){let v=upstream.headers.get(key);if(v)out[key]=v}
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }catch{return result({error:'Não foi possível conectar ao Drive.'},503)}
}
