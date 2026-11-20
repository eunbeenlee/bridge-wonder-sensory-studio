'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(base,'server/apps-script/StaffBridge.gs'),'utf8');
const client=fs.readFileSync(path.join(base,'assets/js/staff-google-bridge.js'),'utf8');
const html=fs.readFileSync(path.join(base,'staff/standalone.html'),'utf8');
const tests=[];
function test(name,fn){return Promise.resolve().then(fn).then(()=>{tests.push(name);console.log('PASS',name);});}
function serverContext(){
  const methods=[...server.matchAll(/^\s{2}(\w+):\s+\1[, \n]/gm)].map(x=>x[1]);
  const handlers={};for(const n of methods)handlers[n]=(...args)=>({name:n,args});
  handlers.staffCurrentUser=(token)=>{if(token!=='valid')throw Error('권한이 없습니다.');return {role:'owner'};};
  const ctx={...handlers,ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {text,setMimeType(){return this;}}}}};
  vm.createContext(ctx);vm.runInContext(server,ctx,{timeout:3000});
  return {ctx,run:(method,args,protocol='BW_STAFF_V27')=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({protocol,method,args})}}).text),methods};
}
function clientContext(fetchMock){
  const elements={'bw27-server-status':{textContent:'',style:{}}};
  const window={};
  const ctx={window,document:{getElementById:n=>elements[n]||null},URL,AbortController,setTimeout,clearTimeout,console,fetch:fetchMock};
  vm.runInNewContext(client,ctx,{timeout:3000});
  return {window,elements};
}
(async()=>{
 await test('standalone HTML has own login and no Google iframe/redirect',()=>{
   assert.match(html,/<main id="loginScreen"/);assert.doesNotMatch(html,/<iframe\b|location\.replace/);
   const p=html.indexOf('staff-google-bridge.js'),a=html.indexOf('administration-accelerator.js'),u=html.indexOf('administration.js');
   assert.ok(p>0 && a>p && u>a);
 });
 await test('Google backend does not expose setup, arbitrary names, or private helpers',()=>{
   const h=serverContext();assert.ok(h.methods.length>=45);
   for(const name of ['setupBridgeWonderPayrollV26_','setupBridgeWonderV24','bw17Book_','doGet','constructor','__proto__']){
      assert.equal(h.run(name,[]).ok,false,name);
   }
 });
 await test('server bridge delegates to existing server auth, never bypasses it',()=>{
   const h=serverContext();assert.equal(h.run('staffCurrentUser',['invalid']).ok,false);
   assert.equal(h.run('staffCurrentUser',['valid']).value.role,'owner');
 });
 await test('server payload validation prevents untrusted generic routes',()=>{
   const h=serverContext();
   assert.equal(h.run('staffDashboard',['token'],'bad').ok,false);
   const bad=JSON.parse(h.ctx.doPost({postData:{contents:'{"protocol":"BW_STAFF_V27","method":"staffCurrentUser","args":{}}'}}).text);
   assert.equal(bad.ok,false);
 });
 await test('server exposes only minimal health result',()=>{
   const r=serverContext().run('bridgeHealth',[]);
   assert.equal(r.ok,true);assert.equal(r.transport,'google-apps-script');assert.equal(r.value,undefined);
 });
 await test('GitHub client sends JSON over Google HTTPS and omits cookies',async()=>{
   let captured;
   const h=clientContext(async (url,options)=>{
     captured={url,options};return {ok:true,text:async()=>JSON.stringify({ok:true,value:{role:'owner'}})};
   });
   const data=await h.window.BW27Bridge.request('staffCurrentUser',['test-token']);
   assert.equal(data.role,'owner');assert.match(captured.url,/^https:\/\/script\.google\.com\/macros\/s\//);
   assert.equal(captured.options.method,'POST');assert.equal(captured.options.credentials,'omit');
   assert.equal(captured.options.headers['Content-Type'],'text/plain;charset=utf-8');
   assert.equal(JSON.parse(captured.options.body).args[0],'test-token');
 });
 await test('google.script.run-compatible success handlers operate',async()=>{
   let ok;const h=clientContext(async()=>({ok:true,text:async()=>JSON.stringify({ok:true,value:{status:'ok'}})}));
   await new Promise((resolve,reject)=>h.window.google.script.run.withSuccessHandler(v=>{ok=v;resolve();}).withFailureHandler(reject).staffCurrentUser('token'));
   assert.equal(ok.status,'ok');
 });
 await test('Google transport/CORS failure is shown without logging in',async()=>{
   const h=clientContext(async()=>{throw new TypeError('Failed to fetch');});
   await assert.rejects(h.window.BW27Bridge.request('staffCurrentUser',['token']),/통신이 차단/);
   assert.match(h.elements['bw27-server-status'].textContent,/Google 웹앱 통신이 차단/);
 });
 console.log(JSON.stringify({suite:'optional Shinjeon-style bridge offline',passed:tests.length,total:8}));
})().catch(e=>{console.error(e);process.exitCode=1;});
