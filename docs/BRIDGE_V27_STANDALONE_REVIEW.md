# V27 검토본 — 신전캐나다 방식의 GitHub 독립 관리자 화면

## 확인한 아키텍처 차이
- 기존 신전캐나다 y2c-advisory-portal/admin.html은 GitHub에서 화면과 로그인 폼을 직접 표시하고 assets/js/auth.js가 Google Apps Script /exec를 fetch(POST, text/plain)로 호출합니다.
- 브릿지 원더 V26은 Google HtmlService가 제공하는 google.script.run을 사용하므로 로그인 화면이 Google 웹앱 접근 성공에 의존합니다.
- 신전캐나다와 같은 독립 UI 구조는 Google Apps Script HTTP API 통신이 필요합니다. 외부 Cloudflare는 쓰지 않지만, 이전 요구사항인 API 전혀 사용하지 않기와는 다른 방식입니다.

## 준비한 검토본
- staff/standalone.html: GitHub에서 직접 그리는 로그인·관리 화면. Google iframe 없음.
- assets/js/staff-google-bridge.js: 기존 google.script.run 호출을 Google HTTP POST 통신으로 연결.
- server/apps-script/StaffBridge.gs: 기존 직원 함수 51개만 허용. 권한검사는 기존 Code.gs와 Payroll.gs에서 수행.
- tests/staff-google-bridge.test.cjs: 통신 실패, 보안 허용목록, 권한 검사 연결 등을 확인.

## 검증과 보안 경계
- Google Sheets ID, Script Properties 비밀키, 실급여·아동 데이터는 GitHub에 넣지 않습니다.
- setup 함수는 브라우저에서 호출할 수 없으며, 기존 급여 함수에는 원장 권한 검사가 유지됩니다.
- Google Apps Script ContentService 리디렉션과 cross-origin CORS 제약은 Google 플랫폼이 결정하므로 실제 브라우저 테스트 전 성공을 보장할 수 없습니다.
- Google 웹앱 자체가 파일을 열 수 없습니다 오류를 반환하면 이 브리지도 통신이 차단될 수 있습니다. 계정 접근을 우회하는 기술이 아닙니다.

## 안전한 적용 순서
1. 기존 직원용 Apps Script Code.gs, Payroll.gs, Admin.html, Sheets와 웹앱 배포 URL 백업.
2. 기존 직원용 프로젝트에 StaffBridge.gs를 추가(학부모 상담 프로젝트는 변경하지 않음).
3. 기존 배포를 새 버전으로 수정해 doPost가 반영되도록 함. 새로운 배포 URL을 만들지 않아도 됨.
4. 별도 검증 페이지 staff/standalone.html에서 원장 로그인, 수강생 1건 조회, 수납 저장 검사, 교사 계정의 급여 접근 차단을 테스트.
5. 브라우저 CORS·접근 오류가 없는지 확인한 후에만 staff/index.html 교체를 판단.

## Google Drive 오류 구분
- GitHub 로그인 화면 자체가 열리지 않으면 정적 자산 문제입니다.
- GitHub 로그인 화면이 열리지만 서버 통신 차단 경고가 나오면 Google 배포 URL, CORS 리디렉션, 배포 접근층을 점검합니다.
- 서버가 권한이 없습니다라고 응답하면 해당 계정의 역할·접근권한 설정을 확인합니다.
- 2026년 10월부터 Google 이슈 트래커 #574946511에서 다른 계정이 Google Drive 파일 오류를 보는 Apps Script 플랫폼 문제를 보고하고 있습니다.

## 현재 적용 상태
실제 운영 main, /staff/, Google Apps Script, Google Sheets 데이터와 급여는 변경하지 않았습니다. 이 코드는 새 GitHub 브랜치의 검토용으로만 존재하며, 별도 Google 웹앱 배포 없이 정상 작동한다고 주장하지 않습니다.
