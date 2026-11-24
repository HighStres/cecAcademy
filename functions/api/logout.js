import {sameOrigin,result,cookie} from '../../lib/shared.js';
export function onRequestPost({request}){if(!sameOrigin(request))return result({error:'Origem não permitida.'},403);return result({ok:true},200,{'Set-Cookie':cookie('',0)})}
