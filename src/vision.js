import {CATALOG} from './catalog.js?v=11c9ab943438';
import {validPolygon,polygonBounds,insideRoom} from './geometry.js?v=11c9ab943438';
import {adoptRecognition} from './recognition-ui.js?v=11c9ab943438';
import {uid,ROOMS} from './core.js?v=11c9ab943438';
export const VISION_VERSION='floorplan-vision-1';
const unit=n=>Number.isFinite(n)&&n>=0&&n<=1;
const plain=(v,max=24)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,'').slice(0,max):'';
function polygon(raw){
 if(!Array.isArray(raw)||raw.length<3||raw.length>80||!raw.every(p=>p&&unit(p.x)&&unit(p.y)))return null;
 const ps=raw.map(({x,y})=>({x,y}));
 if(ps.length>3&&ps[0].x===ps.at(-1).x&&ps[0].y===ps.at(-1).y)ps.pop();
 return validPolygon(ps)?ps:null;
}
// Model output is untrusted: copy only supported geometry and never accept report instructions.
export function validateVision(data){
 if(!data||!Array.isArray(data.rooms)||!Array.isArray(data.objects))throw Error('识图结果不完整，请重新识别。');
 let rejected=0;
 const boundary=polygon(data.boundary);if(data.boundary&&!boundary)rejected++;
 const candidates=data.rooms.slice(0,30).flatMap(r=>{
  const points=polygon(r?.points);if(!points||!unit(r.confidence)||r.confidence<.5){rejected++;return [];}
  return [{...polygonBounds(points),points,type:Object.hasOwn(ROOMS,r.type)?r.type:'other',name:plain(r.name)||'待确认空间',confidence:r.confidence,origin:VISION_VERSION,reviewed:false}];
 });
 const objects=data.objects.slice(0,80).flatMap(o=>{
  if(!o||!Object.hasOwn(CATALOG,o.type)||![o.x,o.y,o.width,o.height,o.confidence].every(unit)||o.width<.003||o.height<.003||o.confidence<.5||o.x-o.width/2<-.01||o.x+o.width/2>1.01||o.y-o.height/2<-.01||o.y+o.height/2>1.01){rejected++;return [];}
  return [{type:o.type,x:o.x,y:o.y,width:o.width,height:o.height,rotation:Number.isFinite(o.rotation)?((o.rotation%360)+360)%360:0,confidence:o.confidence,reviewed:false}];
 });
 return {version:VISION_VERSION,boundary,candidates,objects,rejected,status:'review',provider:'DeepSeek'};
}
export function adoptVision(f,{indices=[],objectIndices=[],boundary=false,types={},names={}}={}){
 const r=f.visionRecognition;if(!r||r.version!==VISION_VERSION)throw Error('请先完成识图。');
 if(!indices.length&&!objectIndices.length&&!boundary)throw Error('先勾选需要采用的标注。');
 let next=structuredClone(f),added=0,skipped=0,objectsAdded=0;
 if(indices.length||boundary){const result=adoptRecognition({...next,recognition:r},{indices,boundary,types});next=result.floor;added=result.added;skipped=result.skipped;next.recognition=f.recognition;
  // Existing annotations stay untouched; labels apply only to the newly adopted polygons.
  for(const room of next.rooms.filter(x=>!f.rooms.some(old=>old.id===x.id))){const i=r.candidates.findIndex(c=>JSON.stringify(c.points)===JSON.stringify(room.points));room.name=plain(names[i])||r.candidates[i]?.name||room.name;}
 }
 if(!validPolygon(next.boundary||[]))throw Error('请先采用或勾画边界红线，再加入门窗家具。');
 for(const i of [...new Set(objectIndices)]){const o=r.objects[i];if(!o||!Object.hasOwn(CATALOG,o.type)||!insideRoom(o,{points:next.boundary}))throw Error('有门窗或家具位于红线外，请取消该项，回到图上手动补标。');
  if(next.markers.some(m=>m.type===o.type&&Math.hypot(m.x-o.x,m.y-o.y)<.025)){skipped++;continue;}
  next.markers.push({id:uid(),type:o.type,x:o.x,y:o.y,rotation:o.rotation,uiScale:Math.max(.5,Math.min(3,Math.max(o.width,o.height)*8)),locked:!!CATALOG[o.type].fixed,origin:VISION_VERSION,reviewed:true});objectsAdded++;
 }
 next.confirmed=false;next.geometryConfirmed=false;
 return {floor:next,added,objectsAdded,skipped};
}
