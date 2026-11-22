'use strict';
/* V49 tests: synthetic financial values and mock private Sheets, never real data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const math=read('assets/js/staff-finance-model-v49.js');
const ui=read('assets/js/staff-finance-v49.js');
const gas=read('server/apps-script/StudioFinance.gs');
const server=read('server/apps-script/Code.gs');
const bridge=read('server/apps-script/StaffBridge.gs');
const main=read('assets/js/administration.js');
const nav=read('assets/js/staff-enterprise-v33.js');
const css=read('assets/css/staff-finance-v49.css');
const index=read('staff/index.html');
const standalone=read('staff/standalone.html');
const w={};const mc=vm.createContext({window:w});new vm.Script(math).runInContext(mc);
const M=w.BW49FinanceModel;
let passed=0;
const test=(label,fn)=>{fn();passed++;console.log('PASS '+label);};
const money=v=>Math.round(v);
const nearly=(a,b,epsilon=2)=>assert.ok(Math.abs(a-b)<epsilon,a+' != '+b);
test('non-exempt general taxable 10% and VAT-inclusive posted prices are the default',()=>{
  assert.equal(M.DEFAULTS.vatMode,'general');
  assert.equal(M.DEFAULTS.priceVatIncluded,'yes');
  assert.equal(M.DEFAULTS.rent,700000);
  assert.equal(M.DEFAULTS.management,300000);
  assert.equal(M.DEFAULTS.deposit,10000000);
  assert.equal(M.DEFAULTS.capacity,4);
  const d=M.compute(M.DEFAULTS);
  nearly(d.monthlySessions,104,.001);
  nearly(d.salesGross,3120000);
  nearly(d.outputVat,3120000/11);
  nearly(d.revenueBook,3120000/1.1);
  assert.ok(d.vatEstimate>0);
  assert.equal(d.vatUnresolved,false);
  assert.ok(d.operatingProfit<d.revenueBook);
  assert.ok(d.operatingProfit>0);
  assert.ok(d.breakEvenFill>0&&d.breakEvenFill<=100);
  assert.equal(d.termCashExample,8*4*.75*30000*10);
});
test('prices excluding VAT add 10% to receipts but not to pre-VAT revenue',()=>{
  const inc=M.compute({...M.DEFAULTS,priceVatIncluded:'yes'});
  const exc=M.compute({...M.DEFAULTS,priceVatIncluded:'no'});
  nearly(exc.salesGross,inc.salesGross*1.1);
  nearly(exc.revenueBook,inc.salesGross);
  nearly(exc.outputVat,inc.salesGross*.1);
  assert.ok(exc.cashAfterTax>inc.cashAfterTax);
});
test('rent and management separately billed VAT impacts cash and eligible input tax',()=>{
  const basic=M.compute(M.DEFAULTS);
  const taxed=M.compute({...M.DEFAULTS,rentVatSeparate:'yes',managementVatSeparate:'yes'});
  nearly(taxed.vatPaidOnRent,100000);
  nearly(taxed.vatEstimate,basic.vatEstimate-100000);
  nearly(taxed.operatingProfit,basic.operatingProfit);
  nearly(taxed.cashAfterTax,basic.cashAfterTax);
});
test('deposit is an asset, owner draw and pension cash outflows are not business expense',()=>{
  const basic=M.compute(M.DEFAULTS);
  const modified=M.compute({...M.DEFAULTS,deposit:20000000,ownerDraw:500000,ownerPension:150000});
  nearly(modified.operatingProfit,basic.operatingProfit);
  nearly(modified.cashAfterTax,basic.cashAfterTax-500000-150000+
     (basic.monthlyIncomeTax-modified.monthlyIncomeTax));
  nearly(modified.startupTotal,basic.startupTotal+10000000);
});
test('employee cost calculates employer levies and retirement allowance separately',()=>{
  const d=M.compute({...M.DEFAULTS,staffGross:2000000});
  assert.ok(d.employerPension>0&&d.employerHealth>0&&d.employerLtc>0);
  assert.ok(d.severance>0);
  nearly(d.peopleTotal,2000000+d.employerTotal);
  assert.ok(d.operatingProfit<0||d.operatingProfit<M.compute(M.DEFAULTS).operatingProfit);
});
test('tax brackets are progressive and scenario inputs clamp capacity',()=>{
  assert.equal(M.taxBrackets(14000000),840000);
  assert.equal(M.taxBrackets(20000000),1740000);
  const d=M.compute({capacity:15,vatMode:'general',regularFee:30000});
  assert.equal(d.input.capacity,4);
  assert.ok(M.FIELD_GROUPS.flatMap(x=>x.fields).length>=60);
  assert.ok(M.CATEGORY.length>=25);
});
test('actual cash ledger keeps deposits, withdrawals and tax out of operating P&L',()=>{
  const rows=[
    {category:'regular',amount:1000000},
    {category:'rent',amount:700000},
    {category:'deposit',amount:10000000},
    {category:'ownerDraw',amount:120000},
    {category:'vat',amount:50000},
    {category:'ownerCapital',amount:15000000}
  ];
  const actual=M.actualSummary(rows);
  assert.equal(actual.operatingPnl,300000);
  assert.equal(actual.netCash,1000000+15000000-(700000+10000000+120000+50000));
});
class Sheet{
  constructor(headers){this.rows=[headers.slice()];}
  getLastRow(){return this.rows.length;}
  appendRow(row){this.rows.push(Array.from(row));return this;}
  getRange(row,col,count=1,columns=1){
    const ref=this;
    return {getDisplayValues:()=>Array.from({length:count},(_,i)=>Array.from({length:columns},(_,j)=>String(ref.rows[row-1+i]?.[col-1+j]??'')))};
  }
}
function setupGas(){
 const tabs=new Map(),audit=[],locks=[];
 const ctx=vm.createContext({Utilities:{getUuid:()=>crypto.randomUUID()},LockService:{
   getScriptLock:()=>({waitLock(){locks.push('on')},releaseLock(){locks.push('off')}})
 }});
 new vm.Script(gas,{filename:'StudioFinance.gs'}).runInContext(ctx);
 ctx.bw17Tab_=(name,headers,create)=>{
   if(!tabs.has(name)&&create)tabs.set(name,new Sheet(headers));
   return tabs.get(name)||null;
 };
 ctx.bw17Now_=()=> '2026-11-21 23:00:00';
 ctx.bw17Safe_=(v,max)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').slice(0,max||200);
 ctx.bw17Audit_=(user,action,target,status,detail)=>audit.push([user.email,action,target,status,detail]);
 ctx.bw24Authorized_=(token,module,access,roles)=>{
   if(token!=='owner'||module!=='finance'||!roles.includes('owner'))throw Error('권한 없음');
   return {role:'owner',email:'owner@example.invalid'};
 };
 return {ctx,tabs,audit,locks};
}
const fake=setupGas(),g=fake.ctx,request=()=>crypto.randomUUID();
test('new finance API is owner-only and never creates a public staff financial endpoint',()=>{
  assert.match(server,/"finance":\{"label":"운영 손익·현금흐름","read":\["owner"\],"write":\["owner"\]\}/);
  for(const m of ['staff49FinanceRead','staff49FinanceSaveSettings','staff49FinanceSaveEntry','staff49FinanceVoidEntry'])
    assert.match(bridge,new RegExp(m+': '+m));
  assert.throws(()=>g.staff49FinanceRead('teacher','2026-11'),/권한/);
  assert.throws(()=>g.staff49FinanceSaveSettings('director',{revision:0,requestId:request(),values:{rent:700000}}),/권한/);
  assert.doesNotMatch(gas,/function doGet|function doPost|ANYONE_WITH_LINK|setSharing/);
  assert.equal(fake.tabs.size,0);
});
test('finance settings are versioned, repeat-safe and validated under owner session',()=>{
  const value={...M.DEFAULTS};
  const rid=request(),first=g.staff49FinanceSaveSettings('owner',{revision:0,requestId:rid,values:value});
  assert.equal(first.revision,1);
  assert.equal(g.staff49FinanceSaveSettings('owner',{revision:0,requestId:rid,values:value}).alreadySaved,true);
  assert.throws(()=>g.staff49FinanceSaveSettings('owner',{revision:0,requestId:request(),values:value}),/다른 화면/);
  assert.throws(()=>g.staff49FinanceSaveSettings('owner',{revision:1,requestId:request(),values:{vatMode:'exempt'}}),/부가세/);
  const row=g.staff49FinanceRead('owner','2026-11');
  assert.equal(row.settings.values.rent,700000);
  assert.equal(row.settings.values.vatMode,'general');
  assert.equal(row.settings.values.priceVatIncluded,'yes');
});
test('month ledger logs immutable revisions, allows correction and soft-void with no backdating',()=>{
  const month='2026-11',date='2026-11-21';
  const base={month,date,category:'rent',amount:700000,method:'계좌이체',note:'fixture'};
  const id=request(),created=g.staff49FinanceSaveEntry('owner',{...base,requestId:id});
  assert.equal(created.revision,1);
  assert.equal(g.staff49FinanceSaveEntry('owner',{...base,requestId:id}).alreadySaved,true);
  assert.equal(g.staff49FinanceRead('owner',month).entries.length,1);
  assert.throws(()=>g.staff49FinanceSaveEntry('owner',{...base,date:'2026-10-21',requestId:request()}),/날짜/);
  const corrected=g.staff49FinanceSaveEntry('owner',{...base,id:created.id,revision:1,amount:750000,requestId:request()});
  assert.equal(corrected.revision,2);
  assert.equal(g.staff49FinanceRead('owner',month).entries[0].amount,750000);
  assert.throws(()=>g.staff49FinanceSaveEntry('owner',{...base,id:created.id,revision:1,requestId:request()}),/다른 화면/);
  const removed=g.staff49FinanceVoidEntry('owner',{id:created.id,revision:2,requestId:request()});
  assert.equal(removed.revision,3);
  assert.equal(g.staff49FinanceRead('owner',month).entries.length,0);
  assert.equal(fake.tabs.get('재무_현금거래').rows.length,4);
  assert.ok(fake.audit.length>=3);
  assert.equal(fake.locks.filter(x=>x==='on').length,fake.locks.filter(x=>x==='off').length);
});
(async()=>{
 const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="pageBody"></div></body></html>',{
   url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
 });
 const win=dom.window,root=win.document.getElementById('pageBody');win.BW49FinanceModel=M;win.eval(ui);
 const cache={month:'2026-11',settings:{revision:0,values:null,updatedAt:''},entries:[]};const methods=[];
 const call=async(name,...args)=>{
   methods.push({name,args});
   if(name==='staff49FinanceRead')return cache;
   if(name==='staff49FinanceSaveSettings')return {ok:true,revision:1};
   if(name==='staff49FinanceSaveEntry')return {ok:true,id:'FIN-'+crypto.randomUUID(),revision:1};
   throw Error('Unknown method '+name);
 };
 await win.BW49FinanceUI.mount(root,{
   user:{role:'owner'},token:'synthetic-owner-token',call,isCurrent:()=>true,navigation:1
 });
 test('owner finance view is interactive and shows VAT 10%, monthly rent and deposit',()=>{
   assert.match(root.textContent,/운영 손익·현금흐름/);
   assert.equal(root.querySelector('#bw49-vatMode').value,'general');
   assert.equal(root.querySelector('#bw49-priceVatIncluded').value,'yes');
   assert.equal(root.querySelector('#bw49-rent').value,'700000');
   assert.equal(root.querySelector('#bw49-management').value,'300000');
   assert.equal(root.querySelector('#bw49-deposit').value,'10000000');
   assert.equal(root.querySelectorAll('[data-bw49tab]').length,5);
   assert.match(root.querySelector('#bw49VATPreview').textContent,/매출 부가세/);
   assert.match(css,/@media\(max-width:620px\)/);
 });
 test('finance module keeps writes owner-only and requires server before persistence',()=>{
   assert.match(main,/user\?\.role!=='owner'/);
   assert.match(nav,/pages:\['users','payroll','finance','security'\]/);
   assert.match(index,/administration\.js\?v=53\.0\.0/);
   assert.match(standalone,/administration\.js\?v=53\.0\.0/);
   assert.match(main,/renderFinance49/);
 });
 await assert.rejects(()=>win.BW49FinanceUI.mount(root,{user:{role:'teacher'},token:'synthetic',call,isCurrent:()=>true}),/원장 계정/);
 const other=win.document.createElement('div');win.document.body.appendChild(other);
 const broken=async()=>{throw Error('허용되지 않은 업무 요청입니다.');};
 await win.BW49FinanceUI.mount(other,{user:{role:'owner'},token:'synthetic',call:broken,isCurrent:()=>true});
 test('without installed server the forecast still works but entry and budget writes are blocked',()=>{
   assert.equal(other.querySelector('#bw49SaveEntry').disabled,true);
   assert.equal(other.querySelector('#bw49SaveBudget').disabled,true);
   assert.match(other.querySelector('#bw49State').textContent,/직원용 Apps Script/);
   assert.doesNotMatch(ui,/localStorage|sessionStorage|SPREADSHEET_ID|Google Sheets ID/);
 });
 dom.window.close();
 console.log(JSON.stringify({suite:'V49 owner P&L finance and private cashflow',passed}));
})().catch(err=>{console.error(err);process.exitCode=1;});
