import {direction} from './core.js?v=b1cae4b4be94';
import {DIRECTIONS,roleOf,boundaryNotches,externalFindings} from './residence.js?v=b1cae4b4be94';
import {directionItems} from './report-data.js?v=b1cae4b4be94';
import {insideRoom} from './geometry.js?v=b1cae4b4be94';
import {CATALOG} from './catalog.js?v=b1cae4b4be94';
export const PALACES={
 北:{gua:'坎',person:'中男',meaning:'坎取水、流动与劳作之象',care:'把常用物品归位，检查用水处是否干燥，休息区减少夜间干扰'},
 东北:{gua:'艮',person:'少男',meaning:'艮取山与止，有安定、收束之意',care:'给学习和休息保留固定位置，柜体靠实墙，转角不要堆满'},
 东:{gua:'震',person:'长男',meaning:'震取雷与动，有生发、起步之意',care:'保留起身活动与出入通路，把学习、工作用品集中在固定区域'},
 东南:{gua:'巽',person:'长女',meaning:'巽取风与入，有通达、条理之意',care:'保留可用窗与桌面采光，帘布可调，不用高柜封堵窗前'},
 南:{gua:'离',person:'中女',meaning:'离取火与明，有明见、呈现之意',care:'先保留有效采光，桌面补均匀照明，镜面与屏幕避开反光'},
 西南:{gua:'坤',person:'女主人',meaning:'坤取地与承托，重在养护、归置',care:'给家务与收纳留连续操作面，重物放低，常用物品容易取放'},
 西:{gua:'兑',person:'少女',meaning:'兑取泽与悦，关联交流、表达',care:'保留家人坐下交流的位置，减少电视与谈话区域互相干扰'},
 西北:{gua:'乾',person:'男主人',meaning:'乾取天与健，关联主事、秩序',care:'把重要资料与常用物件集中收纳，长期座位靠稳，头顶不堆悬挂重物'}
};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inSector(r,f,d){let n=0,total=0;for(let y=0;y<7;y++)for(let x=0;x<7;x++){const p={x:r.x+r.w*(x+.5)/7,y:r.y+r.h*(y+.5)/7};if(!insideRoom(p,r))continue;total++;if(direction(p.x,p.y,f.north,f.bounds,f.width/f.height)===d)n++;}return total&&n/total>.12;}
export function palaceReview(h){const dirs=directionItems(h),ext=externalFindings(h),role=roleOf(h),notches=h.floors.map(f=>({f,data:boundaryNotches(f)}));return DIRECTIONS.map(d=>{
 const profile=PALACES[d],inside=dirs.filter(x=>x.direction===d),outside=ext.filter(x=>x.direction===d),cut=notches.filter(x=>x.data.items.some(z=>z.direction===d)),ready=notches.every(x=>x.data.status==='checked'),rooms=h.floors.flatMap(f=>f.rooms.filter(r=>inSector(r,f,d)).map(r=>({floorId:f.id,id:r.id,name:(h.floors.length>1?f.name+' · ':'')+r.name}))),good=[],bad=[],missing=[];
 if(ready&&!cut.length)good.push('已确认的红线在本方未见明显内凹，保留现有封闭边界。');
 if(cut.length)bad.push(`${cut.map(x=>x.f.name).join('、')}的本方红线内凹，${profile.gua}位形体不完整。先确认凹处是否为管井、结构柱或室外空间。`);
 if(!ready)missing.push('边界或八方位尚未确认');
 const match=inside.flatMap(x=>x.good),opposite=inside.flatMap(x=>x.bad);
 if(match.length)good.push(`已标${[...new Set(match)].join('、')}与本方砂水取象相合，保留操作和通行空间。`);
 if(opposite.length)bad.push(`已标${[...new Set(opposite)].join('、')}与本方砂水偏好相反。固定厨卫设施不据此迁移，先整理可动小件。`);
 for(const x of outside){if(x.kind==='good')good.push(x.text);else if(x.kind==='attention')bad.push(x.text);}
 if(!inside.length)missing.push('室内家具及设施标注不足');
 if(!outside.some(x=>x.kind!=='unknown'))missing.push('宅外尚无已核实的窗边观察');
 if(!rooms.length)missing.push('功能区在本方的覆盖需要核对');
 const conclusion=cut.length?`${d}${profile.gua}方有内凹，先核实形体，再处理相邻空间。`:outside.some(x=>x.kind==='attention')?`${d}侧已有实际干扰，优先处理窗与常用位置。`:opposite.length?`${d}方砂水取象有不合之处，先改可动项。`:ready&&inside.length?`${d}方形体可保留，按现有用途维护。`:`${d}方先保留已确认部分，补齐标注后再定家具位置。`;
 const action=cut.length?`${profile.care}。凹处内侧可用适配的低柜顺墙收纳，保留转角通行；若要采用补角摆件，可请风水师到现场核位后作民俗陈设，不把摆件当成结构修补。`:profile.care+'。移动前量家具与门窗开启净空，固定设施保留原位。';
 return {direction:d,...profile,rooms,good,bad,missing,conclusion,action,traditional:`${profile.meaning}，家庭取象对应${profile.person}。${cut.length?`本方内凹时，传统上会优先审视${profile.person}相关空间的安排；`:'本方形体与使用条件完整时，取该卦有承接之象；'}具体以相邻空间的真实用途、采光与通行为判断条件。`,relevant:role.direction===d};
 });}
export function centerReview(h){return h.floors.map(f=>{const b=f.bounds,c={x:b.x+b.w/2,y:b.y+b.h/2},box={x:b.x+b.w/3,y:b.y+b.h/3,w:b.w/3,h:b.h/3},inside=!!f.boundary&&insideRoom(c,{points:f.boundary}),rooms=f.rooms.filter(r=>insideRoom(c,r)),markers=f.markers.filter(m=>insideRoom(m,box)),wet=rooms.some(r=>['bath','kitchen'].includes(r.type)),stairs=rooms.some(r=>r.type==='stairs');
 return {floorId:f.id,name:f.name,conclusion:!f.boundary?'中宫定位待确认红线':!inside?'红线中心落在封闭边界外，不能当成可布置地面':wet?'中宫点落在厨卫用途内，先检查干燥、排风与通行':stairs?'中宫点落在楼梯范围内，优先保留上下楼通路':rooms.length?`中宫点落在${rooms.map(r=>r.name).join('、')}，按实际用途安排通行`:'中宫的功能区尚未标清',good:inside&&rooms.length&&!wet&&!stairs?'中心有已标使用空间，保留相邻房间之间的联系。':'先保留已有结构，核实中心实际用途后再列可保持项。',bad:!inside?'中部不属于封闭室内，不放柜体或摆件。':wet?'厨卫使用带来用水或油烟；是否存在潮湿异味需要现场核对。':markers.length?`中部已标${markers.map(m=>CATALOG[m.type]?.name||'物件').join('、')}，需核对绕行和开门净空。`:'中部没有家具标注，尚不能据此断定通道畅通。',action:!inside?'回图中检查外边界，不为补中宫占用室外或公共面积。':wet?'固定管线先保留，检查漏水、排风与日常干燥；储物沿边放，进出不绕行。':'保留主要通路，杂物收至边侧；不为摆件占住中心。柜体与结构不能移动时，从可动小件整理起。'};
 });}
const lines=xs=>xs.length?xs.map(x=>`<p>${e(x)}</p>`).join(''):'<p>现有资料未确认这一类问题。</p>';
export function renderPalaces(h){return `<div class="palace-review"><h3>八方位逐项解读</h3><p class="small-note">每个方位都列出现状、传统取象与改法；未提供的条件列为待补录。</p>${palaceReview(h).map(x=>`<article class="palace-card" data-palace="${x.direction}"><div class="palace-title"><h3>${x.direction} · ${x.gua}卦</h3><span>${x.person}${x.relevant?' · 你的身份':''}</span></div><p class="palace-conclusion">${e(x.conclusion)}</p>${x.rooms.length?`<p class="palace-rooms">现有空间：${e(x.rooms.map(r=>r.name).join('、'))}</p>`:''}<details ${x.bad.length||x.relevant?'open':''}><summary>查看优缺点与改法</summary><h4>优点 · 保持</h4>${lines(x.good)}<h4>缺点 · 调整</h4>${lines(x.bad)}<h4>传统取象</h4><p>${e(x.traditional)}</p><h4>具体改法</h4><p>${e(x.action)}</p>${x.missing.length?`<p class="palace-missing">待补：${e(x.missing.join('；'))}。</p>${x.missing.some(m=>m.includes('宅外'))?`<button class="text-link" data-survey-direction="${x.direction}">补录${x.direction}侧环境 →</button>`:''}${x.missing.some(m=>!m.includes('宅外'))?'<button class="text-link" data-fix-step="8">核对本方图面 →</button>':''}`:''}</details></article>`).join('')}<article class="palace-card" data-palace="中宫"><h3>中宫 · 全屋枢纽</h3><p class="small-note">中宫不套外围八方的砂水偏好，重点看房屋中部的实际用途。</p>${centerReview(h).map(x=>`<section><h4>${e(x.name)} · ${e(x.conclusion)}</h4><p><b>保持：</b>${e(x.good)}</p><p><b>留意：</b>${e(x.bad)}</p><p><b>改法：</b>${e(x.action)}</p></section>`).join('')}</article></div>`;}
