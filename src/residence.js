import {direction} from './core.js?v=58bbea2826c4';
import {insideRoom,polygonBounds,validPolygon} from './geometry.js?v=58bbea2826c4';
import {favorableReference} from './favorable.js?v=58bbea2826c4';

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
export function mapSearch(h){const q=[h.housingCity,h.district,h.community].filter(Boolean).join(' ');return 'https://uri.amap.com/search?'+new URLSearchParams({keyword:q,city:h.housingCity||'',view:'map',callnative:'0',src:'guanzhai'});}
export function normalizeEnvironment(raw,address=''){
 const items=(raw.items||[]).filter(x=>String(x.name||'').trim()).slice(0,24).map(x=>{
  if(!DIRECTIONS.includes(x.direction)||!EXTERNAL_TYPES[x.kind]||!EXTERNAL_EFFECTS[x.effect])throw Error('请为每条周边记录选择方位、类型与观察情况。');
  if(x.distance!==''&&x.distance!=null&&(!Number.isFinite(Number(x.distance))||Number(x.distance)<0||Number(x.distance)>100000))throw Error('距离请填写 0–100000 米，或留空。');
  let url=String(x.url||'').trim();if(url){try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error();url=u.href;}catch{throw Error('来源链接仅支持 http 或 https。');}}
  if(x.effect!=='unknown'&&!String(x.position||'').trim())throw Error('实际观察请填写位置，例如“客厅窗边”。');
  return {name:String(x.name).trim().slice(0,80),direction:x.direction,kind:x.kind,effect:x.effect,distance:x.distance===''||x.distance==null?null:Number(x.distance),source:String(x.source||'自行查找').slice(0,80),url,position:String(x.position||'').trim().slice(0,100),note:String(x.note||'').slice(0,240)};
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
 const d=x.direction||(Number.isFinite(x.bearing)?DIRECTIONS[Math.round(x.bearing/45)%8]:'方位待核实'),verified=h.environment?.status!=='stale'&&x.effect&&x.effect!=='unknown';
 return {id:`external-${i}`,direction:d,title:`${d} · ${x.name}`,kind:!verified?'unknown':x.effect==='clear'?'good':'attention',text:!verified?'目前只有地点线索，先到主要窗边核实遮挡、噪声和视线。':x.effect==='clear'?`${x.position}观察未见明显干扰。保持窗前开阔，不用高柜挡住这一面。`:`${x.position}已记录${EXTERNAL_EFFECTS[x.effect].split('：')[1]}。`,action:externalMethods[x.effect]||'保留开口前的通行与视野；周边条件变化后重新观察。',source:x.source||h.environment?.provider||'来源待核实',url:x.url,role:roleNote(h,d)};
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
