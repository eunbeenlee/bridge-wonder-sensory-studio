# Bridge Wonder Sensory Play Studio — 웹사이트 V7

## 무엇이 변경되었나요?
- 원더 웹사이트 전체 5개 페이지 및 브랜드 선택·아카데미 Coming Soon 유지
- Google Apps Script 공개 상담 웹 앱 URL 연결 (사용자 제공 /exec)
- 상담 신청 과정 안내, '홈페이지에서 신청' + '새 창에서 신청' 선택 제공
- 모바일 하단 상담 신청/전화/인스타그램 연결, 반응형 폼 및 UX 정리
- 2027년 소프트 오프닝 안내, 월령별 7~48개월, 보호자 동반 50분 유지
- 기존 '2+2' 홍보 멘트 제외
- Instagram: https://www.instagram.com/bridgewonder.e/
- e편한세상 명지 비주거시설동 2층 75호 주소 유지

## 브릿지 원더 GitHub에 배포
1. GitHub 저장소 `eunbeenlee/bridge-wonder-sensory-studio`에 접속합니다.
2. 기존 저장소 **Download ZIP**으로 백업하거나 GitHub에서 복원 가능한 커밋을 확인합니다.
3. 이 ZIP의 **내용물**을 저장소 최상위(root)에 전체 업로드/동기화합니다. ZIP 파일만 올리면 동작하지 않습니다.
4. 기존 자동 생성 README.md는 남아 있어도 무방합니다. `index.html`, `assets/`, `sensory-studio/`, `CNAME`을 비롯한 파일의 위치를 유지하세요.
5. Settings > Pages > Source `Deploy from a branch` > Branch `main` / `(root)` 설정이 기존과 같아야 합니다.
6. Custom domain `bridgewonder.bridgeacademy.co.kr`을 유지합니다. 기존 DNS CNAME을 변경하거나 삭제하지 마세요.
7. 저장소에 `.nojekyll` 파일도 포함되어 있습니다. 주소 끝의 슬래시를 유지해 접속하세요.

## 상담 폼 사용 방법
- 방문/문의 페이지: https://bridgewonder.bridgeacademy.co.kr/sensory-studio/visit/#online-inquiry
- `홈페이지에서 상담 신청하기`를 누르면 Google 신청서가 페이지 안에 열립니다.
- iframe 오류/빈 화면이 나타나면 '신청서 새 창으로 열기' 버튼을 사용하세요.
- 새 창이 열렸더라도 신청서 제출이 성공하는지 실제 테스트가 필요합니다.
- 신청서 URL: https://script.google.com/macros/s/AKfycbwaycRP4no6Fm2jStSndXwmnGSw1CZUlN7yUeEfCfBlD13Pb5Rw8hZuDwX7CD6V3yDqHA/exec
- 이 URL은 공개 웹 앱 URL이며, 계정 비밀번호/API 키와 다릅니다. 제출 내용과 연락처는 공개 저장소에 넣지 마세요.
- Google Apps Script 편집기의 Code.gs / Form.html 코드를 바꿨다면, **배포 > 배포 관리 > 수정 > 새 버전 > 배포**를 진행해야 /exec에 반영될 수 있습니다.

## 반드시 진행할 실사용 QA
1. 컴퓨터/모바일에서 브릿지 원더 홈페이지 접속, 모바일 메뉴 및 5개 원더 서브페이지 이동.
2. 방문·문의에서 '사이트에서 신청'과 '새 창에서 신청' 버튼 각각 동작 확인.
3. 시험 데이터(실제 개인정보 대신 본인이 허가한 테스트 정보)를 폼으로 접수해 발급된 접수번호 확인.
4. Google Sheets 접수 대장에 같은 접수번호와 테스트 행이 저장되었는지 확인.
5. 지정 수신 이메일로 알림이 실제 도착했는지 확인. 스팸함도 확인.
6. 테스트 데이터 삭제 및 개인정보 접근 권한 점검.
7. Instagram `@bridgewonder.e`, 전화, 네이버/카카오 지도 링크 확인.

## 보안 및 개인정보 주의
- Google Apps Script `Code.gs`·`Form.html` 백엔드는 공개 GitHub 사이트 저장소에 올리지 않습니다.
- Sheets는 외부에 공개하지 마세요. 접수 대장과 이메일 사본은 운영자가 관리해야 합니다.
- 웹 앱은 누구나 접속할 수 있으므로 스팸과 악용 대응이 필요합니다. 기존 코드에 간단한 허니팟과 중복방지가 있지만 CAPTCHA는 아닙니다.
- 상담 신청은 예약 확정·결제 완료를 의미하지 않습니다.
- 외부 웹 앱의 실시간 상태는 코드 검사 환경에서 직접 확인할 수 없었습니다. 실제 발송은 사용자 계정에서 검증해야 합니다.

## 파일 구분
- `assets/js/inquiry-config.js` : 공개 웹 앱 URL만 포함하는 프런트 설정
- `assets/js/site.js` : 폼 열기/닫기, 모바일 내비게이션, 월령별 탭, 주소 복사
- `sensory-studio/visit/index.html` : 상담 안내 및 임베드 화면
- `assets/css/site.css` : 브릿지 원더 공통 스타일, 반응형 디자인

## 아카데미와의 분리
이 패키지는 **브릿지 원더 신규 저장소 전용**입니다. 기존 브릿지 아카데미 저장소 원본 소스는 포함하지 않으며 수정하지 않습니다. 새 저장소의 `/academy/`는 향후 개원 안내 페이지입니다.
