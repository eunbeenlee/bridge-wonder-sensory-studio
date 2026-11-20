/**
 * Bridge Wonder V32 — authenticated inspection-readiness PDF.
 * Generates an internal status/evidence index only. This PDF is NOT an
 * official inspection certificate and does NOT prove statutory compliance.
 * No student names, guardian contacts, account numbers or health data.
 */
const BW32_INSPECTION_ITEMS_ = Object.freeze([
  ['REG01','학원 등록증·등록 교습과정·학원명 확인'],
  ['REG02','시설 변경·운영자 변경 등 신고사항 및 원본 확인'],
  ['REG03','교습비·기타경비 게시 및 홈페이지 광고표시'],
  ['REG04','교습시간·유아 과정 운영 조건 확인'],
  ['REG05','학원 원칙·등록증의 비치 및 게시 확인'],
  ['FEE01','교습비 영수증 원부·현금출납부 대조'],
  ['FEE02','수강생 대장·출석부·직원명부 확인'],
  ['FEE03','교습비 반환 기준 고지·반환기한 점검'],
  ['FEE04','교습비 변경 신고·증빙 자료 관리'],
  ['FEE05','결제·납부·영수증 발행 이력 대조'],
  ['STAFF01','강사 채용·해임 및 신고·자격 서류'],
  ['STAFF02','성범죄·아동학대 관련 취업제한 조회 확인'],
  ['STAFF03','해당 종사자 법정 의무교육 확인'],
  ['STAFF04','근로계약·급여대장·법정 보험 구분 확인'],
  ['PRIV01','만 14세 미만 법정대리인 동의·확인 기록'],
  ['PRIV02','사진·영상 선택동의·철회 관리'],
  ['PRIV03','개인정보처리방침·보유/파기 기준'],
  ['PRIV04','직원별 개인정보 접근권한·이력·백업'],
  ['SAFE01','학원 배상책임보험·공제가입 증권과 만기'],
  ['SAFE02','비상대피·소방시설·안전계획'],
  ['SAFE03','영유아 보호자 인계·비상연락 절차'],
  ['SAFE04','식재료·자연소재 위생·삼킴 위험'],
  ['SAFE05','시설 면적·안전설비·사용 용도 일치 확인'],
  ['OPS01','교육청 현장점검 제출자료·보관처'],
  ['OPS02','정기 점검·미비사항 조치·재점검'],
  ['OPS03','월간 강의계획과 안전 점검 기록']
]);
function bw32PdfText_(v,max) {
  const str=bw17Safe_(v==null?'':v,max||180);
  return str||'미기록';
}
function bw32PdfTable_(body,headers,rows) {
  const grid=[headers].concat(rows);
  const table=body.appendTable(grid.map(row=>row.map(c=>String(c===undefined||c===null?'':c))));
  table.setBorderColor('#d9e0d5').setBorderWidth(0.5);
  for(let j=0;j<headers.length;j++) {
    table.getCell(0,j).setBackgroundColor('#e8f0e8');
    table.getCell(0,j).editAsText().setBold(true).setFontSize(8).setForegroundColor('#30523c');
  }
  for(let i=1;i<grid.length;i++) {
    for(let j=0;j<headers.length;j++) table.getCell(i,j).editAsText().setFontSize(8);
  }
  body.appendParagraph('');
  return table;
}
function staff32DownloadInspectionPdf(token) {
  const user=bw24Authorized_(token,'compliance','read',['owner','director']);
  const now=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm');
  const checks=bw32Rows_(bw32Tab_(BW32.CHECKS,BW32.CHECK_HEADERS),500);
  const checkMap=new Map(checks.map(r=>[String(r[0]),r]));
  const legacy=bw18Rows_(bw18OpsTab_(),250);
  const today=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');
  const checkRows=BW32_INSPECTION_ITEMS_.map(([code,title])=>{
    const r=checkMap.get(code)||[];
    const due=String(r[3]||'');
    return {
      code,title,status:String(r[1]||'미확인'),applies:String(r[2]||'확인필요'),
      due,checked:String(r[7]||''),assignee:String(r[4]||''),
      evidence:String(r[5]||''),note:String(r[6]||''),
      late:due&&due<today&&r[1]!=='내부확인',
    };
  });
  const verified=checkRows.filter(r=>r.status==='내부확인'&&r.applies==='적용').length;
  const missing=checkRows.filter(r=>r.status!=='내부확인'&&r.applies!=='해당없음').length;
  const overdue=checkRows.filter(r=>r.late).length;
  const outstanding=legacy.filter(r=>r[4]!=='완료');
  const financeAllowed=bw24Can_(user,'tuition','read');
  const refunds=financeAllowed?bw32Rows_(bw32Tab_(BW32.REFUNDS,BW32.REFUND_HEADERS),500):[];
  const refundOpen=refunds.filter(r=>r[7]!=='반환완료');
  const number='BW-INS-'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,12);
  const filename='BridgeWonder_Inspection_Readiness_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmm')+'.pdf';
  const doc=DocumentApp.create('비공개_학원현장점검_'+number);
  let closed=false;
  try{
    const body=doc.getBody();
    body.appendParagraph('BRIDGE WONDER').setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .editAsText().setBold(true).setForegroundColor('#40543a');
    body.appendParagraph('학원 현장점검 준비현황 및 증빙목록  |  내부 관리용')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('작성시각: '+now+' (KST)   문서번호: '+number+'   기준: 2026-11 / 부산광역시');
    body.appendParagraph('본 문서는 직원이 기록한 준비 현황을 정리한 내부 참고자료이며 교육청 확인서, 실제 점검 결과 또는 법적 적합성 증명서가 아닙니다.')
      .editAsText().setForegroundColor('#9a4f32').setFontSize(9);
    body.appendParagraph('');
    body.appendParagraph('1. 운영 현황 요약').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    bw32PdfTable_(body,['확인항목','건수'],[
      ['확인 목록 전체',checkRows.length],
      ['내부 확인 기록(적용 항목)',verified],
      ['확인 또는 보완이 필요한 항목',missing],
      ['확인 예정일이 지난 항목',overdue],
      ['기존 개원·운영 점검의 미완료 항목',outstanding.length],
      ['반환 처리기한 관리 미완료',financeAllowed?refundOpen.length+'건':'열람권한 없음']
    ]);
    body.appendParagraph('2. 법정·행정 확인 항목 / 증빙 참조').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    bw32PdfTable_(body,['코드 / 확인 항목','적용·상태','예정일 / 확인일','증빙 참조'],checkRows.map(r=>[
      r.code+'  '+r.title,
      r.applies+' / '+r.status,
      (r.due||'미설정')+' / '+(r.checked||'미확인')+(r.late?' [기한 경과]':''),
      bw32PdfText_(r.evidence,110)
    ]));
    body.appendParagraph('3. 기존 운영 점검표 대조 (이전 기록 유지)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    bw32PdfTable_(body,['기존 코드 / 업무','상태','예정일 / 담당자'],legacy.map(r=>[
      bw32PdfText_(r[0],18)+'  '+bw32PdfText_(r[2],90),
      bw32PdfText_(r[4],20),
      bw32PdfText_(r[5],18)+' / '+bw32PdfText_(r[6],30)
    ]));
    body.appendParagraph('4. 환불 사유·기한 관리 현황').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    if(financeAllowed){
      bw32PdfTable_(body,['관리번호','사유 발생일 / 확인기한','진행상태 / 실제 반환일'],refunds.map(r=>[
        bw32PdfText_(r[0],36),
        bw32PdfText_(r[3],18)+' / '+bw32PdfText_(r[4],18),
        bw32PdfText_(r[7],24)+' / '+bw32PdfText_(r[8],18)
      ]));
    }else{
      body.appendParagraph('수납·환불 관리 메뉴에 대한 별도 접근권한이 없어 이 항목은 포함하지 않았습니다.');
    }
    body.appendParagraph('5. 현장 확인용 원본 서류 위치 체크').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('□ 학원 설립·운영 등록증  □ 교습비 게시표  □ 수강생대장  □ 출석부');
    body.appendParagraph('□ 교습비 영수증 원부  □ 현금출납부  □ 직원명부  □ 강사 자격·신고자료');
    body.appendParagraph('□ 배상책임보험(공제) 증권  □ 시설·소방 관련 서류  □ 개인정보처리방침');
    body.appendParagraph('□ 법정대리인 동의 원본  □ 안전점검 기록  □ 교습비 반환 이력');
    body.appendParagraph('증빙파일은 이 PDF에 자동 첨부되지 않습니다. 원본 제출 여부는 담당자가 실제 파일·장부를 확인해야 합니다.');
    body.appendParagraph('6. 법령·검토 기준 (원문 링크)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    [
      '학원법 및 시행령 제18조 (반환기준/기한): https://www.law.go.kr/LSW/lumLsLinkPop.do?lspttninfSeq=83246',
      '학원법 시행규칙 (영수증 원부·수강생대장 등): https://www.law.go.kr/lsInfoP.do?lsId=008606',
      '부산 학원 조례: https://www.law.go.kr/LSW/ordinInfoP.do?ordinId=211001',
      '부산 학원 조례 시행규칙: https://www.law.go.kr/ordinInfoP.do?ordinId=211002',
      '개인정보 보호법 제22조의2: https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029335069'
    ].forEach(line=>body.appendParagraph(line).editAsText().setFontSize(8));
    body.appendParagraph('※ 법령 및 행정해석 변경, 실제 등록 업종, 교육지원청 판단에 따라 적용범위가 달라질 수 있습니다. 점검 전 최신 규정을 다시 확인하세요.')
      .editAsText().setFontSize(8);
    doc.saveAndClose();closed=true;
    const pdf=DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(filename);
    const bytes=pdf.getBytes();
    if(bytes.length>2*1024*1024)throw Error('점검 PDF 파일이 제한 용량을 초과했습니다. 항목 수를 확인해 주세요.');
    // Keep a private copy as an immutable snapshot, never a public URL.
    const folder=bw19Folder_('original');
    const saved=folder.createFile(pdf);saved.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const hash=bw19Hex_(bytes);
    bw17Audit_(user,'학원 현장점검 PDF 다운로드',number,'성공',checkRows.length+' 항목 / '+hash.slice(0,16));
    return {ok:true,filename,contentType:'application/pdf',base64:Utilities.base64Encode(bytes),
      generatedAt:now,reportId:number,sha256:hash,stored:true};
  }finally{
    if(!closed){try{doc.saveAndClose();}catch(_){ }}
    try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(_){ }
  }
}
