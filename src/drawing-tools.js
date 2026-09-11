import {insideRoom} from './geometry.js?v=c8579f40cafb';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function snapPoint(p,previous,first,threshold=.016,boundary=null,walls={}){
 const out={...p};
 for(const axis of ['x','y']){const candidates=[...(walls[axis]||[]),...(previous?[previous[axis]]:[])];let best=threshold;for(const v of candidates){const d=Math.abs(v-p[axis]);if(d<best){out[axis]=v;best=d;}}}
 if(first&&Math.hypot(out.x-first.x,out.y-first.y)<threshold*1.6)return {...first};
 if(boundary?.length&&!insideRoom(out,{points:boundary})){let near=null,dist=Infinity;for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((out.x-a.x)*dx+(out.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),q={x:a.x+t*dx,y:a.y+t*dy},d=Math.hypot(out.x-q.x,out.y-q.y);if(d<dist){near=q;dist=d;}}if(dist<threshold*2)return near;}
 return out;
}
const states=new Map();
export function bindViewport(root,key,{cancel=()=>{}}={}){
 if(!root)return null;const sheet=root.querySelector('.drawing-sheet'),state=states.get(key)||{scale:1,x:0,y:0};states.set(key,state);const pts=new Map();let gesture=null,block=false;
 const apply=()=>{const w=root.clientWidth,h=root.clientHeight;state.x=clamp(state.x,w*(1-state.scale),0);state.y=clamp(state.y,h*(1-state.scale),0);sheet.style.transformOrigin='0 0';sheet.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`;sheet.dataset.zoom=state.scale;root.dataset.zoom=state.scale;};
 const zoom=(factor,cx=root.clientWidth/2,cy=root.clientHeight/2)=>{const old=state.scale,n=clamp(old*factor,1,4);state.x=cx-(cx-state.x)*n/old;state.y=cy-(cy-state.y)*n/old;state.scale=n;apply();};
 root.addEventListener('wheel',ev=>{ev.preventDefault();const r=root.getBoundingClientRect();zoom(ev.deltaY<0?1.12:1/1.12,ev.clientX-r.left,ev.clientY-r.top);},{passive:false});
 root.addEventListener('pointerdown',ev=>{if(ev.target.closest('button[data-zoom]'))return;pts.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(pts.size===2){cancel();block=true;root.dataset.gesture='true';const [a,b]=[...pts.values()],r=root.getBoundingClientRect();gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:state.scale,mid:{x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top},x:state.x,y:state.y};ev.preventDefault();ev.stopPropagation();root.setPointerCapture(ev.pointerId);}else if(state.scale>1&&!ev.target.closest('[data-select],[data-handle],[data-vertex]')&&!['boundary','polygon','scale'].includes(root.querySelector('.plan-canvas')?.dataset.tool)){cancel();block=true;root.dataset.gesture='true';gesture={pan:true,start:{x:ev.clientX,y:ev.clientY},x:state.x,y:state.y};root.setPointerCapture(ev.pointerId);ev.preventDefault();ev.stopPropagation();}},true);
 root.addEventListener('pointermove',ev=>{if(!pts.has(ev.pointerId))return;pts.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(!gesture)return;ev.preventDefault();ev.stopPropagation();if(pts.size>=2){const [a,b]=[...pts.values()],r=root.getBoundingClientRect(),n=clamp(gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/(gesture.distance||1),1,4);state.scale=n;state.x=(a.x+b.x)/2-r.left-(gesture.mid.x-gesture.x)*n/gesture.scale;state.y=(a.y+b.y)/2-r.top-(gesture.mid.y-gesture.y)*n/gesture.scale;}else if(gesture.pan){state.x=gesture.x+ev.clientX-gesture.start.x;state.y=gesture.y+ev.clientY-gesture.start.y;}apply();},true);
 const end=ev=>{const wasBlocked=block;pts.delete(ev.pointerId);if(block){ev.preventDefault();ev.stopPropagation();}if(!pts.size){gesture=null;block=false;delete root.dataset.gesture;if(wasBlocked)root.dataset.suppressUntil=String(performance.now()+150);}};
 root.addEventListener('pointerup',end,true);root.addEventListener('pointercancel',end,true);
 apply();return {zoom,reset:()=>{Object.assign(state,{scale:1,x:0,y:0});apply();},blocked:()=>block||performance.now()<Number(root.dataset.suppressUntil||0)};
}
