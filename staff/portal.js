"use strict";
// Google-only: this URL is public in the browser's HTML/Network tab; it is NOT a secret.
// No Cloudflare Worker, no external API credentials or Google Sheets IDs are exposed here.
const APP_URL="https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec";
const frame=document.getElementById('portal');
const status=document.getElementById('status');
const fallback=document.getElementById('assist');
fallback.href=APP_URL;
frame.addEventListener('load',()=>{status.hidden=true;},{once:true});
frame.addEventListener('error',()=>{status.hidden=true;},{once:true});
frame.src=APP_URL;
setTimeout(()=>{if(!status.hidden){status.hidden=true;fallback.focus();}},9000);
