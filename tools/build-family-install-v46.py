#!/usr/bin/env python3
"""Build V46 patch for the existing staff Apps Script; no user records or credentials."""
from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "Bridge_Wonder_V46_Staff_Family_And_Lesson_Upload.zip"
FILES = [
    "server/apps-script/Code.gs",
    "server/apps-script/StaffBridge.gs",
    "server/apps-script/LessonPlans.gs",
]
README = """브릿지 원더 V46 — 직원 서버 정원 제한 + 수업안 자료실

이 파일은 이미 운영 중인 직원용 Apps Script 프로젝트 전용입니다.
공개 상담·수강신청용 별도 스크립트 프로젝트에는 설치하면 안 됩니다.

수정 범위:
- Code.gs: 새 수업반 정원을 아이 1~4명으로만 저장하도록 서버 검증
- StaffBridge.gs: 기존 직원 수업안 API 호출 허용 (V45)
- LessonPlans.gs: 기존 직원용 비공개 수업안 파일 업로드·관리 모듈 (V45)

설치:
1. 직원용 Apps Script 프로젝트의 Code.gs / StaffBridge.gs, 배포 설정을 먼저 백업합니다.
   이미 LessonPlans.gs를 설치했다면 그 파일도 백업합니다.
2. ZIP의 GoogleAppsScript/Code.gs와 StaffBridge.gs의 전체 내용을 기존 같은 이름 파일에 반영합니다.
   LessonPlans.gs가 없으면 새 스크립트 파일로 추가하고 내용을 붙여넣습니다.
   기존 Payroll.gs, AcademicManagement.gs, Compliance.gs, InspectionPDF.gs, Admin.html,
   사용자 계정, Script Properties, Google Sheets 데이터는 변경하지 않습니다.
3. Apps Script → 배포 → 배포 관리 → 현재 직원 웹앱 수정 → 새 버전 배포.
   기존 /exec 주소, 실행 주체와 접근 설정을 유지합니다. 별도 설치 함수는 없습니다.
4. 원장 계정으로 직원 사이트에 로그인하여:
   - [정원 현황]에서 5명 입력이 거부되고 4명 설정이 되는지 확인
   - [오감놀이 준비 → 월간 오감놀이 계획 → 수업안 파일]에서 허구의 작은 PDF 업로드,
     다운로드, 수정본 버전, 보관/복구를 확인
   - 직원별 원래 권한과 상담·급여·문서 기능이 정상인지 확인

참고:
- 대상은 7~48개월, 한 회차 아이 최대 4명 + 보호자 1명씩 동반, 50분 수업입니다.
- 과거에 저장된 정원이나 기존 수강 기록은 자동 수정하지 않습니다.
  4명보다 높은 정원이 저장된 반은 원장님이 목록에서 확인한 뒤 개별 조정해야 합니다.
- 수업안 파일은 기존 V45 기준 최대 5MB, 지원 형식 및 권한은 V45 안내를 따릅니다.
- 실제 업로드는 Apps Script 배포를 업데이트한 이후에만 가능합니다.
- 아동·보호자의 개인정보·건강정보가 있는 수업안은 업로드하지 마세요.
- 교육지원업 사업자등록만으로 학원법·건축·소방의 비대상 판단이 확정되지는 않습니다.
- 서버 설치 전에는 GitHub 직원 화면의 새 업로드 기능만으로 파일 저장이 되지 않습니다.
"""
def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    checksums = {}
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=8) as package:
        for relative in FILES:
            data = (ROOT / relative).read_bytes()
            if not data:
                raise RuntimeError("Missing Apps Script file: " + relative)
            name = "GoogleAppsScript/" + Path(relative).name
            package.writestr(name, data)
            checksums[name] = sha256(data).hexdigest()
        package.writestr("README_INSTALL_KO.txt", README.encode("utf-8-sig"))
        package.writestr("MANIFEST.json", (json.dumps({
            "version": "46.0.0",
            "purpose": "existing staff Apps Script: four-child capacity + V45 lesson library",
            "files_sha256": checksums,
            "contains_credentials": False,
            "changes_existing_sheets": False,
            "targets_public_enrollment": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(OUTPUT.name, OUTPUT.stat().st_size, "bytes")
    for path, digest in checksums.items():
        print(path, digest[:16])
if __name__ == "__main__":
    main()
