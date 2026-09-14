import {recognizeImage,RECOGNITION_VERSION} from './recognition.js?v=7c4f4cec418c';
import {validPolygon,polygonBounds,insideRoom,roomAnchor} from './geometry.js?v=7c4f4cec418c';
import {regionWithin} from './intake-validation.js?v=7c4f4cec418c';
import {ROOMS,uid} from './core.js?v=7c4f4cec418c';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function overlap(a,b){let union=0,both=0;const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.max(a.x+a.w,b.x+b.w)-x,h=Math.max(a.y+a.h,b.y+b.h)-y;for(let j=0;j<32;j++)for(let i=0;i<32;i++){const p={x:x+w*(i+.5)/32,y:y+h*(j+.5)/32},aa=insideRoom(p,a),bb=insideRoom(p,b);if(aa||bb)union++;if(aa&&bb)both++;}return union?both/union:0;}
// Returns a new floor, so a failed validation never partially overwrites existing work.
export function adoptRecognition(f,{indices=[],boundary=false,types={}}={}){
 const result=f.recognition;if(!result)throw Error('请先识别图纸。');
 const next=structuredClone(f),outline=boundary?result.boundary:f.boundary;
 if(!indices.length&&!boundary)throw Error('请选择要采用的红线或房间。');
 if(!validPolygon(outline||[]))throw Error('先采用并核对边界红线，或手动勾画红线后再采用房间。');
 if(boundary&&(f.rooms.some(r=>!regionWithin(r,outline))||f.markers.some(m=>!insideRoom(m,{points:outline}))))throw Error('新红线会排除已有标注。请先手动核对边界，已有房间和家具保持不变。');
 let added=0,skipped=0;
 for(const i of [...new Set(indices)]){const r=result.candidates[i];if(!r||!regionWithin(r,outline))throw Error('所选房间超出红线，请取消该项或手动修正红线。');
  if(next.rooms.some(x=>overlap(x,r)>.82)){skipped++;continue;}
  const type=ROOMS[types[i]]?types[i]:'other';next.rooms.push({...structuredClone(r),id:uid(),type,name:(type==='other'?'功能区':ROOMS[type])+' '+(next.rooms.length+1),measurements:{width:'未知',depth:'未知'},reviewed:true,locked:false});added++;
 }
 if(boundary){next.boundary=structuredClone(outline);next.bounds=polygonBounds(outline);next.extents={width:'未知',height:'未知',confirmed:false};next.geometryConfirmed=false;}
 next.confirmed=false;return {floor:next,added,skipped};
}
export async function editRecognition(f,{modal,toast,save}){
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 let selected=new Set(),useBoundary=false,gap=f.recognition?.parameters?.gap??20;
 const types={};let generation=0;
 async function run(){
  const id=++generation,controller=new AbortController();
  modal('自动识图',`<div class="recognition-status" data-recognition-status="loading" data-recognition-run="${id}" role="status" aria-live="polite"><span class="recognition-spinner" aria-hidden="true"></span><h3>正在识别这张户型图</h3><p>完成后会显示房间和外轮廓，核对后再采用。</p><small>在你的浏览器中处理，GitHub 测试站也可使用。</small></div>`,`<button class="btn ghost" data-close>取消识图</button>`);
  const dialog=$('#modal'),cancel=()=>controller.abort();dialog.addEventListener('close',cancel,{once:true});
  const current=()=>id===generation&&!controller.signal.aborted&&dialog.open&&!!dialog.querySelector(`[data-recognition-run="${id}"]`);
  try{
   const result=await recognizeImage(f.image,{gap},{signal:controller.signal});if(!current())return;
   f.recognition=result;selected=new Set();useBoundary=false;for(const key of Object.keys(types))delete types[key];show();
  }catch(err){if(!current()||err.name==='AbortError')return;
   modal('自动识图 · 未完成',`<div class="recognition-status" data-recognition-status="error" data-recognition-run="${id}" role="alert"><h3>这次没有完成识别</h3><p>${e(err.message||'请重试，或换用清晰的二维户型图。')}</p><small>你已画好的红线、房间和家具会保留。</small></div>`,`<button class="btn ghost" data-close>返回手动标注</button><button class="btn primary" id="recognition-retry">重新识别</button>`);
   $('#recognition-retry').onclick=run;
  }finally{dialog.removeEventListener('close',cancel);}
 }
 function show(){const r=f.recognition;
 modal('自动识图 · 核对后采用',`<div class="recognition-editor"><p class="hint">识别出 ${r.candidates.length} 个封闭区域。核对轮廓和用途；半封阳台不能纳入红线。</p><div class="recognition-preview" style="--recognition-aspect:${f.width/f.height}"><img src="${f.image}" alt="${e(f.name)}识图预览"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" id="recognition-overlay"></svg></div><div class="recognition-controls"><div class="recognition-settings"><label>断线连接 <select id="recognition-gap">${[[6,'少'],[12,'中'],[20,'多']].map(([v,n])=>`<option value="${v}" ${gap===v?'selected':''}>${n}</option>`).join('')}</select></label><button class="text-link" id="retry-recognition">重新识别</button></div>${r.boundary?`<label class="check"><input type="checkbox" id="recognition-boundary">采用红色外轮廓${f.boundary?'（替换现有红线）':''}</label>`:'<p class="hint">没有可靠外轮廓，请手动勾画红线。</p>'}<div class="recognition-options">${r.candidates.map((x,i)=>`<div class="recognition-row"><label class="check"><input type="checkbox" data-candidate="${i}">区域 ${i+1}</label><select data-candidate-type="${i}" aria-label="区域${i+1}用途">${Object.entries(ROOMS).map(([k,v])=>`<option value="${k}" ${k==='other'?'selected':''}>${v}</option>`).join('')}</select></div>`).join('')||'<p>没有找到可采用的房间。清晰、正向的二维线稿更适合识别；效果图请手动勾画。</p>'}</div><label class="check"><input id="recognition-reviewed" type="checkbox">已核对所选轮廓，排除了半封阳台</label><small>已有家具保留，重复区域跳过。识图不推定实测尺寸、朝向或家具种类。</small></div></div><p id="recognition-feedback" class="recognition-feedback" role="alert" hidden></p>`,`<button class="btn ghost" data-close>返回</button><button class="btn primary" id="use-candidates" ${!r.candidates.length&&!r.boundary?'disabled':''}>采用并返回</button>`);
 const draw=()=>{const point=ps=>ps.map(p=>`${p.x*1000},${p.y*1000}`).join(' ');$('#recognition-overlay').innerHTML=`${(useBoundary?r.boundary:f.boundary)?`<polygon class="recognized-boundary" points="${point(useBoundary?r.boundary:f.boundary)}"/>`:r.boundary?`<polygon class="recognized-boundary candidate" points="${point(r.boundary)}"/>`:''}${r.candidates.map((c,i)=>{const p=roomAnchor(c);return `<polygon class="recognized-region ${selected.has(i)?'chosen':''}" points="${point(c.points)}"/><text x="${p.x*1000}" y="${p.y*1000}">${i+1}</text>`;}).join('')}`;};
 all('[data-candidate]').forEach(el=>el.onchange=()=>{const i=+el.dataset.candidate;el.checked?selected.add(i):selected.delete(i);draw();});
 all('[data-candidate-type]').forEach(el=>el.onchange=()=>types[el.dataset.candidateType]=el.value);
 $('#recognition-boundary')?.addEventListener('change',ev=>{useBoundary=ev.target.checked;draw();});
 $('#retry-recognition').onclick=()=>{gap=Number($('#recognition-gap').value);return run();};
 $('#use-candidates').onclick=()=>{try{if(!$('#recognition-reviewed').checked)throw Error('先核对图面，并勾选确认。');const result=adoptRecognition(f,{indices:[...selected],boundary:useBoundary,types});save(result.floor);$('#modal').close();toast(`已采用${useBoundary?'边界红线及':''} ${result.added} 个房间${result.skipped?`，跳过 ${result.skipped} 个重复区域`:''}。尺寸和八方位请继续核对。`);}catch(err){const feedback=$('#recognition-feedback');feedback.hidden=false;feedback.textContent=err.message;}};draw();
 }
 if(f.recognition?.version===RECOGNITION_VERSION&&Array.isArray(f.recognition.candidates)&&f.recognition.candidates.every(r=>validPolygon(r.points||[]))&&(!f.recognition.boundary||validPolygon(f.recognition.boundary)))show();else await run();
}
