# Bridge Wonder — 전용 GitHub 저장소 배포 파일 (V5)

이 폴더의 **내용물만** 새로운 GitHub 저장소 `bridge-wonder-sensory-studio`에 업로드하세요.

**절대로 기존 `bridge-academy-web-workbook` 저장소에 이 파일을 덮어쓰지 마세요.** 기존 Academy의 전체 파일과 교육 시스템은 그 저장소의 `main`에 그대로 보존합니다.

## 새로운 사이트 구성

- `https://bridgewonder.bridgeacademy.co.kr/` — 브릿지 브랜드 선택 화면 (원더 입장 / 아카데미 Coming Soon)
- `https://bridgewonder.bridgeacademy.co.kr/sensory-studio/` — 실제 운영하는 브릿지 원더 메인
- `https://bridgewonder.bridgeacademy.co.kr/sensory-studio/story/` — BI/CI · 스토리
- `https://bridgewonder.bridgeacademy.co.kr/sensory-studio/programs/` — 7~48개월 프로그램
- `https://bridgewonder.bridgeacademy.co.kr/sensory-studio/experience/` — 오픈 · 체험수업
- `https://bridgewonder.bridgeacademy.co.kr/sensory-studio/visit/` — 상담 · 위치
- `https://bridgewonder.bridgeacademy.co.kr/academy/` — 아카데미 Coming Soon (원본 기능과 자료는 포함하지 않음)
- `https://bridgewonder.bridgeacademy.co.kr/bridge-wonder-sensory-studio/` — 원더 메인으로 이동하는 기억하기 쉬운 별칭

## GitHub 등록 — 신규 저장소에만 적용

1. GitHub에 새 **Public** 저장소 `bridge-wonder-sensory-studio`를 생성합니다. 이미 존재하는 아카데미 저장소는 그대로 둡니다.
2. 새 저장소의 **Code → Add file → Upload files**를 열어 이 폴더의 **압축을 푼 내부 파일과 폴더**를 업로드합니다. `index.html`, `assets`, `sensory-studio`, `academy`, `CNAME`이 저장소 최상단에 있어야 합니다.
3. 새 저장소 **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**를 선택합니다.
4. 사이트를 `https://bridgewonder.bridgeacademy.co.kr`에서 열려면 기존 `bridgeacademy.co.kr` 도메인의 DNS 관리에서 다음 레코드를 추가해야 합니다.

   | 유형 | 이름/호스트 | 값/목표 |
   |------|---------|--------|
   | `CNAME` | `bridgewonder` | `eunbeenlee.github.io` |

   **기존 `www` 레코드와 기존 Academy 도메인 설정은 건드리지 않습니다.**
5. 새 저장소 **Settings → Pages → Custom domain**에 `bridgewonder.bridgeacademy.co.kr`을 입력하고 HTTPS 설정을 활성화합니다.

> 주의: `CNAME` 파일을 포함했습니다. DNS 설정 이전에는 별도 사용자 도메인이 동작하지 않습니다. 도메인 소유/설정은 사이트 파일만 업로드해서 완료되는 작업이 아닙니다.

## 브랜딩 및 운영 정보

- 주색: sage / ivory / mustard / maple orange
- 대상: 7~48개월, 보호자 동반 50분, 소규모 수업
- 재료: 실제 식재료와 자연소재 중심. 구체적인 비율과 횟수는 외부 웹사이트에 고정 표기하지 않음. 월별 주제·월령·안전 조건에 따라 운영
- 공개된 오픈 일정·가격·연락처는 **사용자가 제공한 홍보물 기준이며 실 운영 확정 전 재검증**이 필요합니다.
- 문의는 전화 링크로만 연결합니다. 결제/예약완료/개인정보를 수집하는 서버 기능은 포함되어 있지 않습니다.
- DNS 반영 전 사전 테스트가 필요하면 CNAME 파일을 일시적으로 제외한 상태로 Pages를 배포할 수 있으나, 그때 HTML 메타의 canonical URL은 새 주소 기준입니다.

## 아카데미 보호

**원래의 아카데미 기능이 이 Wonder 프로젝트에 포함되지 않은 것은 의도적입니다.**
아카데미 웹 소스는 `https://github.com/eunbeenlee/bridge-academy-web-workbook` 저장소 `main`에 유지합니다. 공개 도메인에서 Coming Soon만 보여주려면 별도 제공된 `Bridge_Academy_ComingSoon_ADD_ONLY_docs.zip`을 참조하세요.


## V5 모바일·외부 연동

- 모바일 문의바에서 전화·인스타그램·네이버 지도 바로 열기
- 제공된 프로필 자료 기준 Instagram: https://www.instagram.com/bridgeacademy.e/
- 위치: 부산 강서구 명지국제2로 80, e편한세상 명지 비주거시설동 2층 75호 (75호는 사용자 안내자료 기준)
- 인스타그램에 게시물을 자동 올리거나 예약을 확정하는 API 연동이 아니라, **프로필을 직접 여는 안전한 링크**입니다.
- Studio 화면에서는 '2+2' 재료 비율, 고정 횟수를 홍보하지 않습니다.
- 기존 아카데미 저장소/도메인 정보는 절대 덮어쓰지 마세요.
