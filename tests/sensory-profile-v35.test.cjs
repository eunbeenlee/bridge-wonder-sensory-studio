'use strict';
/* Bridge Wonder V35 regression: account-only, free Instagram profile embed
 * plus CSS protections for on-page illustration and copy collisions.
 * Only synthetic DOM; never calls the external Instagram service.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const js=read('assets/js/instagram-feed-v35.js');
const css=read('assets/css/sensory-polish-v35.css');
const originalCSS=read('assets/css/site.css');
const pagePaths=[
  'sensory-studio/index.html',
  'sensory-studio/story/index.html',
  'sensory-studio/programs/index.html',
  'sensory-studio/experience/index.html',
  'sensory-studio/visit/index.html'
];
let count=0;
function test(name,check){check();count++;console.log('PASS',name);}

test('existing brand colors are unchanged in source and new layer does not override variables',()=>{
  for(const [key,value] of Object.entries({
    '--forest':'#40543a','--sage':'#99a682','--sage-pale':'#e7eadf',
    '--cream':'#fbf8f2','--paper':'#fffdf8','--orange':'#d1693b'
  })){
    assert.ok(originalCSS.includes(key+':'+value),key+' original palette');
    assert.ok(!new RegExp(key+'\\s*:').test(css),key+' is not redefined');
  }
});

test('every sensory public page loads one shared visual polish layer',()=>{
  for(const file of pagePaths){
    const html=read(file);
    assert.match(html,/sensory-polish-v35\.css\?v=35\.0\.0/,file);
    assert.match(html,/instagram-feed-v35\.js\?v=35\.0\.0/,file);
    assert.match(html,/site\.css/,file);
    assert.match(html,/site\.js/,file);
    assert.ok(html.indexOf('site.css')<html.indexOf('sensory-polish-v35.css'),file+' cascade order');
  }
});

test('Instagram stories are available on the main and story pages without fake posts',()=>{
  for(const file of pagePaths.slice(0,2)){
    const html=read(file);
    assert.match(html,/data-bw-instagram-feed/,file);
    assert.match(html,/instagram\.com\/bridgewonder\.e/,file);
  }
  for(const file of pagePaths){
    assert.doesNotMatch(read(file),/data-instgrm-permalink="https:\/\/www\.instagram\.com\/p\//);
  }
});

test('illustrations are placed in grid cells instead of absolute layers covering headings',()=>{
  for(const selector of [
    '.page-wonder .hero-visual',
    '.page-wonder .intro-collage',
    '.page-wonder .wonder-social-visual',
    '.page-wonder .mission-feature',
    '.page-wonder .experience-hero-scene'
  ])assert.ok(css.includes(selector),selector);
  assert.match(css,/\.page-wonder \.hero-visual\s*\{[^}]*display:grid/s);
  assert.match(css,/\.page-wonder \.hero-floating\s*\{[^}]*position:relative/s);
  assert.match(css,/\.page-wonder \.intro-collage \.collage-card\s*\{[^}]*position:relative/s);
  assert.match(css,/\.page-wonder \.social-preview\s*\{[^}]*transform:none/s);
  assert.match(css,/\.page-wonder \.mission-feature img\s*\{[^}]*position:relative/s);
  assert.match(css,/\.page-wonder \.experience-hero-scene > div\s*\{[^}]*position:relative/s);
});

test('official profile embed has one username, not a post URL or API integration',()=>{
  assert.match(js,/const USERNAME = 'bridgewonder\.e'/);
  assert.match(js,/const SCRIPT_URL = 'https:\/\/www\.instagram\.com\/embed\.js'/);
  assert.match(js,/data-instgrm-permalink/);
  assert.doesNotMatch(js,/instagram-feed\.json|BW_INSTAGRAM_ACCESS_TOKEN|graph\.instagram\.com|graph\.facebook\.com|\/p\/|\/reel\/|fetch\s*\(/);
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie/);
});

(async()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body><section data-bw-instagram-feed></section></body></html>',
    {url:'https://bridgewonder.bridgeacademy.co.kr/sensory-studio/',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.eval(js);
  d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));

  test('initial render has accessible account link and loads no external Meta script',()=>{
    const root=d.querySelector('[data-bw-instagram-feed]');
    assert.ok(root.querySelector('.bw-instagram-account-widget'));
    assert.equal(root.querySelectorAll('a[href="https://www.instagram.com/bridgewonder.e/"]').length,1);
    assert.equal(d.querySelector('script[src*="instagram.com"]'),null);
    assert.ok(root.querySelector('.bw-instagram-profile-status[role="status"]'));
  });

  let processCount=0,wasScriptAdded=false;
  const append=d.head.appendChild.bind(d.head);
  d.head.appendChild=(node)=>{
    const saved=append(node);
    if(node.tagName==='SCRIPT'&&node.src==='https://www.instagram.com/embed.js'){
      wasScriptAdded=true;
      w.instgrm={Embeds:{process:()=>{processCount++;}}};
      queueMicrotask(()=>node.onload?.(new w.Event('load')));
    }
    return saved;
  };
  d.querySelector('.bw-instagram-profile-load').click();
  await Promise.resolve();
  await new Promise(resolve=>setImmediate(resolve));

  test('click opens official profile blockquote, not any individual post',()=>{
    assert.equal(wasScriptAdded,true);
    assert.equal(processCount,1);
    const quote=d.querySelector('blockquote.instagram-media');
    assert.ok(quote);
    assert.equal(quote.getAttribute('data-instgrm-permalink'),
      'https://www.instagram.com/bridgewonder.e/');
    assert.equal(quote.getAttribute('data-instgrm-version'),'14');
    assert.equal(d.querySelector('.bw-instagram-profile-frame').hidden,false);
    assert.ok(d.querySelector('a[href="https://www.instagram.com/bridgewonder.e/"]'));
  });
  dom.window.close();
  console.log(JSON.stringify({suite:'V35 sensory site & Instagram account embed',passed:count}));
})().catch(error=>{console.error(error);process.exitCode=1;});
