/* V56 owner-only regular-course planning. One combined read, no polling or storage of financial values in the browser. */
(function(){
 'use strict';
 const M=window.BW56Planning,F=window.BW49FinanceModel,$=id=>document.getElementById(id);
 if(!M)return;
 let token='',allowed=false,connected=false,busy=false,dirty=false,etag='new',pending=null,computed=null;
 let sources={pricing:null,finance:null,materials:[]},status={};
 const copy=v=>JSON.parse(JSON.stringify(v));
 const money=M.won;
 const scalar=['startMonth','months','weeks','termTotal','payment','vatMode','vatIncluded','refundPct','cardPct','materialExtra','consumable','prepPerClass','fixedCash','fixedVatCredit','depreciation','otherCashOut','openingCash'];
 const stringKeys=new Set(['startMonth','payment','vatMode','vatIncluded']);
 const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
 function msg(id,value,error=false){const el=$(id);el.textContent=value;el.dataset.error=error?'1':'0';}
 function numeric(el){return el.value.trim()===''?NaN:Number(el.value);}
 function element(tag,klass,text){
   const node=document.createElement(tag);if(klass)node.className=klass;if(text!==undefined)node.textContent=text;return node;
 }
 function field(label,key,value,type,min,max,step){
   const wrapper=element('label','bw56-field');wrapper.appendChild(element('span','',label));
   const input=element('input','');input.dataset.key=key;input.type=type;input.value=String(value??'');
   if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);if(step!==undefined)input.step=String(step);
   if(type==='number')input.inputMode=String(step)==='1'?'numeric':'decimal';
   if(type==='text')input.maxLength=key==='label'?110:50;
   wrapper.appendChild(input);return wrapper;
 }
 function appendRow(kind,record){
   const root=$(kind==='cohort'?'bw56Cohorts':'bw56Materials');
   const limit=kind==='cohort'?24:100;
   if(root.children.length>=limit){msg('bw56SaveStatus','추가 가능한 항목 수를 초과했습니다.',true);return;}
   const row=element('div','bw56-entry'+(kind==='material'?' bw56-material':''));
   if(kind==='cohort'){
     row.append(field('첫 수업일','start',record.start,'date'),field('반별 정원','capacity',record.capacity,'number',1,4,1),
       field('유료 등록 인원','seats',record.seats,'number',0,4,1),field('같은 편성 반 수','groups',record.groups,'number',1,200,1));
   }else{
     row.append(field('재료명','label',record.label,'text'),field('단위','unit',record.unit,'text'),
       field('단가 (원)','price',record.price,'number',0,1000000000,1),field('아이당 1회 사용량','qty',record.qty,'number',0,10000,'any'));
   }
   const remove=element('button','btn btn-outline btn-small','삭제');remove.type='button';remove.setAttribute('aria-label',kind==='cohort'?'이 반 편성 삭제':'이 재료 삭제');
   remove.addEventListener('click',()=>{row.remove();changed();});row.appendChild(remove);root.appendChild(row);
 }
 function fill(values){
   for(const key of scalar)$('bw56-'+key).value=String(values[key]);
   $('bw56Cohorts').replaceChildren();$('bw56Materials').replaceChildren();
   for(const row of values.cohorts)appendRow('cohort',row);
   for(const row of values.materials)appendRow('material',row);
   render();
 }
 function collect(){
   const value={};
   for(const key of scalar){const input=$('bw56-'+key);value[key]=stringKeys.has(key)?input.value:numeric(input);}
   function rows(id,textKeys){
     return Array.from($(id).children).map(row=>Object.fromEntries(Array.from(row.querySelectorAll('[data-key]')).map(input=>
       [input.dataset.key,textKeys.includes(input.dataset.key)?input.value:numeric(input)])));
   }
   value.cohorts=rows('bw56Cohorts',['start']);value.materials=rows('bw56Materials',['label','unit']);
   return M.validate(value);
 }
 function output(id,value,negative=false){
   const el=$(id);el.textContent=value;el.dataset.negative=negative?'1':'0';
 }
 function drawTable(id,rows){
   const fragment=document.createDocumentFragment();
   rows.forEach(row=>{
     const tr=document.createElement('tr');
     row.forEach(cell=>{
       const td=document.createElement('td');
       if(typeof cell==='object'){td.textContent=cell.text;if(cell.negative)td.className='bw56-negative';}
       else td.textContent=String(cell);
       tr.appendChild(td);
     });
     fragment.appendChild(tr);
   });
   $(id).replaceChildren(fragment);
 }
 const currencyCell=value=>({text:money(value),negative:value<0});
 function controls(){
   $('bw56Fields').disabled=busy;
   $('bw56Reload').disabled=busy;
   $('bw56Reset').disabled=busy;
   $('bw56Save').disabled=!(allowed&&connected&&!busy&&computed);
   $('bw56CSV').disabled=busy||!computed;
   $('bw56ApplyPrice').disabled=busy||!sources.pricing;
   $('bw56ApplyFinance').disabled=busy||!sources.finance||!F;
   $('bw56ImportMaterial').disabled=busy||$('bw56MaterialSource').value==='';
 }
 function render(){
   try{
     const d=M.compute(collect());computed=d;
     output('bw56Groups',d.allGroups+'개 반');output('bw56Children',d.allChildren+'명');
     output('bw56Fill',d.allCapacity?(100*d.allChildren/d.allCapacity).toFixed(1)+'%':'—');
     output('bw56TermReceipts',money(d.allExpected));
     output('bw56MaterialSubtotal',money(d.materialSelected));output('bw56PerChild',money(d.perChildCost));
     output('bw56Receipts',money(d.totals.receipts));output('bw56Profit',money(d.totals.operatingProfit),d.totals.operatingProfit<0);
     output('bw56Balance',money(d.balance),d.balance<0);output('bw56Shortfall',money(d.peakShortfall),d.peakShortfall>0);
     drawTable('bw56Sensitivity',d.sensitivity.map(r=>[r.seats+'명',currencyCell(r.gross),currencyCell(r.expected),currencyCell(r.materials+r.prep),currencyCell(r.card),currencyCell(r.contribution)]));
     drawTable('bw56Months',d.rows.map(r=>[r.month,r.classes,r.visits,currencyCell(r.receipts),currencyCell(r.earned),
       currencyCell(r.operatingProfit),currencyCell(r.cashOut),currencyCell(r.cashChange),currencyCell(r.balance)]));
     msg('bw56Calculation',d.peakShortfall>0?'예측 기간에 월말 자금 부족 가능성이 있습니다. 과정 시작일·수납 방식·고정비를 확인하세요.':'현재 입력값으로 계산했습니다. 월말 기준 예측이며 일별 자금 부족은 따로 확인해야 합니다.',d.peakShortfall>0);
     $('bw56Outside').textContent=(d.unearnedOutside||d.uncollectedOutside)?
       '예측 기간 밖 제공 예정 매출 '+money(d.unearnedOutside)+' · 기간 밖 예상 수납 '+money(d.uncollectedOutside)+'. 전체 과정 합계에는 포함됩니다.':'현재 편성된 과정의 예정 수업이 모두 예측 기간 안에 있습니다.';
   }catch(e){
     computed=null;
     for(const id of ['bw56Groups','bw56Children','bw56Fill','bw56TermReceipts','bw56MaterialSubtotal','bw56PerChild','bw56Receipts','bw56Profit','bw56Balance','bw56Shortfall'])output(id,'—');
     $('bw56Sensitivity').replaceChildren();$('bw56Months').replaceChildren();$('bw56Outside').textContent='';
     msg('bw56Calculation',String(e.message||'입력값을 확인해 주세요.'),true);
   }
   controls();
 }
 function changed(){dirty=true;render();msg('bw56SaveStatus','수정한 계획이 아직 저장되지 않았습니다.');}
 function sourceStatus(code){return {ready:'불러오기 가능',empty:'저장값 없음',notPublished:'공개 승인 전',unavailable:'연결 또는 권한 확인',error:'자료 확인 필요'}[code]||'확인 전';}
 function refreshSources(){
   const select=$('bw56MaterialSource');select.replaceChildren();
   const placeholder=element('option','','등록 재료 선택');placeholder.value='';select.appendChild(placeholder);
   sources.materials.forEach((r,i)=>{
     const opt=element('option','',r.label+' · '+money(r.price)+(r.unit?' / '+r.unit:''));opt.value=String(i);select.appendChild(opt);
   });
   $('bw56Sources').textContent='공개 요금: '+sourceStatus(status.pricing)+' / 재무 예산: '+sourceStatus(status.finance)+' / 재료: '+sourceStatus(status.materials)+' ('+sources.materials.length+'개)';
   controls();
 }
 function applyPlan(result){
   if(!result||result.version!=='56.0.0'||!result.plan)throw Error('운영계획 서버 응답을 확인해 주세요.');
   const values=result.plan.values?M.validate(result.plan.values):copy(M.DEFAULTS);
   etag=String(result.plan.etag||'new');
   pending=null;dirty=false;connected=true;
   fill(values);
   msg('bw56SaveStatus',result.plan.revision?'저장된 계획 v'+result.plan.revision+' · '+String(result.plan.updatedAt||''):'새 계획입니다. 기본 예시값은 아직 서버에 저장하지 않았습니다.');
 }
 async function reload(force=false){
   if(!allowed||busy)return;
   if(dirty&&!force&&!window.confirm('저장하지 않은 변경 사항을 버리고 최신 계획을 불러올까요?'))return;
   busy=true;controls();
   msg('bw56State','운영계획과 기준 자료를 한 번에 조회하고 있어요.');
   try{
     const r=await rpc('staff56PlanningRead',token);
     applyPlan(r);
     sources={pricing:r.sources?.pricing||null,finance:r.sources?.finance||null,materials:Array.isArray(r.sources?.materials)?r.sources.materials:[]};
     status=r.status||{};refreshSources();
     msg('bw56State','V56 운영계획 서버 연결 완료. 원본 운영 자료는 적용 버튼을 누를 때만 계획에 반영합니다.');
   }catch(e){
     connected=false;sources={pricing:null,finance:null,materials:[]};status={};refreshSources();
     msg('bw56State','현재 V56 저장 서버를 확인하지 못했습니다. 계산·CSV는 이용할 수 있지만 시트 저장은 불가능합니다. '+String(e.message||''),true);
     msg('bw56SaveStatus','서버 저장이 연결되지 않았습니다.',true);
   }finally{busy=false;controls();}
 }
 function importFinance(){
   if(!sources.finance||!F||busy)return;
   const c=F.sanitize(sources.finance),d=F.compute(c);
   if(!window.confirm('기존 재무 예산의 원가·고정비·보험 부담·세금 가정을 이 계획에 복사할까요? 반 편성과 과정 요금은 그대로 유지합니다.'))return;
   const vals={vatMode:c.vatMode,vatIncluded:c.priceVatIncluded,refundPct:c.refundPercent,cardPct:c.cardFeePercent,
     materialExtra:Math.round(c.materialPerChild),consumable:Math.round(c.consumablePerChild),
     fixedCash:Math.round(d.fixedBase+d.vatPaidOnRent+d.peopleTotal+c.ownerHealth),
     fixedVatCredit:Math.round(c.vatMode==='general'?d.vatPaidOnRent:0),
     depreciation:Math.round(c.depreciation),otherCashOut:Math.round(c.ownerPension+c.ownerDraw)};
   for(const [key,value] of Object.entries(vals))$('bw56-'+key).value=String(value);
   changed();msg('bw56SaveStatus','재무 가정을 복사했습니다. 선택 재료와 그 외 재료비 중복 여부를 확인한 뒤 운영계획을 저장하세요.');
 }
 async function save(e){
   e.preventDefault();if(!allowed||!connected||busy||!computed)return;
   const values=collect();
   if(!window.crypto?.randomUUID){msg('bw56SaveStatus','보안 연결에서 다시 시도해 주세요.',true);return;}
   const key=JSON.stringify([etag,values]);
   if(!pending||pending.key!==key)pending={key,requestId:window.crypto.randomUUID()};
   busy=true;controls();msg('bw56SaveStatus','운영계획을 저장하고 있어요.');
   try{
     const r=await rpc('staff56PlanningSave',token,{values,etag,requestId:pending.requestId});
     if(r?.ok!==true)throw Error('저장 결과를 확인하지 못했습니다.');
     applyPlan(r);
     msg('bw56SaveStatus',r.auditWarning?'계획은 저장되었으나 감사 이력 기록을 확인해 주세요.':'운영계획 v'+r.plan.revision+' 저장 완료. 실제 거래나 공개 가격은 변경하지 않았습니다.',Boolean(r.auditWarning));
   }catch(e){msg('bw56SaveStatus',String(e.message||'저장하지 못했습니다.')+' 저장 결과가 불확실하면 다시 조회해 주세요.',true);}
   finally{busy=false;controls();}
 }
 function csv(){
   if(!computed)return;
   const headings=['연월','반 수업 횟수','아이 참여 회수','예상 수납','제공 매출(총액)','추정 손익','현금비 및 충당','순현금 변화','월말 예상 잔액'];
   const rows=computed.rows.map(r=>[r.month,r.classes,r.visits,r.receipts,r.earned,r.operatingProfit,r.cashOut,r.cashChange,r.balance].map((v,i)=>i===0?v:Math.round(v)));
   const content='\uFEFF'+[headings,...rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
   const a=element('a','');a.href=url;a.download='BridgeWonder_정규과정_운영계획_'+computed.input.startMonth+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 $('bw56Form').addEventListener('input',e=>{if(e.target.id==='bw56MaterialSource'){controls();return;}changed();});
 $('bw56Form').addEventListener('change',e=>{if(e.target.id==='bw56MaterialSource')controls();});
 $('bw56Form').addEventListener('submit',save);
 $('bw56Reload').addEventListener('click',()=>reload());
 $('bw56Reset').addEventListener('click',()=>{if(window.confirm('현재 화면의 계획만 기본 예시값으로 되돌릴까요? 저장된 계획은 바뀌지 않습니다.')){fill(copy(M.DEFAULTS));changed();}});
 $('bw56ApplyPrice').addEventListener('click',()=>{
   if(!sources.pricing||busy)return;
   $('bw56-weeks').value=String(sources.pricing.weeks);$('bw56-termTotal').value=String(sources.pricing.total);changed();
 });
 $('bw56ApplyFinance').addEventListener('click',importFinance);
 $('bw56AddCohort').addEventListener('click',()=>{
   appendRow('cohort',{start:$('bw56-startMonth').value+'-01',capacity:4,seats:3,groups:1});changed();
 });
 $('bw56AddMaterial').addEventListener('click',()=>{appendRow('material',{label:'',unit:'개',price:0,qty:1});changed();});
 $('bw56ImportMaterial').addEventListener('click',()=>{
   const index=$('bw56MaterialSource').value;if(index===''||busy)return;
   const r=sources.materials[Number(index)];if(!r)return;
   if(Array.from($('bw56Materials').querySelectorAll('[data-key="label"]')).some(input=>input.value===r.label)&&!window.confirm('같은 이름의 재료가 있습니다. 중복 비용 여부를 확인하고 추가할까요?'))return;
   appendRow('material',{label:r.label,unit:r.unit,price:r.price,qty:1});$('bw56MaterialSource').value='';changed();
 });
 $('bw56CSV').addEventListener('click',csv);
 async function start(){
   try{token=sessionStorage.getItem('bw17_staff_session')||'';}catch(_){}
   if(!token){msg('bw56Access','직원 홈에서 원장 계정으로 로그인한 뒤 이용해 주세요.');return;}
   try{
     const user=await rpc('staffCurrentUser',token);
     if(user?.role!=='owner'||user.mustChange||user.permissions?.read?.finance===false){msg('bw56Access','원장 계정으로 로그인해야 이용할 수 있습니다.',true);return;}
     allowed=true;$('bw56Workspace').hidden=false;$('bw56Access').hidden=true;
     window.BW57Workspace?.setUser(user);window.BW57Workspace?.setGuard(()=>busy?'계획 저장 또는 조회 중입니다. 이동할까요?':dirty||pending?'저장하지 않은 운영계획이 있습니다. 이동할까요?':'');
     fill(copy(M.DEFAULTS));await reload(true);
   }catch(e){msg('bw56Access','직원 로그인 상태를 확인하지 못했습니다. 직원 홈에서 다시 로그인해 주세요.',true);}
 }
 start();
})();
