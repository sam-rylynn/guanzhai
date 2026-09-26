import {stageError} from './intake-validation.js?v=716b99049af8';
import {validate,validBirth} from './core.js?v=716b99049af8';
import {requiredStages} from './journey.js?v=716b99049af8';
export function finishReportEdit(h){
 const next=structuredClone(h),birthErrors=validBirth(next.birth);
 if(birthErrors.length)return {error:birthErrors[0],step:0};
 for(const s of requiredStages(next).filter(s=>s<10)){const error=stageError(next,s);if(error)return {error,step:s};}
 next.summaryConfirmed=true;next.floors.forEach(f=>f.confirmed=true);next.reportRevision=next.revision;
 const errors=validate(next);return errors.length?{error:errors[0]}:{house:next};
}
