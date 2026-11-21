/* Bridge Wonder V49 | Studio finance calculation model.
 * Pure client-side math. Budget values are estimates, NOT a tax return.
 * 2026 legislative reference; review rates again for the 2027 opening.
 */
(function(global){
  'use strict';
  const Y=52/12,EPS=.0000001;
  const FIELD_GROUPS=Object.freeze([
    {id:'revenue',title:'클래스 매출·가동률',fields:[
      ['weeklyClasses','주당 운영하는 반(회)','회',8,'예시값 · 한 회차 아이 4명 기준'],
      ['capacity','한 회차 아이 정원','명',4,'운영 상한 4명 · 부모는 매출 인원에 포함하지 않음'],
      ['occupancy','평균 등록률','%',75,'예시값 · 실제 예약률로 수정'],
      ['regularFee','정규 수업 회당 이용료','원',30000,'현재 공개 사이트의 1회 안내 금액'],
      ['termWeeks','정규 텀 기간','주',10,'주 1회 × 10주 · 예약/수납은 텀 단위일 수 있음'],
      ['trialCount','월별 체험 참여 아이','명',0,'체험은 정규 등록과 별도로 입력 · 중복 매출 주의'],
      ['trialFee','체험수업 회당 이용료','원',25000,'1~2월 예정가 · 3월 35,000원은 아직 검토 중'],
      ['otherSales','기타 월매출','원',0,'별도 상품·체험 등 확인된 수입만'],
      ['refundPercent','평균 환불·취소 매출 차감률','%',0,'실제 정책 확정 전 0% 예시'],
      ['materialPerChild','아이당 재료비(1회)','원',3000,'예시값 · 식재료/자연소재·소모품 포함 여부 조정'],
      ['consumablePerChild','아이당 소모품(1회)','원',0,'티슈·앞치마 소모품 등, 재료비와 중복 제외'],
      ['cardFeePercent','결제 수수료율','%',2.0,'예시값 · 결제대행·카드사 실제 약정 확인']
    ]},
    {id:'facility',title:'시설·관리 고정비',fields:[
      ['rent','월세','원',700000,'사용자 제공 · 계약서상 부가세 별도 여부 확인'],
      ['management','기본관리비','원',300000,'사용자 제공 · 공용관리비 포함 항목 확인'],
      ['electricity','전기료','원',0,'미확정 · 기본관리비에 포함되면 중복 입력하지 않음'],
      ['water','수도료','원',0,'수도·하수도, 별도 부과 확인'],
      ['heating','난방·냉방·가스','원',0,'전기료와 중복 주의'],
      ['internet','인터넷·와이파이','원',0,'회선·설치비 별도'],
      ['phone','업무용 전화','원',0,'개인 휴대전화와 업무 사용분 구분'],
      ['security','출입·보안·CCTV','원',0,'장비 렌탈/유지관리'],
      ['cleaning','청소·방역·위생','원',0,'소독제/매트 세척 포함 여부 확인'],
      ['laundry','세탁·미술가운 관리','원',0,'가운 세탁, 보호자 개인 물품 제외'],
      ['waste','쓰레기·폐기물 처리','원',0,'식재료 및 자연소재 폐기'],
      ['repairs','시설 유지보수','원',0,'소규모 보수·교체·소방 점검'],
      ['insurance','배상책임·화재보험료','원',0,'영유아 활동 보장 범위·면책 확인'],
      ['accounting','세무 기장·회계','원',0,'개인사업자 세무대행/장부'],
      ['marketing','광고·인스타그램 홍보','원',0,'콘텐츠 제작·프로모션 포함'],
      ['software','예약·알림장·클라우드','원',0,'도구 이용료, 도메인·호스팅'],
      ['supplies','사무용품·인쇄·문구','원',0,'문서·안내문·교체품'],
      ['rental','단말기·정수기 등 렌탈','원',0,'전산·정수·공기청정기'],
      ['miscFixed','기타 고정비','원',0,'위 항목과 중복되지 않은 금액']
    ]},
    {id:'people',title:'직원·대표자·세무',fields:[
      ['staffGross','직원 월 급여 총액','원',0,'직원 고용 때만 입력 · 대표자 인출은 제외'],
      ['employerPensionPct','직원 국민연금 사업주 부담률','%',4.75,'2026년 기준 · 직원 보수 상·하한 등 실제 고지액 확인'],
      ['employerHealthPct','직원 건강보험 사업주 부담률','%',3.595,'2026년 기준 · 기본 보수월액'],
      ['employerLtcPct','직원 장기요양보험 비율(건보료 대비)','%',13.14,'2026년 기준'],
      ['employerEmploymentPct','직원 고용보험 사업주 부담률','%',1.15,'2026년 150인 미만 가정 · 업종/사업장 확인'],
      ['employerAccidentPct','직원 산재·부담금 추정률','%',0.72,'임시 예시 · 업종별 산재 고시와 부과 내역 확인'],
      ['severancePct','퇴직급여 예상 충당률','%',8.3333,'예시 약 1/12 · 모든 고용형태에 일률 적용 금지'],
      ['contractLabor','강사·외주 인건비','원',0,'용역 계약 지급액 · 원천징수는 예수금 성격 별도'],
      ['ownerHealth','대표자 건강·장기요양보험','원',0,'직장/지역 가입 형태에 따라 실제 납부액 입력 · 경비 산입 검토'],
      ['ownerPension','대표자 국민연금 납입액','원',0,'현금지출 + 종소세 연금보험료공제 추정, 사업 필요경비와 구분'],
      ['ownerDraw','대표자 생활비 인출','원',0,'손익 비용 아님 · 현금흐름에서만 차감'],
      ['depreciation','월 감가상각 추정액','원',0,'비현금 손익비용 · 투자비와 당월 중복 비용처리 주의'],
      ['otherIncomeAnnual','대표자 다른 연간 과세소득','원',0,'종합소득 합산에 따른 추가 세율 추정용'],
      ['deductionAnnual','연간 소득공제 추정액','원',0,'신고 자료 확인 전 추정 · 세액공제는 별도'],
      ['otherInputVat','기타 매입세액 공제 예상액','원',0,'일반과세 시 적격증빙 확인된 매입세액만'],
      ['simplifiedValueAddedPct','간이과세 부가가치율 가정','%',30,'2026 업종별 실제율 확인 전 임의 예시, 확정세액 아님']
    ]},
    {id:'opening',title:'개원자금·투자비(1회성)',fields:[
      ['deposit','임대보증금','원',10000000,'사용자 제공 · 반환 예정 자산, 영업비용 아님'],
      ['keyMoney','권리금·시설 인수비','원',0,'관련 거래가 있을 때만'],
      ['interior','인테리어·도장·가벽','원',0,'기존 2-75호 공간 실측·견적 확인'],
      ['flooring','바닥재·난방·방염','원',0,'안전/방염·시공 영수증 확인'],
      ['furniture','가구·렉·상담 테이블','원',0,'수납·기저귀 교환대 등'],
      ['teachingTools','교구·책·감각놀이 도구','원',0,'내용연수·감가상각 여부 별도'],
      ['safetySetup','소방·안전·위생 시설','원',0,'안전매트·소화기·모서리 보호'],
      ['openingMaterials','초도 재료·가운·소모품','원',0,'월 재료비와 중복주의'],
      ['signage','간판·브랜딩·인쇄','원',0,'옥외광고물 신고 여부 검토'],
      ['devices','POS·태블릿·프린터','원',0,'고정자산 계상 여부 검토'],
      ['broker','부동산 중개·행정 비용','원',0,'계약 후 수수료 기준 확인'],
      ['firstMarketing','개원 광고·사진 촬영','원',0,'월 광고비와 구분'],
      ['contingency','예비비(초기)','원',0,'자금 확보용 · 실제 지출 전 비용 아님'],
      ['workingCapitalMonths','운영자금 여유 개월 수','개월',3,'월 고정현금비 기준 예비 운영자금']
    ]}
  ]);
  const SPECIAL_FIELDS=Object.freeze([
    {key:'vatMode',label:'부가세 과세유형',values:[['general','일반과세 (과세 10%)'],['simplified','간이과세 (과세 · 실제 요율 확인)']]},
    {key:'priceVatIncluded',label:'수업료·체험료의 부가세 포함 여부',values:[['yes','부가세 포함 소비자가격 (기본)'],['no','부가세 별도 청구 (실제 고지 확인)']]},
    {key:'rentVatSeparate',label:'월세 부가세 별도 청구',values:[['no','아니요/미확정'],['yes','별도 10% 청구 확인']]},
    {key:'managementVatSeparate',label:'관리비 부가세 별도 청구',values:[['no','아니요/미확정'],['yes','별도 10% 청구 확인']]}
  ]);
  const CATEGORY=Object.freeze([
    {id:'regular',label:'정규 수업 매출',bucket:'sales'},
    {id:'trial',label:'체험수업 매출',bucket:'sales'},
    {id:'otherSales',label:'기타 매출',bucket:'sales'},
    {id:'refund',label:'환불 지급',bucket:'refund'},
    {id:'rent',label:'월세 지급',bucket:'expense'},
    {id:'management',label:'관리비 지급',bucket:'expense'},
    {id:'utilities',label:'전기·수도·냉난방',bucket:'expense'},
    {id:'materials',label:'식재료·교구 소모품',bucket:'expense'},
    {id:'cleaning',label:'청소·위생·세탁',bucket:'expense'},
    {id:'insurance',label:'보험료',bucket:'expense'},
    {id:'marketing',label:'광고·마케팅',bucket:'expense'},
    {id:'accounting',label:'세무·소프트웨어',bucket:'expense'},
    {id:'payroll',label:'직원 급여·사업주 4대보험',bucket:'expense'},
    {id:'outsourcing',label:'외주·강사비',bucket:'expense'},
    {id:'otherExpense',label:'그 밖의 영업비',bucket:'expense'},
    {id:'ownerHealth',label:'대표자 건강보험 납부',bucket:'ownerHealth'},
    {id:'ownerPension',label:'대표자 국민연금 납부',bucket:'ownerOut'},
    {id:'vat',label:'부가세 납부',bucket:'tax'},
    {id:'incomeTax',label:'종소세·지방소득세 납부',bucket:'tax'},
    {id:'withholding',label:'원천세 예수금 납부',bucket:'tax'},
    {id:'deposit',label:'임대보증금 지급',bucket:'asset'},
    {id:'depositReturn',label:'보증금 회수',bucket:'assetIn'},
    {id:'equipment',label:'인테리어·비품 구입',bucket:'asset'},
    {id:'ownerDraw',label:'대표자 인출',bucket:'ownerOut'},
    {id:'ownerCapital',label:'대표자 자금 투입',bucket:'financingIn'},
    {id:'loan',label:'대출·차입금 유입',bucket:'financingIn'},
    {id:'loanRepay',label:'대출 원금 상환',bucket:'financingOut'},
    {id:'loanInterest',label:'대출이자 지급',bucket:'expense'}
  ]);
  const DEFAULTS=Object.freeze(Object.assign(
    Object.fromEntries(FIELD_GROUPS.flatMap(g=>g.fields.map(f=>[f[0],f[3]]))),
    {vatMode:'general',priceVatIncluded:'yes',rentVatSeparate:'no',managementVatSeparate:'no'}
  ));
  const n=value=>Number.isFinite(Number(value))?Number(value):0;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,n(value)));
  const round=value=>Math.round((Number.isFinite(value)?value:0)+EPS);
  const sum=arr=>arr.reduce((a,b)=>a+n(b),0);
  const krw=value=>round(value).toLocaleString('ko-KR')+'원';
  function sanitize(input){
    const o={...DEFAULTS};
    if(!input||typeof input!=='object')return o;
    FIELD_GROUPS.forEach(g=>g.fields.forEach(f=>{
      if(Object.prototype.hasOwnProperty.call(input,f[0])){
        const max=f[2]==='%'?100:f[2]==='개월'?24:f[0]==='capacity'?4:f[0]==='termWeeks'?52:
          f[0]==='weeklyClasses'?200:f[0]==='workingCapitalMonths'?24:1e10;
        o[f[0]]=clamp(input[f[0]],0,max);
      }
    }));
    o.capacity=4; // fixed studio policy; not a legal facility occupancy conclusion
    for(const f of SPECIAL_FIELDS){
      if(f.values.some(row=>row[0]===input[f.key]))o[f.key]=input[f.key];
    }
    return o;
  }
  function taxBrackets(value) {
    const base=Math.max(0,n(value));
    const bands=[[14000000,.06],[50000000,.15],[88000000,.24],[150000000,.35],
      [300000000,.38],[500000000,.40],[1000000000,.42],[Infinity,.45]];
    let prior=0,tax=0;
    for(const [limit,rate] of bands){
      if(base<=prior)break;
      const v=Math.min(base,limit)-prior;tax+=v*rate;prior=limit;
    }
    return round(tax);
  }
  function compute(raw,items=[]){
    const c=sanitize(raw);
    const monthlyClasses=c.weeklyClasses*Y;
    const regularChildren=monthlyClasses*4*c.occupancy/100;
    const refundFactor=1-c.refundPercent/100;
    const taxable=c.vatMode==='general',priceIncluded=c.priceVatIncluded==='yes';
    const multiplier=taxable&&!priceIncluded?1.1:1;
    const regGross=regularChildren*c.regularFee*refundFactor*multiplier;
    const trialGross=c.trialCount*c.trialFee*multiplier;
    const otherGross=c.otherSales*multiplier;
    const salesGross=regGross+trialGross+otherGross;
    const vatUnresolved=false; // non-exempt taxable business is the configured default
    const revenueBook=taxable?(priceIncluded?salesGross/1.1:salesGross/1.1):salesGross;
    const expenseGroups=FIELD_GROUPS.find(x=>x.id==='facility').fields.map(f=>({
      key:f[0],label:f[1],amount:c[f[0]]
    }));
    const fixedBase=sum(expenseGroups.map(x=>x.amount));
    const extraRentVat=c.rentVatSeparate==='yes'?c.rent*.1:0;
    const extraMgmtVat=c.managementVatSeparate==='yes'?c.management*.1:0;
    const vatPaidOnRent=extraRentVat+extraMgmtVat;
    const vatRecoverable=taxable?Math.max(0,vatPaidOnRent+c.otherInputVat):0;
    const vatPaidNonDeductible=taxable?0:vatPaidOnRent;
    const material=regularChildren*(c.materialPerChild+c.consumablePerChild)+
      c.trialCount*(c.materialPerChild+c.consumablePerChild);
    const processing=salesGross*c.cardFeePercent/100;
    const wages=c.staffGross;
    const employerPension=wages*c.employerPensionPct/100;
    const employerHealth=wages*c.employerHealthPct/100;
    const employerLtc=employerHealth*c.employerLtcPct/100;
    const employerEmployment=wages*c.employerEmploymentPct/100;
    const employerAccident=wages*c.employerAccidentPct/100;
    const severance=wages*c.severancePct/100;
    const employerTotal=employerPension+employerHealth+employerLtc+employerEmployment+employerAccident+severance;
    const peopleTotal=wages+employerTotal+c.contractLabor;
    const variableTotal=material+processing;
    const fixedCash=fixedBase+vatPaidOnRent;
    const allBusinessCashCost=fixedCash+variableTotal+peopleTotal+c.ownerHealth;
    const operatingCosts=fixedBase+vatPaidNonDeductible+variableTotal+peopleTotal+c.ownerHealth+c.depreciation;
    const operatingProfit=revenueBook-operatingCosts;
    const outputVat=taxable?salesGross-salesGross/1.1:0;
    const vatEstimate=taxable?Math.max(0,outputVat-(vatPaidOnRent+c.otherInputVat)):
      salesGross/1.1*c.simplifiedValueAddedPct/100*.10; // simplified taxable: rough provision, not filing formula
    const vatCarry=taxable?Math.max(0,(vatPaidOnRent+c.otherInputVat)-outputVat):0;
    const bizTaxableAnnual=operatingProfit*12-c.ownerPension*12;
    const otherBase=Math.max(0,c.otherIncomeAnnual-c.deductionAnnual);
    const combinedBase=Math.max(0,bizTaxableAnnual+c.otherIncomeAnnual-c.deductionAnnual);
    const annualIncomeTax=Math.max(0,taxBrackets(combinedBase)-taxBrackets(otherBase));
    const annualLocalTax=round(annualIncomeTax*.1);
    const monthlyIncomeTax=(annualIncomeTax+annualLocalTax)/12;
    const grossCashAfterEstimatedPayments=salesGross-allBusinessCashCost-c.ownerPension-
      c.ownerDraw-monthlyIncomeTax-(vatEstimate===null?0:vatEstimate);
    const monthlyLiquidBeforeTax=salesGross-allBusinessCashCost-c.ownerPension-c.ownerDraw;
    const initialItems=FIELD_GROUPS.find(g=>g.id==='opening').fields;
    const initialNonDeposit=sum(initialItems.filter(f=>f[0]!=='deposit'&&f[0]!=='workingCapitalMonths').map(f=>c[f[0]]));
    const operatingReserveMonths=c.workingCapitalMonths;
    const operatingCashReserve=(fixedBase+peopleTotal+c.ownerHealth+vatPaidOnRent)*operatingReserveMonths;
    const startupImmediate=c.deposit+initialNonDeposit;
    const startupTotal=startupImmediate+operatingCashReserve;
    const unitNetRevenue=c.regularFee*(taxable&&priceIncluded?1/1.1:1)*refundFactor;
    const unitFee=c.regularFee*multiplier*refundFactor*c.cardFeePercent/100;
    const unitContribution=unitNetRevenue-c.materialPerChild-c.consumablePerChild-unitFee;
    const trialContribution=c.trialCount*(c.trialFee*(taxable&&priceIncluded?1/1.1:1)-
      c.materialPerChild-c.consumablePerChild-c.trialFee*multiplier*c.cardFeePercent/100);
    const neededProfitCover=fixedBase+vatPaidNonDeductible+peopleTotal+c.ownerHealth+c.depreciation-trialContribution-c.otherSales;
    const targetSeats=unitContribution>0?Math.max(0,neededProfitCover)/unitContribution:Infinity;
    const seatPlaces=monthlyClasses*4;
    const breakEvenFill=seatPlaces>0&&Number.isFinite(targetSeats)?targetSeats/seatPlaces*100:Infinity;
    const targetGroups=c.occupancy>0&&unitContribution>0?
      Math.ceil(targetSeats/(4*c.occupancy/100*Y)):Infinity;
    const cashTerm=c.weeklyClasses*4*c.occupancy/100*c.regularFee*c.termWeeks*multiplier;
    const actual=actualSummary(items);
    return {
      input:c, monthlyWeeks:Y, monthlyClasses, monthlySessions:regularChildren,
      salesGross,regGross,trialGross,otherGross,termCashExample:cashTerm,
      revenueBook,outputVat,vatEstimate,vatCarry,vatUnresolved,vatPaidOnRent,priceIncluded,vatRecoverable,
      fixedBase,expenseGroups,material,processing,variableTotal,peopleTotal,
      wages,employerPension,employerHealth,employerLtc,employerEmployment,employerAccident,severance,employerTotal,
      ownerHealth:c.ownerHealth,ownerPension:c.ownerPension,ownerDraw:c.ownerDraw,
      operatingCosts,operatingProfit,monthlyIncomeTax,annualIncomeTax,annualLocalTax,combinedBase,
      cashBeforeTax:monthlyLiquidBeforeTax,cashAfterTax:grossCashAfterEstimatedPayments,
      cashTaxUnresolved:vatUnresolved,
      startupImmediate,startupTotal,initialNonDeposit,operatingCashReserve,
      unitContribution,breakEvenFill,targetSeats,targetGroups,occupancyFeasible:breakEvenFill<=100,
      actual, annualSales:salesGross*12,annualOperatingProfit:operatingProfit*12
    };
  }
  function actualSummary(entries){
    const groups={income:0,refund:0,opex:0,ownerHealth:0,capex:0,deposit:0,depositReturn:0,
      taxes:0,ownerDraw:0,ownerPension:0,loansIn:0,loansOut:0};
    for(const row of Array.isArray(entries)?entries:[]){
      const category=CATEGORY.find(c=>c.id===row.category),amount=clamp(row.amount,0,1e12);
      if(!category)continue;
      switch(category.bucket){
        case 'sales':groups.income+=amount;break;
        case 'refund':groups.refund+=amount;break;
        case 'expense':groups.opex+=amount;break;
        case 'ownerHealth':groups.ownerHealth+=amount;break;
        case 'asset':if(row.category==='deposit')groups.deposit+=amount;else groups.capex+=amount;break;
        case 'assetIn':groups.depositReturn+=amount;break;
        case 'tax':groups.taxes+=amount;break;
        case 'ownerOut':if(row.category==='ownerPension')groups.ownerPension+=amount;else groups.ownerDraw+=amount;break;
        case 'financingIn':groups.loansIn+=amount;break;
        case 'financingOut':groups.loansOut+=amount;break;
      }
    }
    const operatingPnl=groups.income-groups.refund-groups.opex-groups.ownerHealth;
    const cashIn=groups.income+groups.depositReturn+groups.loansIn;
    const cashOut=groups.refund+groups.opex+groups.ownerHealth+groups.capex+groups.deposit+
      groups.taxes+groups.ownerDraw+groups.ownerPension+groups.loansOut;
    return {...groups,operatingPnl,cashIn,cashOut,netCash:cashIn-cashOut};
  }
  global.BW49FinanceModel=Object.freeze({
    FIELD_GROUPS,SPECIAL_FIELDS,DEFAULTS,CATEGORY,TERM_MONTHLY_WEEKS:Y,
    compute,sanitize,taxBrackets,actualSummary,krw,version:'49.0.0'
  });
})(window);
