import {validPolygon,insideRoom} from './geometry.js?v=b1cae4b4be94';
export const rectangle=r=>r.points||[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
// Split every inner edge at each outer-edge intersection. Checking each interval
// catches a region spanning a concave cutout even when all its corners are inside.
export function regionWithin(r,points){if(!validPolygon(points||[]))return false;const ps=rectangle(r),cross=(a,b)=>a.x*b.y-a.y*b.x;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],d={x:b.x-a.x,y:b.y-a.y},ts=[0,1];for(let j=0;j<points.length;j++){const c=points[j],q=points[(j+1)%points.length],v={x:q.x-c.x,y:q.y-c.y},ca={x:c.x-a.x,y:c.y-a.y},den=cross(d,v);if(Math.abs(den)>1e-10){const t=cross(ca,v)/den,u=cross(ca,d)/den;if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);}}ts.sort((a,b)=>a-b);for(let j=0;j<ts.length;j++){const t=j? (ts[j-1]+ts[j])/2:ts[j];if(!insideRoom({x:a.x+d.x*t,y:a.y+d.y*t},{points}))return false;}if(!insideRoom(b,{points}))return false;}return true;}
export function dimensionValid(v){return v==='未知'||Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=200;}
export function stageError(h,s){const f=h.floors;
 if(s===1&&!(Number(h.budget)>=0&&String(h.budget).trim()))return '请填写可接受的预算，0 元也可以。';
 if(s===2&&(!h.finish||!h.tier))return '请确认装修状态与改造范围。';
 if(s===3&&(!h.housingCity?.trim()||!h.district?.trim()||!h.community?.trim()||!(Number(h.area)>0)||!String(h.bedrooms??'').trim()||!String(h.livingrooms??'').trim()))return '请补齐城市、区域、小区（自建房可填地名）、面积和几房几厅。';
 if(s===3){for(const [key,min] of [['buildingFloor',-5],['buildingTotalFloors',1]])if(h[key]!==undefined&&h[key]!==''&&(!Number.isInteger(Number(h[key]))||Number(h[key])<min||Number(h[key])>200))return '楼层请填写有效整数，或留空待核实。';if(Number(h.buildingFloor)>0&&Number(h.buildingTotalFloors)>0&&Number(h.buildingFloor)>Number(h.buildingTotalFloors))return '所在楼层不能高于楼栋总层数。';}
 if(s===4&&!f.length)return '请上传户型图。';
 if(s===5&&f.some(x=>!validPolygon(x.boundary||[])))return '每层都需要沿封闭外墙勾画红线并闭合。';
 if(s===6&&f.some(x=>!dimensionValid(x.extents?.width)||!dimensionValid(x.extents?.height)))return '每层的横向、纵向最长尺寸请填写米数或“未知”。';
 if(s===7&&f.some(x=>!x.directionConfirmed))return '请逐层确认八方位。';
 if(s===8){for(const x of f){if(!x.rooms.length)return `${x.name} 至少标注一个功能区。`;for(const r of x.rooms){if(!r.name.trim()||!dimensionValid(r.measurements?.width)||!dimensionValid(r.measurements?.depth))return `${r.name||'功能区'} 请填写名称、尺寸或“未知”。`;if(!regionWithin(r,x.boundary))return `${r.name} 超出了红线，请调整范围；半封阳台不纳入。`;}}}
 if(s===9){for(const x of f)if(x.markers.some(m=>!insideRoom(m,{points:x.boundary})))return `${x.name} 有物件在红线外，请移入或删除。`;}
 if(s===10&&!h.summaryConfirmed)return '请核对汇总，勾选确认后生成报告。';
 return '';
}
