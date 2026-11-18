# Bridge Wonder Sensory Play Studio — V8 GitHub 배포 안내

## 사용 도메인

- **원더:** https://bridgewonder.bridgeacademy.co.kr/
- 프로그램 안내: https://bridgewonder.bridgeacademy.co.kr/sensory-studio/programs/
- 상담 신청: https://bridgewonder.bridgeacademy.co.kr/sensory-studio/visit/#online-inquiry
- 인스타그램: https://www.instagram.com/bridgewonder.e/

이 ZIP은 **브릿지 원더 전용 GitHub Pages 저장소**에만 업로드합니다. 브릿지 아카데미 저장소 `bridge-academy-web-workbook`은 건드리지 않습니다.

## 적용 순서

**1. 백엔드 업데이트를 먼저 완료하세요.** 별도 제공되는 `Bridge_Wonder_V8_GAS_Sheets_Only/Code.gs`를 현재 사용 중인 Apps Script 프로젝트에 적용한 다음, `setupStorage` 실행 및 기존 배포를 **새 버전으로 업데이트**하세요. 이 작업을 먼저 하지 않으면 V8 웹사이트에서 접수를 확인할 수 없습니다.

**2. 기존 Wonder GitHub 저장소를 ZIP 백업하세요.**

https://github.com/eunbeenlee/bridge-wonder-sensory-studio

**3. 이 폴더의 내용물을 사이트 저장소 최상위에 복사하세요.** ZIP 파일 자체가 아니라 압축 해제한 파일을 올립니다. `index.html`, `CNAME`, `assets/`, `sensory-studio/` 등이 루트에 있어야 합니다. GitHub Desktop 사용을 권장합니다.

**4. GitHub Pages**는 기존의 `main / (root)` 설정을 유지하고, `CNAME`은 `bridgewonder.bridgeacademy.co.kr`입니다. DNS는 변경하지 않습니다.

**5. 접수 테스트**를 진행하세요. 보호자 본인 또는 테스트에 동의한 사람의 정보로 접수 → `BW-...` 접수번호 표시 → 비공개 스프레드시트에 1행 추가를 확인합니다.

## V8 핵심 변경

- 연령별로 다른 수업 주제를 운영한다는 잘못된 인식을 수정했습니다.
- **한 달의 공통 주제, 다섯 가지 연령별 티칭 방식**을 시각적으로 설명합니다.
- 방문/문의 페이지에 홈페이지 자체 상담 신청 폼을 넣었습니다.
- iframe과 Google Drive 오류 화면을 제거했습니다.
- `assets/js/inquiry-client.js`가 데이터 전송 및 별도 저장 상태 확인을 담당합니다.
- Apps Script URL은 비밀번호가 아닌 **공개 엔드포인트 주소**이므로 `assets/js/inquiry-config.js`에 들어 있습니다.
- 기존 원더 UI·인스타그램·전화·지도 링크를 유지했습니다.
- 원더에서 사용하던 기존 Pages 도메인과 Academy Coming Soon 안내를 유지했습니다.

## 실패 시 점검 순서

- `Code.gs`에 V8 백엔드가 적용되었는지
- 함수 `setupStorage`를 실행해 기존 접수 대장에 `요청 ID` 11번째 열이 생성되었는지
- **배포 관리**에서 기존 웹 앱의 버전을 새 버전으로 올렸는지 (코드 저장만으로 `/exec`는 변경되지 않음)
- 배포 권한이 `나/모든 사용자`인지
- 웹 앱 `/exec`에 접속했을 때 `status:ready` JSON이 나오는지
- Chrome 새로고침 `Ctrl+Shift+R` 이후 재시험했는지

> 접수 상태가 확인되지 않으면 중복 제출을 반복하지 마세요. Google은 별도 호스트이므로 POST가 저장되었더라도 확인 호출만 실패할 수 있습니다. 비공개 시트에서 확인하거나 전화·DM으로 문의하는 것이 안전합니다.
