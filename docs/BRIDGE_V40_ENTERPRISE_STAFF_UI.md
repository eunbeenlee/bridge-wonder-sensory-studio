# Bridge Wonder V40 — Corporate Staff Workspace

**대상:** `https://bridgewonder.bridgeacademy.co.kr/staff/` 직원 운영 사이트의 화면 디자인만 변경합니다.

## 사용자 요청
기존 V39 사이트는 상단 그룹 메뉴와 많은 중첩 카드, 제각각인 테두리·버튼 스타일 때문에 업무 시스템보다 프로모션 페이지처럼 보일 수 있었습니다. V40은 실제 업무에 집중하는 기업용 관리자 화면 형태로 정리합니다.

## 변경 내용
- **데스크톱(1080px 이상):** 기존 서버 권한을 그대로 반영하는 그룹형 왼쪽 고정 사이드바 + 간결한 상단 제목/직원 정보 + 업무 검색(Ctrl/⌘+K)과 보호자 PDF 바로가기
- **태블릿·모바일:** 기존 상단 그룹형 메뉴·검색·PDF 기능을 유지하며 너비에 맞게 항목과 입력 폼을 축소·정렬
- **홈 화면:** 각자 둥근 카드로 분리되던 운영 현황을 하나의 KPI 바 형태로 표시하고, 업무 바로가기를 테두리 없는 업무 목록으로 구성
- **콘텐츠 디자인:** 하얀 배경, 얇은 회색 선, 균일한 8~10px 곡률, 일관된 폼/테이블/버튼. 강조색은 기존 브릿지 원더 포레스트 그린 유지
- **로그인 및 계정 복구:** 공식 로고와 세이지색·아이보리 톤을 보존하면서 브랜드 소개/업무 로그인 2열(모바일 1열)로 개편. 이메일 OTP, 첫 계정 비밀번호 설정, 접속 도움말도 같은 입력 UI로 정리. 모든 인증 ID와 계정·세션 처리 로직은 그대로

## 유지한 기능
- 기존 `MENU`, `BW24_CAPS`, `staffCurrentUser`, 직원별 Google 권한, 로그인/로그아웃
- 학생 기본정보, 월간 테마, 반·출결, 수납·급여, 계약 PDF 및 발급 이력
- 자료는 기존 Google Apps Script와 비공개 Sheets에만 보관, 새 API나 외부 서비스 호출 없음
- 메인 홈페이지 및 `/sensory-studio/` 전체 공개 페이지는 미변경
- Google Apps Script `Code.gs`, `Admin.html`, `Payroll.gs`, `StaffBridge.gs`와 기존 배포 설정 미변경

## 적용 방식
CSS `assets/css/staff-enterprise-v40.css` 하나를 기존 스타일 파일 뒤에 추가했습니다. `staff/index.html`, `staff/standalone.html`의 로그인 구조를 새롭게 배치하되 원래 로그인·계정 인증·OTP·Google 직접 접속·서버 재확인 버튼과 모든 ID는 유지했습니다. Apps Script 직원 `/exec` 페이지는 그대로입니다.

**별도 설치/실행 함수 없음.** GitHub PR이 메인 브랜치로 병합되고 Pages가 배포되면 직원 사이트에 자동 반영됩니다.

## 검증
- 기존 전 기능 검증 `npm run check` / GitHub Actions
- 신규 `tests/staff-enterprise-v40.test.cjs`에서 로그인/권한·원본 라우트·데스크톱 사이드바·모바일 그룹 메뉴·KPI·폼/테이블·브랜드값 유지 확인
- 실제 페이지는 로그인 및 Google 서버 환경에 따라 데이터가 달라질 수 있으며, CI는 CSS 및 가상 직원 화면을 사용합니다.
