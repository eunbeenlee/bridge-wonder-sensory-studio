# Bridge Wonder V27.1 — GitHub 기본값 우선 · 빠른 선생님 운영공간

## 무엇이 달라졌나
- `staff/index.html`에서 Google iframe과 자동 이동을 없애고 GitHub가 로그인 화면을 직접 표시합니다.
- 정적 파일 `assets/js/staff-static-defaults.js`에 브랜드 문구, 기본 수강 과정 **코드**(`BW-SENSORY`), 요일/교습기간 선택지, 새 반의 비공개·검토전 상태, 메뉴 바로가기 순서만 기록했습니다.
- `오늘의 업무`의 링크와 빈 지표는 Google 응답을 기다리지 않고 먼저 표시합니다. 실제 수업반·상담·등록 건수는 `staffDashboard` 서버 결과가 오면 채웁니다.
- 서버 확인(`bridgeHealth`)은 기본 화면과 병렬로 자동 한 번 수행하며, 검사 성공 전에는 로그인·개인정보 요청을 보내지 않습니다.
- 상담·아이 이름/연락처·출결·급여·환불·문서·직원 권한은 GitHub에 저장하지 않습니다. 각 메뉴에 들어갔을 때 Google로부터 실제 값을 조회합니다.
- 서버 요청은 기존 V26 가속 모듈이 일부 **민감하지 않은 요약**만 메모리에서 잠깐 캐시합니다. 급여/수납/개인정보는 결과 캐시에 넣지 않습니다.

## 계속 Google이 담당하는 것
- `Code.gs`: 직원 로그인/비밀번호 검증, 직원 권한, 조회/저장/이력, 수업반 관리, 출결, 문서 생성.
- `Payroll.gs`: 원장 전용 급여 계산/확정/명세서.
- `StaffBridge.gs`: 허용한 51개 업무 메서드를 HTTP 요청으로 연결. 기존 각 함수의 인증·권한 검사를 재사용합니다.
- Sheets와 Drive: 실제 민감 데이터/원본/백업. GitHub는 정적 UI와 비공개가 아닌 선택지만 보관합니다.

## 설치 및 접속
1. GitHub Pages의 V27.1 배포가 완료되면 기존 주소 `https://bridgewonder.bridgeacademy.co.kr/staff/`에서 GitHub 로그인 화면이 바로 나타납니다.
2. Google 직원 프로젝트에는 **기존 V26의 Code.gs, Payroll.gs, Admin.html**과 **V27의 StaffBridge.gs**가 배포되어 있어야 합니다.
3. 화면 아래 '서버 연결 확인 완료' 후 원장 계정으로 로그인하고 오늘의 업무 → 출결·시간표·급여를 확인하세요.
4. 계정 선택 오류가 나면 Chrome 시크릿 창의 원장 계정 한 개로 확인하세요. Google은 Apps Script 웹앱의 다중 로그인 사용을 지원하지 않습니다.
5. Google HTTP의 ContentService는 302 리디렉션 후 응답을 반환합니다. CORS나 Google 서비스 오류가 발생하면 `/staff/`는 로그인 화면을 유지하고 해당 오류를 안내합니다. 별도 'Google 직접 접속' 링크도 유지했습니다.

## 속도·보안상 주의
- 이 방식은 Cloudflare나 외부 데이터베이스를 쓰지 않지만 **HTTP API 통신**은 사용합니다. Apps Script 호출이 무제한인 것은 아닙니다.
- 화면이 빠르게 표시된다는 것과 서버의 데이터 처리 시간이 단축된다는 것은 다릅니다. 실제 속도는 Google의 실행 지연과 동시 호출 한도를 별도로 측정해야 합니다.
- GitHub `staff-static-defaults.js`에는 **고정된 실교습비·환불액·급여·수강생·직원 이메일·계좌**를 입력하지 마세요. 담당 직원 권한과 현재 수업시간·정원도 Google 원본을 기준으로 표시합니다.
- `StaffBridge.gs`는 원래 백엔드에서 권한을 검사하는 기존 함수만 호출합니다. 메뉴 숨김은 보안의 대체가 아닙니다.
- 이 변경은 GitHub 프런트엔드만 교체하고 Google Sheets의 내용은 수정하지 않습니다.

## 복구
- 장애가 나면 Google에 직접 접속하는 링크를 사용하거나, GitHub에서 이번 변경의 **이전 커밋**으로 롤백해 기존 /staff/ 연결 화면으로 되돌립니다.
- 현재 배포는 GitHub 정적 파일만 업데이트합니다. Google Code.gs / Payroll.gs / StaffBridge.gs의 코드·권한은 변경하지 않습니다.

## 검증
- `tests/staff-login-gateway.test.cjs`: GitHub 로그인·정적 코드·개인정보 노출 검사.
- `tests/staff-google-bridge.test.cjs`: 기존 Apps Script HTTP 브리지·허용 목록/권한 검증.
- `tests/staff-static-fast.test.cjs`: 병렬 요청 1회 서버 확인, 연결 실패 시 개인정보 요청 차단, 지연 중 대시보드 표시.
- 전체 `npm test` 및 `npm run check`, GitHub Actions 통과 확인 후 배포.
- 실제 Google 인증/급여 확인은 오프라인 자동테스트만으로 보장하지 않습니다.
