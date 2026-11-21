#!/usr/bin/env python3
"""Build V49 private staff Apps Script finance patch. Never bundle secrets or records."""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist"/"Bridge_Wonder_V49_Staff_Finance_Install.zip"
FILES=[
    "server/apps-script/Code.gs",
    "server/apps-script/StaffBridge.gs",
    "server/apps-script/LessonPlans.gs",
    "server/apps-script/StudioFinance.gs",
]
README="""BRIDGE WONDER V49 | 원장 전용 운영 손익·현금흐름 관리 설치 안내

직원용 Google Apps Script 프로젝트 전용입니다.
공개 상담/등록 Apps Script 프로젝트에는 절대 설치하지 마세요.

먼저 할 일
1. 직원용 Apps Script의 기존 Code.gs, StaffBridge.gs, LessonPlans.gs 및
   현재 웹앱 배포 주소를 백업합니다. 연결된 Google Sheets 데이터를 백업합니다.
2. Google Apps Script 편집기에서 ZIP의 Code.gs, StaffBridge.gs를 같은 이름의
   기존 파일에 덮어 넣습니다. LessonPlans.gs가 없으면 새 파일로 추가합니다.
   StudioFinance.gs는 새로운 파일로 추가합니다.
3. Payroll.gs, AcademicManagement.gs, Compliance.gs, InspectionPDF.gs, Admin.html,
   Script Properties, 직원 계정/비밀번호 및 기존 스프레드시트는 그대로 둡니다.
4. Apps Script → 배포 → 배포 관리 → 기존 직원 웹앱 수정 → 새 버전 배포.
   /exec URL, 실행 주체, 접근 권한 설정을 임의로 바꾸지 않습니다.
   별도 설치 함수 실행은 필요하지 않습니다.
5. 원장 계정 로그인 → 스튜디오 관리 → 운영 손익·현금흐름.
   월세 700,000원, 관리비 300,000원, 보증금 10,000,000원 확인.
   일반과세(부가세 10%) 및 표시가에 VAT 포함 가정 확인.
   가상의 거래를 등록·수정·취소하고 재조회한 후 CSV를 받아 확인합니다.
   선생님/상담 계정에서 해당 메뉴와 서버 메서드 접근이 차단되는지 확인하세요.

보안·세무 주의
- 실제 거래와 재무 가정은 소유자 전용 비공개 Google Sheets 탭에 기록됩니다.
- GitHub의 계산기 기본 가정(보증금·월세·관리비)은 JS 정적 자산으로
  공개될 수 있습니다. 개인 계좌번호나 비공개 사업 자료는 코드에 입력하지 마세요.
- 월 영업손익과 개원자금·보증금, 대표자 인출, 대출 원금, 세금 예수금을 구분합니다.
- 직원 수납/급여/은행 내역을 자동 가져오지 않습니다. 수기 입력 시 중복 확인.
- 부가세는 사용자가 지정한 비면세 사업을 전제로 일반과세 10%를 기본 설정합니다.
  체험료·정규 수업비는 부가세 포함 소비자가격을 기본으로 가정합니다.
  간이과세 등은 실제 사업자등록 및 세무 확인 후 변경하세요.
- 월세/관리비 부가세 별도 청구 여부, 매입세액 공제 여부는
  세금계산서 및 계약서에 따라 확인해야 합니다.
- 종합소득세, 사업주 4대보험과 2027년 세율은 신고 전 세무사와 재검토하세요.
- 이번 계산기는 예측 및 거래 관리 보조 도구로, 부가가치세/종소세 신고,
  급여 명세서, 현금영수증 발행을 대신하지 않습니다.
- 실제 연결은 직원용 GAS 재배포 후에만 가능합니다.
"""

def main() -> None:
    OUT.parent.mkdir(parents=True,exist_ok=True)
    digests={}
    with ZipFile(OUT,"w",ZIP_DEFLATED,compresslevel=8) as z:
        for path in FILES:
            data=(ROOT/path).read_bytes()
            if not data:raise ValueError("Empty file: "+path)
            name="GoogleAppsScript/"+Path(path).name
            z.writestr(name,data)
            digests[name]=sha256(data).hexdigest()
        z.writestr("README_INSTALL_KO.txt",README.encode("utf-8-sig"))
        z.writestr("MANIFEST.json",(json.dumps({
            "version":"49.0.0",
            "purpose":"private owner finance dashboard and existing staff workflow update",
            "contains_credentials":False,
            "existing_sheets_overwritten":False,
            "public_enrollment_project_modified":False,
            "files_sha256":digests,
            "generated_at":datetime.now(timezone.utc).isoformat()
        },indent=2,ensure_ascii=False)+"\n").encode("utf-8"))
    print(OUT.name,OUT.stat().st_size,"bytes")
    for p,h in digests.items():print(p,h[:16])
if __name__=="__main__":
    main()
