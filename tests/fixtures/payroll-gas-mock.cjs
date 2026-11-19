/* Offline verification of payroll business rules and server authorization.
 * SpreadsheetApp/Auth are controlled doubles; this does not claim a live Google deployment test.
 * All identities and amounts below are fictional fixtures.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../server/apps-script/Payroll.gs'),'utf8');
class Range {
  constructor(sheet,r,c,n=1,m=1){Object.assign(this,{sheet,r,c,n,m});}
  setValues(rows){for(let i=0;i<this.n;i++){while(this.sheet.rows.length<this.r+i)this.sheet.rows.push([]);for(let j=0;j<this.m;j++)this.sheet.rows[this.r+i-1][this.c+j-1]=rows[i][j];}return this;}
  getValues(){this.sheet.reads.push({r:this.r,c:this.c,n:this.n,m:this.m});return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.rows[this.r+i-1]?.[this.c+j-1]??''));}
  getDisplayValues(){return this.getValues().map(r=>r.map(String));}
  setBackground(){return this;} setFontColor(){return this;} setFontWeight(){return this;} setNumberFormat(){return this;}
}
class Sheet {
  constructor(name){this.name=name;this.rows=[];this.reads=[];}
  getName(){return this.name;} getLastRow(){return this.rows.length;} setFrozenRows(){return this;}
  getRange(r,c,n,m){return typeof r==='string'?new Range(this,1,1):new Range(this,r,c,n,m);}
  appendRow(row){this.rows.push(row);return this;}
}
function harness(){
  const sheets=new Map(),book={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet(n);sheets.set(n,s);return s;}},lock={held:false,tryLock(){assert.equal(this.held,false);this.held=true;return true;},waitLock(){assert.equal(this.held,false);this.held=true;},releaseLock(){this.held=false;}};
  let id=0,active='owner@example.test',authReads=0;
  const ctx={console,Date,JSON,Math,Number,String,Object,Array,Error,RegExp,Map,Set,
    bw17Authorized_:(token,roles)=>{authReads++;if(token==='owner-token')return{email:'owner@example.test',role:'owner'};if(token==='teacher-token')throw Error('권한 없음');if(token==='pretend-owner')return{email:'teacher@example.test',role:'teacher'};throw Error('로그인이 필요합니다.');},
    bw17Book_:()=>book,bw17Config_:()=>({owner:'owner@example.test'}),
    Session:{getActiveUser:()=>({getEmail:()=>active})},LockService:{getScriptLock:()=>lock},Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`}};
  vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'Payroll.gs'});
  const call=(action,p={})=>JSON.parse(JSON.stringify(ctx.payrollCommand('owner-token',action,p)));
  return{ctx,call,book,sheets,lock,setActive:v=>active=v,getAuthReads:()=>authReads};
}
const allActions=['bootstrap','saveEmployee','saveSettings','approveYear','preview','saveDraft','finalize','markPaid','void','getPayslip','annualReport'];
function initialize(h){h.ctx.setupBridgeWonderPayrollV26_();h.call('saveSettings',{revision:0,businessName:'테스트 교육원',representative:'테스트 원장',businessNumber:'123-45-67890',address:'테스트 주소'});h.call('approveYear',{year:2026,confirmed:true});}
function employee(h,overrides={}){return h.call('saveEmployee',{revision:0,email:'staff@example.test',name:'테스트 직원',employmentStart:'2025-01-01',employmentEnd:'',department:'교육',position:'강사',payType:'monthly',basePay:3001001,hourlyRate:15000,dailyRate:120000,monthlyHours:209,coverage:{pension:true,health:true,employment:true},coverageVerified:true,...overrides}).employee;}
function inputs(overrides={}){return{basePay:null,paidHours:0,paidDays:0,items:[],deductionItems:[],pensionBase:3001001,healthBase:3001001,employmentBase:3001001,actualInsurance:{pension:null,health:null,ltc:null,employment:null},incomeTax:50000,localTax:5000,taxReference:'2026년 3월 시행 간이세액표 확인',taxPercent:100,familyCount:1,childCount:0,review:{tax:true,insurance:true,taxFree:true,hours:true},...overrides};}
function payload(e,overrides={}){return{month:'2026-11',employeeId:e.id,payDate:'2026-12-05',revision:0,inputs:inputs(),...overrides};}

module.exports={createHarness:harness,harness,initialize,createEmployee:employee,employee,createInputs:inputs,inputs,createPayload:payload,payload,allActions,source};
