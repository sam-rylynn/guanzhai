// 室内物件的产品映射候选；不是已校核的师承定论。修改此表后，下次加载/编辑时重新计算。
export const CATALOG_VERSION='2026-09-11.1';
const groups={
  '门窗与结构':[['door','入户门','门','pending',true],['interiorDoor','室内门','门','pending',true],['window','窗','窗','pending',true],['partition','隔断','隔','sand',true],['column','柱体','柱','sand',true]],
  '卧室与收纳':[['bed','床','床','sand'],['bedside','床头柜','床柜','sand'],['wardrobe','衣柜','衣柜','sand'],['dresser','梳妆台','妆','sand'],['bookshelf','书柜','书柜','sand'],['cabinet','储物柜','柜','sand'],['shoeCabinet','鞋柜','鞋','sand']],
  '客餐厅与办公':[['sofa','沙发','沙','sand'],['armchair','单人椅','椅','sand'],['coffeeTable','茶几','几','sand'],['diningTable','餐桌','餐','sand'],['desk','书桌','桌','sand'],['officeChair','办公椅','办椅','sand'],['tvCabinet','电视柜','视柜','sand'],['screen','活动屏风','屏','sand']],
  '电器与设备':[['tv','电视','视','mixed'],['fridge','冰箱','冰','mixed'],['ac','空调','空','mixed',true],['washer','洗衣机','洗','mixed'],['dryer','烘干机','烘','mixed'],['dishwasher','洗碗机','洗碗','mixed',true],['stove','灶台','灶','mixed',true],['heater','热水器','热','mixed',true]],
  '用水设施':[['sink','水槽','槽','water',true],['basin','洗手盆','盆','water',true],['toilet','马桶','厕','water',true],['shower','淋浴','淋','water',true],['bathtub','浴缸','浴','water',true],['aquarium','鱼缸','缸','water'],['fountain','流水摆件','流','water']],
  '软装与陈设':[['plant','盆栽','植','pending'],['floorLamp','落地灯','灯','mixed'],['rug','地毯','毯','pending'],['curtain','窗帘','帘','pending'],['mirror','镜子','镜','pending'],['art','装饰画','画','pending'],['ornament','摆件','饰','pending']]
};
export const CATALOG=Object.fromEntries(Object.entries(groups).flatMap(([group,items])=>items.map(([key,name,glyph,nature,fixed=false])=>[key,{name,glyph,group,nature,fixed,version:CATALOG_VERSION,review:'候选映射，待师承校核',basis:nature==='sand'?'实体体量候选，需结合高度、形态与尺度':nature==='water'?'用水或蓄水设施候选，需核实实际使用状态':nature==='mixed'?'实体与运行状态并存，不直接归为单一砂水':'仅凭物件名称不足以判定砂水'}])));
export const NATURES={sand:'砂候选',water:'水候选',mixed:'复合待核实',pending:'待核实'};
export function classifyMarker(marker){const c=CATALOG[marker.type];return {version:CATALOG_VERSION,nature:c?.nature||'pending',fixed:!!c?.fixed,basis:c?.basis||'未知物件',review:c?.review||'待核实'};}
