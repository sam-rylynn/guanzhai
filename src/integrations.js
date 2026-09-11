import {SERVICE_BASE} from './service-config.js?v=c8579f40cafb';
export async function service(path,payload){const r=await fetch(`${SERVICE_BASE}/api/${path}`,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(path==='furniture'?65000:15000)});if(!r.ok){if(r.status===404)throw Error('服务尚未开通');let text;try{text=(await r.json()).error;}catch{}throw Error(text||'服务暂不可用');}return r.json();}
export const serviceCapabilities=()=>service('capabilities').catch(()=>({maps:false,vision:false}));
