import {orient,annualStars,relation,lifeGua,eightMap} from './deep.js?v=a51e404773f7';
import {roomAnchor} from './geometry.js?v=a51e404773f7';
import {classifyMarker,CATALOG} from './catalog.js?v=a51e404773f7';
import {favorableReference} from './favorable.js?v=a51e404773f7';
import {externalFindings} from './residence.js?v=a51e404773f7';
import {insideRoom,validPolygon} from './geometry.js?v=a51e404773f7';
export const ELEMENT={北:'水',东北:'土',东:'木',东南:'木',南:'火',西南:'土',西:'金',西北:'金'},GUA={北:'坎',东北:'艮',东:'震',东南:'巽',南:'离',西南:'坤',西:'兑',西北:'乾'};
export function annotationCoverage(h){
 const rooms=h.floors.flatMap(f=>f.rooms),count=v=>v!==''&&v!=null&&Number.isInteger(Number(v))&&Number(v)>=0?Number(v):null;
 return {rooms:rooms.length,bedrooms:rooms.filter(r=>r.type==='bedroom').length,livingrooms:rooms.filter(r=>['living','dining'].includes(r.type)).length,expectedBedrooms:count(h.bedrooms),expectedLivingrooms:count(h.livingrooms),markers:h.floors.reduce((n,f)=>n+f.markers.length,0),furniture:h.floors.reduce((n,f)=>n+f.markers.filter(m=>CATALOG[m.type]&&CATALOG[m.type].group!=='门窗与结构').length,0)};
}
export function missingInputs(h,b){
 const rows=[],coverage=annotationCoverage(h);
 const add=(code,title,action,step,extra={})=>rows.push({id:[code,extra.floorId,extra.roomId,extra.environmentId].filter(Boolean).join('-'),code,title,action,step,...extra});
 if(!b)add('birth','户主出生资料未完成','住宅分析可继续；如需个人参考，再补出生资料。',0,{optional:!h.birth?.enabled});
 else if(b.unknown||b.boundaries?.length)add('birth-time',b.unknown?'出生时辰缺失':'出生时间接近分界','核对出生时间后，重新推导喜用参考。',0);
 for(const [key,actual,expected,label] of [['bedrooms',coverage.bedrooms,coverage.expectedBedrooms,'房'],['livingrooms',coverage.livingrooms,coverage.expectedLivingrooms,'厅']]){
  if(expected!==null&&actual!==expected)add('room-count-'+key,`基础资料为 ${expected} ${label}，图上已标 ${actual} ${label}`,'核对是否漏标或重复标注；几厅按客厅与餐厅合计，开放空间请核对实际划分。',8,{expected,actual});
 }
 for(const f of h.floors){
  const base={floorId:f.id};
  if(!validPolygon(f.boundary||[]))add('boundary',f.name+'的封闭边界未确认','沿封闭外墙勾画红线，排除半封阳台。',5,base);
  if(!f.extents?.confirmed||![f.extents.width,f.extents.height].every(x=>Number(x)>0))add('dimensions',f.name+'的红线尺寸未实测核对','填写横、纵最长尺寸并确认实测；目前不能给厘米级落位。',6,base);
  if(!f.rooms.length)add('rooms',f.name+'尚未标明功能区','补上实际房间；未标区域不参与分析。',8,base);
  for(const r of f.rooms)if(![r.measurements?.width,r.measurements?.depth].every(x=>Number(x)>0))add('room-dimensions',r.name+'的尺寸缺失','补填两条净尺寸，或继续保留“未知”。',8,{...base,roomId:r.id});
  if(!f.directionConfirmed)add('direction',f.name+'的八方位未确认','核对图纸上方对应的方向。',7,base);
  if(!f.markers.some(m=>m.type==='door'))add('entry',f.name+'的入户门未标','标明实际入户位置。',9,base);
  if(!f.markers.some(m=>m.type==='window'))add('window',f.name+'的窗位未标','补上可开启窗的位置。',9,base);
  const furniture=f.markers.filter(m=>CATALOG[m.type]&&CATALOG[m.type].group!=='门窗与结构');
  if(!furniture.length)add('furniture',f.name+'尚未标注家具或设备',h.finish==='shell'?'毛坯可先看边界和用途；未提供拟用家具，暂不给家具摆放结论。':'补标实际床、沙发、书桌及厨卫设施；零标注不等于没有家具或没有问题。',9,base);
  else for(const r of f.rooms){const type={bedroom:'bed',study:'desk'}[r.type];if(type&&!furniture.some(m=>m.type===type&&insideRoom(m,r)))add('room-furniture',r.name+'的主要家具未标',`核对实际${CATALOG[type].name}的位置；尚未布置可保留待定。`,9,{...base,roomId:r.id});}
 }
 const external=externalFindings(h);
 if(!external.length)add('environment','宅外周边资料待补录','查询住宅地址，核对具体楼栋；户型图看不见窗外遮挡。',3);
 else for(const x of external.filter(x=>x.kind==='unknown'))add('environment',x.title+' · 尚未现场核实',x.action,3,{environmentId:x.id,direction:x.direction});
 return rows;
}
export function directionItems(h){return h.floors.flatMap(f=>Object.keys(GUA).flatMap(d=>{const markers=f.markers.filter(m=>orient(m,f)===d),want=['北','西南','东','东南'].includes(d)?'sand':'water';const known=markers.map(m=>({...m,nature:classifyMarker(m).nature})).filter(m=>['sand','water'].includes(m.nature));if(!known.length)return [];const matches=known.filter(m=>m.nature===want),opposite=known.filter(m=>m.nature!==want);return [{floorId:f.id,direction:d,gua:GUA[d],want,good:matches.map(m=>CATALOG[m.type].name),bad:opposite.map(m=>CATALOG[m.type].name),locked:opposite.some(m=>m.locked||CATALOG[m.type].fixed),markers:known}];}));}
export function personalFit(h,b){const favored=favorableReference(b);const rooms=h.floors.flatMap(f=>f.rooms.filter(r=>['bedroom','study','living'].includes(r.type)).map(r=>({floorId:f.id,roomId:r.id,name:r.name,direction:orient(roomAnchor(r),f)})));const aligned=rooms.filter(r=>ELEMENT[r.direction]===favored.element);const gua=b&&lifeGua(b.chartYear,h.birth.sex);return {favored,rooms,aligned,gua,map:gua?eightMap(gua.gua):null};}
export const YEAR_STARS={1:'一白贪狼',2:'二黑巨门',3:'三碧禄存',4:'四绿文曲',5:'五黄廉贞',6:'六白武曲',7:'七赤破军',8:'八白左辅',9:'九紫右弼'};
export function yearAdvice(h,goals){const year=Number(h.assessmentYear)||new Date().getFullYear(),stars=annualStars(year);if(!stars)return {year,rows:[]};const picks={wealth:[9,'九紫取名望与呈现之意，先整理这处的展示与接待位置，再添一件暖色陶器或柔光台灯。'],work:[6,'六白取秩序与责任之意。用金属文件架集中正在办理的资料，桌面只留当前事项。'],study:[4,'四绿取文昌之意。把常读书籍和固定台灯放在这里；合适时再添小型木质笔筒。'],family:[9,'九紫取喜庆与相聚之意。保留共同坐下的位置，可添暖色织物与一盏柔光灯。'],rest:[2,'二黑在传统中与照料、静养相关。这一处先减少杂物和夜间强光，不为年星添水景或搬床。'],balance:[1,'一白取交流之意。保持中心通行，装饰放边柜上，不在中间堆放摆件。']};return {year,rows:goals.filter(goal=>picks[goal]).map(goal=>{const [n,action]=picks[goal],direction=Object.keys(stars).find(d=>stars[d]===n),rooms=h.floors.flatMap(f=>f.rooms.filter(r=>orient(roomAnchor(r),f)===direction).map(r=>r.name));const constrained=h.floors.flatMap(f=>f.rooms.filter(r=>orient(roomAnchor(r),f)===direction)).some(r=>['bedroom','kitchen','bath','hall'].includes(r.type));return {goal,direction,star:YEAR_STARS[n],rooms,action:constrained&&['work','study'].includes(goal)?'这一方落在休息区、厨卫或通道，保留原用途。工作资料与书桌留在现有办公区；此处只整理小件，不为年星增加工位。':action};})};}
