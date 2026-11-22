'use strict';
/* V54: pricing/occupancy scenarios are client-side; no GAS schema or auth change. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const modelSource=read('assets/js/staff-finance-model-v49.js');
const uiSource=read('assets/js/staff-finance-v49.js');
const winModel={};
new vm.Script(modelSource).runInContext(vm.createContext({window:winModel}));
const M=winModel.BW49FinanceModel;
assert.equal(M.DEFAULTS.regularFee,32000);
assert.equal(M.DEFAULTS.termWeeks,10);
assert.equal(M.DEFAULTS.capacity,4);
assert.equal(M.compute(M.DEFAULTS).termTotal,320000);
for(let seats=0;seats<=4;seats++){
 const d=M.compute({...M.DEFAULTS,occupancy:seats*25,trialCount:0,otherSales:0});
 assert.equal(d.registeredPerSession,seats);
 assert.ok(Math.abs(d.regGross-d.monthlyClasses*seats*32000)<0.01);
 assert.ok(Math.abs(d.termCashExample-8*seats*320000)<0.01);
}
assert.equal(M.compute({...M.DEFAULTS,capacity:1}).input.capacity,4,'safety ceiling does not shrink to fill ratio');
assert.match(read('assets/js/administration.js'),/staff20SetCapacity/);
assert.match(read('assets/js/administration.js'),/capacity<1\|\|capacity>BW44_POLICY.maxChildren/);
assert.match(read('assets/css/staff-finance-v49.css'),/bw54-tax-columns/);
assert.match(read('assets/css/staff-finance-v49.css'),/#bw49EmployerCost/);
assert.match(read('assets/css/administration-payroll.css'),/overflow-wrap:anywhere/);
for(const page of ['sensory-studio/index.html','sensory-studio/programs/index.html','sensory-studio/experience/index.html','sensory-studio/visit/index.html']){
 const html=read(page);
 assert.match(html,/320,000원/);
 assert.doesNotMatch(html,/30,000원/);
}
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{
   url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window,root=w.document.getElementById('app');w.BW49FinanceModel=M;w.eval(uiSource);
 const call=async name=>{
   if(name==='staff49FinanceRead')return {settings:{revision:0,values:null},entries:[]};
   throw new Error('test backend is read-only');
 };
 await w.BW49FinanceUI.mount(root,{user:{role:'owner'},token:'test-token',call,isCurrent:()=>true,navigation:1});
 const get=id=>root.querySelector('#'+id);
 assert.equal(get('bw54TermFee').value,'320000');
 assert.equal(get('bw54PaidSeats').value,'3');
 assert.equal(get('bw49-regularFee').value,'32000');
 assert.equal(get('bw49-occupancy').value,'75');
 assert.equal(get('bw49-capacity').readOnly,true);
 assert.equal(get('bw49SaveBudget').disabled,false);
 root.querySelector('[data-bw54seats="2"]').click();
 assert.equal(get('bw54PaidSeats').value,'2');
 assert.equal(get('bw49-occupancy').value,'50');
 assert.equal(root.querySelector('[data-bw54seats="2"]').getAttribute('aria-pressed'),'true');
 get('bw54TermFee').value='400000';
 get('bw54TermFee').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(get('bw49-regularFee').value,'40000');
 get('bw49-termWeeks').value='12';
 get('bw49-termWeeks').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.ok(Math.abs(Number(get('bw49-regularFee').value)-33333.33)<.011);
 assert.equal(get('bw54TermFee').value,'400000');
 get('bw54PaidSeats').value='0';
 get('bw54PaidSeats').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(get('bw49-occupancy').value,'0');
 get('bw54PaidSeats').value='4';
 get('bw54PaidSeats').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(get('bw49-occupancy').value,'100');
 get('bw54ApplyStandard').click();
 assert.equal(get('bw49-termWeeks').value,'10');
 assert.equal(get('bw49-regularFee').value,'32000');
 assert.equal(get('bw54TermFee').value,'320000');
 dom.window.close();
 console.log('V54 10-week 320k, 0–4 paid seats, editable controls and insurance overflow smoke tests passed');
})().catch(err=>{console.error(err);process.exitCode=1;});
