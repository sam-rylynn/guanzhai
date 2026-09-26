import {GOALS,normalize} from './core.js?v=124593df2a03';
import {insideRoom} from './geometry.js?v=124593df2a03';
import {favorableReference} from './favorable.js?v=124593df2a03';
import {DIRECTIONS,externalFindings,sleepingDirection} from './residence.js?v=124593df2a03';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const METHODS={
 noise:'先把已有床或常坐位试移到较安静的一侧，检查窗扇是否关严，再在实际休息或工作时段复核。',
 shade:'先撤开窗前高物，把工作面移到可用自然光处；外部楼栋不能改，无法缓解时把采光列为选房取舍。',
 glare:'先调整已有桌面或座位角度、试用现有帘布，在原来刺眼的时段复核；不以高柜封窗。',
 privacy:'先让床和常坐位避开直接对视，试用现有可调帘布，保留通风与通路。'
};

function birthFacts(b){
 const usable=b&&b.dayMaster?.element&&b.dayMaster?.stem&&b.solar?.lonSource&&b.fiveElements;
 const reference=usable?favorableReference(b):{status:b?'incomplete':'missing',element:null,reason:b?'出生资料尚不足以给个人方位':'尚未填写出生资料'};
 const complete=!!usable&&!b.unknown&&!b.boundaries?.length&&b.solar.lonSource.startsWith('city:');
 return {...reference,complete,directions:complete?sleepingDirection(b).directions:[]};
}

export function personalFit(h,b){
 const goals=[...new Set([...(h.goals||[]),...(h.improvementGoals||[])])].filter(x=>GOALS[x]);
 const ownerRooms=(h.floors||[]).flatMap(f=>(f.rooms||[]).filter(r=>r.occupantRole==='owner').map(r=>({floorId:f.id,roomId:r.id,name:r.name,type:r.type,floorName:f.name,room:r,floor:f})));
 const good=[],conflicts=[],unknown=[],birthReference=birthFacts(b);
 const add=(target,id,title,reason,action,extra={})=>target.push({id,title,reason,action,...extra});
 if(!ownerRooms.length)add(unknown,'owner-unknown','尚不能确定哪间房适合你','还没有标明户主本人实际使用的房间，不能把全宅所有床位都当作你的床。','在功能区选择“户主本人使用”，再核对实际床位或书桌。',{scope:'practical',step:8});
 const wanted=new Set();if(goals.includes('rest'))wanted.add('bed');if(goals.some(x=>['work','study'].includes(x)))wanted.add('desk');if(goals.includes('family'))wanted.add('shared');
 const observations=externalFindings(h),rawRows=h.environment?.items||[],rawById=new Map(rawRows.map((row,i)=>[`external-${row.id||i}`,row]));
 for(const owned of ownerRooms){
  const {room:r,floor:f,floorId,roomId}=owned,extra={floorId,roomId},markers=(f.markers||[]).filter(m=>insideRoom(m,r));
  const linked=observations.filter(finding=>finding.associationStatus==='linked'&&finding.floorId===floorId&&finding.roomId===roomId).map(finding=>({row:rawById.get(finding.id),finding})).filter(x=>x.row);
  const verified=linked.filter(({row,finding})=>h.environment?.status!=='stale'&&row.method==='onsite'&&row.position?.trim()&&finding?.kind!=='unknown'&&['clear',...Object.keys(METHODS)].includes(row.effect));
  if(!verified.length)add(unknown,`environment:${floorId}:${roomId}`,`${r.name}的实际环境待核实`,'尚无关联到这间房的有效门窗处观察，不能断定它安静、明亮或没有对视。','到这间房实际使用的门窗处补录光线、噪声和视线，并关联到本房间。',{...extra,scope:'practical',step:3});
  for(const {row,finding}of verified){
   const source={...extra,direction:row.direction,issueKey:`external:${finding.id}`,scope:'practical'};
   if(row.effect==='clear')add(good,`environment:${finding.id}`,`${r.name}已有可保持的窗边条件`,finding.text,'先保留窗前通行、视野与可开启范围；常用时段变化后再复核。',source);
   else add(conflicts,`environment:${finding.id}`,`${r.name}存在与你使用有关的实际干扰`,finding.text,METHODS[row.effect],source);
  }
  const beds=markers.filter(m=>m.type==='bed'),desks=markers.filter(m=>m.type==='desk');
  if(wanted.has('bed')&&(r.type==='bedroom'||beds.length)){
   if(beds.length)add(good,`rest:${floorId}:${roomId}`,`${r.name}能承接你的休息用途`,'你已将这间房标为本人使用，并标出了实际床位。','先保留休息用途；床位调整先看开门视线、窗边干扰与通道。',{...extra,scope:'practical'});
   else add(unknown,`bed:${floorId}:${roomId}`,`${r.name}还缺实际床位`,'房间用途已经明确，但不能仅凭“卧室”名称判断你的床位。','标出你实际使用的床；不要用其他家庭成员的床代替。',{...extra,scope:'practical',step:9});
  }
  if(wanted.has('desk')&&(r.type==='study'||desks.length)){
   if(desks.length)add(good,`work:${floorId}:${roomId}`,`${r.name}已有固定工作位置`,'本人使用的房间已标出书桌，可以承接你填写的工作或学习需求。','先把工作资料集中到现有桌面，核对灯光、座椅活动与家人通行。',{...extra,scope:'practical'});
   else add(unknown,`desk:${floorId}:${roomId}`,`${r.name}还缺实际书桌位置`,'用途与目标一致，但尚未标出固定桌面。','先标出现有书桌；如尚未布置，保留待定，不默认需要购买。',{...extra,scope:'practical',step:9});
  }
  if(wanted.has('shared')&&['living','dining'].includes(r.type)&&markers.some(m=>['sofa','diningTable'].includes(m.type)))add(good,`shared:${floorId}:${roomId}`,`${r.name}保留了共同活动位置`,'本人使用的公共区域已标出沙发或餐桌，能承接共同坐下的日常需求。','先保持座位之间的联系与通行，具体以家人的实际使用为准。',{...extra,scope:'practical'});
  for(const bed of beds){
   if(!birthReference.directions.length)continue;
   const known=bed.rotationConfirmed===true&&f.directionConfirmed&&Number.isFinite(f.north)&&typeof bed.rotation==='number'&&Number.isFinite(bed.rotation);
   if(!known){add(unknown,`head:${floorId}:${bed.id}`,`${r.name}的床头朝向待确认`,'已有床位，但床头旋转角或本层北向尚未确认，不能把默认角度当成实测方向。','在图上确认实际床头指向，再与个人参考对照。',{...extra,scope:'cultural',markerId:bed.id,step:9});continue;}
   const head=DIRECTIONS[Math.round(normalize(bed.rotation-f.north)/45)%8],aligned=birthReference.directions.includes(head);
   add(aligned?good:unknown,`head:${floorId}:${bed.id}`,aligned?`${r.name}床头与个人参考方向一致`:`${r.name}床头与个人参考方向不同`,`已标床头朝${head}；现有扶抑参考为${birthReference.directions.join('、')}。`,aligned?'床头靠实墙、环境安静且通行够用时，可先保留原位。':'这不等于房间不适合你。优先保留安全、安静和通行；不要只为参考方向移动床或固定设施。',{...extra,direction:head,scope:'cultural',markerId:bed.id});
  }
 }
 const anyMarker=type=>ownerRooms.some(x=>x.floor.markers.some(m=>m.type===type&&insideRoom(m,x.room)));
 if(ownerRooms.length&&wanted.has('bed')&&!anyMarker('bed')&&!unknown.some(x=>x.id.startsWith('bed:')))add(unknown,'owner-rest-position','你的实际休息位置尚未明确','已有本人使用的区域，但其中没有实际床位。','确认本人卧室及床位后，再判断休息安排。',{scope:'practical',step:8});
 if(ownerRooms.length&&wanted.has('desk')&&!anyMarker('desk')&&!unknown.some(x=>x.id.startsWith('desk:')))add(unknown,'owner-work-position','你的固定工作位置尚未明确','填写了工作或学习目标，但尚未把现有桌面关联到本人使用的区域。','先标出现有工作位置；不在家办公时，可取消这一目标。',{scope:'practical',step:8});
 if(ownerRooms.length&&wanted.has('shared')&&!good.some(x=>x.id.startsWith('shared:')))add(unknown,'owner-shared-position','共同活动的位置尚未明确','尚未在本人使用的公共区域标出实际沙发或餐桌。','补标家人常用的位置，再看交谈、取物与通行是否互相干扰。',{scope:'practical',step:9});
 if(goals.includes('wealth'))add(unknown,'wealth-scope','财务目标不能由房间朝向判定','现有标注可以帮助核对收纳与避免不必要购置，不能据此预测收入或财运。','先盘点已有物品，采购只纳入有完整报价且预算允许的项目。',{scope:'limit'});
 if(!birthReference.complete)add(unknown,'birth-reference','个人方位参考待补充',birthReference.reason,'出生资料可以选填；缺失时仍保留上述实际使用与环境判断。',{scope:'cultural',step:0});
 const practicalGood=good.filter(x=>x.scope==='practical'),practicalUnknown=unknown.filter(x=>x.scope==='practical');
 const goalSupported=practicalGood.some(x=>/^(rest|work|shared):/.test(x.id));
 const status=conflicts.length?'conflict':ownerRooms.length&&goalSupported&&!practicalUnknown.length?'suitable':'unknown';
 const conclusion=status==='conflict'?'你实际使用的房间有已核实干扰，先改善这些条件，再考虑个人方位。':status==='suitable'?'已标的本人使用区域能承接当前需求，可先保留现有安排。':'目前还不能判断这套安排是否适合你，先确认本人使用的房间及实际条件。';
 const methods=[{title:'先保留硬装与主家具',action:'把现有地板、墙面和主家具作为底色；先用已有帘布、地毯或抱枕做小面积搭配，白天与夜间各观察一次。'}, {title:birthReference.element?`配色采用${birthReference.element}的扶抑参考`:'先用中性配色',action:birthReference.element?'从原报告三套配色中选一套，与现有底色相近的颜色作大面积，另一色只放在已有小件上；采光不足时不要整屋改深色。':'先统一已有织物与收纳颜色；出生资料未齐，不给定向摆放或更换硬装的结论。'}];
 return {status,conclusion,goals,good,conflicts,unknown,ownerRooms:ownerRooms.map(({floor,room,...x})=>x),birthReference,methods};
}

export function renderPersonalFit(h,b){
 const fit=personalFit(h,b),rows=(items)=>items.map(x=>`<li><b>${esc(x.title)}</b><span>${esc(x.reason)}</span><p>${esc(x.action)}</p>${x.issueKey?`<button class="text-link" data-report-issue="${esc(x.issueKey)}">查看对应位置 →</button>`:x.step!=null?`<button class="text-link" data-fix-step="${x.step}" data-fix-floor="${esc(x.floorId||'')}" data-fix-room="${esc(x.roomId||'')}">补充这一项 →</button>`:''}</li>`).join('');
 return `<section class="report-section personal-fit-reading" data-personal-fit="${fit.status}"><h2>这套安排适合你吗？</h2><p>${esc(fit.conclusion)}</p><details id="report-personal-fit-details"><summary>查看适合、冲突与待核实的原因</summary>${fit.conflicts.length?`<h3>先处理</h3><ul class="reading-list">${rows(fit.conflicts)}</ul>`:''}${fit.good.length?`<h3>可以保持</h3><ul class="reading-list">${rows(fit.good)}</ul>`:''}${fit.unknown.length?`<details id="report-personal-fit-unknown"><summary>待核实与可选个人参考 · ${fit.unknown.length} 项</summary><ul class="reading-list">${rows(fit.unknown)}</ul></details>`:''}<details id="report-personal-fit-colors"><summary>怎样与现有配色搭配</summary>${fit.methods.map(x=>`<p><b>${esc(x.title)}</b><br>${esc(x.action)}</p>`).join('')}</details></details><small class="source-note">依据本人使用区域、已填需求和实际观察；个人方位仅沿用既有扶抑参考，不作适配评分或结果预测。</small></section>`;
}
