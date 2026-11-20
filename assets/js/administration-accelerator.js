/* Bridge Wonder V26: bounded Google RPC reads, short memory cache, no write retry. */
(function (global) {
  'use strict';
  const READ_METHODS=new Set(['staffCurrentUser','staffDashboard','staffListClasses','staffListInquiries','staffListRegistrations','staffListRoster','staffListAttendance','staffListUsers','staffListAudit','staffListOperations','staffListTuition','staffListDailyChecks','staffListHandoffs','staffListStaffCompliance','staff22GetCourseSettings','staff20Capacity','staff20Waitlist','staff20Makeups','staff20Themes','staff20ActionCenter','staffDocTypes','staffDocSources','staffDocPreview','staffDocHistory','staffDocDownload']);
  const TTL_MS=Object.freeze({staffDashboard:10000,staffListClasses:20000,staff20Capacity:12000,staff20Themes:16000,staff20ActionCenter:8000});
  const VIEW_CANCELED='BW24_STALE_VIEW';
  const errorOf=e=>e instanceof Error?e:Error(e?.message?String(e.message):String(e));
  const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function create(options) {
    if(!options||typeof options.invoke!=='function')throw Error('invoke 함수가 필요합니다.');
    const now=options.now||(()=>Date.now()),concurrency=Math.max(1,Math.min(6,Number(options.concurrency)||4));
    const readTimeout=Number(options.readTimeoutMs)||30000,writeTimeout=Number(options.writeTimeoutMs)||45000;
    const cache=new Map(),inFlight=new Map();
    let active=0,queue=[],dataEpoch=0,session='',currentNav=0;
    let calls=0,errors=0,timedOut=0,cacheHits=0,coalesced=0,maxQueued=0,measurements=[];
    function metrics() {
      const sorted=measurements.map(x=>x.ms).sort((a,b)=>a-b);
      return Object.freeze({calls,errors,timedOut,cacheHits,coalesced,active,queued:queue.length,maxQueued,p95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:0,cacheEntries:cache.size});
    }
    function cancel(item) {
      if(item.settled)return;
      item.settled=true;clearTimeout(item.timer);
      if(item.key&&inFlight.get(item.key)?.item===item)inFlight.delete(item.key);
      item.reject(Error(VIEW_CANCELED));
    }
    function invalidate() {
      dataEpoch++;cache.clear();inFlight.clear();
      const old=queue;queue=[];old.forEach(cancel);
    }
    function setSession(value) {const next=String(value||'');if(next!==session){session=next;invalidate();}}
    function setNavigation(value) {
      currentNav=value;
      const old=queue;queue=[];
      old.forEach(item=>{if(item.nav!==undefined&&item.nav!==currentNav)cancel(item);else queue.push(item);});
    }
    function pump() {
      while(active<concurrency&&queue.length) {
        const item=queue.shift();
        if(item.settled)continue;
        if(item.epoch!==dataEpoch||item.session!==session||(item.nav!==undefined&&item.nav!==currentNav)){cancel(item);continue;}
        active++;item.running=true;
        // Consumer timeouts do not cancel Google RPCs. Retain the physical slot
        // until that actual call settles, even if the caller has already timed out.
        Promise.resolve().then(()=>options.invoke(item.name,item.args)).then(value=>{
          if(!item.settled){item.settled=true;clearTimeout(item.timer);item.resolve(value);}
        },error=>{
          if(!item.settled){item.settled=true;clearTimeout(item.timer);item.reject(errorOf(error));}
        }).finally(()=>{active--;pump();});
      }
    }
    function scheduleRead(name,args,nav,key) {
      let item;
      const promise=new Promise((resolve,reject)=>{
        item={name,args,nav,key,epoch:dataEpoch,session,resolve,reject,settled:false,running:false};
        item.timer=setTimeout(()=>{
          if(item.settled)return;
          item.settled=true;timedOut++;queue=queue.filter(x=>x!==item);
          reject(Error('조회가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'));
        },readTimeout);
        queue.push(item);maxQueued=Math.max(maxQueued,queue.length);pump();
      });
      return {promise,item};
    }
    function writeInvoke(name,args,requestSession) {
      return new Promise((resolve,reject)=>{
        let finished=false;
        // V29: legacy PBKDF2 -> native KDF migration may need one longer verification.
        // Avoid timing out early while Google is still verifying; never resend writes.
        const isAuth=name==='staff23PasswordLogin'||name==='staff23PasswordCompleteEnrollment';
        const deadline=isAuth?Math.max(90000,writeTimeout):writeTimeout;
        const timer=setTimeout(()=>{if(finished)return;finished=true;timedOut++;reject(Error(isAuth
          ? '인증 응답이 지연되었습니다. 인증 기록을 확인한 뒤 다시 로그인해 주세요.'
          : '저장 결과를 확인하지 못했습니다. 중복 저장하지 말고 먼저 기록을 새로 조회해 주세요.'));},deadline);
        Promise.resolve().then(()=>options.invoke(name,args)).then(value=>{
          if(requestSession===session)invalidate();
          if(!finished){finished=true;clearTimeout(timer);resolve(value);}
        },error=>{
          if(requestSession===session)invalidate();
          if(!finished){finished=true;clearTimeout(timer);reject(errorOf(error));}
        });
      });
    }
    function request(name,args,cfg) {
      cfg=cfg||{};args=args||[];setSession(cfg.session);
      const requestSession=session,read=READ_METHODS.has(name),ttl=TTL_MS[name]||0;
      const nav=read&&name!=='staffCurrentUser'&&Number.isInteger(cfg.nav)?cfg.nav:undefined;
      if(!read)invalidate();
      const version=dataEpoch,key=ttl?name+':'+JSON.stringify(args.slice(1)):'';
      const guard=value=>{
        if(requestSession!==session||(nav!==undefined&&nav!==currentNav)||(read&&version!==dataEpoch))throw Error(VIEW_CANCELED);
        return ttl?copy(value):value;
      };
      if(ttl) {
        const hit=cache.get(key);
        if(hit&&hit.until>now()){cacheHits++;return Promise.resolve(hit.value).then(guard);}
        if(hit)cache.delete(key);
        const shared=inFlight.get(key);
        if(shared&&shared.version===version){coalesced++;return shared.promise.then(guard);}
      }
      calls++;
      const started=now(),job=read?scheduleRead(name,args,nav,key):{promise:writeInvoke(name,args,requestSession)};
      const task=job.promise.then(value=>{
        if(read&&ttl&&version===dataEpoch&&requestSession===session){
          if(cache.size>=24)cache.delete(cache.keys().next().value);
          cache.set(key,{value:copy(value),until:now()+ttl});
        }
        return value;
      },error=>{errors++;if(!read&&requestSession===session)invalidate();throw errorOf(error);}).finally(()=>{
        if(key&&inFlight.get(key)?.promise===task)inFlight.delete(key);
        const ms=Math.max(0,now()-started);measurements.push({name,ms});if(measurements.length>60)measurements.shift();
        if(typeof options.onTiming==='function')options.onTiming(name,ms);
        if(ms>2500&&typeof options.onSlow==='function')options.onSlow(name,ms);
      });
      if(key)inFlight.set(key,{version,promise:task,item:job.item});
      return task.then(guard);
    }
    function clear(){session='';invalidate();measurements=[];}
    return Object.freeze({request,invalidate,setSession,setNavigation,clear,metrics,isRead:n=>READ_METHODS.has(n)});
  }
  global.BW25Acceleration=Object.freeze({create,READ_METHODS,VIEW_CANCELED,version:'26.0.0'});
})(window);
