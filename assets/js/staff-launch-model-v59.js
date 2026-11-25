/* V59: editable reference templates from Bridge Wonder B-plan V3 and launch planning.
 * Static templates contain no actual prices, supplier contacts, staff/customer records or confidential files.
 */
(function(g){
 'use strict';
 const months=[
 ['Winter & Holidays','감귤','감귤(공급·인증 확인)','면직물·원목'],
 ['All About Me','고구마','고구마','면직물·원목'],
 ['Colors of Weather','봄동','배추','면직물·종이'],
 ['Little Crawlers','오이','애호박','원목·종이'],
 ['My Super Family','당근','고구마','원목·면직물'],
 ['Under the Sea','오이','애호박','면직물·물'],
 ['Dinos Rule!','애호박','오이','원목·면직물'],
 ['My Five Senses & Food','수박','참외','면직물·종이'],
 ['Wild Animals','단호박','고구마','원목·종이'],
 ['How Do We Go?','사과','단호박','원목·종이'],
 ['Who Are the Helpers?','무','배추','원목·면직물'],
 ['Space Adventure','감귤','고구마','면직물·종이']
 ];
 const ages=['7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'];
 const statuses=['미확인','진행중','검토완료','보류'];
 const groups=['시설·공사','안전·보험·동의','교육·운영','홍보'];
 const channels=['인스타그램 광고','부산·경남 맘카페','명지 지역 맘카페','육아 인플루언서','네이버 플레이스','당근마켓','아파트 게시판','아파트 엘리베이터','네이버 블로그 체험단','네이버 검색광고','부산 육아정보 SNS','공식 인스타그램','공식 네이버 블로그','카카오톡 채널','산후조리원','소아과·키즈카페','베이비페어·유아박람회','아파트 입주민 앱','지역 상가 전단지','기존 회원 추천','아파트너','아파트리','아파트아이'];
 const tasks=[
 ['시설·공사','2-75호 실측·가벽 배치','A/B 강의실과 상담·교구보관·기저귀 교환 공간, 복도 실측 및 용도 검토'],
 ['시설·공사','수도·전기·온수 확인','관리단과 점검구·기존 배관 및 전기 용량, 온수 방식 확인'],
 ['시설·공사','B실 가벽 및 선행 공사','가벽·수도·전기 선행 공사 확인 후 바닥 작업. 시공 순서는 시공업체와 확정'],
 ['시설·공사','단열재·전기판넬·바닥 마감','가벽 선행 확인, 열선 적합성·전기안전·난방 시험 후 마감'],
 ['시설·공사','시트지·간판·실물 색상 검수','출력 색상·실측 치수·업체 테스트 출력 확인'],
 ['안전·보험·동의','영업 형태 및 관할 확인','보호자 동반 오감놀이 모델의 업종·시설·관할 요건 확인. 학원 등록 단정 금지'],
 ['안전·보험·동의','배상책임보험 검토','시설·영업배상, 구내 치료비, 식재료·알레르기 담보의 적용·제외 및 한도 확인'],
 ['안전·보험·동의','01 이용 신청·등록','법정대리인과 실제 동반 보호자 확인'],
 ['안전·보험·동의','02 10주 이용약관·환불','요금 320,000원 및 실제 사업형태별 환불 규정 검토'],
 ['안전·보험·동의','03 동반 안전수칙·위험 고지','전 연령 보호자 1명 동반 필수, 운영자 법정 책임 면제 금지'],
 ['안전·보험·동의','04 알레르기·건강정보','민감정보 별도 동의, 최소 수집·접근권한 검토'],
 ['안전·보험·동의','05 개인정보·선택 촬영','촬영·홍보 선택 동의 분리, 거부에 따른 이용 불이익 금지, 보유기간 확정'],
 ['안전·보험·동의','06 응급 연락·대응·서명','비상연락·현장 대응·최종 서명, 실제 동의서 버전 확인'],
 ['안전·보험·동의','비상대피·사고 대응 시연','응급연락 체계, 사고 기록, 교사 시연 및 보호자 안내'],
 ['교육·운영','12개월 테마·48회 마스터 확인','B안: 월 1·3회 식재료, 2·4회 자연소재. 주차는 실제 시간표에 맞춰 배정'],
 ['교육·운영','첫 3개월 12회 수업안 준비','회차별 영어 표현·월령별 실행·재료·대체 활동 검토'],
 ['교육·운영','첫 4회 시연 및 준비시간 측정','교사용 진행안, 안전·세척·정리, 보호자 피드백 점검'],
 ['교육·운영','36~48개월 IBL + Art 연계','Project Art Level 1 원본 목차·페이지 매칭 미확정. 원본 확인 후 승인'],
 ['교육·운영','발주 견적·구매 단위 검토','신선 원물 1·3회 별도 구매, 실제 단가·배송·공급처 확인'],
 ['교육·운영','개원 일정 및 안내 최종 검수','2027년 1월 예정. 홍보물의 0~48개월 표기는 7~48개월로 통일 검토'],
 ['교육·운영','정규 과정 및 시간표 검토','50분, 주 1회 10주 320,000원, 최대 4명, 실제 등록 인원 0~4명']
 ];
 const integer=(v,lo,hi,name)=>{if(!Number.isSafeInteger(v)||v<lo||v>hi)throw Error(name+' 범위를 확인해 주세요.');return v;};
 const finite=(v,lo,hi,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(name+' 범위를 확인해 주세요.');return v;};
 const string=(v,max,name)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error(name+' 입력값을 확인해 주세요.');return v.trim();};
 const date=v=>{if(v==='')return '';if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))throw Error('예정일을 확인해 주세요.');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('예정일을 확인해 주세요.');return v;};
 const nullableWon=(v,name)=>v===null?null:integer(v,0,1000000000,name);
 function defaults(){
   return {year:2027,lessons:months.flatMap((r,i)=>[1,2,3,4].map(w=>({
     id:'L'+(i+1)+'-'+w,month:i+1,week:w,theme:r[0],kind:w%2?'식재료':'자연소재',
     material:w%2?r[1]:r[3],alternative:w%2?r[2]:'연령 적합 대체 교구',
     english:['Look! / What do you see?','Touch / Big / Small','I see / Same / Different','I made it / Show me'][w-1],
     status:'미확인',note:'',counts:[3,4,4,4,4],ageGroups:[1,1,1,1,1],classes:5,grams25:45,grams36:60,demo:200,loss:15,pack:1000,price:null,
     prep:w%2?18:10,cleanup:w%2?20:15,shared:w%2?20:0
   }))),tasks:tasks.map((r,i)=>({id:'T'+(i+1),group:r[0],title:r[1],note:r[2],status:'미확인',due:'',assignee:'',budget:null,actual:null,leads:null,trials:null,registrations:null})).concat(
     channels.map((name,i)=>({id:'M'+(i+1),group:'홍보',title:name,note:i>=20?'입주민 앱 세부 견적·지역별 이용자 수 확인; 상위 채널과 중복 집계 주의':'부산 전역·양산 및 인접 지역 검토; 비용·광고 조건 미확정',status:'미확인',due:'',assignee:'',budget:null,actual:null,leads:null,trials:null,registrations:null}))
   )};
 }
 function validate(raw){
   if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('계획 형식을 확인해 주세요.');
   const year=integer(raw.year,2026,2099,'연도');
   if(!Array.isArray(raw.lessons)||raw.lessons.length!==48||!Array.isArray(raw.tasks)||raw.tasks.length>80)throw Error('48회 수업안과 업무 항목 수를 확인해 주세요.');
   const ids=new Set(),slots=new Set();
   const unique=v=>{const id=string(v,40,'관리 ID');if(!/^[A-Z0-9-]+$/.test(id)||ids.has(id))throw Error('중복 또는 잘못된 관리 ID');ids.add(id);return id;};
   const state=v=>{if(!statuses.includes(v))throw Error('상태를 확인해 주세요.');return v;};
   const lessons=raw.lessons.map(r=>{
     if(!r||typeof r!=='object'||Array.isArray(r))throw Error('수업안 형식');
     const month=integer(r.month,1,12,'월'),week=integer(r.week,1,4,'회차'),key=month+'-'+week;
     if(slots.has(key))throw Error('중복 회차');slots.add(key);
     const kind=week%2?'식재료':'자연소재';
     if(r.kind!==kind)throw Error('월 1·3회 식재료, 2·4회 자연소재 기준을 유지해 주세요.');
     if(!Array.isArray(r.counts)||r.counts.length!==5)throw Error('월령별 인원 확인');
     const theme=string(r.theme,90,'테마'),material=string(r.material,90,'재료');
     if(!theme||!material)throw Error('테마와 재료를 입력해 주세요.');
     const counts=r.counts.map(v=>integer(v,0,4,'반별 참여 인원'));
     if(!Array.isArray(r.ageGroups)||r.ageGroups.length!==5)throw Error('월령별 반 수를 확인해 주세요.');
     const ageGroups=r.ageGroups.map(v=>integer(v,0,20,'월령별 운영 반 수')),classes=ageGroups.reduce((n,v)=>n+v,0);
     return {id:unique(r.id),month,week,theme,kind,material,alternative:string(r.alternative,100,'대체 재료'),english:string(r.english,150,'영어 표현'),
       status:state(r.status),note:string(r.note,250,'수업 메모'),counts,ageGroups,classes,grams25:finite(r.grams25,0,1000,'25~35개월 배정량'),grams36:finite(r.grams36,0,1000,'36~48개월 배정량'),
       demo:finite(r.demo,0,5000,'교사 시범량'),loss:finite(r.loss,0,100,'여유율'),pack:integer(r.pack,1,100000,'구매 단위'),price:nullableWon(r.price,'kg당 단가'),
       prep:integer(r.prep,0,240,'준비시간'),cleanup:integer(r.cleanup,0,240,'정리시간'),shared:integer(r.shared,0,480,'공동 준비시간')};
   });
   const tasks=raw.tasks.map(t=>{
     if(!t||typeof t!=='object'||Array.isArray(t)||!groups.includes(t.group))throw Error('업무 구분을 확인해 주세요.');
     const title=string(t.title,90,'업무명');if(!title)throw Error('업무명을 입력해 주세요.');
     const kpi=(v,n)=>v===null?null:integer(v,0,1000000,n);
     return {id:unique(t.id),group:t.group,title,note:string(t.note,250,'업무 메모'),status:state(t.status),due:date(t.due),assignee:string(t.assignee,60,'담당'),budget:nullableWon(t.budget,'예산'),actual:nullableWon(t.actual,'실제비용'),leads:kpi(t.leads,'문의'),trials:kpi(t.trials,'체험'),registrations:kpi(t.registrations,'등록')};
   });
   const result={year,lessons,tasks};
   if(JSON.stringify(result).length>45000)throw Error('계획 분량이 너무 큽니다. 메모를 줄여 주세요.');
   return result;
 }
 function order(r){
   const food=r.kind==='식재료',classes=r.ageGroups.reduce((a,b)=>a+b,0),people=r.counts.reduce((s,n,i)=>s+n*r.ageGroups[i],0);
   const net=food?r.counts[3]*r.ageGroups[3]*r.grams25+r.counts[4]*r.ageGroups[4]*r.grams36+classes*r.demo:0;
   const need=net*(1+r.loss/100),grams=food?Math.ceil(need/r.pack)*r.pack:0;
   const cost=!food||grams===0?0:r.price===null?null:Math.round(grams/1000*r.price);
   return {people,net,need,grams,cost,minutes:classes?(r.prep+r.cleanup)*classes+r.shared:0};
 }
 function summarize(raw){
   const v=validate(raw),orders=v.lessons.map(order),ads=v.tasks.filter(t=>t.group==='홍보');
   const sum=(rows,key)=>rows.reduce((a,r)=>a+(r[key]??0),0);
   return {lessonsDone:v.lessons.filter(t=>t.status==='검토완료').length,first12Done:v.lessons.filter(t=>t.month<=3&&t.status==='검토완료').length,
     tasksDone:v.tasks.filter(t=>t.status==='검토완료').length,taskCount:v.tasks.length,foodCost:sum(orders,'cost'),missingQuotes:orders.filter(o=>o.cost===null).length,
     minutes:sum(orders,'minutes'),adBudget:sum(ads,'budget'),adActual:sum(ads,'actual'),adUnknown:ads.filter(x=>x.budget===null).length,
     registrations:sum(ads.filter(x=>x.title!=='아파트 입주민 앱'),'registrations')};
 }
 g.BW59=Object.freeze({months,ages,statuses,groups,defaults,validate,order,summarize,version:'59.0.0'});
})(typeof window==='object'?window:globalThis);
