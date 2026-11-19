# Bridge Wonder · V26

기존 아이보리·포레스트 테마를 유지한 공개 웹사이트와 Google Apps Script 직원 운영공간입니다. V26에는 원장 전용 급여관리, 요청 가속, 저장·권한 검증 및 공개 문안 수정을 포함합니다.

- [최종본 적용 및 운영 안내](docs/BRIDGE_V26_RELEASE.md)
- [검증 결과와 한계](docs/BRIDGE_V26_QA.md)
- [급여 서버·계산 규칙](docs/BRIDGE_V26_PAYROLL_BACKEND.md)
- [엑셀 19개 시트 대응 분석](docs/BRIDGE_V26_EXCEL_MAPPING.md)
- [권한·인증·수납 오류 수정](docs/BRIDGE_V26_SECURITY.md)
- [공개 문안 검토](docs/BRIDGE_V26_COPY_REVIEW.md)

공개 사이트: https://bridgewonder.bridgeacademy.co.kr/

## 운영 구성

GitHub Pages에서 공개 사이트와 직원 화면의 정적 파일을 제공합니다. 로그인, 개인정보 조회·저장, 급여 계산은 별도 직원 Apps Script 프로젝트에서 처리합니다. GitHub에 병합하는 작업과 Google 웹앱의 새 버전 배포는 별도 단계입니다.

`server/apps-script/Code.gs`, `Payroll.gs`, `Admin.html`을 **기존 직원용 Apps Script 프로젝트**에 적용합니다. 공개 상담·수강 신청 프로젝트와 혼합하지 않습니다. 실제 원장 이메일·스프레드시트 ID·비밀키는 Script Properties에만 보관하며 GitHub에 넣지 않습니다.

## 개발 및 검증

Node.js 24, Python 3.10 이상, Git을 사용합니다.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
```

직원 HTML 원본을 수정한 경우 `npm run build`로 `administration-layout.js`를 다시 생성합니다. `npm run check`는 생성 결과 일치와 기존 테마 파일 보존을 함께 확인하므로, 기준 커밋이 포함된 Git 체크아웃에서 실행합니다. ZIP만 내려받았다면 `npm test`를 실행하거나 저장소를 복제하여 전체 검사를 실행할 수 있습니다.

GitHub Actions도 같은 검사를 수행합니다. 검증은 가상 Google 서비스와 DOM 실행을 포함하며, 실제 Google 계정·메일·운영 Sheets에 접근하지 않습니다.
