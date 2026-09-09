let dbPromise;
function openDB() {
  if(!dbPromise) dbPromise = new Promise((resolve,reject)=>{
    const req = indexedDB.open('guanzhai-local-v1',1);
    req.onupgradeneeded = ()=>req.result.createObjectStore('houses',{keyPath:'id'});
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(new Error('无法打开本机宅档，请检查浏览器存储权限。'));
  });
  return dbPromise;
}
async function transaction(mode, run) {
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('houses', mode), request=run(tx.objectStore('houses'));
    tx.oncomplete=()=>resolve(request.result);
    tx.onerror=tx.onabort=()=>reject(new Error('宅档未保存。可能是本机存储空间不足，请保留当前页面并重试。'));
  });
}
export const listHouses=()=>transaction('readonly',s=>s.getAll());
export const putHouse=house=>transaction('readwrite',s=>s.put(structuredClone(house)));
export const removeHouse=id=>transaction('readwrite',s=>s.delete(id));
