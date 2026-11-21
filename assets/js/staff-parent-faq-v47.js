/* Bridge Wonder V47 · Parent questions / staff response drafts.
 * Displayed within authorized staff consultation UI; never inserted into public site.
 * This is a GitHub-hosted source asset, not a confidential repository or policy database.
 * Operational answers are proposed only; flagged answers cannot be copied as approved policy.
 */
(function(global){
  'use strict';
  const GROUPS=Object.freeze([
    {id:'A',title:'등록·프로그램 안내'},
    {id:'B',title:'수업 내용·교육 방향'},
    {id:'C',title:'아이 적응·수업 환경'},
    {id:'D',title:'환불·안전·시설 이용'},
    {id:'E',title:'운영 원칙·추가 메모'}
  ]);
  const DATA=Object.freeze([
    {n:1,group:'A',question:'브릿지원더는 몇 개월부터 몇 개월까지 이용할 수 있나요?',
     original:'앉아있을 수 있는 7개월 부터 의사소통 가능한 48개월',
     answer:'생후 7개월부터 48개월까지 참여할 수 있어요. 월령뿐 아니라 아이의 발달 상태에 맞춰 활동을 준비합니다. 아직 말로 표현하지 못해도 괜찮습니다.',
     status:'draft'},
    {n:2,group:'A',question:'수업료는 얼마인가요? 재료비는 포함되어 있나요?',
     original:'텀 형식으로 운영, 한텀에 10주간의 수업 (주1회 기준), 재료비 포함 (여벌 옷, 앞치마, 미술가운 별도로 준비 / 미술가운은 사이즈 별로 구비 예정 - ikea)',
     answer:'정규 클래스는 주 1회씩 10주를 한 텀으로 운영할 계획입니다. 재료비는 이용료에 포함하고, 여벌 옷이나 앞치마는 별도로 준비해 주세요. 미술가운은 사이즈별로 준비할 예정입니다. 텀 총액과 결제 방식은 확정 후 안내드리겠습니다.',
     status:'review',note:'10주 텀·재료비 포함 정책은 신규안입니다. 기존 홈페이지의 회당 30,000원 안내와 10주 총액, 세금 표시, 시작·중도 등록 및 환불 기준을 대조해야 합니다.'},
    {n:3,group:'A',question:'체험수업이 가능한가요? 비용과 신청 방법은 어떻게 되나요?',
     original:'정규 수업 중간에도 가능, 1-2월 프로모션 기간에는 25,000원, 3월 정규는 35,000원',
     answer:'체험은 정규 클래스가 진행되는 기간에도 남은 자리가 있으면 참여할 수 있어요. 1~2월에는 25,000원 프로모션을, 3월부터는 35,000원 체험료를 검토하고 있습니다. 정확한 가격과 일정은 확정 후 안내하겠습니다.',
     status:'review',note:'3월 35,000원은 기존 공개 홈페이지의 체험 25,000원·정규 30,000원 안내와 다릅니다. 홈페이지 및 결제 시스템의 가격 확정 전 외부 안내 금지.'},
    {n:4,group:'A',question:'수업에 부모님이 함께 참여해야 하나요? 아이 혼자 참여할 수도 있나요?',
     original:'36개월까지는 무조건 보호자 동반, 그 이상은 별도로 반이 편성되는 대로 조율할 예정',
     answer:'현재 운영하는 모든 클래스는 보호자가 함께 참여하는 방식입니다. 36개월이 지난 아이를 위한 별도 분리반은 개설이 확정될 때 따로 안내드리겠습니다.',
     status:'review',note:'현 공개 운영안은 7~48개월 전원 보호자 동반입니다. 36개월 이상 분리반은 아직 개설되지 않았고, 도입 시 법적 운영 형태·안전·등록 요건 재검토가 필요합니다.'},
    {n:5,group:'A',question:'브릿지원더는 일반 영어수업이나 문화센터 오감놀이와 어떤 점이 다른가요?',
     original:'일반 영어수업 (ex: Froebel, Disney English) : 전집 구매 비용 부담 및 대기 가능성\n짜여진 프로그램 안에서의 교구 및 교재이용/ 제한된 사용 및 반복)\n(ex: 일반 영어 전문 교습소) : 교재 활동의 부담/ 일반적으로 분리가능한 나이대',
     answer:'브릿지 원더는 책이나 교재를 구매하지 않아도 참여할 수 있는 놀이 중심 프로그램입니다. 매주 다양한 재료를 직접 만지고 탐색하면서 영어를 자연스럽게 듣고 사용해 보도록 구성합니다.',
     status:'draft',note:'특정 브랜드의 가격·대기·교구 제한을 일반화하거나 부정적으로 비교하지 않도록 응대문에서는 제외했습니다.'},
    {n:6,group:'B',question:'영어를 전혀 접해보지 않은 아이도 참여할 수 있나요?',
     original:'물론이죠, 영어를 처음 접하는 그 누구나 가능합니다.',
     answer:'물론이죠. 영어를 처음 듣는 아이도 편하게 참여할 수 있어요. 알아듣거나 따라 말해야 하는 수업이 아니라 놀이하면서 영어 소리를 접하는 시간입니다.',
     status:'draft'},
    {n:7,group:'B',question:'주 1회와 주 2회 중 선택할 수 있나요? 수업시간과 등록 방식은 어떻게 되나요?',
     original:'기본적으로 주 1회 수업이 일반적이지만, 수요에 따라 조율 예정. 현재로서는 계획 없음',
     answer:'현재는 주 1회 수업을 기본으로 준비하고 있습니다. 주 2회반은 아직 개설 계획이 정해지지 않았어요. 희망 요일을 남겨 주시면 가능한 시간을 상담해 드리겠습니다.',
     status:'review',note:'공개 상담 신청서에는 주 2회 희망 선택지가 있으나, 확정된 정규 주 2회 상품은 없습니다. 주 1회 기본 운영과 신청화면 안내를 일치시켜야 합니다.'},
    {n:8,group:'B',question:'수업은 어떤 방식으로 진행되나요? 매주 다른 재료와 주제로 활동하나요?',
     original:'맞습니다. 텀 당 계절 혹은 여러 주별 주제로 수업 진행 예정입니다.\n매주 단계가 올라가거나 수업 형식이 바뀌지 않으니 언제 등록을 해도 텀 상관없이 수업 가능합니다',
     answer:'계절과 주간 테마에 맞춰 매주 새로운 재료와 놀이를 준비합니다. 앞선 수업을 꼭 들어야 다음 수업에 참여할 수 있는 단계형 과정은 아니에요. 다만 참여 가능한 시점과 이용료는 빈자리와 신청 조건에 따라 안내드립니다.',
     status:'draft',note:'중간 등록 가능 여부와 10주 텀 비용 계산 기준은 별도 확인이 필요합니다.'},
    {n:9,group:'B',question:'특정 식재료에 알레르기가 있는 아이도 참여할 수 있나요?',
     original:'미리 알려주시고 주의사항 동의서 작성 후 수업 예정입니다',
     answer:'수업 전에 어떤 재료를 주의해야 하는지 별도로 상담해 주세요. 사용 재료를 확인하고 참여 방법을 조정할 수 있는지 안내드리겠습니다. 안전하게 진행하기 어렵다면 다른 활동을 제안할 수 있습니다.',
     status:'review',note:'건강·알레르기 정보는 민감정보에 해당할 수 있습니다. 공개 상담 메모가 아닌 제한된 채널과 적절한 처리 근거·동의 절차를 마련한 후 받으세요. 주의사항 동의서가 면책서류는 아닙니다.'},
    {n:10,group:'B',question:'아이가 수업 중 재료를 입에 넣거나 먹으려고 하면 어떻게 하나요?',
     original:'브릿지 원더는 안전에 최선을 다합니다.\n수업 재료는 매번 새롭게 혹은 세척 및 소독 후 사용예정이지만\n본인은 제출한 원아의 알레르기 및 건강 상태 정보가 정확함을 확인합니다. 단, 영아반(부모 동반 수업) 중 보호자의 직접적인 통제 범위를 벗어나 발생한 안전사고에 대해서는 원에 민형사상 책임을 물을 수 없습니다.',
     answer:'영유아는 재료를 입에 넣으려는 행동이 있을 수 있어요. 선생님이 월령별 위험 요소를 확인하고, 보호자와 함께 아이를 살피며 활동을 진행합니다. 재료를 입에 넣으려 하면 즉시 중단하고 안전한 방법으로 안내합니다.',
     status:'review',note:'원문의 “원에 민형사상 책임을 물을 수 없습니다”는 책임을 포괄적으로 면제하는 위험한 문구입니다. 약관규제법 제7조 등을 고려해 계약서·동의서·홈페이지에 사용하지 마세요. 사고 책임은 구체적 과실과 법령에 따라 판단됩니다.'},
    {n:11,group:'C',question:'수업은 어떤 선생님이 진행하나요? 원어민 선생님인가요?',
     original:'10년 이상의 유학생활 (북미 거주, 주언어가 영어인 미국과 캐나다에서 초중고 대학생활까지 마침) 을 경험한 원장 직강.',
     answer:'북미에서 10년 이상 거주하며 공부한 경험이 있는 원장이 직접 수업을 진행할 예정입니다. 영어로 아이와 자연스럽게 소통하면서 활동을 이끌어 갑니다.',
     status:'draft',note:'원어민 국적·자격은 별도 근거 없이 단정하지 않습니다. 실제 원장의 학력·근무 이력이 확인된 범위에서만 소개하세요.'},
    {n:12,group:'C',question:'낯가림이 심하거나 수업 중 계속 울면 어떻게 하나요?',
     original:'부모 동반이기 때문에 가능성은 적어보이나 혹여나 수업에 적응하지 못하는 원아는 다른 날 보강 또는 이월. 모든 분들께 정규 수업 시작 전 체험을 추천함',
     answer:'처음에는 낯설어서 울거나 참여를 망설일 수 있어요. 억지로 참여시키지 않고 보호자와 함께 천천히 적응할 수 있도록 도와드립니다. 체험수업을 먼저 권해 드리며, 계속 참여하기 어려운 경우 일정 조정 가능 여부를 함께 상담하겠습니다.',
     status:'review',note:'보강·이월을 무조건 보장하는 표현은 피하고, 확정된 텀·결석·환불 기준을 적용해야 합니다.'},
    {n:13,group:'C',question:'한 반에 몇 명의 아이가 참여하나요? 선생님은 몇 명인가요?',
     original:'최대 4팀 운영, 형제 및 쌍둥이 포함\n선생님 한명',
     answer:'한 회차에 아이 최대 4명이 참여하고 선생님 한 분이 진행합니다. 현재는 아이 한 명당 보호자 한 명이 함께하는 수업이에요.',
     status:'review',note:'“4팀”이 아니라 “아이 최대 4명” 기준입니다. 쌍둥이·형제는 아이 각각 1명으로 정원에 포함합니다. 보호자 1명이 아이 둘을 동시에 돌보는 예외는 정해지지 않았습니다.'},
    {n:14,group:'C',question:'어린아이가 수업시간 동안 집중하지 못하거나 중간에 쉬고 싶어 하면 어떻게 하나요?',
     original:'자유롭게 탐색 및 놀이하는 시간, 자기주도 적으로 이끌어가는 시간이지만 선생님이 아이의 성향에 맞추어 방향성 조정 및 이끌 예정',
     answer:'괜찮습니다. 아이가 원하는 속도로 만지고 살펴보는 시간이니까요. 잠시 쉬거나 다른 재료에 관심을 보여도 선생님이 아이의 반응에 맞춰 활동을 이어 갑니다.',
     status:'draft'},
    {n:15,group:'C',question:'개인 사정이나 질병으로 결석하면 보강 또는 일정 변경이 가능한가요?',
     original:'네 가능합니다. 같은 주 혹은 보강이 있는 주에 가능합니다. 다만 당일 취소 및 결석은 보강 안됩니다',
     answer:'결석하는 경우 같은 주나 별도로 마련한 보강일에 가능한 자리가 있는지 확인해 드립니다. 당일 취소와 질병 관련 예외, 보강·이월 가능 여부는 최종 이용 조건을 확인한 뒤 안내하겠습니다.',
     status:'review',note:'“당일 결석은 무조건 보강 불가”와 Q17의 발열 시 대체수업 안내가 충돌합니다. 통지 시점·감염 예방·증빙·소비자 관련 기준을 종합해 규정을 확정하세요.'},
    {n:16,group:'D',question:'등록 후 취소하거나 중도 환불받을 수 있나요?',
     original:'개인사유 및 단순변심은 불가능\n마땅한 이유 (아이가 적응이 불가능함, 알러지가 심함, 이사등의 이유만 가능)',
     answer:'취소나 중도 해지를 원하시면 이용한 회차와 결제 내역을 확인해 적용되는 환불 기준에 따라 안내드리겠습니다. 개인 사정으로 그만두는 경우에도 환불 가능 여부와 금액은 관련 법령과 약정에 따라 판단합니다.',
     status:'review',note:'개인 사정·단순 변심을 이유로 모든 환불을 일괄 거절할 수는 없습니다. 학원법 적용 시 자발적 수강 포기도 교습비 반환 사유이며, 미적용 시에도 소비자보호·약관 규제가 적용될 수 있습니다. 10주 텀 환불 산식과 기한을 확정하기 전 외부 공지·복사 금지.'},
    {n:17,group:'D',question:'아이가 감기에 걸리거나 열이 있을 때도 수업에 참여할 수 있나요?',
     original:'안됩니다. 전염성이 없더라도 절대 불가능\n대체 수업으로 가능',
     answer:'열이 있거나 컨디션이 좋지 않은 날에는 아이가 쉬는 것을 권장합니다. 감염 우려가 있는 증상이 있다면 수업 참여를 미뤄 주세요. 대체수업은 일정과 확정된 결석 규정에 따라 안내드립니다.',
     status:'review',note:'모든 비전염성 증상을 일률적으로 금지하는 표현과 Q15 당일 취소 불가를 함께 검토하세요. 참여 중지 및 보강 가능성의 기준을 구체화해야 합니다.'},
    {n:18,group:'D',question:'수업에 참여할 때 준비물이 있나요? 옷이 더러워질 수도 있나요?',
     original:'여벌 옷이나 미술 가운 권유 (spare 미술가운은 구비 예정)',
     answer:'편한 옷과 여벌 옷을 준비해 주세요. 재료가 옷에 묻을 수 있어서 앞치마나 미술가운도 권합니다. 여분의 미술가운은 준비할 예정이에요.',
     status:'draft'},
    {n:19,group:'D',question:'주차가 가능한가요? 기저귀 교체나 수유를 위한 공간이 마련되어 있나요?',
     original:'네 한 매장당 1시간씩만 가능, 기저귀 교체만 가능 (엉덩이를 씻기는 행위는 안됨)',
     answer:'주차와 이용 가능 시간은 건물 운영 기준을 확인해 안내드리겠습니다. 기저귀를 갈 수 있는 공간은 마련할 예정이지만, 별도의 세척 시설은 준비하지 않습니다. 수유 공간 여부도 사전에 안내드리겠습니다.',
     status:'review',note:'주차 1시간 기준이 실제 해당 점포·차량에 적용되는지 관리사무소 확인 필요. 수유 공간은 원문에 확정 내용이 없으므로 있다고 안내하지 마세요.'},
    {n:20,group:'D',question:'수업 중 아이의 사진이나 영상을 받을 수 있나요? SNS에도 게시되나요?',
     original:'sns 동의시 가능, 사진과 함께 알림장 전송 예정 (키즈노트나 카톡으로)',
     answer:'사진과 영상은 보호자 동의 범위에 따라 촬영·공유할 예정입니다. 개별 활동 사진 공유와 SNS 홍보는 각각 선택할 수 있도록 준비하고 있어요. 발송 방식과 빈도는 서비스 확정 후 안내드리겠습니다.',
     status:'review',note:'개별 공유와 SNS 공개 게시를 별도 선택동의로 분리해야 합니다. 카카오톡·키즈노트 사용 여부, 보관기간, 다른 아이가 함께 찍힌 경우 보호, 국외이전·처리위탁 고지는 별도 검토 필요.'},
    {n:21,group:'E',question:'보호자에게 꼭 안내하고 싶은 브릿지원더만의 특징이나 운영 원칙이 있나요?',
     original:'아이가 즐거워 하는게 최우선\n\n단순한 영어 수업이 아닌, 완벽한 \'영어 환경(English Immersion)\'을 선물합니다.\n영어를 학습의 대상으로 접근하지 않습니다. 아이가 오감을 통해 만지고, 느끼고, 탐색하는 놀이의 시작부터 끝(A to Z)까지, 모든 소통의 기본 세팅값이 \'영어\'로 이루어집니다.\n모국어를 자연스럽게 습득하던 그 방식 그대로, 마치 미국 현지의 플레이 센터에서 노는 듯한 몰입 환경을 통해 영어를 \'공부\'가 아닌 \'일상의 언어\'로 체화합니다.',
     answer:'브릿지 원더에서는 무엇보다 아이가 즐거운 시간을 보내는 것이 중요합니다. 영어를 외우거나 시험 보는 대신, 그림책과 노래, 촉감놀이를 하면서 자연스럽게 듣고 만나는 환경을 만들고자 합니다.',
     status:'draft',note:'완벽한 영어 환경, 모국어처럼 습득, 영어 체화 등의 절대적 학습 효과를 보장하는 표현은 피했습니다.'},
    {n:22,group:'E',question:'아직 결정하지 못했거나 추가로 검토해야 할 운영 사항이 있나요?',
     original:'딱히',
     answer:'운영자 추가 의견은 현재 없습니다. 다만 확정 전 검토 항목은 10주 텀 환불 규정, 체험수업 가격 변경, 36개월 이상 수업 유형, 결석 예외, 주차·사진 공유 방식 등입니다.',
     status:'internal',note:'내부 관리자 메모입니다. 보호자에게 전송하지 않습니다.'}
  ]);
  const safe=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const groupFor=id=>GROUPS.find(x=>x.id===id);
  const classFor=status=>status==='review'?'review':status==='internal'?'internal':'draft';
  const statusFor=status=>status==='review'?'확인 필요':status==='internal'?'내부 메모':'응대 초안';
  function addStyle(){
    if(document.getElementById('bw47FaqStyle'))return;
    const el=document.createElement('style');
    el.id='bw47FaqStyle';
    el.textContent=[
      '#workspace .bw47-hub{margin:0 0 20px;border:1px solid #dce4d8;border-radius:12px;background:#fffdf8;overflow:hidden;}',
      '#workspace .bw47-hub>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:13px;flex-wrap:wrap;padding:17px 19px;font-size:14px;color:#40543a;font-weight:760;}',
      '#workspace .bw47-hub>summary::-webkit-details-marker{display:none;}',
      '#workspace .bw47-hub>summary:after{content:"⌄";margin-left:auto;font-size:17px;font-weight:400;color:#71836a;}',
      '#workspace .bw47-hub[open]>summary:after{transform:rotate(180deg);}',
      '#workspace .bw47-head-caption{display:block;flex-basis:100%;color:#73856e;font-size:11px;font-weight:450;line-height:1.65;}',
      '#workspace .bw47-inner{padding:0 17px 18px;}',
      '#workspace .bw47-guidance{padding:12px 15px;margin:0 0 13px;border-left:3px solid #d1693b;border-radius:5px;background:#fbf8f2;color:#5e6c57;font-size:12px;line-height:1.85;word-break:keep-all;}',
      '#workspace .bw47-filter{display:grid;grid-template-columns:minmax(0,2fr) minmax(150px,1fr) minmax(145px,1fr);gap:10px;margin:13px 0 10px;}',
      '#workspace .bw47-filter input,#workspace .bw47-filter select{box-sizing:border-box;width:100%;min-height:41px;padding:9px 11px;border:1px solid #dce4d6;border-radius:8px;background:#fff;color:#40543a;font:12px inherit;}',
      '#workspace .bw47-counter{font-size:11px;color:#75846e;margin:6px 0 13px;}',
      '#workspace .bw47-groups{display:grid;gap:18px;}',
      '#workspace .bw47-group-label{margin:0 0 9px;font-size:12px;color:#5c7353;font-weight:750;}',
      '#workspace .bw47-questions{display:grid;gap:9px;}',
      '#workspace .bw47-item{border:1px solid #e1e5dc;background:#fff;border-radius:10px;overflow:hidden;}',
      '#workspace .bw47-item>summary{cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 14px;list-style:none;color:#40543a;font-size:12px;line-height:1.65;font-weight:650;}',
      '#workspace .bw47-item>summary::-webkit-details-marker{display:none;}',
      '#workspace .bw47-index{flex:none;color:#d1693b;font:700 11px inherit;min-width:31px;}',
      '#workspace .bw47-item-title{flex:1;word-break:keep-all;}',
      '#workspace .bw47-status{flex:none;border-radius:4px;padding:3px 7px;background:#eef2e9;color:#61765a;font-size:10px;white-space:nowrap;}',
      '#workspace .bw47-status.review{background:#fff1e9;color:#96572e;}',
      '#workspace .bw47-status.internal{background:#f0f0ee;color:#757a70;}',
      '#workspace .bw47-content{border-top:1px solid #e8eee3;padding:12px 15px 15px;color:#4d604b;}',
      '#workspace .bw47-content p{margin:0 0 9px;white-space:pre-wrap;word-break:keep-all;font-size:12px;line-height:1.9;}',
      '#workspace .bw47-content strong{display:block;margin-bottom:5px;font-size:11px;color:#607456;}',
      '#workspace .bw47-flag{border:1px solid #ecdccb;border-radius:7px;background:#fff9f3;padding:10px 12px;margin:9px 0;font-size:11px;color:#8c5d3e;line-height:1.8;}',
      '#workspace .bw47-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:9px 0 0;}',
      '#workspace .bw47-actions .btn{font-size:11px;}',
      '#workspace .bw47-original{margin-top:11px;padding-top:10px;border-top:1px dashed #e2e7dd;}',
      '#workspace .bw47-original>summary{cursor:pointer;color:#6e7d69;font-size:11px;}',
      '#workspace .bw47-original p{font-size:11px;color:#697566;line-height:1.8;margin-top:9px;}',
      '#workspace .bw47-copy-status{font-size:11px;color:#597253;}',
      '#workspace .bw47-empty{padding:15px;color:#718469;border:1px dashed #dce5d5;border-radius:8px;font-size:12px;}',
      '@media(max-width:680px){#workspace .bw47-inner{padding:0 12px 15px;}#workspace .bw47-filter{grid-template-columns:1fr;}#workspace .bw47-hub>summary{padding:14px 12px;}#workspace .bw47-item>summary{padding:12px 10px;gap:7px;}#workspace .bw47-index{min-width:28px;}}'
    ].join('\n');
    document.head.appendChild(el);
  }
  function itemHTML(item){
    const copyAllowed=item.status==='draft';
    const label=statusFor(item.status);
    return '<details class="bw47-item" data-bw47-number="'+item.n+'">'+
      '<summary><span class="bw47-index">Q'+item.n+'</span><span class="bw47-item-title">'+safe(item.question)+'</span>'+
      '<span class="bw47-status '+classFor(item.status)+'">'+label+'</span></summary>'+
      '<div class="bw47-content"><strong>보호자 응대 문구 · 초안</strong><p>'+safe(item.answer)+'</p>'+
      (item.note?'<div class="bw47-flag"><strong>운영 확인 사항</strong>'+safe(item.note)+'</div>':'')+
      '<div class="bw47-actions">'+
      (copyAllowed?'<button type="button" class="btn btn-outline btn-small" data-bw47-copy="'+item.n+'">답변 복사</button>':
        '<small>확인 전 보호자에게 전송하지 마세요.</small>')+
      '<span class="bw47-copy-status" data-bw47-feedback="'+item.n+'" role="status"></span></div>'+
      '<details class="bw47-original"><summary>운영자 작성 원문 보기 (검토용)</summary>'+
      '<p>'+safe(item.original)+'</p></details></div></details>';
  }
  function mount(root){
    if(!root||root.querySelector('#bw47FaqHub')||!root.querySelector('#inqSearch'))return;
    addStyle();
    const hub=document.createElement('details');
    hub.id='bw47FaqHub';hub.className='bw47-hub';
    hub.innerHTML='<summary><span>보호자 예상 질문·응대 가이드 <b>22문항</b></span>'+
      '<span class="bw47-head-caption">운영자 작성 답변을 보관한 내부 초안입니다. 확인이 필요한 항목은 별도로 표시했습니다.</span></summary>'+
      '<div class="bw47-inner"><div class="bw47-guidance">이 문답은 직원 상담 참고용으로 작성 중인 자료입니다. 환불·사고 책임·체험료·보호자 분리·보강 기준처럼 확인이 필요한 답변은 그대로 안내하지 마세요. 홈페이지에는 게시되지 않습니다.</div>'+
      '<div class="bw47-filter"><input type="search" id="bw47Search" aria-label="보호자 질문 검색" placeholder="궁금한 질문이나 키워드 검색">'+
      '<select id="bw47GroupFilter" aria-label="질문 분류"><option value="">모든 주제</option>'+
      GROUPS.map(g=>'<option value="'+g.id+'">'+g.id+'. '+safe(g.title)+'</option>').join('')+'</select>'+
      '<select id="bw47StatusFilter" aria-label="답변 확인 상태"><option value="">모든 답변</option>'+
      '<option value="draft">응대 초안</option><option value="review">확인 필요</option><option value="internal">내부 메모</option></select></div>'+
      '<div class="bw47-counter" id="bw47Count" role="status"></div><div id="bw47Results" class="bw47-groups"></div></div>';
    const target=root.querySelector('.panel');
    if(target)root.insertBefore(hub,target);
    else root.appendChild(hub);
    const search=hub.querySelector('#bw47Search'),group=hub.querySelector('#bw47GroupFilter'),
      status=hub.querySelector('#bw47StatusFilter'),result=hub.querySelector('#bw47Results'),
      count=hub.querySelector('#bw47Count');
    const draw=()=>{
      const query=search.value.trim().toLocaleLowerCase('ko-KR');
      const filtered=DATA.filter(item=>
        (!query||[item.question,item.answer,item.original,item.note||''].join(' ').toLocaleLowerCase('ko-KR').includes(query))&&
        (!group.value||item.group===group.value)&&(!status.value||item.status===status.value));
      count.textContent='전체 22문항 중 '+filtered.length+'개 표시 · 확인 필요 '+filtered.filter(x=>x.status==='review').length+'개';
      result.innerHTML=GROUPS.map(g=>{
        const subset=filtered.filter(x=>x.group===g.id);
        return subset.length?'<section class="bw47-group"><h4 class="bw47-group-label">'+g.id+'. '+safe(g.title)+'</h4>'+
          '<div class="bw47-questions">'+subset.map(itemHTML).join('')+'</div></section>':'';
      }).join('')||'<p class="bw47-empty">검색 조건에 맞는 질문이 없습니다.</p>';
    };
    search.addEventListener('input',draw);group.addEventListener('change',draw);
    status.addEventListener('change',draw);
    hub.addEventListener('click',async event=>{
      const button=event.target.closest('[data-bw47-copy]');
      if(!button||!hub.contains(button))return;
      const item=DATA.find(x=>x.n===Number(button.dataset.bw47Copy));
      const feedback=hub.querySelector('[data-bw47-feedback="'+item?.n+'"]');
      if(!item||item.status!=='draft'||!feedback)return;
      try{
        if(!navigator.clipboard?.writeText)throw Error('복사를 지원하지 않는 환경입니다.');
        await navigator.clipboard.writeText(item.answer);
        feedback.textContent='답변을 복사했습니다.';
      }catch(_){feedback.textContent='복사할 수 없습니다. 문구를 선택해 복사해 주세요.';}
    });
    draw();
  }
  function attach(){
    const root=document.getElementById('pageBody');
    if(!root)return;
    let scheduled=false;
    const observer=new MutationObserver(()=>{
      if(scheduled)return;scheduled=true;
      Promise.resolve().then(()=>{scheduled=false;mount(root);});
    });
    observer.observe(root,{childList:true,subtree:false});
    mount(root);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
  global.BW47ParentFAQ=Object.freeze({groups:GROUPS,items:DATA,mount});
})(window);
