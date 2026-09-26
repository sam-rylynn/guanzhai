import {assessmentSummary} from './assessment.js?v=124593df2a03';
import {GOALS} from './core.js?v=124593df2a03';
import {yearAdvice} from './report-data.js?v=124593df2a03';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cents=value=>{
 if(value==null||String(value).trim()===''||!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()))return null;
 const n=Math.round(Number(value)*100);return Number.isSafeInteger(n)&&n>=0&&n<=1000000000?n:null;
};
const practicalMethods={
 noise:'先把已有床或常坐位试移到较安静的位置，检查窗扇是否关严；记录调整后实际噪声。',
 shade:'先移开窗前已有高物，把日常工作面试移到自然光较好的位置，保留可开启窗。',
 glare:'先转动已有桌面或座位避开反光，试用现有窗帘，确认常用时段是否仍刺眼。',
 privacy:'先把已有床和常坐位移出窗外直接视线，试用现有帘布；保留通风与出入。'
};
const GOODS={
 shade:{type:'task-light',title:'可调工作台灯',action:'先在实际工作面试光，确认不反射到屏幕，核对插座与线缆通路后再询价。'},
 glare:{type:'adjustable-curtain',title:'可调帘布',action:'先用现有帘布试遮光；仍不够时量窗宽高，核对可沿用的轨道，再询价。'},
 privacy:{type:'adjustable-curtain',title:'可调帘布',action:'选择能遮挡直接视线、仍可调光通风的帘布；先量窗宽高并核对现有轨道。'}
};
const needs=(row,goals)=>row.caseKey==='focus'&&goals.some(g=>['work','study'].includes(g));

export function planPolicy(h,{goals=h.improvementGoals?.length?h.improvementGoals:h.goals||[]}={}){
 const chosen=[...new Set(goals.filter(x=>GOALS[x]))],subject={...h,goals:[...new Set([...(h.goals||[]),...chosen])]},assessment=assessmentSummary(subject);
 const configured=h.planSettingsConfirmed!==false&&['small','medium','large'].includes(h.tier),limit=configured?cents(h.budget):null;
 const permissions={moveFurniture:true,reassignRooms:true,walls:false,openings:false,fixedUtilities:false,structuralIntent:configured&&h.tier==='large'&&limit>0,automaticStructuralChange:false};
 const actions=[],candidates=[],structuralIntents=[],rows=h.environment?.items||[],rawById=new Map(rows.map((row,i)=>[`external-${row.id||i}`,row]));
 const add=(stage,id,title,text,extra={})=>actions.push({id,stage,title,text,costMode:'existing',...extra});
 for(const finding of assessment.external){
  const raw=rawById.get(finding.id),room=h.floors.find(f=>f.id===finding.floorId)?.rooms.find(r=>r.id===finding.roomId);
  const observed=finding.associationStatus==='linked'&&finding.kind!=='unknown'&&raw?.method==='onsite'&&raw?.position?.trim()&&Object.hasOwn(practicalMethods,raw?.effect);
  const issueKey=`external:${finding.id}`,where={issueKey,sourceId:finding.id,floorId:room?raw.floorId:undefined,roomId:room?.id,direction:finding.direction};
  if(finding.kind==='attention')add('practical',issueKey,finding.title,observed?practicalMethods[raw.effect]:'先在实际使用的门窗处复核视线、采光、风与噪声；未发现干扰前不增加遮挡。',where);
  else if(finding.kind==='unknown')add('practical',issueKey,finding.title,finding.action,where);
  const goods=observed&&room?GOODS[raw.effect]:null;
  if(goods){
   const id=['soft',raw.floorId,raw.roomId,raw.direction,goods.type].join(':');
   if(!candidates.some(x=>x.id===id))candidates.push({id,title:goods.title,reason:finding.text,action:goods.action,...where,positions:[raw.position]});
   else{const candidate=candidates.find(x=>x.id===id);candidate.reason+=' '+finding.text;candidate.positions.push(raw.position);}
  }
  if(permissions.structuralIntent&&observed&&['shade','noise'].includes(raw.effect))structuralIntents.push({id:`structure:${finding.id}`,title:'门窗改善意向 · 先专业核验',reason:finding.text,action:'先让物业及专业人员核对外立面管理、结构、窗型、消防和产权边界；取得可行方案与完整报价前，不拆改门窗。',status:'professional-review',...where});
 }
 for(const section of assessment.sections.filter(x=>['corners','space'].includes(x.key)))for(const row of section.bad){
  const id=`${section.key}:${row.id}`,text=section.key==='corners'?'先核对凹处的真实边界，沿现有墙线整理已有物品；保留转角通行，不为补角新增摆件或占用室外空间。':row.caseKey==='sight'?'站在门口打开门，先确认是否直见床或常坐位。确有直视时，只试调已有且未锁定家具；有墙挡住就保留原位。':row.caseKey==='concave'?'先量凹处净宽与深度，用已有且尺寸合适的收纳试摆；不合适就保留通路。':row.caseKey==='focus'?'先用已有桌面集中工作资料，试用固定位置；没有合适桌面时先核对面积，不自动添置书桌。':row.action;
  add('practical',id,row.title,text,{issueKey:id,sourceId:row.id,floorId:row.floorId,roomId:row.roomId,direction:row.direction});
  if(permissions.structuralIntent&&(needs(row,chosen)||row.caseKey==='concave'))structuralIntents.push({id:`structure:${row.id}`,title:'分区调整意向 · 先专业核验',reason:row.text,action:'先用现有家具试出真实使用面积；如仍需改隔断，请专业人员核对承重、管线、消防和采光。当前不生成拆墙线。',status:'professional-review',floorId:row.floorId,roomId:row.roomId,issueKey:id});
 }
 if(!actions.length)add('practical','existing-first','先保留已标布局','先整理已有物品，核对开门与通行；没有明确问题，不为生成方案而添置东西。');
 add('personal','existing-palette','个人偏好放在第二步','在保留地板、墙面和主家具的基础上，从现有窗帘、地毯或抱枕选一组相近颜色；白天和夜间各看一次，不为配色重做硬装。');
 const year=yearAdvice(h,chosen);
 for(const row of year.rows)add('annual',`annual:${row.goal}` ,`${row.direction} · ${GOALS[row.goal]}年度参考`,`仅在该方已有可用区域整理现有陈设，保留厨卫、门窗与通道；不为${row.star}另购摆件或搬动固定设施。`,{direction:row.direction,source:`${year.year} 年 · ${row.star}传统取象`});
 const entries=new Map();for(const entry of Array.isArray(h.procurement)?h.procurement:[])if(entry&&typeof entry.candidateId==='string')entries.set(entry.candidateId,entry);
 let total=0,selectedQuotedTotal=0;
 for(const item of candidates){
  const entry=entries.get(item.id)||{},quote=cents(entry.quote),source=String(entry.source||'').trim().slice(0,500),selected=entry.selected===true;
  Object.assign(item,{selected,quote:quote==null?null:quote/100,source,status:'unselected'});
  if(selected&&quote!=null&&source)selectedQuotedTotal+=quote;
  if(limit===0)item.status='zero-budget';
  else if(limit==null)item.status='budget-missing';
  else if(quote==null||!source)item.status='unquoted';
  else if(!selected)item.status='unselected';
  else if(total+quote>limit)item.status='over-budget';
  else{item.status='included';total+=quote;}
 }
 const included=candidates.filter(x=>x.status==='included'),pendingQuotes=candidates.filter(x=>x.status==='unquoted'),excluded=candidates.filter(x=>['over-budget','zero-budget','budget-missing'].includes(x.status));
 for(const [id,entry]of entries)if(entry.selected&&!candidates.some(x=>x.id===id))excluded.push({id,title:'原采购项已无对应的已核实问题',selected:true,quote:cents(entry.quote)==null?null:cents(entry.quote)/100,source:String(entry.source||''),status:'not-applicable'});
 // Purchasing is explicit and follows no-cost practical review. A user quote is
 // never treated as a market price or a promise about installation feasibility.
 const purchaseActions=included.map(item=>({id:`purchase:${item.id}`,stage:'practical',title:`按已填报价备选：${item.title}`,text:item.action,costMode:'quoted-purchase',amount:item.quote,source:item.source,candidateId:item.id,issueKey:item.issueKey,floorId:item.floorId,roomId:item.roomId,direction:item.direction}));
 const ordered=[...actions.filter(x=>x.stage==='practical'),...purchaseActions,...actions.filter(x=>x.stage!=='practical')];
 return {version:1,goals:chosen,budget:{status:limit==null?'missing':limit===0?'zero':'set',limit:limit==null?null:limit/100,total:total/100,remaining:limit==null?null:(limit-total)/100,selectedQuotedTotal:selectedQuotedTotal/100},permissions,actions:ordered,candidates,included,pendingQuotes,excluded,structuralIntents};
}

const statusText={included:'已按填写报价纳入',unselected:'未选中，不计入合计',unquoted:'待询价，不计入合计','over-budget':'超过剩余预算，未纳入','zero-budget':'0 元方案不新增采购','budget-missing':'先填写预算，再决定是否采购','not-applicable':'原问题已变化，未纳入'};
export function renderPolicy(h,policy,{editable=true}={}){
 if(!policy&&!editable)return '<section class="report-section action-policy"><h2>预算记录</h2><p>这份旧方案未保存报价清单；保留当时结果，不按现宅重新计算。</p></section>';
 const p=policy||planPolicy(h),money=v=>Number(v).toFixed(2).replace(/\.00$/,'');
 return `<section class="report-section action-policy"><h2>预算与执行顺序</h2><p>${p.budget.status==='zero'?'本轮只整理和试摆已有物品，不新增采购。':p.budget.status==='missing'?'预算尚未填写，先整理和试摆已有物品。':`预算上限 ${esc(money(p.budget.limit))} 元；按你填写的报价，已纳入 ${esc(money(p.budget.total))} 元，剩余 ${esc(money(p.budget.remaining))} 元。`}</p>${editable?'<button class="text-link" data-action="edit-plan-settings">修改预算与范围 →</button>':''}<p class="small-note">${p.permissions.structuralIntent?'大改可记录结构意向，墙体、门窗及固定设施仍须专业核验后决定。':'保留墙体、门窗及固定设施；可调整功能区与未锁定家具。'}</p><p>先处理已核实干扰 → 再调已有家具 → 最后参考配色与年星。</p><details id="plan-policy-actions"><summary>查看执行步骤</summary><ol class="reading-list">${p.actions.map(x=>`<li><b>${esc(x.title)}</b><span>${esc(x.text)}</span></li>`).join('')}</ol></details>${p.candidates.length&&p.budget.status!=='zero'?`<details id="plan-policy-procurement"><summary>可选软装 · 已选 ${p.candidates.filter(x=>x.selected).length} 项 / 待询价 ${p.pendingQuotes.length} 项</summary><p class="small-note">填写单项完整总价及商家、报价单或链接。仅选中且金额、来源齐全的项目参与预算；不代表已下单或完成安装核验。</p>${p.candidates.map(x=>editable?`<article class="procurement-row" data-procurement-row="${esc(x.id)}"><label class="check"><input type="checkbox" data-procurement-id="${esc(x.id)}" data-procurement-field="selected" ${x.selected?'checked':''}>${esc(x.title)}</label><p>${esc(x.reason)}</p><p>${esc(x.action)}</p><div class="form-grid"><label class="field"><span>单项完整报价（元）</span><input type="number" min="0" max="10000000" step="0.01" inputmode="decimal" data-procurement-id="${esc(x.id)}" data-procurement-field="quote" value="${x.quote==null?'':esc(x.quote)}"></label><label class="field"><span>报价来源</span><input maxlength="500" data-procurement-id="${esc(x.id)}" data-procurement-field="source" value="${esc(x.source)}" placeholder="商家、报价单或链接"></label></div><p role="status">${statusText[x.status]}</p></article>`:`<article class="procurement-row"><h4>${esc(x.title)}</h4><p>${esc(x.reason)}</p><p>${x.quote==null?'当时未录入报价':'当时报价：'+esc(money(x.quote))+' 元'}${x.source?' · 来源：'+esc(x.source):''}</p><p>${statusText[x.status]}</p></article>`).join('')}${editable?'<button class="btn primary" data-action="save-procurement">保存报价并更新方案</button>':''}</details>`:''}${p.excluded.some(x=>x.status==='not-applicable')?'<p>原来选中的部分采购项已无对应问题，本轮未计入；请按当前清单重新核对。</p>':''}${p.structuralIntents.length?`<details id="plan-policy-structural"><summary>大改意向 · 须专业核验 ${p.structuralIntents.length} 项</summary>${p.structuralIntents.map(x=>`<p><b>${esc(x.title)}</b><br>${esc(x.reason)}<br>${esc(x.action)}</p>`).join('')}</details>`:''}</section>`;
}
