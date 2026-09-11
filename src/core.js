import {CATALOG, classifyMarker, CATALOG_VERSION} from './catalog.js';
import {insideRoom, roomAnchor, validPolygon} from './geometry.js';
export const GOALS = {work:'事业与工作',wealth:'财务与积累',family:'关系与家庭',study:'学习与专注',rest:'休息与安定',balance:'整体协调'};
export const ROOMS = {living:'客厅',bedroom:'卧室',study:'书房',dining:'餐厅',kitchen:'厨房',bath:'卫生间',balcony:'阳台',hall:'玄关',stairs:'楼梯',yard:'庭院',other:'其他空间'};
export const MARKERS = Object.fromEntries(Object.entries(CATALOG).map(([key,value])=>[key,value.name]));
export const TIERS = {
 large:{name:'大改',sub:'硬装与功能区重新规划',text:'毛坯 / 精装：可讨论砸墙、封拆窗、改管道与重新规划功能区；施工前核实结构条件。',hard:true,zones:true},
 medium:{name:'中改',sub:'保留硬装与功能区用途',text:'精装 / 租房：不砸墙、不封拆窗、不改管道、不随意更换功能区，只调整家具软装。',hard:false,zones:false},
 small:{name:'微调',sub:'硬装不动，功能区可重排',text:'精装 / 租房：不动任何硬装，允许在现有条件内重新规划功能区及家具软装。',hard:false,zones:true}
};
export function markerFacts(f,markers=f.markers){return markers.map(m=>({...classifyMarker(m),id:m.id,type:m.type,direction:direction(m.x,m.y,f.north,f.bounds,f.width/f.height)}));}
export function syncAttributes(h){for(const f of h.floors)f.markerAttributes=markerFacts(f);h.catalogVersion=CATALOG_VERSION;return h;}
export function normalizeHouse(h){const copy=structuredClone(h);if(!copy.schemaVersion){copy.schemaVersion=2;copy.finish='';for(const p of copy.plans||[])p.tierLabel=p.tier==='small'?'小改（旧版）':p.tier==='medium'?'中改（旧版）':'大改（旧版）';}return syncAttributes(copy);}
export const uid = ()=>globalThis.crypto.randomUUID();
export const clamp = (v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
export const normalize = n=>(Number(n)%360+360)%360;
export function direction(x,y,north=0,bounds={x:0,y:0,w:1,h:1},aspect=1) {
  const dx=(x-(bounds.x+bounds.w/2))*aspect,dy=y-(bounds.y+bounds.h/2);
  if(Math.hypot(dx,dy)<0.05*Math.min(bounds.w,bounds.h))return '中央';
  return ['北','东北','东','东南','南','西南','西','西北'][Math.round(normalize(Math.atan2(dx,-dy)*180/Math.PI-north)/45)%8];
}
export function newHouse(mode='home') {
  return {id:uid(),schemaVersion:2,finish:'',name:'',mode,type:'apartment',area:'',residents:2,goals:['balance'],budget:'3000',tier:'small',keep:'',note:'',floors:[],birth:{enabled:false,consent:false,date:'',time:'',city:'',unknown:false},revision:1,reportRevision:0,plans:[],createdAt:new Date().toISOString()};
}
export function newFloor(image,name='1 层',width=800,height=620) {
  return {id:uid(),name,image,width,height,north:0,directionConfirmed:false,confirmed:false,bounds:{x:.05,y:.05,w:.9,h:.9},rooms:[],markers:[]};
}
export function validBirth(birth,today=new Date()) {
  if(!birth.enabled)return [];
  const errors=[];
  if(!birth.consent)errors.push('请先同意在本机处理出生资料。');
  const p=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birth.date||'');
  const date=p?new Date(Date.UTC(+p[1],+p[2]-1,+p[3])):null;
  if(!p||date.toISOString().slice(0,10)!==birth.date||+p[1]<1901||date>today)errors.push('请填写 1901 年至今的有效公历生日。');
  if(!birth.city?.trim())errors.push('请填写中国大陆出生城市，以便核对经度。');
  if(!birth.unknown&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.time||''))errors.push('请填写出生时间，或选择时辰不详。');
  return errors;
}
export function validate(h) {
  const e=[];
  if(h.schemaVersion===2&&!['shell','furnished'].includes(h.finish))e.push('请选择毛坯或精装。');
  if(h.finish==='shell'&&h.tier!=='large')e.push('毛坯请选择大改，完成硬装规划。');
  if(!TIERS[h.tier])e.push('请选择可接受的方案状态。');
  if(!h.name.trim())e.push('请为这套住宅起一个名称。');
  if(!h.floors.length)e.push('请先上传户型图。');
  h.floors.forEach(f=>{
    if(!f.directionConfirmed)e.push(`${f.name}：请标注并确认东南西北。`);
    if(!f.confirmed)e.push(`${f.name}：请确认房屋范围与图面标注。`);
    for(const room of f.rooms)if(room.points&&!validPolygon(room.points))e.push(`${f.name}：房间轮廓无效，请重新勾线。`);
    if(!f.rooms.length)e.push(`${f.name}：请至少标注一个房间。`);
  });
  if(!h.goals.length)e.push('请至少选择一个居住目标。');
  return [...e,...validBirth(h.birth)];
}
export function computeBirth(birth,engine) {
  if(!birth.enabled)return null;
  const errors=validBirth(birth);if(errors.length)throw Error(errors.join(' '));
  const [y,m,d]=birth.date.split('-').map(Number),input={y,m,d,city:birth.city.trim()};
  if(!birth.unknown){const [hh,mm]=birth.time.split(':').map(Number);Object.assign(input,{hh,mm});}
  const c=engine.computeChart(input);
  // Do not expose the inherited strength heuristic as a verified 喜用神 method.
  return {pillars:c.pillars,dayMaster:c.dayMaster,solar:c.solar,boundaries:c.boundaries,unknown:birth.unknown,
    note:birth.unknown?'时辰不详：三柱仅为日期参考；节气交接日及晚子时附近可能存在差异。':'按北京时间录入，采用经度与均时差校正；23 点换日。'};
}
export function analyse(h) {
  const errors=validate(h);if(errors.length)throw Error(errors[0]);
  const findings=[];
  const add=(kind,title,text,source,floor,room,extra={})=>findings.push({id:`${floor?.id||h.id}-${findings.length}`,kind,title,text,source,floorId:floor?.id,roomId:room?.id,...extra});
  for(const f of h.floors){
    for(const r of f.rooms){
      const anchor=roomAnchor(r),orient=direction(anchor.x,anchor.y,f.north,f.bounds,f.width/f.height);
      add('fact',`${r.name} · ${orient}侧`, `按你确认的房屋范围中心与四向，这个标注区域位于${orient}。方位只用于定位，不单独判定优劣。`,'用户标注 · 相对方位',f,r);
    }
    const study=f.rooms.find(r=>r.type==='study'),bed=f.rooms.find(r=>r.type==='bedroom');
    if(study&&h.goals.some(g=>['work','study'].includes(g)))add('good','已有独立的专注空间',`${study.name}被标记为书房，可优先保留这一用途。实际隔音、桌面尺度与照明仍需使用时核实。`,'房间用途 × 你的目标',f,study);
    if(bed&&h.goals.includes('rest'))add('good','休息目标有明确的空间承接',`将${bed.name}保留为休息区域；优化方案优先在该区域内处理软装与床位。`,'房间用途 × 你的目标',f,bed);
    if(!study&&h.goals.some(g=>['work','study'].includes(g)))add('attention','工作与生活需要一处清楚的分界','尚未标注独立书房。可在现有房间内选择固定的办公位置，再核对通行和家具尺寸。','用途缺项 × 你的目标',f,f.rooms.find(r=>r.type==='living'));
    const entry=f.markers.find(m=>m.type==='door');
    if(!entry)add('unknown','入户关系待补充','尚未标注入户门，暂不判断入户与各房间的关系。','资料完整性',f);
    if(!f.markers.some(m=>m.type==='window'))add('unknown','门窗关系尚不完整','没有窗位标注，不推断实际采光、通风或窗外遮挡。','资料完整性',f);
    if(entry&&bed){
      const near=Math.hypot(entry.x-(bed.x+bed.w/2),entry.y-(bed.y+bed.h/2))<.35;
      if(near)add('attention','复核入户与卧室的视线关系','入户标记与卧室标注区域在图上较近。是否能直接看见床位取决于门洞、墙体和家具，不能仅凭中心距离确定。','图面位置 · 需核实',f,bed);
    }
    if(f.markers.some(m=>m.type==='desk')&&h.goals.some(g=>['study','work'].includes(g)))add('good','可以从已有书桌开始优化','图中已标出书桌，可在原有家具基础上做位置推演，先确认走动和开门不受影响。','家具标注 × 你的目标',f,study||f.rooms.find(r=>r.type==='living'));
  }
  add('unknown','平面图之外的条件留待核实','楼外道路、山水、楼间遮挡、真实噪声和日照未被现场核实，不参与本次优劣比较。','分析范围');
  if(!h.area)add('unknown','缺少尺度，方案先按概念位置表达','未填写面积，且标注区域不是实测尺寸。家具能否放置、通道是否足够仍需量尺。','尺寸条件');
  if(!findings.some(f=>f.kind==='good'))add('good','已建立可追溯的户型资料',`已确认 ${h.floors.length} 层的四向及空间标注，后续调整可以回到同一张图上比较。`,'已确认资料');
  return {findings,rooms:h.floors.flatMap(f=>f.rooms).length,revision:h.revision,createdAt:new Date().toISOString()};
}
const ELEMENT_STYLE={木:{colors:['#6c8169','#b6a789'],names:'苔绿与原木色',material:'木质、织物',metaphor:'生长与舒展'},火:{colors:['#ad755d','#d6b586'],names:'陶土与暖米色',material:'暖色织物、陶器',metaphor:'明亮与温度'},土:{colors:['#b69c71','#d8cfb7'],names:'砂岩与米白色',material:'陶土、棉麻',metaphor:'稳定与承托'},金:{colors:['#b6b4aa','#d6c198'],names:'月白与香槟色',material:'浅色织物、少量金属',metaphor:'秩序与清晰'},水:{colors:['#516b76','#c5ced0'],names:'烟蓝与雾灰色',material:'蓝灰织物、简洁饰物',metaphor:'流动与沉静'}};
export const palette=element=>ELEMENT_STYLE[element]||{colors:['#7d8973','#d2c4a7'],names:'鼠尾草绿与暖米色',material:'棉麻、木质',metaphor:'自然与平衡'};
export function makePlan(h,tier=h.tier,birth=null) {
  if(!TIERS[tier])throw Error('未知改动档位');
  const report=analyse(h), actions=[],moves=[],partitions=[];
  const primary=h.goals[0],isFocus=['work','study'].includes(primary), isRest=primary==='rest';
  for(const f of h.floors){
    const usable=f.rooms.filter(r=>!r.locked&&!['kitchen','bath','stairs','balcony','yard','hall'].includes(r.type)&&!(h.keep&&h.keep.includes(r.name)));
    const target=usable.find(r=>r.type===(isRest?'bedroom':isFocus?'study':'living'))||usable[0];
    if(!target)continue;
    const markType=isRest?'bed':isFocus?'desk':'sofa';
    const furniture=f.markers.find(m=>m.type===markType&&!m.locked&&!CATALOG[m.type]?.fixed&&!(h.keep&&h.keep.includes(MARKERS[m.type]))&&insideRoom(m,target));
    const where=`${f.name} · ${target.name}`;
    if(furniture){
      const to={x:target.x+target.w*.62,y:target.y+target.h*.55};
      if(Math.hypot(to.x-furniture.x,to.y-furniture.y)<.06)to.x=target.x+target.w*.3;
      if(!insideRoom(to,target))Object.assign(to,roomAnchor(target));
      moves.push({floorId:f.id,id:furniture.id,from:{x:furniture.x,y:furniture.y},to,type:markType});
      actions.push({title:`比较${MARKERS[markType]}在原区域内的新位置`,where,text:`图上箭头提供一个位置候选，保留${target.name}用途。核对家具尺寸、门窗开启和插座后，再决定是否移动。`,source:'已标注家具 × 使用目标',kind:'move'});
    }else actions.push({title:isFocus?'为专注保留一处固定位置':isRest?'让休息区的布置更集中':'整理主要活动区域',where,text:`先核对${target.name}的家具位置与尺度。当前没有可移动的对应家具标记，方案不擅自新增或移动图中物件。`,source:'房间用途 × 使用目标',kind:'layout'});
    if(tier==='small')actions.push({title:'在不动硬装的前提下重新安排功能区',where,text:`可把${isFocus?'办公与收纳':isRest?'休息与日常收纳':'交流与休闲'}明确分区，比较家具组合的两种摆法。保留厨卫、管线与已锁定区域；未确认尺寸前，不直接替换房间用途。`,source:'微调范围 · 可调整功能区用途',kind:'zone'});
    if(tier==='medium')actions.push({title:'保留现有功能区用途',where,text:'只调整家具与软装。保留墙体、门窗、管道，以及现有房间与功能区的用途。',source:'中改范围 · 功能区不换用途',kind:'constraint'});
    if(tier==='large'){
      if(!target.points)partitions.push({floorId:f.id,roomId:target.id,x:target.x+target.w*.7,y:target.y+target.h*.15,h:target.h*.7});
      actions.push({title:'探索一处分区或隔断的可能',where,text:'允许讨论砸墙、封拆窗、改管道与功能区重排，但必须先核实承重、采光、通行及管线。虚线表示待讨论分区，不是拟拆墙或施工线；不规则区域先给文字讨论，不跨轮廓画线。',source:'大改范围 · 概念分区',kind:'partition'});
    }
  }
  const style=palette(birth?.dayMaster?.element);
  actions.push({title:primary==='wealth'?'先盘点已有物品，再安排软装预算':'用一组软装建立空间的一致性',where:'可调整区域',text:`可以从已有的${style.material}中整理一组，选择${style.names}作局部点缀；保留你喜欢的物品，先试摆再决定是否添置。预算上限为 ${h.budget||'待定'} 元，不代表实际报价。`,source:birth?`日主·${birth.dayMaster.stem}${birth.dayMaster.element}的文化意象配色，不等同喜用神`:'用户目标 · 软装偏好',kind:'decor'});
  if(h.keep.trim())actions.push({title:'执行前核对你的保留清单',where:'整个住宅',text:h.keep,source:'用户保留条件 · 自由文字需逐项核对',kind:'constraint'});
  return {id:uid(),houseId:h.id,houseName:h.name,tier,tierLabel:TIERS[tier].name,finish:h.finish,constraints:{hard:TIERS[tier].hard,zones:TIERS[tier].zones},goals:[...h.goals],revision:h.revision,createdAt:new Date().toISOString(),status:'draft',actions,moves,partitions,style,floors:structuredClone(h.floors),note:'位置与分区均为概念推演；未进行墙体、尺寸或施工可行性验收。',facts:report.rooms};
}
export function metrics(h){
  const f=analyse(h).findings;
  return {rooms:h.floors.flatMap(f=>f.rooms).length,bedrooms:h.floors.flatMap(f=>f.rooms).filter(r=>r.type==='bedroom').length,
    good:f.filter(x=>x.kind==='good'),attention:f.filter(x=>x.kind==='attention'),unknown:f.filter(x=>x.kind==='unknown')};
}
