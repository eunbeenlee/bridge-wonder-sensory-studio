/* Bridge Wonder V56 — pure calendar-based regular-course planning.
 * The forecast is independent of posted prices, contracts, payroll and actual ledger.
 * Gross receipts and earned revenue are allocated separately; no fictitious bank data.
 */
(function(global){
 'use strict';
 const DAY=86400000;
 const DEFAULTS=Object.freeze({startMonth:'2027-01',months:3,weeks:10,termTotal:320000,payment:'upfront',vatMode:'general',vatIncluded:'yes',
   refundPct:0,cardPct:2,materialExtra:3000,consumable:0,prepPerClass:0,fixedCash:1000000,fixedVatCredit:0,depreciation:0,otherCashOut:0,openingCash:0,
   cohorts:[{start:'2027-01-04',capacity:4,seats:3,groups:8}],materials:[]});
 const moneyKeys=['termTotal','materialExtra','consumable','prepPerClass','fixedCash','fixedVatCredit','depreciation','otherCashOut','openingCash'];
 function fail(label){throw Error(label+' 입력값을 확인해 주세요.');}
 function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)fail(label);return v;}
 function decimal(v,min,max,label){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(label);return v;}
 function date(s){
   if(typeof s!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))fail('시작일');
   const d=new Date(s+'T00:00:00Z');
   if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)fail('시작일');
   return d;
 }
 function monthAt(start,offset){
   const d=date(start+'-01');
   d.setUTCMonth(d.getUTCMonth()+offset);
   return d.toISOString().slice(0,7);
 }
 function text(v,max){if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))fail('재료명·단위');return v.trim();}
 function validate(raw){
   if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('운영계획');
   const c={};
   if(typeof raw.startMonth!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(raw.startMonth))fail('조회 시작월');
   c.startMonth=raw.startMonth;c.months=integer(raw.months,1,18,'예측 개월');
   c.weeks=integer(raw.weeks,1,52,'과정 기간');
   for(const key of moneyKeys)c[key]=integer(raw[key],key==='termTotal'?1:0,key==='termTotal'?100000000:10000000000,key);
   for(const key of ['refundPct','cardPct'])c[key]=decimal(raw[key],0,100,key);
   for(const [key,list] of Object.entries({payment:['upfront','weekly'],vatMode:['general','simplified'],vatIncluded:['yes','no']})){
     if(!list.includes(raw[key]))fail(key);c[key]=raw[key];
   }
   if(c.fixedVatCredit>c.fixedCash)fail('고정비 포함 공제 가능 VAT');
   if(!Array.isArray(raw.cohorts)||raw.cohorts.length>24)fail('반 편성(최대 24줄)');
   c.cohorts=raw.cohorts.map((r,i)=>{
     if(!r||typeof r!=='object')fail('반 편성');
     const start=date(r.start).toISOString().slice(0,10);
     if(start<c.startMonth+'-01'||start.slice(0,7)>monthAt(c.startMonth,c.months-1))fail('반 시작일은 예측 기간 안');
     const capacity=integer(r.capacity,1,4,'반별 정원');
     return {start,capacity,seats:integer(r.seats,0,capacity,'유료 등록 인원'),groups:integer(r.groups,1,200,'같은 편성 반 수')};
   });
   if(c.cohorts.reduce((n,r)=>n+r.groups,0)>200)fail('전체 반 수(최대 200)');
   if(!Array.isArray(raw.materials)||raw.materials.length>100)fail('재료 목록(최대 100개)');
   c.materials=raw.materials.map(r=>{
     if(!r||typeof r!=='object')fail('재료');
     const label=text(r.label,110);if(!label)fail('재료명');
     return {label,unit:text(r.unit,50),price:integer(r.price,0,1000000000,'재료 단가'),qty:decimal(r.qty,0,10000,'아이당 사용량')};
   });
   const materialCost=c.materials.reduce((n,r)=>n+r.price*r.qty,0)+c.materialExtra+c.consumable;
   if(materialCost>100000000)fail('아이당 전체 재료 원가(최대 1억원)');
   return c;
 }
 const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';
 function allocate(total,count,i){
   // Allocate whole won without losing the remainder across all sessions.
   return Math.floor(total*(i+1)/count)-Math.floor(total*i/count);
 }
 function compute(raw){
   const c=validate(raw);
   const materialSelected=c.materials.reduce((sum,r)=>sum+r.price*r.qty,0);
   const perChildCost=materialSelected+c.materialExtra+c.consumable;
   const netOfVat=x=>c.vatMode==='general'?x/1.1:x;
   const grossTerm=Math.round(c.termTotal*(c.vatMode==='general'&&c.vatIncluded==='no'?1.1:1));
   const paidTerm=Math.round(grossTerm*(1-c.refundPct/100));
   const fixedPnl=c.fixedCash-(c.vatMode==='general'?c.fixedVatCredit:0)+c.depreciation;
   const months=Array.from({length:c.months},(_,i)=>({month:monthAt(c.startMonth,i),receipts:0,earned:0,classes:0,visits:0,materials:0,preparation:0,processingCash:0,processingEarned:0}));
   const byMonth=new Map(months.map(m=>[m.month,m]));
   let allGross=0,allExpected=0,allChildren=0,allGroups=0,allCapacity=0,unearnedOutside=0,uncollectedOutside=0;
   const cohorts=c.cohorts.map(r=>{
     const children=r.seats*r.groups,capacity=r.capacity*r.groups;
     const gross=grossTerm*children,expected=paidTerm*children;
     allGross+=gross;allExpected+=expected;allChildren+=children;allGroups+=r.groups;allCapacity+=capacity;
     const first=date(r.start),last=new Date(first.getTime()+(c.weeks-1)*7*DAY);
     for(let i=0;i<c.weeks;i++){
       const d=new Date(first.getTime()+i*7*DAY).toISOString().slice(0,10);
       const earned=allocate(paidTerm,c.weeks,i)*children;
       const receipt=c.payment==='upfront'?(i===0?expected:0):earned;
       const row=byMonth.get(d.slice(0,7));
       if(!row){unearnedOutside+=earned;uncollectedOutside+=receipt;continue;}
       row.receipts+=receipt;row.earned+=earned;
       // Zero paid seats = no class held. Monthly fixed overhead still applies.
       if(children>0){row.classes+=r.groups;row.visits+=children;row.materials+=children*perChildCost;row.preparation+=r.groups*c.prepPerClass;}
       row.processingCash+=receipt*c.cardPct/100;
       row.processingEarned+=earned*c.cardPct/100;
     }
     return {...r,children,gross,expected,end:last.toISOString().slice(0,10)};
   });
   let balance=c.openingCash,minimumBalance=balance,peakShortfall=0;
   const rows=months.map(m=>{
     const netRevenue=netOfVat(m.earned),operatingProfit=netRevenue-fixedPnl-m.materials-m.preparation-m.processingEarned;
     const cashOut=c.fixedCash+m.materials+m.preparation+m.processingCash+c.otherCashOut;
     const cashChange=m.receipts-cashOut;balance+=cashChange;
     minimumBalance=Math.min(minimumBalance,balance);peakShortfall=Math.max(peakShortfall,-balance);
     return {...m,netRevenue,operatingProfit,cashOut,cashChange,balance};
   });
   const sensitivity=[0,1,2,3,4].map(seats=>{
     const gross=grossTerm*seats,expected=paidTerm*seats,materials=seats*c.weeks*perChildCost,
       prep=seats>0?c.weeks*c.prepPerClass:0,card=expected*c.cardPct/100;
     return {seats,gross,expected,materials,prep,card,contribution:netOfVat(expected)-materials-prep-card};
   });
   const totals=rows.reduce((s,r)=>{for(const k of ['receipts','earned','netRevenue','operatingProfit','cashOut','cashChange','visits','classes'])s[k]+=r[k];return s;},
      {receipts:0,earned:0,netRevenue:0,operatingProfit:0,cashOut:0,cashChange:0,visits:0,classes:0});
   return {input:c,cohorts,rows,totals,sensitivity,materialSelected,perChildCost,grossTerm,paidTerm,allGross,allExpected,
     allChildren,allGroups,allCapacity,unearnedOutside,uncollectedOutside,balance,minimumBalance,peakShortfall};
 }
 global.BW56Planning=Object.freeze({DEFAULTS,validate,compute,monthAt,won,moneyKeys,version:'56.0.0'});
})(typeof window==='object'?window:globalThis);
