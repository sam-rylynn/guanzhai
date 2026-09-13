import {recognizeImage,RECOGNITION_VERSION} from './recognition.js?v=52d9643d21e1';
import {validPolygon,polygonBounds,insideRoom,roomAnchor} from './geometry.js?v=52d9643d21e1';
import {regionWithin} from './intake-validation.js?v=52d9643d21e1';
import {ROOMS,uid} from './core.js?v=52d9643d21e1';
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
 if(f.recognition?.version!==RECOGNITION_VERSION){toast('正在识别墙线与封闭区域…');f.recognition=await recognizeImage(f.image);}
 let selected=new Set(),useBoundary=false,gap=f.recognition.parameters?.gap??20;
 const types={};
 function show(){const r=f.recognition;
 modal('自动识图 · 核对后采用',`<div class="recognition-editor"><p class="hint">识别出 ${r.candidates.length} 个封闭区域。核对轮廓和用途；半封阳台不能纳入红线。</p><div class="recognition-preview" style="--recognition-aspect:${f.width/f.height}"><img src="${f.image}" alt="${e(f.name)}识图预览"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" id="recognition-overlay"></svg></div><div class="recognition-controls"><div class="recognition-settings"><label>断线连接 <select id="recognition-gap">${[[6,'少'],[12,'中'],[20,'多']].map(([v,n])=>`<option value="${v}" ${gap===v?'selected':''}>${n}</option>`).join('')}</select></label><button class="text-link" id="retry-recognition">重新识别</button></div>${r.boundary?`<label class="check"><input type="checkbox" id="recognition-boundary">采用红色外轮廓${f.boundary?'（替换现有红线）':''}</label>`:'<p class="hint">没有可靠外轮廓，请手动勾画红线。</p>'}<div class="recognition-options">${r.candidates.map((x,i)=>`<div class="recognition-row"><label class="check"><input type="checkbox" data-candidate="${i}">区域 ${i+1}</label><select data-candidate-type="${i}" aria-label="区域${i+1}用途">${Object.entries(ROOMS).map(([k,v])=>`<option value="${k}" ${k==='other'?'selected':''}>${v}</option>`).join('')}</select></div>`).join('')||'<p>没有找到可采用的房间。清晰、正向的二维线稿更适合识别；效果图请手动勾画。</p>'}</div><label class="check"><input id="recognition-reviewed" type="checkbox">已核对所选轮廓，排除了半封阳台</label><small>已有家具保留，重复区域跳过。识图不推定实测尺寸、朝向或家具种类。</small></div></div>`,`<button class="btn ghost" data-close>返回</button><button class="btn primary" id="use-candidates">采用并返回</button>`);
 const draw=()=>{const point=ps=>ps.map(p=>`${p.x*1000},${p.y*1000}`).join(' ');$('#recognition-overlay').innerHTML=`${(useBoundary?r.boundary:f.boundary)?`<polygon class="recognized-boundary" points="${point(useBoundary?r.boundary:f.boundary)}"/>`:r.boundary?`<polygon class="recognized-boundary candidate" points="${point(r.boundary)}"/>`:''}${r.candidates.map((c,i)=>{const p=roomAnchor(c);return `<polygon class="recognized-region ${selected.has(i)?'chosen':''}" points="${point(c.points)}"/><text x="${p.x*1000}" y="${p.y*1000}">${i+1}</text>`;}).join('')}`;};
 all('[data-candidate]').forEach(el=>el.onchange=()=>{const i=+el.dataset.candidate;el.checked?selected.add(i):selected.delete(i);draw();});
 all('[data-candidate-type]').forEach(el=>el.onchange=()=>types[el.dataset.candidateType]=el.value);
 $('#recognition-boundary')?.addEventListener('change',ev=>{useBoundary=ev.target.checked;draw();});
 $('#retry-recognition').onclick=async()=>{const button=$('#retry-recognition');button.disabled=true;try{gap=Number($('#recognition-gap').value);f.recognition=await recognizeImage(f.image,{gap});selected=new Set();useBoundary=false;show();}catch(err){toast(err.message);button.disabled=false;}};
 $('#use-candidates').onclick=()=>{try{if(!$('#recognition-reviewed').checked)throw Error('先核对图面，并勾选确认。');const result=adoptRecognition(f,{indices:[...selected],boundary:useBoundary,types});save(result.floor);$('#modal').close();toast(`已采用${useBoundary?'边界红线及':''} ${result.added} 个房间${result.skipped?`，跳过 ${result.skipped} 个重复区域`:''}。尺寸和八方位请继续核对。`);}catch(err){toast(err.message);}};draw();
 }show();
}
