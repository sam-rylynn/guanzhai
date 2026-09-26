import {direction} from './core.js?v=124593df2a03';
import {insideRoom,polygonBounds,validPolygon} from './geometry.js?v=124593df2a03';
import {favorableReference} from './favorable.js?v=124593df2a03';

export const DIRECTIONS=['北','东北','东','东南','南','西南','西','西北'];
// Family positions follow 說卦; this is a cultural association, never a health forecast.
export const ROLES={
 '':{name:'不指定身份',direction:null},
 father:{name:'男主人',direction:'西北',gua:'乾'},mother:{name:'女主人',direction:'西南',gua:'坤'},
 eldestSon:{name:'长男',direction:'东',gua:'震'},eldestDaughter:{name:'长女',direction:'东南',gua:'巽'},
 middleSon:{name:'中男',direction:'北',gua:'坎'},middleDaughter:{name:'中女',direction:'南',gua:'离'},
 youngestSon:{name:'少男',direction:'东北',gua:'艮'},youngestDaughter:{name:'少女',direction:'西',gua:'兑'}
};
export const roleOf=h=>ROLES[h.householdRole]||ROLES[''];
export const roleNote=(h,d)=>roleOf(h).direction===d?`此方对应你选择的${roleOf(h).name}，本次重点核对。`:'';
export function sleepingDirection(b){const f=favorableReference(b);return {basis:f.element?'扶抑配色与方位参考':'出生资料待补齐',directions:({木:['东','东南'],火:['南'],土:['东北','西南'],金:['西','西北'],水:['北']})[f.element]||[]};}

export const EXTERNAL_TYPES={open:'开阔空地',green:'绿地 / 山体',building:'楼栋 / 围墙',road:'道路',water:'河流 / 水面',other:'其他'};
export const EXTERNAL_EFFECTS={unknown:'尚未到窗边核实',clear:'已观察：视野开阔、无明显干扰',shade:'已观察：遮挡采光',noise:'已观察：噪声干扰',glare:'已观察：强光 / 反光',privacy:'已观察：对视、隐私受扰'};
export const EXTERNAL_FORMS={unknown:'形势未核实',ordinary:'未见下列形势',open:'开口前开阔',roadAxis:'道路直线朝向门窗',outerBend:'位于道路或河道外弯一侧',corner:'对面建筑尖角朝向门窗',gap:'两楼狭缝朝向门窗',closeWall:'近处高墙 / 高楼压近'};
const formReading={
 open:['明堂取开敞之意','开口前有缓冲与视野，可保留采光和出入空间','保持窗前低矮、整洁，不以高柜或浓密植栽封住开口'],
 roadAxis:['传统形峦称路冲，前提是道路轴线实际朝向使用中的门窗','重点核对车灯、噪声和开口处的暴露','床和常坐位移离开口直线，用可调纱帘分隔视线；门内有余地时才设稳定的矮柜，保留出入通道'],
 outerBend:['传统形峦称反弓，需核实弯道走向与房屋确处外侧','重点核对弯道车灯、噪声或沿河潮湿等实际影响','先把长期使用位置移至较安静的一侧；有车灯用可调帘布，有潮湿先查窗边渗水，未观察到干扰时不强行改动'],
 corner:['传统形峦称尖角对射，需在门窗处看见角部朝向本宅','重点是视线压迫与实际反光，不能从地图上两个点直接定冲','调整常坐位避开角部正对的视线，以透光纱帘缓冲；不悬挂会反射到邻家的镜面'],
 gap:['传统形峦关注楼间夹缝直对开口','重点核对穿堂风、风噪与两侧遮光，夹缝存在不等于已经造成干扰','到窗边核实风向，把床和书桌避开强气流直线，调节窗扇和帘布，不能封堵必要通风'],
 closeWall:['传统形峦称前逼，重在开口前的距离与高低关系','重点核对实际遮光和对视；楼层不同，遮挡关系也不同','窗前撤去高物，把工作面移向自然光较好的位置，补均匀照明；保留可开启窗，无法改善时列为选房取舍项']
};
export function mapSearch(h){const q=[h.housingCity,h.district,h.community].filter(Boolean).join(' ');return 'https://uri.amap.com/search?'+new URLSearchParams({keyword:q,city:h.housingCity||'',view:'map',callnative:'0',src:'guanzhai'});}
export const environmentAddress=h=>[h.housingCity,h.district,h.community].filter(Boolean).join(' ');
const openingTypes={window:'窗',door:'入户门',interiorDoor:'室内门'};
const roomPoints=r=>r.points||[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
// This tolerance links nearby drawing symbols only; it is not a physical distance.
export function environmentOpenings(h,floorId,roomId){const f=h.floors.find(x=>x.id===floorId),r=f?.rooms.find(x=>x.id===roomId);if(!r)return [];const ps=roomPoints(r);return (f.markers||[]).filter(m=>openingTypes[m.type]&&Number.isFinite(m.x)&&Number.isFinite(m.y)&&(insideRoom(m,r)||ps.some((p,i)=>distanceToSegment(m,p,ps[(i+1)%ps.length])<=.035))).map(m=>({id:m.id,type:m.type,x:m.x,y:m.y,label:`${openingTypes[m.type]} · ${direction(m.x,m.y,f.north,f.bounds,f.width/f.height)}侧`}));}
export function bindEnvironmentLocation(h,row){const f=h.floors.find(x=>x.id===row.floorId),r=f?.rooms.find(x=>x.id===row.roomId),m=row.markerId?environmentOpenings(h,row.floorId,row.roomId).find(x=>x.id===row.markerId):null;if(row.markerId&&!m)throw Error('所选门窗不属于这个功能区，请重新选择。');return {...row,associationVersion:1,associationStatus:r?'linked':'pending',needsReview:false,address:environmentAddress(h),locationSnapshot:r?{floorName:f.name,roomName:r.name,markerType:m?.type||'',markerX:m?.x??null,markerY:m?.y??null}:null};}
export function environmentAssociation(h,row){
 const originalLocation={floorId:row.floorId||'',roomId:row.roomId||'',markerId:row.markerId||'',...row.locationSnapshot},stale=reason=>({status:'stale',reason,originalLocation});
 if(h.environment?.status==='stale'||row.address&&row.address!==environmentAddress(h))return stale('地址或观察条件已变更，请回到原位置重新核对。');
 if(!row.floorId&&!row.roomId&&!row.markerId)return {status:row.associationVersion?'pending':'legacy',reason:'这条观察尚未关联功能区，不能套用于全屋。',originalLocation};
 const f=h.floors.find(x=>x.id===row.floorId),r=f?.rooms.find(x=>x.id===row.roomId);if(!f||!r)return stale('原楼层或功能区已删除，请重新关联观察位置。');
 const s=row.locationSnapshot;if(!s)return stale('这条旧记录的功能区关联尚未核对，请确认原观察位置。');if(s.roomName!==r.name||s.floorName!==f.name)return stale('原功能区或楼层名称已修改，请核对是否仍为同一观察位置。');
 const m=row.markerId?environmentOpenings(h,f.id,r.id).find(x=>x.id===row.markerId):null;
 if(row.markerId&&(!m||!Number.isFinite(s.markerX)||!Number.isFinite(s.markerY)||s.markerType!==m.type||Math.abs(s.markerX-m.x)>1e-6||Math.abs(s.markerY-m.y)>1e-6))return stale('原门窗已删除、移动或不再邻近此功能区，请重新核对。');
 if(row.needsReview)return stale('观察位置或条件已变更，请回到原位置重新核对。');
 return {status:'linked',reason:'',floorId:f.id,roomId:r.id,markerId:m?.id||'',floorName:f.name,roomName:r.name,openingLabel:m?.label||'',originalLocation};
}
export function normalizeEnvironment(raw,address='',house=null){
 const items=(raw.items||[]).filter(x=>String(x.name||'').trim()).slice(0,24).map(x=>{
  if(!DIRECTIONS.includes(x.direction)||!EXTERNAL_TYPES[x.kind]||!EXTERNAL_EFFECTS[x.effect])throw Error('请为每条周边记录选择方位、类型与观察情况。');
  if(x.distance!==''&&x.distance!=null&&(!Number.isFinite(Number(x.distance))||Number(x.distance)<0||Number(x.distance)>100000))throw Error('距离请填写 0–100000 米，或留空。');
  let url=String(x.url||'').trim();if(url){try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error();url=u.href;}catch{throw Error('来源链接仅支持 http 或 https。');}}
  if(x.effect!=='unknown'&&!String(x.position||'').trim())throw Error('实际观察请填写位置，例如“客厅窗边”。');
  const form=EXTERNAL_FORMS[x.form]?x.form:'unknown',method=['onsite','map'].includes(x.method)?x.method:(x.effect!=='unknown'?'onsite':'map');
  if(method==='map'&&x.effect!=='unknown')throw Error('只有地图资料时，请把实际观察设为尚未核实。');
  if(x.formConfirmed&&form!=='unknown'&&(method!=='onsite'||!String(x.position||'').trim()))throw Error('确认宅外形势需要填写现场观察位置。');
  const item={id:String(x.id||globalThis.crypto.randomUUID()).slice(0,100),form,method,formConfirmed:!!x.formConfirmed&&method==='onsite',observedAt:String(x.observedAt||'').slice(0,40),floorId:String(x.floorId||'').slice(0,100),roomId:String(x.roomId||'').slice(0,100),markerId:String(x.markerId||'').slice(0,100),name:String(x.name).trim().slice(0,80),direction:x.direction,kind:x.kind,effect:x.effect,distance:x.distance===''||x.distance==null?null:Number(x.distance),layer:String(x.layer||'').slice(0,80),source:String(x.source||(method==='onsite'?'本人门窗处观察':'免费地图查找')).slice(0,80),url,position:String(x.position||'').trim().slice(0,100),note:String(x.note||'').slice(0,240)};
  if(x.associationVersion){item.associationVersion=1;item.associationStatus=x.associationStatus==='linked'?'linked':'pending';item.address=String(x.address||'').slice(0,240);item.needsReview=!!x.needsReview;const s=x.locationSnapshot;item.locationSnapshot=s?{floorName:String(s.floorName||'').slice(0,100),roomName:String(s.roomName||'').slice(0,100),markerType:openingTypes[s.markerType]?s.markerType:'',markerX:Number.isFinite(s.markerX)?s.markerX:null,markerY:Number.isFinite(s.markerY)?s.markerY:null}:null;}
  if(house&&item.associationVersion&&environmentAssociation({...house,environment:{...house.environment,status:'recorded'}},item).status==='stale')item.needsReview=true;
  return item;
 });
 return {status:items.length?'recorded':'missing',provider:'用户查找与观察',address,items,updatedAt:new Date().toISOString()};
}
const externalMethods={shade:'移开窗前高物，把常用位置移向本区已有自然光较好的位置；先调整现有灯具。',noise:'先检查窗扇是否关严，把床或长期座位移到本区远离噪声的一侧，试用已有帘布；保留必要通风。',glare:'调整桌面或座位角度避开反光，先调节已有帘布；保留可开启窗。',privacy:'把床和常坐位置移出正对视线，试用已有织物遮挡；不要用高柜封住采光和通风。'};
export function externalFindings(h){const rows=h.environment?.items||[];return rows.map((x,i)=>{
 const association=environmentAssociation(h,x),d=x.direction||(Number.isFinite(x.bearing)?DIRECTIONS[Math.round(x.bearing/45)%8]:'方位待核实'),current=association.status==='linked',verified=current&&x.method!=='map'&&!!x.position&&x.effect&&x.effect!=='unknown',form=current&&x.method==='onsite'&&x.formConfirmed&&x.position?formReading[x.form]:null;
 const attention=verified&&x.effect!=='clear'||form&&x.form!=='open',kind=attention?'attention':verified&&x.effect==='clear'?'good':'unknown';
 const place=association.status==='linked'?`${association.floorName} · ${association.roomName}（${x.position}）`:x.position;
 const observation=verified?`${x.observedAt?`在${x.observedAt}，`:''}${place}${x.effect==='clear'?'观察未见明显干扰':`已记录${EXTERNAL_EFFECTS[x.effect]?.split('：')[1]||'需核对的情况'}`}。`:`${association.status!=='linked'?association.reason:'目前只有地点或形势线索，先到对应门窗核实遮挡、噪声、视线与风。'}`;
 const reference=[x.distance!=null&&x.distance!==''?`所填距离 ${x.distance} 米`:null,x.layer?`现场楼层参照：${x.layer}`:null].filter(Boolean).join('；');
 const text=observation+(verified?x.observedAt?'该记录只反映这个观察时段，不代表全天情况。':'未记录观察时段，不推定全天情况。':'')+(reference?`${reference}，仅作现场参照，不据此推定影响强度。`:'')+(form?` ${form[0]}；${form[1]}。`:'')+(association.status==='legacy'?` 原位置“${x.position||'未填写'}”的历史记录与来源已保留，关联前不认定影响范围。`:'');
 const scope=association.status==='linked'?`屋内调整仅在${association.floorName}的${association.roomName}内处理：`:'先关联这条历史观察对应的功能区，核对后仅在该区屋内处理：';
 const configured=h.planSettingsConfirmed!==false,budgetKnown=configured&&h.budget!==''&&h.budget!=null&&Number.isFinite(Number(h.budget)),zero=budgetKnown&&Number(h.budget)===0;
 const limits=(zero?'0 元预算：先整理、移位和试用已有织物，不新增采购。':!budgetKnown?'预算待确认，先用已有家具与织物试摆。':'')+(configured&&h.tier==='large'&&!zero&&budgetKnown?'如需更换门窗，另核实结构、物业权限与报价；未核实前不拆改。':'本次先不改墙体和门窗，仅调整家具、现有照明与织物。');
 const base=verified&&x.effect!=='clear'?externalMethods[x.effect]:form?'先核实实际干扰；保留原开口和通道，不仅凭形势名称添购物件。':'保持该开口前通行与视野。';
 const action=kind==='unknown'?`${association.reason||'先到这扇门窗现场核实。'}补上功能区关联、观察位置和时间；保留原来源，核实前不安排房间内改动。地图上有道路或水面，不代表它正在影响住宅。`:scope+base+limits+(attention?' 外部道路、河道与邻楼不属于本宅可改范围；不建议改动公共空间。':'');
 return {id:`external-${x.id||i}`,direction:d,title:`${association.status==='linked'?association.roomName+' · ':''}${d} · ${x.name}${form?' · '+EXTERNAL_FORMS[x.form]:''}`,kind,text,action,source:x.source||h.environment?.provider||'来源待核实',url:x.url,role:roleNote(h,d),form:x.form||'unknown',observedAt:x.observedAt||'',distance:x.distance??null,layer:x.layer||'',floorId:association.floorId,roomId:association.roomId,markerId:association.markerId,associationStatus:association.status,reviewReason:association.reason,originalLocation:association.originalLocation};
 });}

// Concavity is compared with the convex hull, so a diagonal/rotated convex home
// is not called 缺角 merely for failing to fill an axis-aligned bounding box.
export function boundaryNotches(f){
 const ps=f.boundary;if(!validPolygon(ps||[])||!f.directionConfirmed)return {status:'missing',items:[]};
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),sorted=[...ps].sort((a,b)=>a.x-b.x||a.y-b.y);
 const half=xs=>{const out=[];for(const p of xs){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const lo=half(sorted),hi=half([...sorted].reverse()),hull=[...lo.slice(0,-1),...hi.slice(0,-1)],bounds=polygonBounds(ps),counts={},total=64*64;
 let hullCells=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const p={x:bounds.x+(x+.5)*bounds.w/64,y:bounds.y+(y+.5)*bounds.h/64};if(!insideRoom(p,{points:hull}))continue;hullCells++;if(!insideRoom(p,{points:ps})){const d=direction(p.x,p.y,f.north,bounds,f.width/f.height);counts[d]=(counts[d]||0)+1;}}
 const items=Object.entries(counts).filter(([d,n])=>d!=='中央'&&n/total>.008).map(([direction,n])=>({direction,share:n/Math.max(hullCells,1)}));
 return {status:'checked',items:items.filter(x=>items.reduce((n,y)=>n+y.share,0)>.02)};
}
