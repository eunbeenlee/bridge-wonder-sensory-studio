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
OUT = ROOT / "dist" / "Bridge_Wonder_V38_Staff_AppsScript_Install.zip"
FILES = [
    "server/apps-script/Code.gs",
    "server/apps-script/StaffBridge.gs",
    "server/apps-script/Admin.html",
    "server/apps-script/AcademicManagement.gs",
    "server/apps-script/Compliance.gs",
    "server/apps-script/InspectionPDF.gs",
]
INSTRUCTIONS = """BRIDGE WONDER V38 — 통합 직원 서버 설치 (기존 프로젝트 업데이트)

적용 대상: 직원용 Google Apps Script 프로젝트만 해당합니다.
절대 학부모 상담/수강신청용 별도 Apps Script 프로젝트에 이 파일들을 설치하지 마세요.

0. 사전 확인
- 현재 운영 중인 직원용 Apps Script 프로젝트를 엽니다.
- 기존 코드/배포 주소, Google Sheet 데이터 및 Script Properties를 백업합니다.
- 실운영 중이라면 직원 사용이 적은 시간에 설치하세요.

1. 코드 설치
- 같은 이름의 Code.gs / StaffBridge.gs / Admin.html을 현재 프로젝트에서 교체합니다.
- AcademicManagement.gs / Compliance.gs / InspectionPDF.gs 세 파일을 새로 추가합니다.
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
- 수업 50분 30,000원, 체험 50분 25,000원 안내 확인.
- 테스트할 때는 실제 아동·보호자 개인정보 대신 허구의 데이터로 점검하세요.

주의
- GitHub Pages(main)는 이번 배포 브랜치의 프런트엔드입니다.
- Google 서버 미배포 상태에서는 새 관리 기능에 서버 업데이트 안내가 표시됩니다.
- 관리 대장의 정보는 실제 수강 동의/서명, 수납 처리, 법정 적합성의 증명이 아닙니다.
- 회당 정규 30,000원 / 체험 25,000원은 안내용이며
  등록증/계약서의 기간별 총액과 기존 수납 데이터를 자동 수정하지 않습니다.
- 기존 앱스 스크립트 등록번호/학원명/교습비/환불기준은 실제 등록 정보를 확인하세요.
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
                "version": "38.0.0",
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
