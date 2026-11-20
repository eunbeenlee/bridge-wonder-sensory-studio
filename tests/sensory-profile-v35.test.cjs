'use strict';
/* V36 regression: automatic, account-only Instagram embed, with zero-post-URL
 * setup, no server API credentials, adaptive layout and safe fallbacks.
 * No real Instagram requests: all external script events are simulated.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const js=read('assets/js/instagram-feed-v35.js');
const css=read('assets/css/sensory-polish-v35.css');
const theme=read('assets/css/site.css');
const pages=['sensory-studio/index.html','sensory-studio/story/index.html','sensory-studio/programs/index.html','sensory-studio/experience/index.html','sensory-studio/visit/index.html'];
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

check('keep original sage green, ivory, gold and orange brand tokens',()=>{
  for(const [token,value] of Object.entries({
    '--forest':'#40543a','--sage':'#99a682','--sage-pale':'#e7eadf',
    '--cream':'#fbf8f2','--paper':'#fffdf8','--orange':'#d1693b'
  })){
    assert.ok(theme.includes(token+':'+value),token+' base token');
    assert.doesNotMatch(css,new RegExp(token+'\\s*:'),token+' cannot be redefined');
  }
});
check('all public pages load one updated V36 stylesheet and auto feed script',()=>{
  for(const file of pages){
    const content=read(file);
    assert.match(content,/sensory-polish-v35\.css\?v=36\.0\.0/,file);
    assert.match(content,/instagram-feed-v35\.js\?v=36\.0\.0/,file);
    assert.ok(content.indexOf('site.css')<content.indexOf('sensory-polish-v35.css'));
    assert.match(content,/site\.js/);
  }
  for(const file of pages.slice(0,2)){
    assert.match(read(file),/data-bw-instagram-feed/,file);
  }
});
check('hero, story, social, seasonal images no longer use overlapping absolute decoration',()=>{
  for(const selector of [
    '.page-wonder .hero-visual','.page-wonder .intro-collage',
    '.page-wonder .wonder-social-visual','.page-wonder .mission-feature',
    '.page-wonder .experience-hero-scene'
  ])assert.ok(css.includes(selector),selector);
  assert.match(css,/\.page-wonder \.hero-visual\s*\{[^}]*display:grid/s);
  assert.match(css,/\.page-wonder \.hero-floating\s*\{[^}]*position:relative/s);
  assert.match(css,/\.page-wonder \.intro-collage \.collage-card\s*\{[^}]*position:relative/s);
  assert.match(css,/\.page-wonder \.social-preview\s*\{[^}]*transform:none/s);
});
check('desktop feed uses two balanced columns; mobile collapses to one and contains iframe width',()=>{
  assert.match(css,/\.bw-instagram-account-widget\s*\{[^}]*display:grid;[^}]*grid-template-columns:minmax\(275px,\.78fr\) minmax\(0,1\.22fr\)/s);
  assert.match(css,/\.bw-instagram-account-intro\s*\{[^}]*display:flex/s);
  assert.match(css,/\.bw-instagram-account-media\s*\{[^}]*display:flex/s);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.bw-instagram-account-widget\s*\{[^}]*flex-direction:column/s);
  assert.match(css,/\.bw-instagram-profile-frame iframe\s*\{[^}]*max-width:100%!important/s);
});
check('one Instagram account, no post URLs, Graph API, paid widget or background polling',()=>{
  assert.match(js,/const USERNAME = 'bridgewonder\.e'/);
  assert.match(js,/const EMBED_SCRIPT = 'https:\/\/www\.instagram\.com\/embed\.js'/);
  assert.match(js,/data-instgrm-permalink/);
  assert.doesNotMatch(js,/fetch\s*\(|graph\.instagram\.com|graph\.facebook\.com|access_token|localStorage|sessionStorage|\/p\/|\/reel\//);
  assert.doesNotMatch(js,/최근 게시물 보기|다시 불러오기|addEventListener\('click'/);
  assert.match(js,/if \(started\) return/);
});

(async()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body><section data-bw-instagram-feed></section></body></html>',
    {url:'https://bridgewonder.bridgeacademy.co.kr/sensory-studio/',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  let callback=null,observer=null,appended=0,processed=0;
  w.IntersectionObserver=class{
    constructor(cb,opts){callback=cb;this.opts=opts;observer=this;}
    observe(root){this.root=root;}
    disconnect(){this.disconnected=true;}
  };
  const append=d.head.appendChild.bind(d.head);
  d.head.appendChild=node=>{
    const result=append(node);
    if(node.tagName==='SCRIPT'&&node.src==='https://www.instagram.com/embed.js'){
      appended++;
      w.instgrm={Embeds:{process:()=>{
        processed++;
        const target=d.querySelector('.bw-instagram-profile-frame');
        const iframe=d.createElement('iframe');
        iframe.src='about:blank';
        target.appendChild(iframe);
      }}};
      queueMicrotask(()=>node.onload?.(new w.Event('load')));
    }
    return result;
  };
  w.eval(js);
  d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  check('initial editorial card renders immediately with no click-dependent buttons',()=>{
    assert.ok(d.querySelector('.bw-instagram-account-widget'));
    assert.ok(d.querySelector('.bw-instagram-account-title'));
    assert.ok(d.querySelector('.bw-instagram-account-media'));
    assert.ok(d.querySelector('.bw-instagram-account-actions a[href="https://www.instagram.com/bridgewonder.e/"]'));
    assert.equal(d.querySelector('.bw-instagram-profile-load'),null);
    assert.equal(d.querySelectorAll('button').length,0);
    assert.equal(appended,0,'loading deferred until viewport intersection');
    assert.ok(observer?.root);
    assert.equal(observer.opts.rootMargin,'650px 0px');
  });
  callback([{isIntersecting:true}]);
  await tick();await tick();
  check('approaching viewport automatically loads exactly one profile embed and hides loading note',()=>{
    assert.equal(appended,1);
    assert.equal(processed,1);
    assert.equal(observer.disconnected,true);
    assert.equal(d.querySelector('blockquote.instagram-media').dataset.instgrmPermalink,
      'https://www.instagram.com/bridgewonder.e/');
    assert.ok(d.querySelector('.bw-instagram-profile-frame iframe'));
    assert.equal(d.querySelector('.bw-instagram-profile-status').hidden,true);
    assert.ok(d.querySelector('[data-bw-instagram-feed]').classList.contains('bw-instagram-embed-ready'));
    callback([{isIntersecting:true}]);
    assert.equal(appended,1,'no repeated requests');
  });
  dom.window.close();

  const dom2=new JSDOM('<!doctype html><html lang="ko"><head></head><body><section data-bw-instagram-feed></section></body></html>',
    {url:'https://bridgewonder.bridgeacademy.co.kr/sensory-studio/story/',runScripts:'outside-only'});
  const w2=dom2.window,d2=w2.document;
  // No IntersectionObserver: auto-start also works in older browsers.
  const original=d2.head.appendChild.bind(d2.head);
  d2.head.appendChild=node=>{
    const result=original(node);
    if(node.tagName==='SCRIPT'&&node.src==='https://www.instagram.com/embed.js')
      queueMicrotask(()=>node.onerror?.(new w2.Event('error')));
    return result;
  };
  w2.eval(js);
  d2.dispatchEvent(new w2.Event('DOMContentLoaded',{bubbles:true}));
  await tick();await tick();
  check('blocked Instagram renderer keeps user-friendly account link and does not request clicks',()=>{
    assert.ok(d2.querySelector('[data-bw-instagram-feed]').classList.contains('bw-instagram-embed-unavailable'));
    assert.match(d2.querySelector('.bw-instagram-profile-status').textContent,/공식 계정/);
    assert.ok(d2.querySelector('.bw-instagram-account-actions a[href="https://www.instagram.com/bridgewonder.e/"]'));
    assert.equal(d2.querySelectorAll('button').length,0);
  });
  dom2.window.close();
  console.log(JSON.stringify({suite:'V36 automatic Instagram editorial feed',passed}));
})().catch(error=>{console.error(error);process.exitCode=1;});
