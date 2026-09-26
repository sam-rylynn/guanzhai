import {GOALS,TIERS} from './core.js?v=124593df2a03';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const describe=section=>[['保持',section.good],['调整',section.bad],['待核实',section.unknown],['现状',section.facts]].filter(([,rows])=>rows.length).map(([label,rows])=>label+'：'+rows.map(x=>x.title+' — '+x.text).join('；')).join('\n')||'已标范围内暂无可判断项目';
export function renderComparison(selected,summaries){
 const rows=[
  ['已分析范围',h=>{const c=summaries.get(h.id).coverage;return `${c.rooms} 个标注空间 / ${c.bedrooms} 个卧室 / ${c.markers} 处物件；宅外 ${c.externalVerified} 项已核实。仅比较已标范围。`;}],
  ['居住目标',h=>h.goals.map(k=>GOALS[k]).join('、')],
  ...['外部风水','缺角','内部风水 · 八方与中宫','空间风水'].map((label,i)=>[label,h=>describe(summaries.get(h.id).sections[i])]),
  ['需要补齐的资料',h=>summaries.get(h.id).missing.map(x=>x.title).join('；')||'已填资料已核对；未标部分不作判断'],
  ['改动范围',h=>`${TIERS[h.tier].name} · ${h.budget===''||h.budget==null?'预算未定':h.budget+' 元预算上限'}`],
  ['个人参考',h=>h.birth.enabled?'已启用户主八字文化参考':'未启用']
 ];
 return `<section class="workspace"><div class="breadcrumb"><a href="#archive">我的宅档</a><span>/</span>候选比较</div><div class="page-heading"><div><div class="eyebrow">SIDE BY SIDE / 看清取舍</div><h1>好房子，也要适合你的生活。</h1><p>与完整报告采用相同判断，未知资料单独列出。</p></div><button class="btn ghost" data-action="back-archive">重新选择</button></div><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>比较维度</th>${selected.map(h=>`<th><img src="${h.floors[0].image}" alt="${esc(h.name)}户型"><h2>${esc(h.name)}</h2><button class="text-link" data-open="${h.id}">查看完整分析 ↗</button></th>`).join('')}</tr></thead><tbody>${rows.map(([name,get])=>`<tr><th scope="row">${name}</th>${selected.map(h=>`<td>${esc(get(h))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="info-box">此处比较的是已确认的图面与各自需求。目标不同的宅档需先统一目标后再讨论适配；缺少资料不会获得更高评价，也不直接生成综合排名。</div></section>`;
}
