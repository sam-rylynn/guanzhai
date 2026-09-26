import {SERVICE_BASE} from './service-config.js?v=716b99049af8';
export async function service(path,payload,{signal,token}={}){const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(new DOMException('服务响应超时，请重试。','TimeoutError')),path==='recognize-plan'?95000:path==='furniture'?65000:15000);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});try{const r=await fetch(`${SERVICE_BASE}/api/${path}`,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json',...(token?{'X-Vision-Token':token}:{})}:{},body:payload?JSON.stringify(payload):undefined,signal:controller.signal});if(!r.ok){if(r.status===404)throw Error('服务尚未开通');let text;try{text=(await r.json()).error;}catch{}throw Error(text||'服务暂不可用');}return await r.json();}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}}
// Call without awaiting during startup. Each endpoint can update its controls
// immediately; callers that need all results can still await the final snapshot.
export async function serviceCapabilities({onUpdate}={}){
 const endpoints=['capabilities','vision-capabilities'];
 const results=[{maps:false,vision:false},{planVision:false}];
 const snapshot=()=>({...results[0],...results[1]});
 await Promise.allSettled(endpoints.map(async(endpoint,index)=>{
  let status='ready';
  try{results[index]=await service(endpoint);}catch{status='unavailable';}
  // Keep endpoint precedence stable regardless of completion order. A failed
  // endpoint retains only its own defaults, not another endpoint's success.
  onUpdate?.(snapshot(),{endpoint,status});
 }));
 return snapshot();
}
