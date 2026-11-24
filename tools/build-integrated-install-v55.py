#!/usr/bin/env python3
"""Build a single staff-only Apps Script installer from the current repository."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json

ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/"server"/"apps-script"
OUT=ROOT/"dist"/"Bridge_Wonder_V55_Integrated_Staff_Install.zip"
FILES=[
    "Code.gs","StaffBridge.gs","Admin.html","AcademicManagement.gs",
    "Compliance.gs","InspectionPDF.gs","LessonPlans.gs","Payroll.gs",
    "StudioContentV51.gs","StudioFinance.gs","StudioIntegrationV55.gs"
]
def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    guide=(ROOT/"docs"/"BRIDGE_V55_INTEGRATION.md").read_bytes()
    hashes={}
    with ZipFile(OUT,"w",ZIP_DEFLATED,compresslevel=8) as z:
        for name in FILES:
            data=(SERVER/name).read_bytes()
            if not data:raise ValueError("Empty source: "+name)
            dest="GoogleAppsScript/"+name
            z.writestr(dest,data)
            hashes[dest]=sha256(data).hexdigest()
        z.writestr("README_INSTALL_KO.md",guide)
        z.writestr("MANIFEST.json",json.dumps({
            "version":"55.0.0","target":"existing private staff Apps Script project",
            "credentials_or_sheet_data":False,"live_google_deployment":False,
            "files_sha256":hashes
        },ensure_ascii=False,indent=2)+"\n")
    with ZipFile(OUT) as z:
        if z.testzip():raise ValueError("Corrupt ZIP")
        for name,hash_ in hashes.items():
            if sha256(z.read(name)).hexdigest()!=hash_:raise ValueError("Checksum mismatch "+name)
    print(str(OUT.relative_to(ROOT)),OUT.stat().st_size,"bytes",len(hashes),"source files")
if __name__=="__main__":
    main()
