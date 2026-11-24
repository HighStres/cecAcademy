import {result,sessionValid} from '../../lib/shared.js';
export async function onRequestGet({request,env}){return await sessionValid(request,env)?result({authenticated:true}):result({authenticated:false},401)}
