import {stageError} from './intake-validation.js?v=82168a3e723a';
import {validate,validBirth} from './core.js?v=82168a3e723a';
export function finishReportEdit(h){
 const next=structuredClone(h),birthErrors=validBirth(next.birth);
 if(birthErrors.length)return {error:birthErrors[0],step:0};
 for(let s=1;s<10;s++){const error=stageError(next,s);if(error)return {error,step:s};}
 next.summaryConfirmed=true;next.floors.forEach(f=>f.confirmed=true);next.reportRevision=next.revision;
 const errors=validate(next);return errors.length?{error:errors[0]}:{house:next};
}
