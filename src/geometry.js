export function polygonBounds(points){const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};}
export function polygonArea(points){return Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p.x*q.y-q.x*p.y;},0))/2;}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function validPolygon(ps){
 if(ps.length<3||polygonArea(ps)<.0005)return false;
 for(let i=0;i<ps.length;i++){if(Math.hypot(ps[i].x-ps[(i+1)%ps.length].x,ps[i].y-ps[(i+1)%ps.length].y)<.003)return false;
 for(let j=i+1;j<ps.length;j++){if(j===i+1||i===0&&j===ps.length-1)continue;const a=ps[i],b=ps[(i+1)%ps.length],c=ps[j],d=ps[(j+1)%ps.length];if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y)))return false;}}
 return true;
}
export function insideRoom(p,r){if(!r.points)return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;let inside=false;for(let i=0,j=r.points.length-1;i<r.points.length;j=i++){const a=r.points[i],b=r.points[j];if(Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function roomAnchor(r){const p={x:r.x+r.w/2,y:r.y+r.h/2};if(insideRoom(p,r))return p;for(let y=.15;y<1;y+=.15)for(let x=.15;x<1;x+=.15){const q={x:r.x+r.w*x,y:r.y+r.h*y};if(insideRoom(q,r))return q;}return r.points?.[0]||p;}
export function resizeRegion(r,next){const copy=structuredClone(r);if(copy.points)copy.points=copy.points.map(p=>({x:next.x+(p.x-r.x)/r.w*next.w,y:next.y+(p.y-r.y)/r.h*next.h}));return Object.assign(copy,next);}
