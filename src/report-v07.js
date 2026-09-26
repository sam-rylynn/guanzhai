import {assessmentSummary} from './assessment.js?v=716b99049af8';
import {GOALS} from './core.js?v=716b99049af8';
import {favorableReference,paletteGroups} from './favorable.js?v=716b99049af8';
import {directionItems,yearAdvice} from './report-data.js?v=716b99049af8';
import {readingItem} from './report-copy.js?v=716b99049af8';
import {roleOf,roleNote,sleepingDirection,boundaryNotches} from './residence.js?v=716b99049af8';
import {reportIssues,reportOverview,renovationSummary} from './report-overview.js?v=716b99049af8';

const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fix=(row,label='去修改 →')=>`<button class="text-link" data-fix-step="${row.step}" data-fix-floor="${e(row.floorId||'')}" data-fix-room="${e(row.roomId||'')}">${e(label)}</button>`;
const issueButton=(row,label='查看位置')=>row?`<button class="rv12-issue-link" data-report-issue="${e(row.key)}" aria-label="${e(row.number+' '+label+'：'+row.title)}"><span>${e(row.number)}</span>${e(label)} →</button>`:'';
const issueFor=(issues,section,id)=>issues.find(x=>x.section===section&&x.sourceId===id);
const lines=xs=>xs.length?xs.map(x=>`<p>${e(x)}</p>`).join(''):'<p>现有资料未确认这一类问题。</p>';

function list(rows,empty,issues=[],section=''){
 return `<ul class="reading-list rv12-findings">${rows.length?rows.map(x=>`<li${x.roomId?` data-finding-room="${e(x.roomId)}"`:''}><b>${e(x.title)}</b><span>${e(x.text)}${x.role?` <em class="role-match">${e(x.role)}</em>`:''}</span>${issueButton(issueFor(issues,section,x.id))}${x.action&&x.action!==x.text&&!x.text?.includes(x.action)?`<p class="rv12-method"><b>怎么做</b>${e(x.action)}</p>`:''}</li>`).join(''):`<li class="muted">${e(empty)}</li>`}</ul>`;
}

function section(n,name,data,issues,extra=''){
 const summary=[data.good.length?`保持 ${data.good.length} 项`:'',data.bad.length?`调整 ${data.bad.length} 项`:'',data.unknown.length?`待核对 ${data.unknown.length} 项`:''].filter(Boolean).join(' · ')||'查看已标范围';
 return `<section class="report-section diagnostic-section rv12-section" data-report-section="${n}"><h2>${n} / ${name}</h2><details class="rv12-section-details" id="report-section-${n}"><summary>${e(summary)}<span>依据与方法</span></summary><div class="rv12-detail-body"><h3 class="keep-heading">优点 · 建议保持</h3>${list(data.good,'现有资料尚不足以确认这一部分的优点。',issues,data.key)}<h3 class="change-heading">缺点 · 建议修改</h3>${list(data.bad,'在已标范围内，暂未发现明确需要调整的项目。',issues,data.key)}${data.unknown.length?'<h3>待核实 · 暂不判断</h3>'+list(data.unknown,'',issues,data.key):''}${extra}</div></details></section>`;
}

function grouped(h,items){const out=[];for(const x of items.map(x=>readingItem(h,x)).filter(x=>x.kind==='attention')){const key=x.caseKey+'-'+x.floorId+'-'+x.roomId;if(!out.some(y=>y.key===key))out.push({...x,key});}return out;}

export function personalRecommendations(b){
 const f=favorableReference(b),sleep=sleepingDirection(b);
 return `<section class="report-section personal-recommendations rv12-personal"><h2>推荐配色 · 三组选一</h2><small>${f.element?'按八字扶抑参考搭配':'可先选中性配色；出生资料为选填'}</small><div class="palette-options">${paletteGroups(f.element).map(([name,cs,names],i)=>`<article class="color-option"><h3>${i+1}. ${name}</h3><div class="color-trio">${cs.map((c,k)=>`<span><i style="background:${c}"></i>${names[k]}<small>${['窗帘 / 地毯','家具','抱枕 / 小件'][k]}</small></span>`).join('')}</div></article>`).join('')}</div><div class="sleep-direction"><h3>睡觉时头的朝向</h3><b>${sleep.directions.length?e(sleep.directions.join(' 或 ')):'暂不给个人定向'}</b><p>${sleep.directions.length?'床头优先靠实墙，避开窗下和门口直视；现场条件不合适，先保留安全、安静的床位。':'先保持床头靠实墙，避开窗下和门口直视。需要个人参考时，再选填出生资料。'}</p>${!sleep.directions.length?fix({step:0},'选填出生资料 →'):''}</div></section>`;
}

function improvementPicker(h,selected,saved){
 const goals=selected.filter(k=>Object.hasOwn(GOALS,k)).slice(0,3);
 return `<section class="improvement-picker report-section rv12-picker" id="report-improvement-picker"><h2>重点改善</h2><p>选择 1–3 项集中加强，其他已发现的问题仍会给出基本改法。</p><div class="goal-grid">${Object.entries(GOALS).map(([k,v])=>`<button class="goal ${goals.includes(k)?'selected':''}" data-improve-goal="${k}" aria-pressed="${goals.includes(k)}">${v}</button>`).join('')}</div><div class="rv12-picker-actions"><small>已选 ${goals.length} / 3</small><button class="btn primary" data-action="improve-all" ${!goals.length?'disabled':''}>${h.planSettingsConfirmed===false?'确认改造范围并生成方案':'生成修改方案与图纸'} →</button></div>${saved?.planId?`<button class="text-link" ${saved.revision===h.revision?'data-action="view-improvements"':`data-plan="${e(saved.planId)}"`}>${saved.revision===h.revision?'查看已生成方案':'查看修改资料前的方案'} →</button>`:''}</section>`;
}

export function renderReport(h,b,items,selected=[],saved){
 const assessment=assessmentSummary(h,b,{items}),overview=reportOverview(h,b,assessment),issues=overview.issues;
 const {external,notches}=assessment,role=roleOf(h),[ext,corner,,space]=assessment.sections;
 return `<div class="rv12-report"><section class="rv12-overview" aria-label="住宅结论"><p class="rv12-conclusion">${e(overview.conclusion)}</p><p class="rv12-scope">${e(overview.scope)}</p>${overview.highlights.length?`<ol class="rv12-highlights">${overview.highlights.map(x=>`<li><div><small>${x.kind==='attention'?'先留意':'建议保持'} · ${e(x.number)}</small><h3>${e(x.title)}</h3>${x.section==='internal'?`<p class="rv12-highlight-text">${e(x.text.split('。')[0])}。</p>`:''}</div>${issueButton(x,x.floorId||x.roomId||x.direction?'查看位置':'查看详情')}</li>`).join('')}</ol>`:''}<div class="report-profile rv12-profile"><span>${e(renovationSummary(h))}${h.buildingFloor?` · ${e(h.buildingFloor)} 楼`:''}</span>${role.direction?`<span>${e(role.name)} · ${e(role.direction+role.gua)}方</span>`:''}<button class="text-link" data-action="focus-improvement">选择改善方向 ↓</button></div></section>
 ${improvementPicker(h,selected,saved)}
 <details class="report-reference input-review rv12-inputs" id="report-inputs"><summary>${overview.missing.length?`待补资料 · ${overview.missing.length} 项`:'已填资料 · 查看核对情况'}<span>不影响已知部分的基础结论</span></summary>${overview.missing.length?`<ol class="missing-links">${overview.missing.map(x=>`<li><div><b>${e(x.title)}</b><p>${e(x.action)}</p></div>${fix(x)}</li>`).join('')}</ol>`:'<p>已填资料已核对；结论限于已标范围。</p>'}</details>
 ${section('01','外部风水',ext,issues,'<button class="text-link" data-action="report-environment">按门窗逐面补录 →</button>'+`<small class="source-note">${external.length?'来源：'+e([...new Set(external.map(x=>x.source))].join('、')):'地图地点需要现场核对；未自动导入地图数据。'}</small>`)}
 ${section('02','缺角',corner,issues,notches.some(x=>x.data.items.length)?fix({step:5}):'')}
 <section class="report-section diagnostic-section rv12-section" data-report-section="03"><h2>03 / 内部风水</h2>${renderAssessmentPalaces(assessment,issues)}<small class="source-note">卦象为传统文化取象，不据此判断家中有无成员或人生事件。</small></section>
 ${section('04','空间风水',space,issues)}
 <details class="rv12-personal-details" id="report-personal"><summary>个人参考 · 推荐配色与睡觉头向<span>${b?'查看搭配':'选填出生资料可增加个人参考'}</span></summary>${overview.personalMissing.length?`<p class="rv12-personal-note">${overview.personalMissing.map(x=>e(x.title)).join('；')}，不影响上方住宅分析。</p>`:''}${personalRecommendations(b)}</details></div>`;
}

export function renderAdvice(h,b,saved){
 if(!saved||saved.revision!==h.revision)return '';
 const assessment=assessmentSummary(h,b,{items:saved.items}),issues=reportIssues(h,b,assessment),groups=grouped(h,saved.items),year=yearAdvice(h,saved.goals),ext=assessment.external,dirs=directionItems(h).filter(x=>x.bad.length);
 return `<div class="improvement-results rv12-advice"><div class="report-profile">加强：${saved.goals.map(x=>e(GOALS[x])).join('、')} · ${e(renovationSummary(h))}</div><section class="report-section"><h2>01 / 外部风水 · 改法</h2>${ext.length?list(ext.map(x=>({...x,text:x.kind==='unknown'?x.text:x.action})), '',issues,'external'):'<p>先从主要窗边补录周边情况。公共道路和外部楼栋不能改动；确认实际干扰后，再调整屋内座位、窗帘和照明。</p>'}</section><section class="report-section"><h2>02 / 缺角 · 改法</h2>${list(h.floors.flatMap(f=>boundaryNotches(f).items.map(x=>({id:`corner-${f.id}-${x.direction}`,title:`${f.name} · ${x.direction}方`,text:'核实红线后，凹处内侧以低矮收纳顺墙摆放，转角留给通行。结构柱、管井及产权外空间保留；不要为“补角”封堵公共区域。',role:roleNote(h,x.direction)}))),assessment.sections[1].unknown.length?'边界或方位待核对，暂不判断是否内凹。':'现有红线没有明显内凹，保留外墙与边界。',issues,'corners')}</section><section class="report-section"><h2>03 / 内部风水 · 改法</h2>${list(dirs.map(x=>({id:`palace-${x.direction}-attention`,title:`${x.direction}${x.gua}方 · ${x.bad.join('、')}`,text:x.locked?'固定设施不移动。清掉周边无用小件，先保证操作和通行；不为砂水取象迁移管线。':'先减少不必要的小件；床、沙发等主要家具按下方图纸在原房间内试摆。若实际位置更好，保留原位；不以摆件取代采光与通行。',role:roleNote(h,x.direction)})),assessment.coverage.furniture?'已标物件未触发相反取象；结论只覆盖已标范围。':'尚未标注家具与设备，暂不判断砂水分布，也不生成搬动建议。',issues,'internal')}</section><section class="report-section"><h2>04 / 空间风水 · 改法</h2>${groups.map(x=>`<article class="reading-case" data-remedy="${e(x.id)}"><h3>${e(x.where)} · ${e(x.title)}</h3>${issueButton(issueFor(issues,'space',x.key))}<p>${e(x.action)}</p>${x.tags.some(g=>saved.goals.includes(g))?`<p class="reading-boost">重点加强：${e(x.boost)}</p>`:''}</article>`).join('')||(assessment.coverage.furniture?'<p>已标范围内暂无新增调整项。下方图纸用于试摆已有家具，先核对开门和取物空间。</p>':'<p>尚未标注可移动家具，先补上实际摆放；未标部分暂不给调整结论。</p>')}</section><section class="report-section year-reading"><h2>${year.year} 年 · 所选方向加强</h2><small>九宫年星取象，适用当年立春至次年立春。</small>${year.rows.map(x=>`<article><h3>${e(GOALS[x.goal])} · ${e(x.direction)} · ${e(x.star)}</h3><p>${e(x.action)}${x.rooms.length?`对应${e(x.rooms.join('、'))}。`:''}厨卫和通道保留原用途，陈设只放在可用边柜上。</p></article>`).join('')}</section></div>`;
}

function renderAssessmentPalaces(assessment,issues){
 return `<div class="palace-review rv12-palaces" aria-label="八方位与中宫">${assessment.palaces.map(x=>{
  const issue=issues.find(i=>i.section==='internal'&&i.direction===x.direction&&i.kind==='attention')||issues.find(i=>i.section==='internal'&&i.direction===x.direction);
  return `<details class="rv12-palace" data-palace="${e(x.direction)}" id="report-palace-${e(x.direction)}"><summary><span class="rv12-palace-direction">${e(x.direction)} · ${e(x.gua)}卦</span><span class="rv12-palace-summary">${e(x.conclusion)}</span></summary><div class="rv12-detail-body"><p class="rv12-palace-person">${e(x.person)}${x.relevant?' · 对应你的身份':''}</p>${issueButton(issue)}${x.rooms.length?`<p class="palace-rooms">现有空间：${e(x.rooms.map(r=>r.name).join('、'))}</p>`:''}<h4>优点 · 保持</h4>${lines(x.good)}<h4>缺点 · 调整</h4>${lines(x.bad)}<h4>依据 · 传统取象</h4><p>${e(x.traditional)}</p><h4>具体改法</h4><p>${e(x.action)}</p>${x.missing.length?`<p class="palace-missing">待补：${e(x.missing.join('；'))}。</p>${x.missing.some(m=>m.includes('宅外'))?`<button class="text-link" data-survey-direction="${e(x.direction)}">补录${e(x.direction)}侧环境 →</button>`:''}${x.missing.some(m=>!m.includes('宅外'))?fix({step:8},'核对本方图面 →'):''}`:''}</div></details>`;
 }).join('')}<details class="rv12-palace" data-palace="中宫" id="report-palace-center"><summary><span class="rv12-palace-direction">中宫</span><span class="rv12-palace-summary">${e(assessment.centers.map(x=>`${assessment.centers.length>1?x.name+'：':''}${x.conclusion}`).join('；'))}</span></summary><div class="rv12-detail-body"><p>中宫看房屋中央的实际用途，不套外围八方砂水偏好。</p>${assessment.centers.map(x=>`<section><h4>${e(x.name)}</h4>${issueButton(issueFor(issues,'internal',`center-${x.floorId}`))}<p><b>保持：</b>${e(x.good)}</p><p><b>留意：</b>${e(x.bad)}</p><p><b>改法：</b>${e(x.action)}</p></section>`).join('')}</div></details></div>`;
}
