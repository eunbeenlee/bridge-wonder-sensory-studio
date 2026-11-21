'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bridge=fs.readFileSync(__dirname+'/../assets/js/staff-google-bridge.js','utf8');
const admin=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
let passes=0;
async function run(name,fn){await fn();passes++;console.log('PASS',name);}
function harness(fetchMock){
  const el={textContent:'',style:{}},check={disabled:false,addEventListener(){}},win={};
  vm.runInNewContext(bridge,{window:win,document:{getElementById:id=>id==='bw27-server-status'?el:id==='bw27-check-server'?check:null},URL,AbortController,setTimeout,clearTimeout,fetch:fetchMock,console},{timeout:3000});
  return {win,el,check};
}
(async()=>{
  await run('One Google health request is shared across simultaneous reads',async()=>{
    const calls=[];let release;
    const h=harness(async(_url,options)=>{
      const data=JSON.parse(options.body);calls.push(data.method);
      if(data.method==='bridgeHealth')await new Promise(r=>release=r);
      return {ok:true,text:async()=>JSON.stringify({ok:true,value:data.method==='bridgeHealth'?{version:'27.0.0',transport:'google-apps-script'}:{ok:true}})};
    });
    const a=h.win.BW27Bridge.request('staffDashboard',['test']);
    const b=h.win.BW27Bridge.request('staffListClasses',['test']);
    await new Promise(r=>setTimeout(r,0));
    assert.equal(calls.filter(x=>x==='bridgeHealth').length,1);
    release();await Promise.all([a,b]);assert.equal(calls.length,3);
  });
  await run('Health failure blocks transmission of passwords',async()=>{
    const calls=[];
    const h=harness(async(_url,options)=>{calls.push(JSON.parse(options.body).method);throw Error('Failed to fetch');});
    await assert.rejects(h.win.BW27Bridge.request('staff23PasswordLogin',[{email:'mock@example.invalid',password:'fake-secret'}]),/연결하지 못했습니다/);
    assert.deepEqual(calls,['bridgeHealth']);assert.match(h.el.textContent,/연결하지 못했습니다/);
  });
  await run('Completed health permits exactly one protected login attempt',async()=>{
    const calls=[];
    const h=harness(async(_url,options)=>{
      const data=JSON.parse(options.body);calls.push(data.method);
      return {ok:true,text:async()=>JSON.stringify({ok:true,value:data.method==='bridgeHealth'?{version:'27.0.0',transport:'google-apps-script'}:{token:'test-token'}})};
    });
    const result=await h.win.BW27Bridge.request('staff23PasswordLogin',[{email:'mock@example.invalid',password:'mock-12chars'}]);
    assert.equal(result.token,'test-token');assert.deepEqual(calls,['bridgeHealth','staff23PasswordLogin']);
  });
  await run('Static dashboard updates only while session and navigation match',()=>{
    const start=admin.indexOf('function renderHome(){'),end=admin.indexOf('async function renderInquiries(){');
    assert.ok(start>0&&end>start);
    const part=admin.slice(start,end);
    assert.ok(part.indexOf("$('pageBody').innerHTML")<part.indexOf("call('staffDashboard'"));
    assert.match(part,/epoch===bw282HomeEpoch/);
    assert.match(part,/r\[key\]===null\|\|r\[key\]===undefined/);
  });
  console.log(JSON.stringify({passed:passes,total:4}));
})().catch(err=>{console.error(err);process.exitCode=1;});
