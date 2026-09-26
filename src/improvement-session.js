import {makePlan} from './core.js?v=124593df2a03';
import {improvementPlan} from './personalization.js?v=124593df2a03';
import {personalRecommendations} from './report-v07.js?v=124593df2a03';

// A new snapshot never changes the source drawing or rewrites a previous plan.
export function appendImprovement(h,b=null,{localResult=null}={}){
 const next=structuredClone(h),goals=[...(next.improvementGoals||[])];
 if(!goals.length||goals.length>3)throw Error('请先选择 1–3 项改善方向。');
 const p=makePlan({...next,goals,layoutMode:'concept'},next.tier,b);
 p.personalRecommendations=personalRecommendations(b);
 if(localResult){
  p.layoutMode='local-metric';p.localResult=structuredClone(localResult);
  p.moves=structuredClone(localResult.moves||[]);p.zoneChanges=[];p.partitions=[];
  p.actions=p.actions.filter(x=>!['move','zone','geometry'].includes(x.kind));
  p.note='仅核对选定房间、已填外形与开启保留区；现场复核后试摆，不作施工图。';
 }
 next.plans||=[];next.plans.push(p);
 next.improvementResult={version:9,policyVersion:13,revision:next.revision,goals,
  items:improvementPlan(next,goals),planId:p.id,createdAt:p.createdAt};
 return {house:next,plan:p};
}
