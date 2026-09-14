import {renderReport} from './report-v07.js?v=11c9ab943438';
import {favorableReference} from './favorable.js?v=11c9ab943438';
import {enrichItem} from './consultation.js?v=11c9ab943438';
import {polygonArea,insideRoom} from './geometry.js?v=11c9ab943438';
import {analyse,GOALS,palette} from './core.js?v=11c9ab943438';
export function colorReference(h,b){const f=favorableReference(b);return {...f,label:f.method||f.status,basis:f.reason,style:palette(f.element)};}

const rules=[
 {match:'工作与生活',tags:['work','study'],action:'在现有可用区域保留固定桌面，用可移动矮柜或地毯划出办公边界；先清理桌旁通道。',impact:'日常工作与休息缺少明确切换位置，可能增加干扰；需要结合实际居住习惯核实。'},
 {match:'入户与卧室',tags:['rest','family'],action:'站在入户位置复核是否直视床位。若确有直视，先调整床位或采用可移动遮挡，并保留门扇开启和通行。',impact:'若实地确认直视，卧室隐私与安定感可能受影响；图上距离本身不能证明直冲。'},
 {match:'入户关系',tags:['family','balance'],action:'补充入户门位置与开启方向，再检查视线和通行；资料未齐前不安排挡门的屏风。',impact:'入户资料缺失，暂不能判断入口对家庭动线的影响。'},
 {match:'门窗关系',tags:['rest','work','study'],action:'补充窗位，并在常用时段核对光线和通风，再选遮光帘、纱帘或工作照明。',impact:'实际采光尚未核实，暂不能判断睡眠与专注环境。'},
 {match:'尺度',tags:['balance','wealth'],action:'先量取计划移动区域、门扇开启范围和通道，再核对家具是否可放；未知尺寸不用于下单或施工。',impact:'尺度未核实容易造成购置不合适或通行受阻，优先减少返工支出。'},
 {match:'平面图之外',tags:['rest','family'],action:'现场核实窗外遮挡、日照、噪声和周围环境，并记录观察；不凭平面图补造外部形峦判断。',impact:'这些条件会改变真实居住体验，目前不能推断其个人影响。'}
];
export function improvementItems(h){const data=analyse({...h,goals:Object.keys(GOALS)});const items=data.findings.filter(x=>['attention','unknown'].includes(x.kind)).map(x=>{const r=rules.find(r=>x.title.includes(r.match));return {...x,tags:r?.tags||['balance'],action:r?.action||'先核实该项图面依据，再在允许改造范围内调整；现阶段资料不足，不生成确定位置。',impact:r?.impact||'这一项需要进一步核实，不能直接推断对个人气运的影响。'};});
 for(const f of h.floors){for(const r of f.rooms){
  if(r.points&&polygonArea(r.points)/(r.w*r.h)<.85)items.push({id:f.id+'-'+r.id+'-concave',floorId:f.id,roomId:r.id,kind:'attention',title:r.name+' · 内凹区域影响连续使用',source:'实际闭合轮廓 · 面积比例提示',tags:['balance','wealth'],impact:'可用范围不是完整矩形；购置家具时若按外接矩形估算，可能放不下或阻挡转角。',action:'沿真实墙线保留通路；凹槽先考虑可移动且尺寸匹配的收纳，不把外部空白当成室内面积。'});
  const focus=f.markers.filter(m=>['bed','desk','sofa'].includes(m.type)&&insideRoom(m,r)),doors=f.markers.filter(m=>m.type==='door');
  if(focus.some(m=>doors.some(d=>Math.abs(d.x-m.x)<.045||Math.abs(d.y-m.y)<.045)))items.push({id:f.id+'-'+r.id+'-sight',floorId:f.id,roomId:r.id,kind:'attention',title:r.name+' · 家具与门位轴线需要复核',source:'已标门位与主要家具 · 二维轴线',tags:r.type==='bedroom'?['rest','family']:['study','work'],impact:'若现场确实存在直接视线，可能影响隐私或专注；中间墙体和遮挡尚需核对。',action:'先站在门口核实可见路径。确有直视时比较可移动家具的朝向或遮挡，保留门扇开启范围；锁定家具维持原位。'});
 }}return items.map(x=>enrichItem(h,x));
}
export function selectedGoals(goals){if(!Array.isArray(goals)||!goals.length||goals.length>3||goals.some(x=>!GOALS[x])||new Set(goals).size!==goals.length)throw Error('请选择 1–3 项不同的改善方向。');return [...goals];}
export function improvementPlan(h,goals){selectedGoals(goals);return improvementItems(h).map(x=>({...x,boosted:x.tags.some(g=>goals.includes(g)),emphasis:x.tags.some(g=>goals.includes(g))?`加强：围绕${x.tags.filter(g=>goals.includes(g)).map(g=>GOALS[g]).join('、')}，优先处理这一项；调整后连续记录一周使用感受，再决定是否添置。`:'基础改善：仍纳入清单，按现场核实结果推进。'})).sort((a,b)=>a.rank-b.rank||Number(b.boosted)-Number(a.boosted));}
export function personalizedReport(h,b){const items=improvementItems(h),color=colorReference(h,b),selected=h.improvementGoals||[],saved=h.improvementResult?.revision===h.revision&&h.improvementResult?.version===9?h.improvementResult:null;return renderReport(h,b,items,selected,saved);}
export const recommend=()=>`<aside class="product-recommend"><div><h3>观宅看空间，知星看自己</h3><p>到知星继续探索个人发展解读。两个产品独立保存资料，跳转不携带出生或户型信息。</p></div><a class="btn outline" href="https://zhixng.cn/app.html?from=guanzhai" target="_blank" rel="noopener noreferrer">去知星排盘与解读 ↗</a></aside>`;
