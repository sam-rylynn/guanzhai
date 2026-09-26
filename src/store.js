let dbPromise;
function openDB() {
  if(!dbPromise) dbPromise = new Promise((resolve,reject)=>{
    const req = indexedDB.open('guanzhai-local-v1',2);
    let failed=false;
    req.onupgradeneeded = ()=>{for(const name of ['houses','drafts'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};
    req.onsuccess = ()=>{if(failed){req.result.close();return;}req.result.onversionchange=()=>{req.result.close();dbPromise=null;};resolve(req.result);};
    req.onblocked = ()=>{failed=true;reject(new Error('旧版观宅页面仍在使用本机宅档。请关闭其他观宅标签页，再点击“重试读取”；已有资料会保留。'));};
    req.onerror = ()=>{failed=true;reject(new Error('无法打开本机宅档，请检查浏览器存储权限后重试。'));};
  }).catch(error=>{dbPromise=null;throw error;});
  return dbPromise;
}
async function transaction(mode, run, stores=['houses']) {
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(stores, mode), request=run(tx.objectStore(stores[0]),tx);
    tx.oncomplete=()=>resolve(request.result);
    tx.onerror=tx.onabort=()=>reject(new Error('宅档未保存。可能是本机存储空间不足，请保留当前页面并重试。'));
  });
}
export const listHouses=async()=> (await transaction('readonly',s=>s.getAll())).map(h=>({...h,storageVersion:h.storageVersion??0}));
export const listDrafts=async()=> (await transaction('readonly',s=>s.getAll(),['drafts'])).map(d=>({...d,draftVersion:d.draftVersion??0}));
const houseConflict=()=>new Error('宅档已在其他页面更新或删除，当前修改未覆盖它。请返回我的宅档核对；未提交的修改仍保留在当前页面。');
const draftConflict=()=>new Error('这份草稿已在其他页面更新或删除，当前内容尚未保存。请保留此页面，先核对另一个页面的修改。');
const matches=(current,expected,key)=>expected==null?!current:!!current&&(current[key]??0)===expected;

export const putDraft=async draft=>{
 const snapshot=structuredClone(draft),db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['drafts','houses'],'readwrite'),drafts=tx.objectStore('drafts'),request=drafts.get(snapshot.id);let conflict;
  const fail=error=>{conflict=error;tx.abort();};
  request.onsuccess=()=>{
   if(!matches(request.result,snapshot.draftVersion,'draftVersion')){fail(draftConflict());return;}
   const write=()=>{snapshot.draftVersion=(request.result?.draftVersion??0)+1;drafts.put(snapshot);};
   if(snapshot.house.storageVersion!==undefined||snapshot.baseRevision>0){const original=tx.objectStore('houses').get(snapshot.id);original.onsuccess=()=>original.result?write():fail(houseConflict());}else write();
  };
  tx.oncomplete=()=>resolve(snapshot);
  tx.onerror=tx.onabort=()=>reject(conflict||new Error('草稿未保存。请保留当前页面，检查本机存储空间后重试。'));
 });
};
export const removeDraft=async(id,expectedVersion)=>{
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts','readwrite'),s=tx.objectStore('drafts'),request=s.get(id);let conflict;
  request.onsuccess=()=>{if(!matches(request.result,expectedVersion,'draftVersion')){conflict=draftConflict();tx.abort();return;}s.delete(id);};
  tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(conflict||new Error('草稿未删除，请重试。'));
 });
};
async function saveHouse(house,{expectedRevision,newPlans=[],finishDraft=false,expectedDraftVersion}={}){
 const snapshot=structuredClone(house),plans=structuredClone(newPlans),db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['houses','drafts'],'readwrite'),houses=tx.objectStore('houses'),request=houses.get(snapshot.id);let conflict;
  const fail=error=>{conflict=error;tx.abort();};
  request.onsuccess=()=>{
   const current=request.result;
   if(!matches(current,snapshot.storageVersion,'storageVersion')||(expectedRevision!==undefined&&(current?.revision??0)!==expectedRevision)){fail(houseConflict());return;}
   if(finishDraft&&current)snapshot.plans=[...(current.plans||[]),...plans.filter(p=>!current.plans?.some(x=>x.id===p.id))];
   const write=()=>{snapshot.storageVersion=(current?.storageVersion??0)+1;houses.put(snapshot);};
   if(finishDraft){const drafts=tx.objectStore('drafts'),checkpoint=drafts.get(snapshot.id);checkpoint.onsuccess=()=>{if(!matches(checkpoint.result,expectedDraftVersion,'draftVersion')){fail(draftConflict());return;}write();drafts.delete(snapshot.id);};}else write();
  };
  tx.oncomplete=()=>resolve(snapshot);
  tx.onerror=tx.onabort=()=>reject(conflict||new Error('宅档未保存。可能是本机存储空间不足，请保留当前页面并重试。'));
 });
}
export const putHouse=house=>saveHouse(house);
export const commitHouse=(house,options={})=>saveHouse(house,{...options,finishDraft:true});
export const removeHouse=async(id,expectedVersion)=>{
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['houses','drafts'],'readwrite'),s=tx.objectStore('houses'),request=s.get(id);let conflict;
  request.onsuccess=()=>{if(!matches(request.result,expectedVersion,'storageVersion')){conflict=houseConflict();tx.abort();return;}s.delete(id);tx.objectStore('drafts').delete(id);};
  tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(conflict||new Error('宅档未删除，请重试。'));
 });
};
