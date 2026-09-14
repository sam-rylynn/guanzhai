// Deterministic line-plan segmentation, no semantic model or remote request.
import {polygonBounds,validPolygon} from './geometry.js?v=7c4f4cec418c';
export const RECOGNITION_VERSION='line-regions-2';
function traceCells(cells,w,h){
 const set=new Set(cells),edges=new Map();const key=(x,y)=>y*(w+1)+x;
 const add=(x,y,xx,yy)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(key(xx,yy));};
 for(const p of cells){const x=p%w,y=Math.floor(p/w);if(!set.has(p-w))add(x,y,x+1,y);if(x===w-1||!set.has(p+1))add(x+1,y,x+1,y+1);if(!set.has(p+w))add(x+1,y+1,x,y+1);if(x===0||!set.has(p-1))add(x,y+1,x,y);}
 let best=[];
 while(edges.size){const first=edges.keys().next().value;let cur=first,loop=[],guard=0;do{loop.push({x:cur%(w+1)/w,y:Math.floor(cur/(w+1))/h});const ns=edges.get(cur);if(!ns?.length)break;const n=ns.pop();if(!ns.length)edges.delete(cur);cur=n;}while(cur!==first&&guard++<w*h*4);if(cur===first&&loop.length>best.length)best=loop;}
 return best.filter((b,i)=>{const a=best[(i+best.length-1)%best.length],c=best[(i+1)%best.length];return Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))>1e-10;});
}
export function detectRegions({data,width:w,height:h},{threshold=165,gap=20,minArea=.012}={}){
 if(w*h>1000000||w<16||h<16)throw Error('识图输入尺寸不适用');
 const dark=new Uint8Array(w*h),wall=new Uint8Array(w*h),run=Math.max(6,Math.round(Math.min(w,h)*.028));
 for(let i=0;i<dark.length;i++){const a=data[i*4+3]/255,gray=(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2])*a+255*(1-a);dark[i]=gray<threshold?1:0;}
 // Keep long horizontal/vertical strokes, not short text strokes.
 for(let y=0;y<h;y++){let start=-1;for(let x=0;x<=w;x++){if(x<w&&dark[y*w+x]){if(start<0)start=x;}else if(start>=0){if(x-start>=run)for(let k=start;k<x;k++)wall[y*w+k]=1;start=-1;}}}
 for(let x=0;x<w;x++){let start=-1;for(let y=0;y<=h;y++){if(y<h&&dark[y*w+x]){if(start<0)start=y;}else if(start>=0){if(y-start>=run)for(let k=start;k<y;k++)wall[k*w+x]=1;start=-1;}}}
 const joined=wall.slice();gap=Math.max(0,Math.min(24,Math.round(gap)));
 for(let y=0;y<h;y++){let last=-1;for(let x=0;x<w;x++)if(wall[y*w+x]){if(last>=0&&x-last<=gap+1)for(let k=last;k<=x;k++)joined[y*w+k]=1;last=x;}}
 for(let x=0;x<w;x++){let last=-1;for(let y=0;y<h;y++)if(wall[y*w+x]){if(last>=0&&y-last<=gap+1)for(let k=last;k<=y;k++)joined[k*w+x]=1;last=y;}}
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[],outside=new Uint8Array(w*h);
 for(let seed=0;seed<seen.length;seed++){if(seen[seed]||joined[seed])continue;let head=0,tail=1,touch=false;queue[0]=seed;seen[seed]=1;const cells=[];
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);cells.push(p);if(x===0||y===0||x===w-1||y===h-1)touch=true;
 for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!seen[n]&&!joined[n]){seen[n]=1;queue[tail++]=n;}}
 if(touch)for(const p of cells)outside[p]=1;
 if(!touch&&cells.length>=w*h*minArea&&cells.length<w*h*.85)components.push(cells);
 }
 const candidates=[];
 for(const cells of components.sort((a,b)=>b.length-a.length).slice(0,30)){
 const points=traceCells(cells,w,h);
 if(points.length<=60&&validPolygon(points))candidates.push({name:`待确认空间 ${candidates.length+1}`,type:'other',...polygonBounds(points),points,origin:RECOGNITION_VERSION,reviewed:false});
 }
 const lines=(axis)=>{const size=axis==='x'?w:h,span=axis==='x'?h:w,found=[];for(let a=0;a<size;a++){let count=0;for(let b=0;b<span;b++)count+=wall[axis==='x'?b*w+a:a*w+b];if(count>span*.18)found.push(a);}const groups=[];for(const a of found){const last=groups.at(-1);if(last&&a-last.at(-1)<=2)last.push(a);else groups.push([a]);}return groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length/size);};
 // Largest enclosed mass plus its wall strokes is a boundary candidate, never an automatic red line.
 const solidSeen=new Uint8Array(w*h);let largest=[];
 for(let seed=0;seed<w*h;seed++){if(outside[seed]||solidSeen[seed])continue;let head=0,tail=1;queue[0]=seed;solidSeen[seed]=1;const cells=[];while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);cells.push(p);for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!outside[n]&&!solidSeen[n]){solidSeen[n]=1;queue[tail++]=n;}}if(cells.length>largest.length)largest=cells;}
 const outline=candidates.length&&largest.length>w*h*.05&&largest.length<w*h*.98?traceCells(largest,w,h):[];
 const boundary=outline.length<=120&&validPolygon(outline)?outline:null;
 return {version:RECOGNITION_VERSION,boundary,candidates,walls:{x:lines('x'),y:lines('y')},parameters:{threshold,gap},note:candidates.length?'仅为封闭线段区域候选：可能合并相通房间或误认家具，逐个核对后采用。':'未找到可靠的封闭区域。可调整断线连接长度，或手动勾线。彩色效果图、斜拍和复杂家具图暂不适用。'};
}
const canceled=()=>Object.assign(Error('已取消识图。'),{name:'AbortError'});
export function loadRecognitionImage(src,{signal,timeoutMs=12000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(canceled());return;}
  const img=new Image();let timer,done=false;
  const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;signal?.removeEventListener('abort',abort);if(err){img.removeAttribute('src');reject(err);}else resolve(img);};
  const abort=()=>finish(canceled());
  img.onload=()=>finish(img.naturalWidth&&img.naturalHeight?null:Error('这张图片没有可读取的图面，请重新上传 JPG 或 PNG 户型图。'));
  img.onerror=()=>finish(Error('未能读取这张户型图。请返回检查底图是否显示，或重新上传 JPG / PNG 后重试。'));
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>finish(Error('读取户型图超时。请检查网络或重新上传图片，再点重试。')),timeoutMs);
  if(typeof src!=='string'||!src.trim()){finish(Error('没有可读取的户型图，请先上传图片。'));return;}
  img.src=src;
 });
}
async function runDetection(data,options,{signal,timeoutMs=12000}={}){
 if(signal?.aborted)throw canceled();
 if(typeof Worker==='function'){
  try{return await new Promise((resolve,reject)=>{
   let worker,timer,done=false;
   const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();err?reject(err):resolve(result);};
   const abort=()=>finish(canceled());
   try{worker=new Worker(new URL('./recognition-worker.js?v=7c4f4cec418c',import.meta.url),{type:'module'});}catch(err){finish(Object.assign(Error('当前浏览器未启用识图线程。'),{code:'worker-unavailable'}));return;}
   worker.onmessage=ev=>ev.data.error?finish(Error(ev.data.error)):finish(null,ev.data.result);
   worker.onerror=ev=>{ev.preventDefault();finish(Object.assign(Error('识图线程未能加载。'),{code:'worker-unavailable'}));};
   signal?.addEventListener('abort',abort,{once:true});
   timer=setTimeout(()=>finish(Error('这张图识别时间过长，已停止处理。请换用清晰的二维户型线稿，或手动勾画。')),timeoutMs);
   // Keep the original pixel buffer available for browsers that block module workers.
   try{worker.postMessage({image:{data:data.data,width:data.width,height:data.height},options});}catch(err){finish(Object.assign(Error('当前浏览器无法启动识图线程。'),{code:'worker-unavailable'}));}
  });}catch(err){if(err.code!=='worker-unavailable')throw err;}
 }
 // Bounded compatibility path; yield first so the loading panel is visible.
 await new Promise(resolve=>setTimeout(resolve,40));
 if(signal?.aborted)throw canceled();
 return detectRegions(data,options);
}
export async function recognizeImage(src,options={},runtime={}){
 const img=await loadRecognitionImage(src,{signal:runtime.signal,timeoutMs:runtime.imageTimeoutMs});
 if(runtime.signal?.aborted)throw canceled();
 const scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);
 if(c.width<16||c.height<16)throw Error('图纸过窄或过小，请裁去多余空白后重新上传清楚的户型图。');
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('当前浏览器无法读取图面，请在系统浏览器中打开后重试。');
 let pixels;try{ctx.drawImage(img,0,0,c.width,c.height);pixels=ctx.getImageData(0,0,c.width,c.height);}catch{throw Error('无法读取图面像素，请重新上传本机保存的 JPG 或 PNG 户型图。');}
 return runDetection(pixels,options,{signal:runtime.signal,timeoutMs:runtime.workerTimeoutMs});
}
