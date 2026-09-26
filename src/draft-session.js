// One writer per editing session. A later edit cannot be marked saved by an older write.
export function createDraftSaver({read,write,onState=()=>{},delay=300}){
 let requested=0,saved=0,timer=null,running=null,paused=false;
 const notify=(state,error)=>onState(state,error);
 const clearTimer=()=>{clearTimeout(timer);timer=null;};
 function schedule(){if(paused)return;requested++;clearTimer();notify('pending');timer=setTimeout(()=>{void flush().catch(()=>{});},delay);}
 async function flush(){
  clearTimer();
  if(running){await running;if(!paused&&saved<requested)return flush();return;}
  if(paused||saved===requested)return;
  running=(async()=>{
   while(!paused&&saved<requested){
    const version=requested,snapshot=structuredClone(read());
    if(!snapshot){saved=version;break;}
    notify('saving');await write(snapshot);saved=version;
   }
   if(!paused)notify('saved');
  })();
  try{await running;}catch(error){notify('error',error);throw error;}finally{running=null;}
 }
 async function reset(){paused=true;clearTimer();try{await running;}catch{}requested=saved=0;running=null;paused=false;notify('idle');}
 return {schedule,flush,reset};
}

export function captureDraft(h,{page='editor',step=0,floorIndex=0,selection=null,tool='select',sketch=[],reportEdit=null,drawingExpanded=null}={}){
 return {id:h.id,house:structuredClone(h),context:{page,step,floorId:h.floors[floorIndex]?.id||null,selection,tool,sketch:structuredClone(sketch),reportEdit:reportEdit?structuredClone(reportEdit):null,drawingExpanded},updatedAt:new Date().toISOString()};
}

export function restoreDraft(entry){
 const house=structuredClone(entry.house),context=entry.context||{};
 const floorIndex=Math.max(0,house.floors.findIndex(f=>f.id===context.floorId));
 let step=Math.max(0,Math.min(10,Number.isInteger(context.step)?context.step:0));
 if(step>=5&&!house.floors.length)step=4;
 return {house,context:{...context,page:context.page==='planner'?'planner':'editor',step,floorIndex,sketch:Array.isArray(context.sketch)?context.sketch:[],tool:['select','boundary','polygon','bounds','scale'].includes(context.tool)?context.tool:'select'}};
}
