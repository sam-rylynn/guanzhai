import {insideRoom} from './geometry.js?v=b1cae4b4be94';
import {CATALOG} from './catalog.js?v=b1cae4b4be94';
export function scaleOf(f){const c=f.calibration;if(!c?.confirmed||!Number.isFinite(c.metres)||c.metres<=0||!c.a||!c.b)return null;const px=Math.hypot((c.b.x-c.a.x)*f.width,(c.b.y-c.a.y)*f.height);return px>=5?{x:f.width*c.metres/px,y:f.height*c.metres/px,mPerPixel:c.metres/px}:null;}
export function rectOf(m,f,p=m,margin=0){const s=scaleOf(f);if(!s||!m.dimensions?.confirmed)return null;const {width,depth,rotation=0}=m.dimensions;if(![width,depth].every(n=>Number.isFinite(n)&&n>0)||![0,90].includes(rotation))return null;const w=((rotation===90?depth:width)+2*margin)/s.x,h=((rotation===90?width:depth)+2*margin)/s.y;return {x:p.x-w/2,y:p.y-h/2,w,h};}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<-1e-12&&cross(c,d,a)*cross(c,d,b)<-1e-12;}
export function contained(rect,room){const ps=[{x:rect.x,y:rect.y},{x:rect.x+rect.w,y:rect.y},{x:rect.x+rect.w,y:rect.y+rect.h},{x:rect.x,y:rect.y+rect.h}];if(!ps.every(p=>insideRoom(p,room)))return false;if(!room.points)return true;
 for(let i=0;i<4;i++)for(let j=0;j<room.points.length;j++){const a=room.points[j],b=room.points[(j+1)%room.points.length];if(intersects(ps[i],ps[(i+1)%4],a,b))return false;}
 // Also reject a concave indentation wholly entering a candidate rectangle.
 if(room.points.some(p=>p.x>rect.x+1e-8&&p.x<rect.x+rect.w-1e-8&&p.y>rect.y+1e-8&&p.y<rect.y+rect.h-1e-8))return false;return true;}
export const overlaps=(a,b)=>a.x<b.x+b.w-1e-8&&a.x+a.w>b.x+1e-8&&a.y<b.y+b.h-1e-8&&a.y+a.h>b.y+1e-8;
export function geometryIssues(f){const e=[];if(!scaleOf(f))e.push('在图上标定一段实测长度');if(!f.geometryConfirmed)e.push('确认已标全净空边界、门窗开启保留区与固定障碍');if(!f.markers.some(m=>m.type==='door'))e.push('标注门洞及完整开启保留区');for(const m of f.markers)if(!rectOf(m,f)&&scaleOf(f))e.push(`填写${CATALOG[m.type]?.name||'物件'}的实测长宽与方向`);if(f.rooms.some(r=>r.origin&&!r.reviewed))e.push('复核自动识别房间');return [...new Set(e)];}
export function fits(m,p,room,f,others,clearance=0){const body=rectOf(m,f,p),envelope=rectOf(m,f,p,clearance);if(!body||!contained(body,room)||!contained(envelope,room))return false;return others.every(o=>{const r=rectOf(o,f);return r&&!overlaps(envelope,r);});}
export function solveLayout(h){
 const floors=[],moves=[];
 for(const f of h.floors){const missing=geometryIssues(f);if(missing.length){floors.push({floorId:f.id,status:'missing',missing});continue;}
 const s=scaleOf(f),clearance=Number.isFinite(f.clearance)?Math.max(.05,Math.min(1.5,f.clearance)):.3;
 const type=['work','study'].includes(h.goals[0])?'desk':h.goals[0]==='rest'?'bed':'sofa';
 const target=f.markers.find(m=>m.type===type&&!m.locked&&!CATALOG[m.type]?.fixed&&!h.keep?.includes(CATALOG[m.type].name));
 const room=target&&f.rooms.find(r=>insideRoom(target,r)&&!r.locked&&!h.keep?.includes(r.name));
 if(!room){floors.push({floorId:f.id,status:'missing',missing:[`在可调整房间内标注未锁定的${CATALOG[type].name}`]});continue;}
 const others=f.markers.filter(m=>m.id!==target.id);let tested=0,candidates=[];
 // 10 cm search grid; precise polygon containment/rectangle collision at each candidate.
 const nx=Math.ceil(room.w*s.x/.1),ny=Math.ceil(room.h*s.y/.1);if(nx*ny>60000){floors.push({floorId:f.id,status:'missing',missing:['当前房间过大，请分区后计算（最多六万个采样点）']});continue;}
 for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){const p={x:room.x+ix*.1/s.x,y:room.y+iy*.1/s.y};tested++;if(!fits(target,p,room,f,others,clearance))continue;const delta=Math.hypot((p.x-target.x)*s.x,(p.y-target.y)*s.y);if(delta<.15)continue;const edge=Math.min((p.x-room.x)*s.x,(room.x+room.w-p.x)*s.x,(p.y-room.y)*s.y,(room.y+room.h-p.y)*s.y);candidates.push({...p,score:delta+edge*.25});}
 candidates.sort((a,b)=>a.score-b.score);
 const before=fits(target,target,room,f,others,clearance),winner=candidates[0];
 if(!winner){floors.push({floorId:f.id,status:'no-solution',room:room.name,tested,clearance,before,missing:['在当前尺寸、保留区和四周留距下，未找到其他可放置位置；不代表任意角度或连续空间均无解。']});continue;}
 const to={x:winner.x,y:winner.y};moves.push({floorId:f.id,id:target.id,from:{x:target.x,y:target.y},to,type:target.type,metric:{x:+(to.x*s.x).toFixed(2),y:+(to.y*s.y).toFixed(2),distance:+Math.hypot((to.x-target.x)*s.x,(to.y-target.y)*s.y).toFixed(2)}});
 floors.push({floorId:f.id,status:'checked',room:room.name,target:CATALOG[type].name,tested,clearance,before,candidates:candidates.length,position:moves.at(-1).metric});
 }
 return {version:'metric-rect-1',step:.1,floors,moves,scope:'按已确认的净空轮廓、矩形家具外形及门窗开启保留区做几何检验；不包含高度、插座管线、承重和跨房间完整动线。四周留距是用户设定，非建筑规范认证。'};
}
