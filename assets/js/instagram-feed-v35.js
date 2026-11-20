/* Bridge Wonder V35 — free curated Instagram post and Reel embeds.
 * No Meta API, developer registration, token, account password, scraping,
 * third-party thumbnail provider, or browser-persisted user data.
 * Site owner adds each public Instagram URL from GitHub Actions.
 * Official Instagram embed.js is loaded ONLY after the visitor clicks.
 */
(function(){
  'use strict';
  const FEED='/assets/data/instagram-feed.json';
  const PROFILE='https://www.instagram.com/bridgewonder.e/';
  const MAX_ITEMS=6;
  const MEDIA=/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]{5,40}\/?$/;
  let embedPromise=null;
  function permalink(value){
    if(typeof value!=='string'||value.length>300)return null;
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||!['www.instagram.com','instagram.com'].includes(url.hostname))return null;
      if(!MEDIA.test(url.pathname)||url.username||url.password||url.port)return null;
      return 'https://www.instagram.com'+url.pathname.replace(/\/?$/,'/');
    }catch(_){return null;}
  }
  function caption(value){
    return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,110);
  }
  function valid(data){
    if(!data||data.account!=='bridgewonder.e'||data.mode!=='manual_embed'||!Array.isArray(data.items))return [];
    const seen=new Set();
    return data.items.slice(0,30).map(item=>{
      if(!item||typeof item!=='object')return null;
      const url=permalink(item.url);
      if(!url||seen.has(url))return null;
      seen.add(url);
      return {url,title:caption(item.title)||'브릿지 원더 인스타그램 게시물',
        kind:url.includes('/reel/')?'릴스':'게시물'};
    }).filter(Boolean).slice(0,MAX_ITEMS);
  }
  function el(tag,klass,text){
    const node=document.createElement(tag);
    if(klass)node.className=klass;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function profileLink(text){
    const a=el('a','btn btn-dark',text);
    a.href=PROFILE;a.target='_blank';a.rel='noopener noreferrer';
    return a;
  }
  function fallback(root){
    root.replaceChildren();
    const box=el('div','bw-instagram-empty');
    const lead=el('div','bw-instagram-empty-head');
    const logo=el('img');logo.src='/assets/img/brand-mark.png';logo.alt='';logo.width=96;logo.height=68;logo.loading='lazy';
    const copy=el('div');
    copy.append(el('strong','', '브릿지 원더의 이야기는 인스타그램에서 만나요.'),
      el('p','','새로운 놀이 소식과 수업 준비 이야기는 공식 인스타그램에서 확인할 수 있습니다.'));
    lead.append(logo,copy);
    box.append(lead,profileLink('@bridgewonder.e 방문하기'));
    root.appendChild(box);
  }
  function loadOfficialEmbedScript(){
    if(embedPromise)return embedPromise;
    embedPromise=new Promise((resolve,reject)=>{
      if(window.instgrm?.Embeds?.process){resolve();return;}
      const script=document.createElement('script');
      script.src='https://www.instagram.com/embed.js';
      script.async=true;
      script.referrerPolicy='no-referrer-when-downgrade';
      script.onload=()=>window.instgrm?.Embeds?.process?resolve():reject(Error('Instagram renderer missing'));
      script.onerror=()=>reject(Error('Instagram renderer unavailable'));
      document.head.appendChild(script);
    }).catch(error=>{embedPromise=null;throw error;});
    return embedPromise;
  }
  function card(item){
    const article=el('article','bw-instagram-embed-card');
    const head=el('div','bw-instagram-embed-head');
    const label=el('strong','',item.title);
    const kind=el('span','',item.kind);
    head.append(label,kind);
    const view=el('div','bw-instagram-embed-view');
    const call=el('a','bw-instagram-open-original','Instagram에서 원본 보기');
    call.href=item.url;call.target='_blank';call.rel='noopener noreferrer';
    article.append(head,view,call);
    return {article,view};
  }
  function installEmbeds(root,posts,button){
    const grid=el('div','bw-instagram-embed-grid');
    posts.forEach(post=>{
      const {article,view}=card(post);
      const quote=el('blockquote','instagram-media');
      quote.setAttribute('data-instgrm-permalink',post.url);
      quote.setAttribute('data-instgrm-version','14');
      quote.setAttribute('data-instgrm-captioned','');
      quote.style.width='100%';
      quote.style.minWidth='0';
      quote.style.maxWidth='100%';
      quote.style.margin='0';
      const link=el('a','','Instagram에서 게시물 열기');
      link.href=post.url;link.target='_blank';link.rel='noopener noreferrer';
      quote.appendChild(link);
      view.appendChild(quote);
      grid.appendChild(article);
    });
    root.replaceChildren(grid);
    button.disabled=true;
    button.textContent='게시물을 불러오는 중입니다…';
    loadOfficialEmbedScript().then(()=>{
      window.instgrm.Embeds.process();
      button.remove();
    }).catch(()=>{
      button.disabled=false;
      button.textContent='게시물 다시 불러오기';
      const hint=el('p','bw-instagram-embed-note',
        'Instagram 게시물을 표시하지 못했습니다. 각 게시물의 원본 보기로 확인할 수 있습니다.');
      grid.before(hint);
    });
  }
  function display(root,posts){
    root.replaceChildren();
    const toolbar=el('div','bw-instagram-feed-toolbar');
    const count=el('p','','최근에 등록한 '+posts.length+'개의 인스타그램 게시물이 있습니다.');
    const button=el('button','btn btn-outline bw-instagram-load','게시물 보기');
    button.type='button';
    button.setAttribute('aria-label','Instagram 게시물 미리보기 불러오기');
    const note=el('p','bw-instagram-embed-note',
      '게시물 보기를 누르면 Instagram의 사진과 릴스를 이 페이지에서 열어 볼 수 있습니다.');
    toolbar.append(count,button);
    root.append(toolbar,note);
    const links=el('div','bw-instagram-link-list');
    posts.forEach(post=>{
      const a=el('a','bw-instagram-preview-link');
      a.href=post.url;a.target='_blank';a.rel='noopener noreferrer';
      a.append(el('span','',post.kind),el('strong','',post.title),el('span','','Instagram에서 보기'));
      links.appendChild(a);
    });
    root.appendChild(links);
    button.addEventListener('click',()=>installEmbeds(root,posts,button));
  }
  async function start(){
    const roots=[...document.querySelectorAll('[data-bw-instagram-feed]')];
    if(!roots.length)return;
    roots.forEach(fallback);
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timeout=controller?setTimeout(()=>controller.abort(),4500):null;
    try{
      const resp=await fetch(FEED,{cache:'no-cache',credentials:'omit',...(controller?{signal:controller.signal}:{})});
      if(!resp.ok)throw Error('Feed unavailable');
      const items=valid(await resp.json());
      if(!items.length)return;
      roots.forEach(root=>display(root,items));
    }catch(_){/* Honest social link fallback, never fake or scrape posts. */}
    finally{if(timeout)clearTimeout(timeout);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
