import {insideRoom,polygonBounds,validPolygon} from './geometry.js?v=124593df2a03';
import {contained,overlaps} from './layout.js?v=124593df2a03';
import {rectangle,regionWithin} from './intake-validation.js?v=124593df2a03';
import {CATALOG} from './catalog.js?v=124593df2a03';

export const LOCAL_LAYOUT_VERSION='local-metric-1';
export const LOCAL_MOVABLE_TYPES=Object.freeze(['bed','desk','sofa','armchair','bedside','wardrobe','dresser','bookshelf','cabinet','shoeCabinet','coffeeTable','diningTable','officeChair','tvCabinet','screen']);
const BACKED=new Set(['bed','sofa']),OPENINGS=new Set(['door','interiorDoor','window']);
const DIRS=['北','东北','东','东南','南','西南','西','西北'];
const MAX_OBJECTS=48,MAX_POOL=64,MAX_BEAM=80,MAX_COMBINATIONS=14000,WALL_GAP=.04,EPS=1e-7;
const finite=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
const positive=(v,max=30)=>finite(v)&&Number(v)>0&&Number(v)<=max;
const mod=v=>((v%360)+360)%360;
const round=v=>Math.round(v*1000)/1000;
const label=m=>m.name||CATALOG[m.type]?.name||'物件';
const point=(p,b,width,depth)=>({x:(p.x-b.x)/b.w*width,y:(p.y-b.y)/b.h*depth});
const boundsFinite=r=>r&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.w>0&&r.h>0;
const pointsFinite=ps=>Array.isArray(ps)&&ps.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
const axisWall=(a,b)=>Math.abs(a.x-b.x)<EPS||Math.abs(a.y-b.y)<EPS;
const descriptor=(f,r)=>({floorId:f.id,roomId:r.id,name:r.name,floorName:f.name});
export function localRoomObjects(f,r,obstacleIds=[]){
 const extra=new Set(obstacleIds);
 return (f?.markers||[]).filter(m=>extra.has(m.id)||insideRoom(m,r));
}
export function localMovable(m,r){return !r?.locked&&!m.locked&&!CATALOG[m.type]?.fixed&&LOCAL_MOVABLE_TYPES.includes(m.type);}

function makeRect(o,p=o){const swap=p.rotation===90||p.rotation===270,w=swap?o.depth:o.width,h=swap?o.width:o.depth;return {x:p.x-w/2,y:p.y-h/2,w,h};}
function envelope(o,p,clearance){const r=makeRect(o,p),m={left:clearance,top:clearance,right:clearance,bottom:clearance};if(BACKED.has(o.type))m[({0:'top',90:'right',180:'bottom',270:'left'})[p.rotation]]=0;return {x:r.x-m.left,y:r.y-m.top,w:r.w+m.left+m.right,h:r.h+m.top+m.bottom};}
function backing(o,p,geometry){
 if(!BACKED.has(o.type))return null;
 const r=makeRect(o,p);
 for(const wall of geometry.walls.filter(w=>w.solid&&w.axis)){
  const {a,b,index}=wall,minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);
  let gap=null;
  if(p.rotation===0&&Math.abs(a.y-b.y)<EPS&&r.x>=minX-EPS&&r.x+r.w<=maxX+EPS)gap=r.y-a.y;
  if(p.rotation===180&&Math.abs(a.y-b.y)<EPS&&r.x>=minX-EPS&&r.x+r.w<=maxX+EPS)gap=a.y-(r.y+r.h);
  if(p.rotation===90&&Math.abs(a.x-b.x)<EPS&&r.y>=minY-EPS&&r.y+r.h<=maxY+EPS)gap=a.x-(r.x+r.w);
  if(p.rotation===270&&Math.abs(a.x-b.x)<EPS&&r.y>=minY-EPS&&r.y+r.h<=maxY+EPS)gap=r.x-a.x;
  if(gap!==null&&gap>=-EPS&&gap<=.08+EPS)return {index,gap:round(Math.max(0,gap)),name:`${index+1} 号实墙`};
 }
 return null;
}
function placement(o,p,g){return {...p,id:o.id,rect:makeRect(o,p),clearanceRect:envelope(o,p,g.clearance),backing:backing(o,p,g)};}
function againstStatic(o,p,g,statics){const x=placement(o,p,g);return contained(x.rect,{points:g.polygon})&&contained(x.clearanceRect,{points:g.polygon})&&(!BACKED.has(o.type)||x.backing)&&statics.every(s=>!overlaps(x.clearanceRect,s.rect));}
function pairFits(a,b){return !overlaps(a.clearanceRect,b.rect)&&!overlaps(b.clearanceRect,a.rect);}

function prepare(h,request={}){
 const errors=[],f=h?.floors?.find(f=>f.id===request.floorId),r=f?.rooms?.find(r=>r.id===request.roomId),ids=request.markerIds;
 if(!f||!r)return {errors:['请选择一个已有功能区。'],invalid:true,geometry:null,targets:[]};
 if(!boundsFinite(r)||!pointsFinite(rectangle(r))||rectangle(r).length>64||!validPolygon(rectangle(r)))return {errors:['房间轮廓未闭合、无效或过于复杂，请先核对功能区（最多 64 个拐角）。'],invalid:true,geometry:null,targets:[]};
 if(!pointsFinite(f.boundary)||f.boundary.length>128||!validPolygon(f.boundary)||!regionWithin(r,f.boundary))errors.push('功能区必须完整位于已闭合的住宅红线内。');
 if(r.origin&&!r.reviewed)errors.push('自动识别的房间轮廓尚未人工复核。');
 const m=request.measurement||{},width=Number(m.width),depth=Number(m.depth),clearance=Number(m.clearance);
 if(!positive(m.width)||!positive(m.depth))errors.push('填写房间横向、纵向的实测净空跨度（各不超过 30 米）。');
 if(!finite(m.clearance)||clearance<.1||clearance>1.5)errors.push('填写家具侧边及前方需要保留的净空（0.1–1.5 米）。');
 if(m.rectified!==true)errors.push('仅支持按比例的正投影俯视图；透视效果图不能据此实测试摆。');
 if(m.outlineConfirmed!==true)errors.push('核对房间净空轮廓与实测跨度。');
 if(m.obstaclesConfirmed!==true)errors.push('确认已标全本房间门窗、固定障碍及邻区伸入的物件。');
 if(m.positionsConfirmed!==true)errors.push('确认图中家具中心与开启保留区的位置已在现场核对。');
 if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length)errors.push('每次选择 1–3 件不同的已有家具。');
 const members=localRoomObjects(f,r,request.obstacleIds),selected=new Set(Array.isArray(ids)?ids:[]),byId=new Map((f.markers||[]).map(m=>[m.id,m]));
 const blocked=r.locked||[...selected].some(id=>!byId.has(id)||!localMovable(byId.get(id),r)||!insideRoom(byId.get(id),r));
 if(blocked)errors.push('锁定、固定或不在该房间内的物件保持原位；请重新选择可动家具。');
 if(members.length>MAX_OBJECTS)errors.push(`一次最多核对 ${MAX_OBJECTS} 件物件，请先整理该房间标注。`);
 if(!members.some(o=>['door','interiorDoor'].includes(o.type)))errors.push('请先在房间入口标出门及其完整开启保留区。');
 const b=polygonBounds(rectangle(r)),safeWidth=positive(m.width)?width:1,safeDepth=positive(m.depth)?depth:1,polygon=rectangle(r).map(p=>point(p,b,safeWidth,safeDepth));
 const wallIds=Array.isArray(request.solidWalls)?request.solidWalls:[];
 if(wallIds.some(i=>!Number.isInteger(i)||i<0||i>=polygon.length))errors.push('实墙编号无效，请重新选择。');
 const walls=polygon.map((a,index)=>({index,a,b:polygon[(index+1)%polygon.length],axis:axisWall(a,polygon[(index+1)%polygon.length]),solid:wallIds.includes(index)}));
 if(walls.some(w=>w.solid&&!w.axis))errors.push('斜墙不能用作本次直角家具的靠背实墙，请核对墙线。');
 if(members.some(o=>selected.has(o.id)&&BACKED.has(o.type))&&!walls.some(w=>w.solid&&w.axis))errors.push('为床头或沙发背部至少确认一段可用实墙。');
 const objects=[];
 for(const marker of members.slice(0,MAX_OBJECTS)){
  const input=request.objects?.[marker.id],name=label(marker),rotation=Number(input?.rotation);
  if(!input||!positive(input.width,15)||!positive(input.depth,15)||input.confirmed!==true){errors.push(`${name}：补齐并确认实测宽、深。`);continue;}
  if(!finite(input.rotation)||![0,90,180,270].includes(rotation)){errors.push(`${name}：确认图上实际朝向（0、90、180 或 270 度）。`);continue;}
  if(!Number.isFinite(marker.x)||!Number.isFinite(marker.y)){errors.push(`${name}：图面位置无效。`);continue;}
  const isOpening=OPENINGS.has(marker.type),offsetX=input.reserveOffsetX??0,offsetY=input.reserveOffsetY??0;
  if(isOpening&&(input.openingConfirmed!==true||!finite(offsetX)||!finite(offsetY)||Math.abs(Number(offsetX))>safeWidth||Math.abs(Number(offsetY))>safeDepth)){errors.push(`${name}：核对门扇、窗扇及通行所需的完整开启保留区。`);continue;}
  const center=point(marker,b,safeWidth,safeDepth),o={id:marker.id,name,type:marker.type,width:Number(input.width),depth:Number(input.depth),rotation,x:center.x+(isOpening?Number(offsetX):0),y:center.y+(isOpening?Number(offsetY):0),selected:selected.has(marker.id),fixed:!localMovable(marker,r),isOpening,original:{x:marker.x,y:marker.y,rotation}};
  o.rect=makeRect(o);objects.push(o);
 }
 const geometry={width:safeWidth,depth:safeDepth,metricReady:positive(m.width)&&positive(m.depth),clearance,polygon,walls,objects,bounds:b,north:f.north||0};
 return {errors:[...new Set(errors)],blocked,geometry,targets:objects.filter(o=>o.selected),statics:objects.filter(o=>!o.selected),room:descriptor(f,r),floor:f,sourceRevision:h.revision};
}

export function localLayoutPreview(h,request){const p=prepare(h,request);return {version:LOCAL_LAYOUT_VERSION,room:p.room,geometry:p.geometry,errors:p.errors,moves:[],placements:[]};}
const scoreCompare=(a,b)=>a.moved-b.moved||a.distance-b.distance||a.preference-b.preference;
function candidateScore(o,p,g,preferred){const distance=Math.hypot(p.x-o.x,p.y-o.y),moved=distance>.005||p.rotation!==o.rotation;const direction=DIRS[Math.round(mod(p.rotation-g.north)/45)%8];return {moved:+moved,distance,preference:BACKED.has(o.type)&&preferred.length&&!preferred.includes(direction)?1:0};}
function pool(o,g,statics,preferred){
 const candidates=[],seen=new Set(),step=Math.max(.1,g.width/22,g.depth/22);
 const add=p=>{if(![p.x,p.y,p.rotation].every(Number.isFinite))return;const key=`${p.x.toFixed(4)},${p.y.toFixed(4)},${p.rotation}`;if(seen.has(key))return;seen.add(key);if(!againstStatic(o,p,g,statics))return;const x=placement(o,p,g);x.score=candidateScore(o,p,g,preferred);candidates.push(x);};
 add({x:o.x,y:o.y,rotation:o.rotation});
 if(BACKED.has(o.type)){
  for(const wall of g.walls.filter(w=>w.solid&&w.axis)){
   const {a,b}=wall,horizontal=Math.abs(a.y-b.y)<EPS,min=horizontal?Math.min(a.x,b.x):Math.min(a.y,b.y),max=horizontal?Math.max(a.x,b.x):Math.max(a.y,b.y);
   const slots=[horizontal?o.x:o.y];for(let t=min+o.width/2;t<=max-o.width/2+EPS;t+=step)slots.push(t);slots.push(max-o.width/2);
   for(const t of slots){if(t<min+o.width/2-EPS||t>max-o.width/2+EPS)continue;if(horizontal){add({x:t,y:a.y+o.depth/2+WALL_GAP,rotation:0});add({x:t,y:a.y-o.depth/2-WALL_GAP,rotation:180});}else{add({x:a.x-o.depth/2-WALL_GAP,y:t,rotation:90});add({x:a.x+o.depth/2+WALL_GAP,y:t,rotation:270});}}
  }
 }else{
  // Opposite headings have the same footprint for objects without a required
  // backing wall. Retain their original heading rather than fill the pool twice.
  for(const rotation of [o.rotation,mod(o.rotation+90)])for(let yi=0;yi<=22;yi++)for(let xi=0;xi<=22;xi++)add({x:g.width*xi/22,y:g.depth*yi/22,rotation});
 }
 candidates.sort((a,b)=>scoreCompare(a.score,b.score)||a.x-b.x||a.y-b.y||a.rotation-b.rotation);
 // Keep nearby options and room-wide alternatives: three overlapping pieces
 // may need more than the nearest cluster even when each has many local fits.
 const diverse=candidates.slice(0,MAX_POOL/2),selected=new Set(diverse),buckets=new Set();
 for(const x of candidates){const key=`${Math.min(3,Math.floor(x.x/g.width*4))}:${Math.min(3,Math.floor(x.y/g.depth*4))}:${x.rotation%180}`;if(buckets.has(key))continue;buckets.add(key);if(!selected.has(x)){diverse.push(x);selected.add(x);}if(diverse.length===MAX_POOL)break;}
 for(const x of candidates){if(diverse.length>=MAX_POOL)break;if(!selected.has(x)){diverse.push(x);selected.add(x);}}
 diverse.sort((a,b)=>scoreCompare(a.score,b.score));
 return {candidates:diverse,tested:seen.size};
}
function normalized(p,g){return {x:g.bounds.x+p.x/g.width*g.bounds.w,y:g.bounds.y+p.y/g.depth*g.bounds.h,rotation:p.rotation};}
const REVIEW=Object.freeze(['移动前复量家具最大外形、门窗完整开启区和所填净空。','床头、沙发背部只靠已确认实墙；实际有窗洞、插座或设备时重新核对。','该图只检查平面占位；高度、抽屉开启、插座管线和跨房动线仍需现场确认。']);
export function solveLocalLayout(h,request={}){
 const p=prepare(h,request),g=p.geometry;
 const result={version:LOCAL_LAYOUT_VERSION,status:'missing',floorId:request.floorId,roomId:request.roomId,room:p.room,sourceRevision:p.sourceRevision,errors:p.errors,moves:[],placements:[],unchanged:[],review:[...REVIEW],geometry:g,tested:{positions:0,combinations:0,limited:false},scope:'按本房间实测跨度、净空轮廓及矩形占位做局部试摆，不改变原始图纸。'};
 const preserve=reason=>{result.unchanged=p.targets.map(o=>({id:o.id,name:o.name,reason}));return result;};
 if(p.errors.length){result.status=p.blocked?'blocked':p.invalid?'invalid':'missing';return preserve('资料或可移动条件未满足，保留原位。');}
 const preferred=Array.isArray(request.preferredDirections)?request.preferredDirections.filter(x=>DIRS.includes(x)):[];
 const original=p.targets.map(o=>placement(o,o,g)),allGood=p.targets.every((o,i)=>againstStatic(o,original[i],g,p.statics))&&original.every((a,i)=>original.slice(i+1).every(b=>pairFits(a,b)));
 let selected=original;
 if(!allGood){
  const pools=p.targets.map(o=>pool(o,g,p.statics,preferred));result.tested.positions=pools.reduce((n,x)=>n+x.tested,0);
  if(pools.some(x=>!x.candidates.length)){result.status='no-solution';return preserve('在已确认实墙、开启保留区和净空条件下，未找到可用位置；先核对尺寸或缩小本次范围。');}
  let beam=[{positions:[],moved:0,distance:0,preference:0}];
  for(const {candidates}of pools){const next=[];for(const state of beam){for(const candidate of candidates){if(++result.tested.combinations>MAX_COMBINATIONS){result.tested.limited=true;break;}if(!state.positions.every(other=>pairFits(candidate,other)))continue;next.push({positions:[...state.positions,candidate],moved:state.moved+candidate.score.moved,distance:state.distance+candidate.score.distance,preference:state.preference+candidate.score.preference});}if(result.tested.limited)break;}next.sort(scoreCompare);beam=next.slice(0,MAX_BEAM);if(!beam.length||result.tested.limited)break;}
  if(result.tested.limited||!beam.length||beam[0].positions.length!==p.targets.length){result.status='no-solution';return preserve('本次有限搜索未找到整组互不冲突的位置，全部保留原位；不代表任意角度或连续空间均无解。');}
  selected=beam[0].positions;
 }
 result.placements=p.targets.map((o,i)=>{const x=selected[i],score=candidateScore(o,x,g,preferred),to=normalized(x,g);return {id:o.id,name:o.name,type:o.type,from:{...o.original},to,moved:!!score.moved,rect:x.rect,clearanceRect:x.clearanceRect,backing:x.backing,metric:{left:round(x.rect.x),top:round(x.rect.y),right:round(g.width-x.rect.x-x.rect.w),bottom:round(g.depth-x.rect.y-x.rect.h),width:round(x.rect.w),depth:round(x.rect.h),distance:round(score.distance),dx:round(x.x-o.x),dy:round(x.y-o.y),clearance:g.clearance},reason:score.moved?'避开已标占位，并满足本次净空与实墙条件。':'原位置已满足本次平面条件，保留现状。'};});
 result.moves=result.placements.filter(x=>x.moved).map(x=>({floorId:request.floorId,id:x.id,type:x.type,from:x.from,to:x.to,metric:x.metric,backing:x.backing,reason:x.reason}));
 result.unchanged=result.placements.filter(x=>!x.moved).map(x=>({id:x.id,name:x.name,reason:x.reason}));result.status=result.moves.length?'suggested':'unchanged';
 return result;
}
