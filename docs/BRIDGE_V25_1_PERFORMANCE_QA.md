# Bridge Wonder V25.1 — 가속 및 오류 검증 (검토용)

현재 운영 중인 `main`과 Google Apps Script 배포는 변경하지 않았습니다. V25.1은 기존 V25 GitHub UI 분리 구조에 추가하는 클라이언트 최적화입니다.

## 추가 파일 및 변경
- `assets/js/administration-accelerator.js`: 동시 조회 4개 제한, 중복 조회 합치기, 화면 이동 중 낡은 결과 무시
- `assets/js/administration.js`: 가속 모듈 연동, 기존 입력 비활성화 상태 보존, 동일 메뉴 반복 렌더링 방지
- `assets/js/administration-layout.js`: 가속 모듈을 먼저 로드한 뒤 관리자 앱 실행. 가속 로드 실패 시 기본 조회 동작
- `staff/administration.html`: 편집용 UI 소스의 로딩 순서 동기화
- `tools/build-administration.py`: 화면 재생성 후에도 가속 모듈 로딩 유지

## 캐시 보안
서버 데이터의 영구 브라우저 저장은 하지 않습니다. 메모리 캐시는 수업반·운영 건수 같은 일부 조회만 8~20초 재사용합니다. 상담·학생 명단·연락처·수납·출결·직원 권한·PDF 데이터는 캐시하지 않습니다. 저장 요청은 재시도하거나 중복 제출하지 않습니다.

## 로컬 QA (실제 Google 계정 미연결)
- Node 가속 모듈 8종 시나리오 통과
- Chrome PC 1440px/모바일 390px 로그인·메뉴 이동·반편성·조회 재시도·권한별 UI 2환경 통과, 페이지 JS 오류 0
- 가속 모듈 로드 실패 시 직접 연결 대체 동작 확인
- 관리자 클라이언트에서 호출하는 서버 함수 48개 모두 기존 V24.1 Code.gs에서 확인
- HTML ID 중복 0
- 실제 Google 서버 응답 시간 단축율 / OAuth / PDF / Sheets 실계정 테스트는 **미확인**

## 배포 보류 및 적용 순서
이 브랜치는 검토용으로 유지합니다. 이후 전환 시 GitHub 변경사항을 먼저 검토·배포한 뒤, 필요하면 V25 최소 `Admin.html`로 Apps Script 기존 배포를 새 버전 갱신해야 합니다. 기존 V24.1 `Code.gs`는 그대로 사용하고 새 setup 함수는 실행하지 않습니다.

실제 Google 서비스 지연과 Google iframe 쿠키 정책을 이 코드만으로 제거할 수 없으며, 운영 전 원장/선생님 실제 계정으로 데이터 저장 및 접근 권한 검증이 필요합니다.
