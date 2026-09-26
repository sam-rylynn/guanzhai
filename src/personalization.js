import {renderReport} from './report-v07.js?v=716b99049af8';
import {favorableReference} from './favorable.js?v=716b99049af8';
import {GOALS,palette} from './core.js?v=716b99049af8';
import {improvementItems} from './assessment.js?v=716b99049af8';
export {improvementItems} from './assessment.js?v=716b99049af8';
export function colorReference(h,b){const f=favorableReference(b);return {...f,label:f.method||f.status,basis:f.reason,style:palette(f.element)};}

export function selectedGoals(goals){if(!Array.isArray(goals)||!goals.length||goals.length>3||goals.some(x=>!GOALS[x])||new Set(goals).size!==goals.length)throw Error('请选择 1–3 项不同的改善方向。');return [...goals];}
export function improvementPlan(h,goals){selectedGoals(goals);return improvementItems({...h,goals:[...new Set([...h.goals,...goals])]}).map(x=>({...x,boosted:x.tags.some(g=>goals.includes(g)),emphasis:x.tags.some(g=>goals.includes(g))?`加强：围绕${x.tags.filter(g=>goals.includes(g)).map(g=>GOALS[g]).join('、')}，优先处理这一项；调整后连续记录一周使用感受，再决定是否添置。`:'基础改善：仍纳入清单，按现场核实结果推进。'})).sort((a,b)=>a.rank-b.rank||Number(b.boosted)-Number(a.boosted));}
export function personalizedReport(h,b){const items=improvementItems(h),color=colorReference(h,b),selected=h.improvementGoals||[],saved=h.improvementResult?.revision===h.revision&&h.improvementResult?.version===9?h.improvementResult:null;return renderReport(h,b,items,selected,saved);}
export const recommend=()=>`<aside class="product-recommend"><div><h3>观宅看空间，知星看自己</h3><p>到知星继续探索个人发展解读。两个产品独立保存资料，跳转不携带出生或户型信息。</p></div><a class="btn outline" href="https://zhixng.cn/app.html?from=guanzhai" target="_blank" rel="noopener noreferrer">去知星排盘与解读 ↗</a></aside>`;
