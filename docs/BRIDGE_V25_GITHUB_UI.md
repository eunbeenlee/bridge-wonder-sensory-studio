# Bridge Wonder V25 — GitHub 화면 · Google 서버 분리

## 원칙
- GitHub: `staff/administration.html`, `assets/css/administration.css`, `assets/js/administration.js`, `assets/js/administration-layout.js`
- Google Apps Script: 기존 V24.1 `Code.gs` 그대로, 간소화된 `Admin.html` 실행 셸
- Google Sheets / Drive: 원본 데이터 · 문서 · 백업 그대로
- 외부 Cloudflare / D1 / 별도 API 없음. GAS 내부 `google.script.run`만 사용.

## 안전한 적용 순서
1. 기존 직원 관리자 `Code.gs`, `Admin.html`, Sheets 백업.
2. 이 브랜치를 검토하고 **GitHub 파일부터 main에 반영**. 새 정적 UI 자산이 HTTPS에서 열리는지 확인.
3. **그다음** 직원 관리자 Apps Script의 `Admin.html`만 'V25 최소 셸'로 교체.
4. `Code.gs`와 프로젝트 속성은 변경하지 말고 기존 배포를 새 버전으로 수정.
5. 기존 /exec 주소에서 비밀번호 로그인 · 권한 · 수업반 편집 · 출결 · 문서 발급을 테스트.
6. 자체 도메인 `/staff/`의 iframe 테스트. 브라우저 제한 시 직접 접속 링크 확인.

## 이후 화면 수정
- 스타일: `assets/css/administration.css`만 수정하고 Push.
- 동작: `assets/js/administration.js`만 수정하고 Push.
- HTML 레이아웃: `staff/administration.html`의 `BW25_UI_START/END` 구역 수정 → `python tools/build-administration.py` 실행 → 소스와 생성본 Push.
- 서버 함수·인증·권한 변경 때만 Apps Script 배포가 필요.

## 보안
- 공개 파일에 암호, 서버 키, Sheets ID, 직원/아동 개인정보 업로드 금지.
- GitHub UI JS는 GAS 실행 셸에서 돌아가므로 GitHub 변경 권한을 제한하고 코드 검토를 필수화.
- 서버 측 접근권한 검사 유지. UI 메뉴 숨김만으로 권한이 보장되는 건 아님.
- GitHub HTML 단독 주소는 디자인 원본이므로 직접 로그인 용도로 사용하지 않음.
- Google 기반 iframe은 브라우저 설정에 따라 접근 실패 가능. 사용 기술 완전 은닉은 불가능.

## 실패 시 복원
- Apps Script `Admin.html`을 이전 V24.1 전체 파일로 복구 후 새 버전 배포.
- GitHub `staff/index.html`을 이전 커밋으로 되돌리기.
- 데이터 시트 구조에는 변경 없음.
