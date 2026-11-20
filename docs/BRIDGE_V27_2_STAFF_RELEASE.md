# Bridge Wonder V27.2 — 독립 직원 포털 적용 안내

## 핵심 구조
- 자체 도메인 `/staff/`에서 바로 로그인 화면과 운영 메뉴를 표시합니다. Google 로그인 페이지 iframe과 1.2초 자동 리디렉션을 제거했습니다.
- 브릿지 원더 기존 로고·크림·포레스트 그린 색상·수업반·출결·급여 UI는 유지합니다.
- **서버는 기존 Google Apps Script만 사용**하며 `StaffBridge.gs`의 `doPost`와 기존 `Code.gs`·`Payroll.gs` 업무 함수가 인증·권한·Sheets 저장을 처리합니다. Cloudflare, Supabase, 별도 API 서비스는 없습니다.
- 웹브라우저 ↔ Google Apps Script 사이에는 HTTP API 호출이 있으므로 'API 기술 자체를 사용하지 않는 구조'는 아닙니다.

## 적용 결과
1. GitHub Pages에서 `staff/index.html`이 HTML을 직접 보여줍니다. Google 계정에 여러 개 로그인되어 있어도 **화면 표시 자체는 Google 로그인 상태에 의존하지 않습니다**.
2. 로그인 폼을 표시한 직후 공개 정보만 포함한 `bridgeHealth`를 **1회 자동 호출**합니다.
3. 연결 확인 전에는 비밀번호·직원 세션·개인정보를 보내지 않습니다. 동일한 검증 중에 여러 요청이 발생해도 하나의 확인을 공유합니다.
4. 연결이 실패하면 로그인 화면을 유지하고 명확한 오류와 `연결 다시 확인` 버튼을 표시합니다.
5. 인증 성공 후 서버가 원장·선생님 개인별 권한을 다시 검사합니다. 급여는 원장만 접근할 수 있으며 데이터 응답을 영구 캐시하지 않습니다.
6. 저장·수납·급여 확정 요청의 자동 재시도는 하지 않습니다. Google ContentService의 응답 유실 가능성이 있어 중복 저장을 방지하기 위함입니다.

## 설치 필요 여부
- **기존 서버 연결 검사에서 '성공' 메시지를 받았고 `StaffBridge.gs`를 배포했다면** Google Apps Script를 다시 배포할 필요가 없습니다.
- 서버 코드 `Code.gs`, `Payroll.gs`, `Admin.html`과 현재 Sheets 데이터·보안 설정을 이 패치에서 변경하지 않았습니다.
- 처음 설치하거나 연결 결과가 실패한다면 직원용 GAS에 `server/apps-script/StaffBridge.gs`가 존재하는지, 배포 관리에서 기존 `/exec` 버전에 반영되었는지 확인하세요.
- 원장/선생님은 새 **GitHub 도메인에서 한 번 다시 로그인**해야 합니다. 이전 Google HTML 서비스 브라우저 세션은 다른 도메인이라 옮길 수 없습니다.

## 사용 전 간단 확인
1. 일반/시크릿 창에서 `https://bridgewonder.bridgeacademy.co.kr/staff/`을 열어 브릿지 원더 로그인 화면이 즉시 보이는지 확인합니다.
2. 연결 상태가 '업무 서버 연결 완료'인지 확인합니다. 처음 확인이 실패하면 '연결 다시 확인'을 누릅니다.
3. 원장 계정으로 로그인해 대시보드와 `직원 급여관리` 메뉴를 확인하고, 샘플 직원 1명의 **초안 미리보기만** 테스트합니다. 실제 급여 확정은 법정 요율과 원천세 확인 후 진행합니다.
4. 테스트 선생님 계정으로 재로그인해 `직원 급여관리` 메뉴가 보이지 않고 관련 서버 요청이 차단되는지 확인합니다.
5. 기존 학부모 문의·수강 신청·Sheets 데이터의 변경은 이 패치에 없습니다.

## 문제 해결 / 복구
- `/staff/`에서 Google 서버 연결 실패: 배포 URL과 브라우저 CORS/Google 웹앱 접근 이슈 확인. 계정 로그인 실패와 다릅니다.
- `/staff/google-fallback.html?manual=1`: 이전 방식의 Google 웹앱 직접 접속 화면으로 이동할 수 있습니다.
- GitHub 배포 문제가 있으면 이 변경 PR의 병합을 되돌리는 새 커밋으로 복구합니다. Google 서버/Sheets에는 손대지 않습니다.
- 원본 Google URL: `https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec`.

## 검증 범위
- Node.js 회귀검사: UI가 외부 iframe 없이 직접 열리는지, 연결 실패 시 인증정보 미전송, 자동 연결 중복 제거, 재연결, 서버 권한 거부, 저장 재시도 금지.
- GitHub Actions 검사를 적용 후 확인합니다.
- **실제 Google 직원 자격증명으로 로그인하거나 운영 급여/수납을 변경하지 않았습니다.** 서버가 HTTP 요청에 200/JSON을 응답하더라도 직원의 모든 권한·업무가 자동 검증됐다는 뜻은 아닙니다.

## 현재 알려진 제약
- Google Apps Script ContentService는 `script.googleusercontent.com`으로 302 리디렉션하며 Google 측 응답 지연/404/CORS 장애는 앱 코드만으로 없앨 수 없습니다.
- GitHub Pages는 정적 호스팅이므로 로그인 비밀키를 브라우저에 보관할 수 없고 인증·인가·금액 검증을 서버에서 실시해야 합니다.
- 다중 Google 계정으로 인한 화면 접근 문제는 감소하지만 서버의 정책·한도·가용성은 여전히 적용됩니다.
