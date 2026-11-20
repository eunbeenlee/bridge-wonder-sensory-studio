# Bridge Wonder V26.1 — Google 로그인 연결 오류 복구

## 증상
`/staff/` 주소에서 로그인 입력 폼 대신 Google Drive의 '현재 파일을 열 수 없습니다' 오류가 iframe 안에 표시됨. 기존 `staff/portal.js`는 iframe `load` 이벤트를 정상 연결로 처리해 실패를 감지하지 못함.

## 변경
- `staff/index.html`과 `staff/portal.js`만 수정. Google 서버·Sheets 데이터·로그인·권한은 수정하지 않음.
- 외부 Google `iframe` 제거. 기본 접속 시 1.2초 후 기존 Apps Script `/exec` 주소로 **현재 탭 전체 이동**.
- 사용자는 버튼으로 즉시 이동하거나 `/staff/?manual=1`에서 자동 이동 없이 직접 접속 가능.
- 이 방식은 브라우저의 외부 프레임 제한·제3자 쿠키 충돌을 줄이는 것이며 **Google 서버 자체 오류를 우회하는 방식은 아님**.

## 테스트
- `node tests/staff-login-gateway.test.cjs` (8개 시나리오): iframe 제거, 직접 이동, 수동 접속, 잘못된 주소 차단, 클릭과 자동 이동 충돌 방지 등.
- 실제 Google 계정의 웹앱 접근 여부는 이 테스트에서 검증할 수 없음.

## 배포
GitHub `main`에 병합하면 GitHub Pages `/staff/`에 반영됩니다. Google `Code.gs`, `Payroll.gs`, `Admin.html`의 재배포는 필요하지 않습니다.

## Google Drive 오류가 **직접 접속**에서도 나타나는 경우
1. 원장 계정의 Apps Script 프로젝트 → **배포 → 배포 관리** → 현재 직원용 **웹앱** 선택.
2. **웹앱 URL**이 `staff/index.html`의 `open-staff-login` 링크와 같은지 확인. 새 배포를 생성했으면 새로운 웹앱 URL로 링크를 업데이트해야 합니다.
3. 앱 배포 방식과 접근 권한, 프로젝트 실행 권한 승인 상태 확인. **기존 배포 수정 → 새 버전**으로 다시 배포한 경우 주소가 유지되어야 합니다.
4. 직접 URL도 같은 오류라면 GitHub가 아닌 Google의 접근·배포 문제이므로 Google Apps Script 실행 로그와 관련 공식 이슈를 확인하세요.

## 주의
브라우저 주소는 `script.google.com`으로 이동합니다. 별도의 API·Cloudflare 없이 사용자 데이터와 인증을 Google에서 처리하기 위한 신뢰성 우선 방식입니다. 인증 성공이나 권한을 속여 통과시키는 방식은 사용하지 않습니다.
