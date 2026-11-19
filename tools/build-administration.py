#!/usr/bin/env python3
"""Rebuild GitHub JS layout from the editable staff/administration.html template."""
from pathlib import Path
import json, re
root=Path(__file__).resolve().parents[1]
source=(root/'staff/administration.html').read_text(encoding='utf-8')
match=re.search(r'<!-- BW25_UI_START -->(.*?)<!-- BW25_UI_END -->',source,re.S)
if not match:
    raise SystemExit('BW25 UI markers missing')
layout=match.group(1).strip()+'\n'
output="""/* Generated from staff/administration.html. Do not hand-edit. */
(function(){
'use strict';
const h=document.getElementById('bw25-root');if(!h)return;
if(!(window.google&&window.google.script&&window.google.script.run)){h.textContent='공식 직원 운영공간에서 접속하세요.';return;}
h.insertAdjacentHTML('afterend',__LAYOUT__);h.remove();
const s=document.createElement('script');s.src='https://bridgewonder.bridgeacademy.co.kr/assets/js/administration.js';s.async=false;
s.onerror=()=>{document.body.insertAdjacentHTML('afterbegin','<section role="alert" style="padding:14px;background:#fff2ea;color:#7d3925">업무 화면을 불러오지 못했습니다.</section>');};
document.body.appendChild(s);
})();
"""
(root/'assets/js/administration-layout.js').write_text(output.replace('__LAYOUT__',json.dumps(layout,ensure_ascii=False)),encoding='utf-8')
print('Generated assets/js/administration-layout.js')
