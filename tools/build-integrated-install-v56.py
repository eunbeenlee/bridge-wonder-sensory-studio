#!/usr/bin/env python3
"""Build the current V56 complete staff-only GAS package; no private data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist"/"Bridge_Wonder_V56_Integrated_Staff_Install.zip"
FILES=["Code.gs","StaffBridge.gs","Admin.html","AcademicManagement.gs","Compliance.gs","InspectionPDF.gs","LessonPlans.gs","Payroll.gs","StudioContentV51.gs","StudioFinance.gs","StudioIntegrationV55.gs","StudioPlanningV56.gs"]
def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    hashes={}
    with ZipFile(OUT,"w",ZIP_DEFLATED,compresslevel=8) as z:
        for name in FILES:
            data=(ROOT/"server"/"apps-script"/name).read_bytes()
            if not data:raise ValueError("Empty source: "+name)
            dest="GoogleAppsScript/"+name
            z.writestr(dest,data)
            hashes[dest]=sha256(data).hexdigest()
        for name,dest in [("BRIDGE_V56_PLANNING.md","README_INSTALL_KO.md"),("BRIDGE_V55_INTEGRATION.md","V55_BASE_INSTALL_KO.md")]:
            z.writestr(dest,(ROOT/"docs"/name).read_bytes())
        z.writestr("MANIFEST.json",json.dumps({"version":"56.0.0","target":"existing private Staff project","credentials_or_sheet_data":False,"live_google_deployment":False,"files_sha256":hashes},ensure_ascii=False,indent=2)+"\n")
    with ZipFile(OUT) as z:
        if z.testzip():raise ValueError("Corrupt ZIP")
        for name,digest in hashes.items():
            if sha256(z.read(name)).hexdigest()!=digest:raise ValueError("Checksum mismatch: "+name)
    print(OUT.name,OUT.stat().st_size,"bytes",len(hashes),"GAS source files")
if __name__=="__main__":main()
