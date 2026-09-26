export const PRIMARY_STEPS=Object.freeze([4,5,7,8,10]);
const LEGACY_STEPS=Object.freeze(Array.from({length:11},(_,i)=>i));
const LABELS=['户主八字','改造预算','改造范围','住宅基本资料','上传户型图','勾画边界红线','填写最长尺寸','确认八个方位','分割功能区','标记软装位置','核对并生成'];

export function intakeSteps(h){return [...(h?.flowVersion===5?PRIMARY_STEPS:LEGACY_STEPS)];}

export function stepProgress(h,step){
 const steps=intakeSteps(h),index=steps.indexOf(step),optional=index<0;
 const title=Number.isInteger(step)?LABELS[step]:null;
 return {current:optional?null:index+1,total:steps.length,label:(optional?'选填 · ':'')+(title||'补充资料'),optional};
}

export function adjacentStep(h,step,delta){
 const steps=intakeSteps(h),index=steps.indexOf(step);
 if(index<0||![1,-1].includes(delta))return null;
 return steps[index+delta]??null;
}

export function requiredStages(h){return h?.flowVersion===5?[4,5,7,8,9,10]:LEGACY_STEPS.slice(1);}

const ROLE_LABELS=Object.freeze({father:'男主人',mother:'女主人',eldestSon:'长男',eldestDaughter:'长女',middleSon:'中男',middleDaughter:'中女',youngestSon:'少男',youngestDaughter:'少女'});

// The app may inject core.validBirth as the third argument. Importing core here
// would create a cycle because core also uses requiredStages for validation.
function defaultBirthErrors(b){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(b.date||''),date=match?new Date(Date.UTC(+match[1],+match[2]-1,+match[3])):null;
 if(!match||date.toISOString().slice(0,10)!==b.date||+match[1]<1901||date>new Date())return ['出生日期无效'];
 if(!b.city.trim())return ['出生城市缺失'];
 if(!b.unknown&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time))return ['出生时间无效'];
 return [];
}

function reusableOwner(source,validateBirth){
 const b=source?.birth;
 if(!b||b.enabled!==true||b.consent!==true||typeof b.date!=='string'||typeof b.city!=='string')return null;
 if(b.unknown!==undefined&&typeof b.unknown!=='boolean')return null;
 // Only birth input fields cross between houses. Omit cached charts, split-date
 // UI state and unrelated properties even if an old record happened to include them.
 const birth={enabled:true,consent:true,date:b.date,time:b.unknown?'':typeof b.time==='string'?b.time:'',city:b.city.trim(),unknown:b.unknown===true,sex:typeof b.sex==='string'?b.sex:''};
 try{const errors=validateBirth(structuredClone(birth));if(!Array.isArray(errors)||errors.length)return null;}catch{return null;}
 return {birth,householdRole:typeof source.householdRole==='string'?source.householdRole:''};
}

export function ownerOptions(houses,excludeId,validateBirth=defaultBirthErrors){
 const seen=new Set(),options=[];
 for(const source of Array.isArray(houses)?houses:[]){
  if(!source||typeof source.id!=='string'||!source.id||source.id===excludeId)continue;
  const owner=reusableOwner(source,validateBirth);if(!owner)continue;
  const b=owner.birth,key=JSON.stringify([b.date,b.unknown?null:b.time,b.city,b.sex,owner.householdRole]);
  if(seen.has(key))continue;seen.add(key);
  const role=Object.hasOwn(ROLE_LABELS,owner.householdRole)?ROLE_LABELS[owner.householdRole]:'未指定身份';
  options.push({id:source.id,label:`${b.date} ${b.unknown?'时辰不详':b.time} · ${b.city} · ${b.sex||'性别未填'} · ${role}`,...owner});
 }
 return options;
}

export function applyOwner(target,source,validateBirth=defaultBirthErrors){
 const owner=reusableOwner(source,validateBirth);
 if(!owner)throw Error('这份宅档没有可复用且已授权的户主资料，请重新填写。');
 if(!target||typeof target!=='object'||Array.isArray(target))throw Error('请先选择需要填写的宅档。');
 const next=structuredClone(target);next.birth=owner.birth;next.householdRole=owner.householdRole;return next;
}
