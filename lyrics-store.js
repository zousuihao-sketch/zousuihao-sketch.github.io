const DATABASE='suihao-local-lyrics',STORE='lyrics',SCHEMA=1;

export function lyricsKey(track){
 if(track.local)return track.lyricsStorageKey||null;
 return JSON.stringify(['library',track.id,track.url]);
}

export function validSavedLyrics(record,key){
 if(!record||record.schema!==SCHEMA||record.key!==key||typeof record.version!=='string'||!Array.isArray(record.lines)||!record.lines.length||record.lines.length>3000)return false;
 let previous=-1,total=0;
 return record.lines.every(row=>{
  if(!row||typeof row.text!=='string'||!row.text.trim()||!Number.isFinite(row.start)||!Number.isFinite(row.end)||row.start<0||row.end<row.start||row.start<=previous)return false;
  previous=row.start;total+=row.text.length;return total<=1024*1024;
 });
}

// A connection owned by one music session; a transaction must commit before "saved".
export function createLyricsStore(){
 let connection=null,pending=null,closed=false;
 function open(){
  if(closed)return Promise.reject(Error('storage closed'));
  if(connection)return Promise.resolve(connection);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   let request,settled=false;
   const timeout=setTimeout(()=>fail(Error('storage unavailable')),1800);
   const fail=error=>{if(settled)return;settled=true;clearTimeout(timeout);reject(error);};
   try{request=indexedDB.open(DATABASE,1);}catch(error){fail(error);return;}
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'key'});};
   request.onerror=()=>fail(request.error||Error('storage unavailable'));
   request.onblocked=()=>fail(Error('storage blocked'));
   request.onsuccess=()=>{
    if(settled||closed){request.result.close();if(!settled)fail(Error('storage closed'));return;}
    settled=true;clearTimeout(timeout);connection=request.result;
    connection.onversionchange=()=>{connection?.close();connection=null;pending=null;};resolve(connection);
   };
  });
  pending.catch(()=>{pending=null;});return pending;
 }
 async function transaction(mode,run){
  const db=await open();if(closed)throw Error('storage closed');
  return new Promise((resolve,reject)=>{
   let tx,result;
   try{tx=db.transaction(STORE,mode);const request=run(tx.objectStore(STORE));request.onsuccess=()=>{result=request.result;};}
   catch(error){reject(error);return;}
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('storage error'));tx.onabort=()=>reject(tx.error||Error('storage aborted'));
  });
 }
 return{
  async get(key){const record=await transaction('readonly',store=>store.get(key));return validSavedLyrics(record,key)?record:null;},
  async put(record){const value={...record,schema:SCHEMA};if(!validSavedLyrics(value,value.key))throw Error('invalid lyric record');await transaction('readwrite',store=>store.put(value));},
  async remove(key){await transaction('readwrite',store=>store.delete(key));},
  close(){closed=true;connection?.close();connection=null;}
 };
}
