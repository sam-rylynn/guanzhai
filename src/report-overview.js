import {assessmentSummary} from './assessment.js?v=124593df2a03';

const PREFIX={external:'外',corners:'角',internal:'内',space:'空'};
const DEFAULT_STEP={external:3,corners:5,internal:9,space:8};
const hasValue=value=>value!==''&&value!==null&&value!==undefined;

// Keys come from the shared assessment, so locating a finding and explaining its
// remedy use the same identity. Numbers label this report snapshot, not severity.
export function reportIssues(h,b=null,assessment=assessmentSummary(h,b)){
 const counts={},numbers=new Map();
 for(const row of [...assessment.findings].sort((a,b)=>`${a.section}:${a.id}`.localeCompare(`${b.section}:${b.id}`))){
  numbers.set(`${row.section}:${row.id}`,`${PREFIX[row.section]||'项'}${String(counts[row.section]=(counts[row.section]||0)+1).padStart(2,'0')}`);
 }
 return assessment.findings.map(row=>({
  key:`${row.section}:${row.id}`,
  number:numbers.get(`${row.section}:${row.id}`),
  sourceId:row.id,section:row.section,title:row.title,text:row.text,kind:row.kind,
  floorId:row.floorId,roomId:row.roomId,markerId:row.markerId,direction:row.direction,
  step:Number.isInteger(row.step)?row.step:DEFAULT_STEP[row.section],
  action:row.action,source:row.source,caseKey:row.caseKey
 }));
}

export function reportOverview(h,b=null,assessment=assessmentSummary(h,b)){
 const issues=reportIssues(h,b,assessment);
 const cornerDirections=new Set(issues.filter(x=>x.section==='corners'&&x.kind==='attention').map(x=>x.direction));
 const externalFacts=new Set(assessment.external.filter(x=>x.kind==='attention'&&issues.some(i=>i.section==='external'&&i.sourceId===x.id)).map(x=>`${x.direction}:${x.text}`));
 const attention=issues.filter(x=>x.kind==='attention').flatMap(row=>{
  if(row.section!=='internal')return [row];
  const parts=assessment.palaces.find(x=>x.direction===row.direction)?.bad;
  if(!parts||parts.join('；')!==row.text)return [row];
  // Palace readings repeat the corner and external facts before adding their own
  // furnishing observations. Remove only those repeated clauses in the overview;
  // the shared issue and complete palace reading stay intact.
  const remaining=parts.filter(text=>!(cornerDirections.has(row.direction)&&text.includes('的本方红线内凹，'))&&!externalFacts.has(`${row.direction}:${text}`));
  return remaining.length?[{...row,text:remaining.join('；')}]:[];
 });
 const priorities=['external','corners','space','internal'];
 const ordered=priorities.flatMap(section=>attention.filter(x=>x.section===section));
 const highlights=[];
 // Start with different kinds of problems before showing another in the same part.
 for(const section of priorities){const row=ordered.find(x=>x.section===section);if(row&&highlights.length<3)highlights.push(row);}
 for(const row of ordered.length?ordered:issues.filter(x=>x.kind==='good')){
  if(highlights.length>=3)break;
  if(!highlights.some(x=>x.key===row.key))highlights.push(row);
 }
 const subjects={external:'窗外已核实的干扰',corners:'红线内凹处',space:'空间使用与家具关系',internal:'八方陈设'};
 const parts=[...new Set(highlights.filter(x=>x.kind==='attention').map(x=>subjects[x.section]))];
 const firstGood=issues.find(x=>x.kind==='good');
 const conclusion=parts.length?`这套住宅先核对${parts.join('、')}，再安排调整。`:firstGood?`目前能确认${firstGood.title}；其他结论仍以已标范围为限。`:'现有资料只够形成基础观察，补上图面与现场条件后再决定怎样调整。';
 return {conclusion,highlights,issues,missing:assessment.missing.filter(x=>x.step!==0),personalMissing:assessment.missing.filter(x=>x.step===0),scope:assessment.coverage.scope};
}

export function renovationSummary(h){
 const configured=h.planSettingsConfirmed!==false&&h.renovationConfigured!==false;
 const tier=configured&&h.tier?({small:'小改',medium:'中改',large:'大改'})[h.tier]:null;
 const budget=configured&&hasValue(h.budget)&&Number.isFinite(Number(h.budget))&&Number(h.budget)>=0?`${Number(h.budget)} 元以内`:'预算待填';
 return `${tier||'改造范围待选'} · ${budget}`;
}
