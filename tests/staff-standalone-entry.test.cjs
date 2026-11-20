'use strict';
/* Simulates the V27.2 HTTP connection without live Google or real credentials. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'staff/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/js/staff-google-bridge.js'),'utf8');
const tests=[];
const ok=value=>({ok:true,text:async()=>JSON.stringify({ok:true,value})});
const healthy={version:'27.0.0',transport:'google-apps-script'};
function boot(fetcher,options={}){
 const status={textContent:'',style:{}},retry={disabled:false,handlers:{},addEventListener(e,fn){this.handlers[e]=fn}};
 const document={body:{textContent:''},getElementById(id){return id==='bw27-server-status'?status:id==='bw27-check-server'?retry:null;}};
 const w={};if(options.framed){w.top={};w.self={};}else{w.top=w;w.self=w;}
 const ctx={window:w,document,URL,fetch:fetcher,AbortController,setTimeout,clearTimeout,console,Date,Error,Promise,JSON,Object};
 vm.runInNewContext(js,ctx,{timeout:3000});
 return {w,status,retry,document};
}
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name);}
(async()=>{
 await test('staff root is GitHub HTML UI, not an iframe or Google redirect',()=>{
   assert.match(html,/<main id="loginScreen"/);
   assert.match(html,/id="passwordLoginForm"/);
   assert.match(html,/id="bw27-server-status"/);
   assert.doesNotMatch(html,/<iframe\b|http-equiv="refresh"|window\.location\.replace/);
   assert.match(html,/connect-src https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com/);
   const names=['staff-google-bridge.js','administration-accelerator.js','administration.js'];
   assert.ok(names.every(k=>html.includes(k)));assert.ok(html.indexOf(names[0])<html.indexOf(names[1])&&html.indexOf(names[1])<html.indexOf(names[2]));
 });
 await test('exactly one anonymous health check is shared before account requests',async()=>{
   const calls=[];let resolveHealth;
   const fetcher=async(_url,args)=>{
     const req=JSON.parse(args.body);calls.push(req);
     if(req.method==='bridgeHealth')return new Promise(resolve=>{resolveHealth=()=>resolve(ok(healthy));});
     return ok({role:'owner'});
   };
   const h=boot(fetcher);
   const read=h.w.BW27Bridge.request('staffCurrentUser',['SYNTHETIC-TOKEN']);
   const login=h.w.BW27Bridge.request('staff23PasswordLogin',[{email:'synthetic@example.test',password:'SYNTHETIC'}]);
   await Promise.resolve();
   assert.equal(calls.length,1);assert.equal(calls[0].method,'bridgeHealth');
   assert.equal(JSON.stringify(calls[0]).includes('SYNTHETIC'),false);
   resolveHealth();
   await Promise.all([read,login]);
   assert.equal(calls.length,3);
   assert.equal(h.w.BW27Bridge.metrics().healthChecks,1);
 });
 await test('a blocked Google handshake never sends credentials or private data',async()=>{
   const calls=[];
   const h=boot(async(_url,args)=>{calls.push(JSON.parse(args.body));throw new TypeError('Failed to fetch');});
   await assert.rejects(h.w.BW27Bridge.request('staff23PasswordLogin',[{password:'SECRET'}]),/통신이 차단/);
   assert.equal(calls.length,1);
   assert.equal(calls[0].method,'bridgeHealth');
   assert.match(h.status.textContent,/통신이 차단/);
 });
 await test('manual reconnect recovers after initial health failure',async()=>{
   let healthCalls=0;let calls=0;
   const h=boot(async(_url,args)=>{
     calls++;const {method}=JSON.parse(args.body);
     if(method==='bridgeHealth'){
       healthCalls++;
       if(healthCalls===1)throw new TypeError('Failed to fetch');
       return ok(healthy);
     }
     return ok({role:'owner'});
   });
   await assert.rejects(h.w.BW27Bridge.ensureReady(),/통신이 차단/);
   await h.w.BW27Bridge.ensureReady(true);
   const r=await h.w.BW27Bridge.request('staffCurrentUser',['SYNTHETIC']);
   assert.equal(r.role,'owner');assert.equal(healthCalls,2);assert.equal(calls,3);
 });
 await test('failed payroll mutation is not automatically repeated',async()=>{
   const calls=[];
   const h=boot(async(_url,args)=>{
     const {method}=JSON.parse(args.body);calls.push(method);
     if(method==='bridgeHealth')return ok(healthy);
     throw new TypeError('Failed to fetch');
   });
   await assert.rejects(h.w.BW27Bridge.request('payrollCommand',['SYNTHETIC','saveDraft',{}]),/통신이 차단/);
   assert.deepEqual(calls,['bridgeHealth','payrollCommand']);
 });
 await test('server authorization refusal is surfaced as business failure',async()=>{
   const h=boot(async(_url,args)=>{
     const {method}=JSON.parse(args.body);
     if(method==='bridgeHealth')return ok(healthy);
     return {ok:true,text:async()=>JSON.stringify({ok:false,message:'이 업무에 접근할 권한이 없습니다.'})};
   });
   await assert.rejects(h.w.BW27Bridge.request('payrollCommand',['TEACHER','bootstrap',{}]),/권한이 없습니다/);
   assert.match(h.status.textContent,/연결 완료/); // Not incorrectly labeled a connection failure.
 });
 await test('embedded portal refuses to register RPC bridge',()=>{
   const h=boot(async()=>ok(healthy),{framed:true});
   assert.equal(h.w.BW27Bridge,undefined);
   assert.match(h.document.body.textContent,/별도 브라우저 탭/);
 });
 await test('no sensitive hardcoded staff account or private auth keys in public page',()=>{
   assert.doesNotMatch(html,/SPREADSHEET_ID|OWNER_EMAIL|BW17_AUTH_SECRET|staff23PasswordLogin\(/);
   assert.doesNotMatch(js,/SPREADSHEET_ID|OWNER_EMAIL|BW17_AUTH_SECRET/);
   assert.match(html,/google-fallback\.html/);
 });
 console.log(JSON.stringify({suite:'V27.2 static-first staff gateway',passed:tests.length,total:8}));
})().catch(e=>{console.error(e);process.exitCode=1;});
