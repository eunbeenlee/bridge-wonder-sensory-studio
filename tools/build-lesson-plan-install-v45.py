#!/usr/bin/env python3
"""Build a small V45-only staff Apps Script patch (do not touch public enrollment)."""
from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "Bridge_Wonder_V45_Lesson_Plans_Staff_Update.zip"
FILES = (
    "server/apps-script/LessonPlans.gs",
    "server/apps-script/StaffBridge.gs",
)
README = """브릿지 원더 V45 · 수업안 파일 자료실 설치 안내

이 설치 파일은 직원용 Google Apps Script 프로젝트 전용입니다.
상담·체험·수강 신청을 받는 공개용 Apps Script에는 절대 설치하지 마세요.

0. 기존 직원 프로젝트와 배포 /exec 주소, 관련 스프레드시트·Script Properties를 백업하세요.

1. 직원용 Apps Script 편집 화면에서:
   - LessonPlans.gs 파일을 새로 추가하고 동봉된 파일 전체 내용을 붙여넣으세요.
   - 기존 StaffBridge.gs를 동봉된 V45 파일의 전체 내용으로 교체하세요.
   - Code.gs, Payroll.gs, AcademicManagement.gs, Compliance.gs, InspectionPDF.gs,
     Admin.html, 현재 데이터 시트 및 Script Properties는 건드리지 마세요.

2. Apps Script → 배포 → 배포 관리 → 기존 직원용 웹앱 수정 → 새 버전 배포.
   기존 /exec 주소와 실행 주체·접근 권한을 그대로 유지하세요.
   설치용 함수를 실행할 필요는 없습니다. 첫 수업안 업로드 시 비공개
   Google Drive 폴더와 비공개 Google Sheets 관리 탭을 필요에 따라 생성합니다.
   저장 공간 접근 권한을 묻는 경우 실제 필요한 승인만 확인하세요.

3. https://bridgewonder.bridgeacademy.co.kr/staff/ 에 원장 계정으로 로그인.
   [월간 오감놀이 계획] 안의 [수업안 파일]에서 테스트 파일을 등록해 보세요.
   제목·적용 월·월령·메모는 선택 사항입니다.
   PDF, DOCX, PPTX, XLSX, HWP, HWPX, JPG, PNG, TXT, CSV (최대 5 MB).
   기존 파일 수정본 등록 → 버전별 다운로드 → 보관/복구를 확인하세요.
   허구의 자료로 먼저 테스트하고, 영유아·보호자의 개인정보는 파일에 넣지 마세요.

4. 기존 홈페이지, 보호자 안내/계약 PDF, 결제 내역, 직원 비밀번호·권한은 변경하지 않습니다.
   자료실은 원장/관리자만 업로드·수정·보관할 수 있으며,
   선생님은 허용된 수업안만 읽거나 내려받을 수 있습니다.

문제 발생 시:
- '관리 서버 업데이트가 필요합니다'가 표시되면 직원용 배포 버전과
  새 LessonPlans.gs / StaffBridge.gs 적용 여부를 확인하세요.
- 업로드 중 브라우저를 닫았다면 파일을 다시 선택해 새 업로드를 시작하세요.
- 대용량(5MB 초과) 파일은 현재 지원하지 않습니다. Google Drive의 비공개
  자료실에 임의로 올려도 관리 목록에 자동 등록되지는 않습니다.
"""

def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    checksums = {}
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=8) as out:
        for path in FILES:
            data = (ROOT / path).read_bytes()
            if not data:
                raise ValueError(f"Missing content: {path}")
            member = "GoogleAppsScript/" + Path(path).name
            out.writestr(member, data)
            checksums[member] = sha256(data).hexdigest()
        out.writestr("README_INSTALL_KO.txt", README.encode("utf-8-sig"))
        out.writestr("MANIFEST.json", (json.dumps({
            "version": "45.0.0",
            "purpose": "staff lesson-plan file library",
            "files_sha256": checksums,
            "contains_credentials": False,
            "replaces_public_project": False,
            "touches_existing_sheets": False,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(f"{OUTPUT.name}: {OUTPUT.stat().st_size} bytes")
    for path, digest in checksums.items():
        print(path, digest[:16])

if __name__ == "__main__":
    main()
