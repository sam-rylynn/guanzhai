// Deterministic line-plan segmentation, no semantic model or remote request.
import {polygonBounds,validPolygon} from './geometry.js';
export const RECOGNITION_VERSION='line-regions-1';
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
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
 for(let seed=0;seed<seen.length;seed++){if(seen[seed]||joined[seed])continue;let head=0,tail=1,touch=false;queue[0]=seed;seen[seed]=1;const cells=[];
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);cells.push(p);if(x===0||y===0||x===w-1||y===h-1)touch=true;
 for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!seen[n]&&!joined[n]){seen[n]=1;queue[tail++]=n;}}
 if(!touch&&cells.length>=w*h*minArea&&cells.length<w*h*.85)components.push(cells);
 }
 const candidates=[];
 for(const cells of components.sort((a,b)=>b.length-a.length).slice(0,30)){
 const set=new Set(cells),edges=new Map();const key=(x,y)=>y*(w+1)+x;
 const add=(x,y,xx,yy)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(key(xx,yy));};
 for(const p of cells){const x=p%w,y=Math.floor(p/w);if(!set.has(p-w))add(x,y,x+1,y);if(x===w-1||!set.has(p+1))add(x+1,y,x+1,y+1);if(!set.has(p+w))add(x+1,y+1,x,y+1);if(x===0||!set.has(p-1))add(x,y+1,x,y);}
 let best=[];
 while(edges.size){const first=edges.keys().next().value;let cur=first,loop=[],guard=0;do{loop.push({x:cur%(w+1)/w,y:Math.floor(cur/(w+1))/h});const ns=edges.get(cur);if(!ns?.length)break;const n=ns.pop();if(!ns.length)edges.delete(cur);cur=n;}while(cur!==first&&guard++<w*h*4);if(cur===first&&loop.length>best.length)best=loop;}
 const points=best.filter((b,i)=>{const a=best[(i+best.length-1)%best.length],c=best[(i+1)%best.length];return Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))>1e-10;});
 if(points.length<=60&&validPolygon(points))candidates.push({name:`待确认空间 ${candidates.length+1}`,type:'other',...polygonBounds(points),points,origin:RECOGNITION_VERSION,reviewed:false});
 }
 return {version:RECOGNITION_VERSION,candidates,parameters:{threshold,gap},note:candidates.length?'仅为封闭线段区域候选：可能合并相通房间或误认家具，逐个核对后采用。':'未找到可靠的封闭区域。可调整断线连接长度，或手动勾线。彩色效果图、斜拍和复杂家具图暂不适用。'};
}
export async function recognizeImage(src,options={}){
 const img=new Image();img.src=src;await img.decode();const scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);return detectRegions(ctx.getImageData(0,0,c.width,c.height),options);
}
