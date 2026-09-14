import {direction} from './core.js?v=b1cae4b4be94';
import {insideRoom,polygonBounds,validPolygon} from './geometry.js?v=b1cae4b4be94';
import {favorableReference} from './favorable.js?v=b1cae4b4be94';

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
export function normalizeEnvironment(raw,address=''){
 const items=(raw.items||[]).filter(x=>String(x.name||'').trim()).slice(0,24).map(x=>{
  if(!DIRECTIONS.includes(x.direction)||!EXTERNAL_TYPES[x.kind]||!EXTERNAL_EFFECTS[x.effect])throw Error('请为每条周边记录选择方位、类型与观察情况。');
  if(x.distance!==''&&x.distance!=null&&(!Number.isFinite(Number(x.distance))||Number(x.distance)<0||Number(x.distance)>100000))throw Error('距离请填写 0–100000 米，或留空。');
  let url=String(x.url||'').trim();if(url){try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error();url=u.href;}catch{throw Error('来源链接仅支持 http 或 https。');}}
  if(x.effect!=='unknown'&&!String(x.position||'').trim())throw Error('实际观察请填写位置，例如“客厅窗边”。');
  const form=EXTERNAL_FORMS[x.form]?x.form:'unknown',method=['onsite','map'].includes(x.method)?x.method:(x.effect!=='unknown'?'onsite':'map');
  if(method==='map'&&x.effect!=='unknown')throw Error('只有地图资料时，请把实际观察设为尚未核实。');
  if(x.formConfirmed&&form!=='unknown'&&(method!=='onsite'||!String(x.position||'').trim()))throw Error('确认宅外形势需要填写现场观察位置。');
  return {form,method,formConfirmed:!!x.formConfirmed&&method==='onsite',observedAt:String(x.observedAt||'').slice(0,40),floorId:String(x.floorId||'').slice(0,100),roomId:String(x.roomId||'').slice(0,100),name:String(x.name).trim().slice(0,80),direction:x.direction,kind:x.kind,effect:x.effect,distance:x.distance===''||x.distance==null?null:Number(x.distance),source:String(x.source||(method==='onsite'?'本人门窗处观察':'免费地图查找')).slice(0,80),url,position:String(x.position||'').trim().slice(0,100),note:String(x.note||'').slice(0,240)};
 });
 return {status:items.length?'recorded':'missing',provider:'用户查找与观察',address,items,updatedAt:new Date().toISOString()};
}
const externalMethods={
 shade:'保持窗前无遮挡，移开高柜；工作位移向可用自然光处，补一盏定向台灯。外部楼栋不能由室内改造移除。',
 noise:'把床或长期座位安排到远离噪声的一侧，先检查窗扇是否关严。小改只调整家具与织物；更换隔音窗须另核实改造权限。',
 glare:'先调整桌面或座位角度避开反光，配可调纱帘；卧室另配遮光帘，保留可开启窗。',
 privacy:'主要窗加透光纱帘，把床和常坐位置移出正对视线；不要用高柜封住采光和通风。'
};
export function externalFindings(h){const rows=h.environment?.items||[];return rows.map((x,i)=>{
 const d=x.direction||(Number.isFinite(x.bearing)?DIRECTIONS[Math.round(x.bearing/45)%8]:'方位待核实'),current=h.environment?.status!=='stale',verified=current&&x.method!=='map'&&!!x.position&&x.effect&&x.effect!=='unknown',form=current&&x.method==='onsite'&&x.formConfirmed&&x.position?formReading[x.form]:null;
 const attention=verified&&x.effect!=='clear'||form&&x.form!=='open',kind=attention?'attention':verified&&x.effect==='clear'?'good':'unknown';
 const observation=verified?x.effect==='clear'?`${x.position}观察未见明显干扰。`:`${x.position}已记录${EXTERNAL_EFFECTS[x.effect]?.split('：')[1]||'需核对的情况'}。`:`${current?'目前只有地点或形势线索':'住宅地址已变更，原观察需重新确认'}，先到对应门窗核实遮挡、噪声、视线与风。`;
 const text=observation+(form?` ${form[0]}；${form[1]}。`:'');
 const base=verified&&x.effect!=='clear'?externalMethods[x.effect]:form?form[2]+'。':'保持开口前的通行与视野，不为未核实的线索搬动家具。';
 const action=kind==='unknown'?'站在实际使用的门窗处确认楼栋与方向，补上观察位置和时间；地图上有道路或水面，不代表它正在影响住宅。':base+(form&&verified&&x.effect!=='clear'?' '+form[2]+'。':'')+(attention?' 外部道路、河道与邻楼不属于本宅可改范围；先处理屋内开口、视线和常用位置。':'');
 return {id:`external-${i}`,direction:d,title:`${d} · ${x.name}${form?' · '+EXTERNAL_FORMS[x.form]:''}`,kind,text,action,source:x.source||h.environment?.provider||'来源待核实',url:x.url,role:roleNote(h,d),form:x.form||'unknown',observedAt:x.observedAt||''};
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
