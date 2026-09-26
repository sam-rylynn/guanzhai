import {analyse} from './core.js?v=124593df2a03';
import {polygonArea,insideRoom,roomAnchor} from './geometry.js?v=124593df2a03';
import {enrichItem} from './consultation.js?v=124593df2a03';
import {readingItem} from './report-copy.js?v=124593df2a03';
import {missingInputs,annotationCoverage,GUA} from './report-data.js?v=124593df2a03';
import {PALACES,palaceReview,centerReview} from './direction-reading.js?v=124593df2a03';
import {externalFindings,boundaryNotches,roleNote,DIRECTIONS} from './residence.js?v=124593df2a03';
import {orient} from './deep.js?v=124593df2a03';

const rules=[
 {match:'工作与生活',tags:['work','study'],action:'在现有可用区域保留固定桌面，用可移动矮柜或地毯划出办公边界；先清理桌旁通道。',impact:'日常工作与休息缺少明确切换位置，可能增加干扰；需要结合实际居住习惯核实。'},
 {match:'入户与卧室',tags:['rest','family'],action:'站在入户位置复核是否直视床位。若确有直视，先调整床位或采用可移动遮挡，并保留门扇开启和通行。',impact:'若实地确认直视，卧室隐私与安定感可能受影响；图上距离本身不能证明直冲。'},
 {match:'入户关系',tags:['family','balance'],action:'补充入户门位置与开启方向，再检查视线和通行；资料未齐前不安排挡门的屏风。',impact:'入户资料缺失，暂不能判断入口对家庭动线的影响。'},
 {match:'门窗关系',tags:['rest','work','study'],action:'补充窗位，并在常用时段核对光线和通风，再选遮光帘、纱帘或工作照明。',impact:'实际采光尚未核实，暂不能判断睡眠与专注环境。'},
 {match:'尺度',tags:['balance','wealth'],action:'先量取计划移动区域、门扇开启范围和通道，再核对家具是否可放；未知尺寸不用于下单或施工。',impact:'尺度未核实容易造成购置不合适或通行受阻，优先减少返工支出。'},
 {match:'平面图之外',tags:['rest','family'],action:'现场核实窗外遮挡、日照、噪声和周围环境，并记录观察；不凭平面图补造外部形峦判断。',impact:'这些条件会改变真实居住体验，目前不能推断其个人影响。'}
];
export function improvementItems(h){const data=analyse(h);const items=data.findings.filter(x=>['attention','unknown'].includes(x.kind)&&!x.title.includes('平面图之外')).filter(x=>!x.title.includes('工作与生活')||!h.floors.find(f=>f.id===x.floorId)?.markers.some(m=>m.type==='desk')).map(x=>{const r=rules.find(r=>x.title.includes(r.match));return {...x,tags:r?.tags||['balance'],action:r?.action||'先核实该项图面依据，再在允许改造范围内调整；现阶段资料不足，不生成确定位置。',impact:r?.impact||'这一项需要进一步核实，不能直接推断对个人气运的影响。'};});
 for(const f of h.floors){for(const r of f.rooms){
  if(r.points&&polygonArea(r.points)/(r.w*r.h)<.85)items.push({id:f.id+'-'+r.id+'-concave',floorId:f.id,roomId:r.id,kind:'attention',title:r.name+' · 内凹区域影响连续使用',source:'实际闭合轮廓 · 面积比例提示',tags:['balance','wealth'],impact:'可用范围不是完整矩形；购置家具时若按外接矩形估算，可能放不下或阻挡转角。',action:'沿真实墙线保留通路；凹槽先考虑可移动且尺寸匹配的收纳，不把外部空白当成室内面积。'});
  const focus=f.markers.filter(m=>['bed','desk','sofa'].includes(m.type)&&insideRoom(m,r)),doors=f.markers.filter(m=>['door','interiorDoor'].includes(m.type));
  if(focus.some(m=>doors.some(d=>Math.abs(d.x-m.x)<.045||Math.abs(d.y-m.y)<.045)))items.push({id:f.id+'-'+r.id+'-sight',floorId:f.id,roomId:r.id,kind:'attention',title:r.name+' · 家具与门位轴线需要复核',source:'已标门位与主要家具 · 二维轴线',tags:r.type==='bedroom'?['rest','family']:['study','work'],impact:'若现场确实存在直接视线，可能影响隐私或专注；中间墙体和遮挡尚需核对。',action:'先站在门口核实可见路径。确有直视时比较可移动家具的朝向或遮挡，保留门扇开启范围；锁定家具维持原位。'});
 }}return items.map(x=>enrichItem(h,x));
}

const section=(key,title,rows=[])=>({key,title,good:rows.filter(x=>x.kind==='good'),bad:rows.filter(x=>x.kind==='attention'),unknown:rows.filter(x=>x.kind==='unknown'),facts:rows.filter(x=>x.kind==='fact')});
// This is the shared assessment contract for the report and property comparison.
// Missing inputs are kept separate from advantages and never become a score.
export function assessmentSummary(h,b=null,{items}={}){
 const missing=missingInputs(h,b),coverage=annotationCoverage(h),external=externalFindings(h),spaceItems=items||improvementItems(h);
 const findings=[];
 const add=(sectionKey,kind,id,title,text,extra={})=>findings.push({id,section:sectionKey,kind,title,text,...extra});
 if(!external.length)add('external','unknown','external-missing','宅外资料待补充','先在免费地图查找楼栋，再到主要窗边核实遮挡、道路、噪声与视线。',{step:3});
 for(const x of external)add('external',x.kind,x.id,x.title,x.text+(x.kind==='attention'?' '+x.action:''),{direction:x.direction,role:x.role,source:x.source,url:x.url,action:x.action,floorId:x.floorId,roomId:x.roomId,markerId:x.markerId,associationStatus:x.associationStatus,reviewReason:x.reviewReason,originalLocation:x.originalLocation,observedAt:x.observedAt,distance:x.distance,layer:x.layer,step:x.kind==='unknown'?3:undefined});
 const notches=h.floors.map(f=>({f,data:boundaryNotches(f)}));
 for(const {f,data} of notches){
  if(data.status==='missing')add('corners','unknown',`corner-${f.id}-missing`,f.name+' · 边界或方位未确认','补齐封闭红线与八方位后，再判断内凹位置。',{floorId:f.id,step:5});
  else if(!data.items.length)add('corners','good',`corner-${f.id}-clear`,f.name+' · 红线未见明显内凹','保持封闭外墙边界，不把半封阳台或公共空间算入室内。',{floorId:f.id});
  for(const x of data.items)add('corners','attention',`corner-${f.id}-${x.direction}`,`${f.name} · ${x.direction}${GUA[x.direction]||''}方内凹`,`本方红线内凹。${PALACES[x.direction]?.gua||''}卦家庭取象对应${PALACES[x.direction]?.person||'相应成员'}，重点查看相邻空间的采光、动线与使用条件。先核实凹处是不是管井或室外；处理方法见本宫解读。`,{floorId:f.id,direction:x.direction,role:roleNote(h,x.direction),step:5});
 }
 const palaces=palaceReview(h),centers=centerReview(h);
 for(const x of palaces){
  const title=`${x.direction} · ${x.gua}卦`;
  for(const [key,kind] of [['good','good'],['bad','attention'],['missing','unknown']])if(x[key].length)add('internal',kind,`palace-${x.direction}-${kind}`,title,x[key].join('；'),{direction:x.direction,action:x.action});
 }
 for(const x of centers)add('internal','fact',`center-${x.floorId}`,`${x.name} · 中宫`,x.conclusion,{floorId:x.floorId,direction:'中央',action:x.action});
 // A room name alone is not evidence of a useful furnished space.
 for(const f of h.floors)for(const r of f.rooms){
  const type={bedroom:'bed',study:'desk'}[r.type];
  if(type&&f.markers.some(m=>m.type===type&&insideRoom(m,r)))add('space','good',`space-${f.id}-${r.id}-use`,`${f.name} · ${r.name} · ${orient(roomAnchor(r),f)}`,r.type==='bedroom'?'已标床位与休息用途，可先保留这一分区；是否安静、通路是否够用还需现场核对。':'已标固定书桌与专注用途，可先保留这一分区；桌椅活动范围与照明还需现场核对。',{floorId:f.id,roomId:r.id});
 }
 const seen=new Set();
 for(const x of spaceItems.map(x=>readingItem(h,x)).filter(x=>x.kind==='attention')){
  const id=[x.caseKey,x.floorId,x.roomId].join('-');if(seen.has(id))continue;seen.add(id);
  add('space','attention',id,`${x.where} · ${x.title}`,x.why,{floorId:x.floorId,roomId:x.roomId,action:x.action,caseKey:x.caseKey});
 }
 for(const x of missing.filter(x=>![0,3,5,7].includes(x.step)))add('space','unknown',x.id,x.title,x.action,x);
 const sections=[['external','外部风水'],['corners','缺角'],['internal','内部风水 · 八方与中宫'],['space','空间风水']].map(([key,title])=>section(key,title,findings.filter(x=>x.section===key)));
 const externalVerified=external.filter(x=>x.kind!=='unknown'),externalDirections=[...new Set(externalVerified.map(x=>x.direction))];
 return {version:'assessment-2026-09-26',missing,sections,findings,palaces,centers,external,notches,items:spaceItems,
  counts:{good:findings.filter(x=>x.kind==='good').length,attention:findings.filter(x=>x.kind==='attention').length,unknown:findings.filter(x=>x.kind==='unknown').length},
  coverage:{...coverage,externalRecorded:external.length,externalVerified:externalVerified.length,externalDirections,externalMissingDirections:DIRECTIONS.filter(d=>!externalDirections.includes(d)),scope:'仅依据已标注空间、物件和已核实观察；未标部分保持待核对。'}};
}
