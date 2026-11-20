/* Bridge Wonder V37 — public monthly experience cards.
 * Read-only JSONP from an allowlisted public GET on the staff Apps Script.
 * No child/guardian data or credentials, no CORS workaround with private data.
 * Static January 2027 content remains visible when not yet published.
 */
(function(){
  'use strict';
  const ENDPOINT='https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec';
  const CODES=['welcome','snowy','colors','teddy','story-book'];
  const ART={welcome:'welcome.webp',snowy:'snowy.webp',colors:'colors.webp',
    teddy:'teddy.webp','story-book':'story-book.webp'};
  const TONES=['tone-ivory','tone-sage','tone-gold'];
  let loaded=false,finished=false;
  const $=selector=>document.querySelector(selector);
  function valid(obj){
    if(!obj||obj.ok!==true||!obj.theme)return null;
    const t=obj.theme;
    if(!/^20\d{2}-(?:0[1-9]|1[0-2])$/.test(String(t.month||'')) ||
       typeof t.heading!=='string'||t.heading.length>85||
       typeof t.intro!=='string'||t.intro.length>250||!Array.isArray(t.cards)||t.cards.length!==3)
      return null;
    const cards=t.cards.map(card=>{
      if(!card||typeof card!=='object'||!CODES.includes(card.image)||
         typeof card.title!=='string'||typeof card.description!=='string'||
         typeof card.tags!=='string'||card.title.length>65||
         card.description.length>195||card.tags.length>90)return null;
      return {title:card.title,description:card.description,tags:card.tags,image:card.image};
    });
    if(cards.some(x=>!x))return null;
    return {month:t.month,heading:t.heading,intro:t.intro,cards};
  }
  function text(tag,klass,value) {
    const node=document.createElement(tag);
    if(klass)node.className=klass;
    node.textContent=value;
    return node;
  }
  function art(card,idx,isHome) {
    const image=document.createElement('img');
    image.alt=card.title+' 체험 테마 일러스트';
    image.src=(isHome?'../':'../../')+'assets/img/'+ART[card.image];
    image.width=isHome?280:390;image.height=isHome?190:265;
    image.loading='lazy';image.decoding='async';
    const wrapper=document.createElement('div');
    wrapper.className=(isHome?'theme-illustration':'experience-visual')+' '+TONES[idx];
    wrapper.appendChild(image);
    return wrapper;
  }
  function card(item,i,isHome){
    const section=document.createElement('article');
    if(isHome)section.className='theme-card';
    section.appendChild(art(item,i,isHome));
    if(isHome){
      section.append(text('span','theme-number','THEME 0'+(i+1)));
      section.append(text('h3','',item.title),text('p','',item.description));
    }else{
      const body=text('div','experience-body','');
      body.append(text('span','','THEME 0'+(i+1)),
        text('h3','',item.title),text('p','',item.description),
        text('div','experience-tag',item.tags));
      section.appendChild(body);
    }
    return section;
  }
  function apply(t){
    const month=t.month.split('-')[1].replace(/^0/,'');
    const year=t.month.slice(0,4);
    const home=$('.theme-section');
    if(home){
      const title=home.querySelector('.section-title'),
        label=home.querySelector('.eyebrow'),
        cards=home.querySelector('.theme-grid'),
        chip=home.querySelector('.status-chip');
      if(title)title.textContent=t.heading||month+'월 체험 테마';
      if(label)label.textContent=year+'년 '+month+'월 · 체험 테마';
      if(cards)cards.replaceChildren(...t.cards.map((x,i)=>card(x,i,true)));
      if(chip)chip.textContent=year+'년 '+month+'월 체험 테마';
    }
    const experiences=$('.experience-themes');
    if(experiences){
      const heading=experiences.querySelector('.section-title'),
        label=experiences.querySelector('.eyebrow'),
        grid=experiences.querySelector('.experience-cards'),
        hero=$('.experience-hero');
      if(heading)heading.textContent=year+'년 '+month+'월 체험 테마';
      if(label)label.textContent='MONTHLY EXPERIENCES · '+t.month;
      if(grid)grid.replaceChildren(...t.cards.map((x,i)=>card(x,i,false)));
      if(hero){
        const title=hero.querySelector('h1'),subtitle=hero.querySelector('p'),eyebrow=hero.querySelector('.eyebrow');
        if(title)title.textContent=t.heading||month+'월, 원더의 새로운 놀이';
        if(subtitle)subtitle.textContent=t.intro;
        if(eyebrow)eyebrow.textContent=t.month+' · BRIDGE WONDER';
        // The illustrated hero must match the three published cards. Do not
        // overwrite price or promotion terms (those are managed separately).
        ['.scene-welcome img','.scene-snow img','.scene-colors img'].forEach((selector,i)=>{
          const picture=hero.querySelector(selector);
          if(picture){
            picture.src='../../assets/img/'+ART[t.cards[i].image];
            picture.alt=t.cards[i].title+' 체험 테마 일러스트';
          }
        });
      }
      document.title=year+'년 '+month+'월 체험 테마 | 브릿지 원더';
    }
    document.documentElement.dataset.bwExperienceMonth=t.month;
  }
  window.BWPublicExperience=Object.freeze({
    receive(value){
      if(finished)return;
      const data=valid(value);
      if(!data)return;
      finished=true;
      loaded=true;
      apply(data);
    }
  });
  function start(){
    if(!$('.theme-section')&&!$('.experience-themes'))return;
    const script=document.createElement('script');
    script.src=ENDPOINT+'?view=experience';
    script.async=true;
    script.onerror=()=>{script.remove();};
    document.head.appendChild(script);
    setTimeout(()=>{
      if(!loaded&&script.isConnected)script.remove();
    },8000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
