#!/usr/bin/env python3
"""Bundle current verified staff-only Apps Script files for an existing deployment.

No secrets, Sheet contents, Script Properties, credentials or private backups.
Use the files inside the ZIP on the *existing staff* Apps Script project.
"""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "Bridge_Wonder_V45_Staff_AppsScript_Install.zip"
FILES = [
    "server/apps-script/Code.gs",
    "server/apps-script/StaffBridge.gs",
    "server/apps-script/Admin.html",
    "server/apps-script/AcademicManagement.gs",
    "server/apps-script/Compliance.gs",
    "server/apps-script/InspectionPDF.gs",
    "server/apps-script/LessonPlans.gs",
]
INSTRUCTIONS = """BRIDGE WONDER V45 — 직원용 서버·수업안 자료실 설치 (기존 프로젝트 업데이트)

적용 대상: 직원용 Google Apps Script 프로젝트만 해당합니다.
절대 학부모 상담/수강신청용 별도 Apps Script 프로젝트에 이 파일들을 설치하지 마세요.

0. 사전 확인
- 현재 운영 중인 직원용 Apps Script 프로젝트를 엽니다.
- 기존 코드/배포 주소, Google Sheet 데이터 및 Script Properties를 백업합니다.
- 실운영 중이라면 직원 사용이 적은 시간에 설치하세요.

1. 코드 설치
- 같은 이름의 Code.gs / StaffBridge.gs / Admin.html을 현재 프로젝트에서 교체합니다.
- AcademicManagement.gs / Compliance.gs / InspectionPDF.gs 파일은 기존 설치 상태에 맞춰 업데이트합니다.
- LessonPlans.gs를 새 파일로 추가합니다. 이미 있다면 파일 내용만 갱신합니다.
- 기존 Payroll.gs / 다른 스크립트 / Script Properties / 구글 시트 데이터는 그대로 둡니다.
- Code.gs 등 GitHub에 있는 공개 원본만 수정하며 실제 직원/학생 비밀번호는 적지 않습니다.

2. 배포
- Apps Script → 배포 → 배포 관리 → 기존 직원용 웹앱의 연필(수정)
- 새 버전으로 배포합니다. 새 deployment를 만들지 말고 기존 /exec URL을 유지하세요.
- 웹앱 실행 주체와 접근 권한 설정을 임의로 바꾸지 마세요.

3. 적용 확인
- 브라우저에서 https://bridgewonder.bridgeacademy.co.kr/staff/ 접속.
- 원장 로그인 → 기존 상담/등록/급여/문서가 동일하게 열리는지 확인.
- 법정·행정 관리와 점검 준비 PDF 다운로드/환불 기한 관리 확인.
- 학생 기본정보 임시등록 → 1·2개 반 배정 → 확인 증빙 → 출결/수납 연동 확인.
- 홈페이지 월간 체험 테마 초안 작성 및 원장 '공개' → 공개 페이지 확인.
- 수업안 자료실: 월간 오감놀이 계획 메뉴에서 PDF·워드·엑셀·PPT·한글·이미지·TXT를 업로드합니다.
- 원장·관리자가 올린 자료는 비공개로 저장되며, 공유로 변경한 자료만 선생님이 내려받을 수 있습니다.
- 수업안 파일은 별도의 비공개 Drive 폴더에 저장됩니다. 이 폴더를 외부에 공유하지 마세요.
- 대용량 파일은 160KB씩 나누어 전송하며 8MB 이하만 올릴 수 있습니다.
- 온라인 기존 수강계약 공개 페이지는 새 스튜디오 이용서식 검토 동안 신규 서명을 받지 않습니다.

- 수업 50분 30,000원, 체험 50분 25,000원 안내 확인.
- 테스트할 때는 실제 아동·보호자 개인정보 대신 허구의 데이터로 점검하세요.

주의
- GitHub Pages(main)는 이번 배포 브랜치의 프런트엔드입니다.
- Google 서버 미배포 상태에서는 새 관리 기능에 서버 업데이트 안내가 표시됩니다.
- GitHub 사이트 변경만으로 새 파일 업로드는 작동하지 않습니다. 직원 Apps Script 배포를 업데이트해야 합니다.
- 배포 후 첫 업로드 시 Google Drive 접근 승인이 필요할 수 있습니다. Google 권한창은 직원용 프로젝트에서 확인합니다.
- 서류에는 아이·보호자 개인정보나 건강정보를 넣지 마세요.
- 관리 대장의 정보는 실제 수강 동의/서명, 수납 처리, 법정 적합성의 증명이 아닙니다.
- 회당 정규 30,000원 / 체험 25,000원은 안내용이며
  등록증/계약서의 기간별 총액과 기존 수납 데이터를 자동 수정하지 않습니다.
- 기존 앱스 스크립트 등록번호/학원명/교습비/환불기준은 실제 등록 정보를 확인하세요.
- 수업안 자료실 업로드/다운로드는 인증된 직원만 사용하며 새롭거나 바뀐 Apps Script 코드는 모두 같은 배포 버전이어야 합니다.
- 새 강사/관리자 파일이 3개 추가됩니다. ZIP 내에 Payroll.gs는 포함하지 않습니다.
"""

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    checksums = {}
    with ZipFile(OUT, "w", ZIP_DEFLATED, compresslevel=8) as bundle:
        for relative in FILES:
            path = ROOT / relative
            data = path.read_bytes()
            if not data:
                raise RuntimeError(f"Missing empty installation file: {relative}")
            dest = "GoogleAppsScript/" + path.name
            bundle.writestr(dest, data)
            checksums[dest] = sha256(data).hexdigest()
        bundle.writestr("README_INSTALL_KO.txt", INSTRUCTIONS.encode("utf-8-sig"))
        bundle.writestr(
            "MANIFEST.json",
            (json.dumps({
                "version": "45.0.0",
                "purpose": "existing private staff Apps Script project only",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "files_sha256": checksums,
                "contains_credentials": False,
                "overwrite_existing_google_sheet": False,
            }, indent=2, ensure_ascii=False) + "\n").encode("utf-8"),
        )
    print(f"Created {OUT.relative_to(ROOT)}: {OUT.stat().st_size} bytes, {len(FILES)} GAS files")
    for name, digest in checksums.items():
        print(name + " " + digest[:16])

if __name__ == "__main__":
    main()
