/* ============================================================
   한끗 — 공유 스토어 + 헬퍼 (데이터는 data/trends.js 에서 로드)
   저장/후기/펄스 아이디어는 localStorage 기반 로컬 개인화.
   ▶ H.* 는 로컬 스토어 추상화 계층. 향후 백엔드를 붙여도 UI는 이 인터페이스만 사용.
   ▶ 신선도: 항상 '오늘'(브라우저 new Date) 대비 analyzedAt 으로 계산해 라이브 표시.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 트렌드 데이터 (data/trends.js) ---------- */
  const _DATA = global.HANGEUT_DATA || { generatedAt:null, trends:[] };
  const TRENDS = _DATA.trends || [];

  /* ---------- 저수준 storage ---------- */
  const LS = global.localStorage;
  const K = {
    users:'hangeut.users',
    session:'hangeut.session',
    saves:'hangeut.saves',
    reviews:'hangeut.reviews',
    pulseIdeas:'hangeut.pulseIdeas'
  };
  function read(k, def){ try{ return JSON.parse(LS.getItem(k)) ?? def; }catch(e){ return def; } }
  function write(k, v){ try{ LS.setItem(k, JSON.stringify(v)); }catch(e){} }
  function hash(s){ let h=5381; for(let i=0;i<s.length;i++){ h=((h<<5)+h)+s.charCodeAt(i); h|=0; } return 'h'+(h>>>0).toString(36); }

  /* ---------- 헬퍼 ---------- */
  const H = {};
  H.TRENDS = TRENDS;
  H.generatedAt = _DATA.generatedAt;
  H.trend = (id)=> TRENDS.find(t=>t.id===id) || null;
  H.q  = (s,r)=> (r||document).querySelector(s);
  H.qa = (s,r)=> [...(r||document).querySelectorAll(s)];
  H.esc = (s)=> String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  H.bandTxt = (v)=> v<=20?'낮음':v<=40?'약간':v<=60?'보통':v<=80?'높음':'매우 높음';
  H.fmtDate = (ts)=>{ const d=new Date(ts); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())}`; };
  H.param = (k)=> new URLSearchParams(global.location.search).get(k);
  H.resolve = (v)=> Promise.resolve(v);
  H.trunc = (s, n=88)=> {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
  };
  H.summary = (t, n=88)=> H.trunc((t && (t.excerpt || t.def || t.stageMsg || t.verdict || t.pull)) || '', n);

  const SAFE_PAGES = new Set(['index.html','list.html','trend.html','dictionary.html','login.html','signup.html','me.html','pulse.html']);
  H.safeNext = (next, fallback='index.html')=>{
    const fb = SAFE_PAGES.has(fallback) ? fallback : 'index.html';
    const raw = String(next || '').trim();
    if(!raw) return fb;
    if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\\)/i.test(raw)) return fb;
    try{
      const u = new URL(raw, 'https://hangeut.local/');
      if(u.origin !== 'https://hangeut.local') return fb;
      const page = (u.pathname.replace(/^\/+/, '') || 'index.html');
      if(!SAFE_PAGES.has(page) || page.includes('/') || page.includes('\\')) return fb;
      return `${page}${u.search}${u.hash}`;
    }catch(e){ return fb; }
  };
  H.currentPage = ()=>{
    const page = (global.location.pathname.split('/').pop() || 'index.html');
    return H.safeNext(`${page}${global.location.search}${global.location.hash}`);
  };
  H.loginHref = (next)=> H.safeNext(next || 'me.html', 'me.html');
  H.signupHref = (next)=> H.safeNext(next || 'me.html', 'me.html');

  /* ---------- 오늘 / 신선도 (라이브) ---------- */
  H.todayStr = ()=>{ const d=new Date(); const p=x=>String(x).padStart(2,'0'); return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())}`; };
  H.fmtISO = (iso)=> iso ? String(iso).replace(/-/g,'.') : '';
  H.daysSince = (iso)=>{ if(!iso) return null; const a=new Date(iso+'T00:00:00'); const b=new Date(); if(isNaN(a)) return null; a.setHours(0,0,0,0); b.setHours(0,0,0,0); return Math.round((b-a)/86400000); };
  H.freshness = (iso)=>{ const n=H.daysSince(iso);
    if(n==null) return {n:null,text:'',cls:'ok'};
    if(n<=0)   return {n,text:'오늘 분석',cls:'fresh'};
    if(n<=3)   return {n,text:`${n}일 전`,cls:'fresh'};
    if(n<14)   return {n,text:`${n}일 전`,cls:'ok'};
    return {n,text:`${n}일 전 · 갱신 필요`,cls:'stale'};
  };
  H.freshChip = (iso)=>{ const f=H.freshness(iso); return f.text ? `<span class="fresh-chip ${f.cls}">${f.text}</span>` : ''; };
  // 데이터 묶음 신선도(홈 발행라인용)
  H.feedFreshness = ()=> H.freshness(H.generatedAt);

  /* ---------- deprecated auth API (kept for old links/scripts) ---------- */
  H.user = ()=> null;
  H.signup = ({name,email,password})=>{
    return {ok:true, deprecated:true};
  };
  H.login = ({email,password})=>{
    return {ok:true, deprecated:true};
  };
  H.logout = ()=>{ LS.removeItem(K.session); };

  /* ---------- saves (bookmarks) ---------- */
  function uniq(arr){ return [...new Set((arr || []).filter(Boolean))]; }
  function savedIds(){
    const raw = read(K.saves, []);
    if(Array.isArray(raw)) return uniq(raw);
    if(raw && typeof raw === 'object'){
      const all = [];
      Object.keys(raw).forEach(k=>{ if(Array.isArray(raw[k])) all.push(...raw[k]); });
      return uniq(all);
    }
    return [];
  }
  function writeSavedIds(arr){ write(K.saves, uniq(arr).slice(0, 200)); }
  H.saves = ()=> savedIds();
  H.isSaved = (id)=> H.saves().includes(id);
  H.toggleSave = (id)=>{
    const arr=savedIds();
    const i=arr.indexOf(id);
    if(i>=0) arr.splice(i,1); else arr.unshift(id);
    writeSavedIds(arr);
    return {saved: i<0};
  };

  /* ---------- reviews ---------- */
  H.reviews = (trendId)=> read(K.reviews, []).filter(r=>r.trendId===trendId).sort((a,b)=>b.ts-a.ts);
  H.myReviews = ()=> read(K.reviews,[]).sort((a,b)=>b.ts-a.ts);
  H.addReview = (trendId,{rating,text})=>{
    rating=Number(rating)||0; text=(text||'').trim();
    if(rating<1||rating>5) return {ok:false,error:'별점을 선택해주세요.'};
    if(text.length<5) return {ok:false,error:'후기를 5자 이상 적어주세요.'};
    const all=read(K.reviews,[]);
    all.push({ trendId, email:'local', name:'나', rating, text, ts: Date.now(), local:true });
    write(K.reviews, all);
    return {ok:true};
  };
  H.avgRating = (trendId)=>{ const rs=H.reviews(trendId); if(!rs.length) return null; return rs.reduce((s,r)=>s+r.rating,0)/rs.length; };

  /* ---------- pulse ideas (local store; 향후 백엔드 전환 시 이 레이어만 교체) ---------- */
  H.pulseIdeas = {
    list: ()=> read(K.pulseIdeas, []),
    save: (items)=>{ write(K.pulseIdeas, (items || []).slice(0, 80)); return {ok:true}; },
    addMany: (items)=>{ const next = (items || []).concat(H.pulseIdeas.list()).slice(0, 80); write(K.pulseIdeas, next); return next; },
    remove: (id)=>{ const next = H.pulseIdeas.list().filter(i=>i.id!==id); write(K.pulseIdeas, next); return next; }
  };

  /* ---------- UI helpers ---------- */
  H.starHTML = (n)=>{ let s=''; for(let i=1;i<=5;i++) s+=`<span class="${i<=Math.round(n)?'':'off'}">★</span>`; return s; };
  // 커버 썸네일용 대표 이미지: 영상 트렌드는 유튜브 썸네일, 아니면 첫 대표 이미지
  H.coverImg = (t)=>{
    if(t && t.video && t.video.youtube) return `https://i.ytimg.com/vi/${t.video.youtube}/hqdefault.jpg`;
    const im = t && t.images && t.images[0];
    return im ? (typeof im==='string'?im:im.u) : '';
  };
  H.COVER_DEFAULTS = {'맛집':'food','디저트':'dessert','카페·핫플':'cafe','신조어':'words','노래·챌린지':'music','패션':'fashion','AI 프롬프트':'ai'};
  H.coverDefault = (t)=>`assets/defaults/${H.COVER_DEFAULTS[t && t.cat]||'general'}.svg`;
  H.coverHTML = (t, opts={})=>{
    const img = H.coverImg(t), fallback = H.coverDefault(t);
    const tag = opts.inline ? 'span' : 'div';
    return `<${tag} class="cover ${H.esc(t.coverCat||'')} ${opts.tall?'tall':''} has-img ${img?'':'is-editorial-cover'}">
      <img class="c-bg" src="${H.esc(img||fallback)}" alt="" loading="${opts.tall?'eager':'lazy'}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallback}';this.parentNode.classList.add('is-editorial-cover')">
      <span class="cover-credit">${H.esc(t.cat||'한끗')} · 기본 이미지</span>
    </${tag}>`;
  };
  H.thumbHTML = (t)=>`<span class="idx-thumb" aria-hidden="true">${H.coverHTML(t,{inline:true})}</span>`;
  // 상세 페이지 링크 (모든 페이지가 frontend/ 루트에 있어 상대경로로 동작)
  H.detailHref = (id)=> `trend.html?id=${encodeURIComponent(id)}`;
  H.scoreMetersHTML = (t)=>{
    const meter=(key,label)=>{
      const value=Math.max(0,Math.min(100,Number(t[key])||0));
      return `<span class="mrow ${key==='ad'?'ad':'trust'}" role="group" aria-label="${label} ${value}점"><span class="m-label">${label}</span><b class="m-value">${value}</b><span class="mbar" role="meter" aria-label="${label} 점수" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${value}점"><i style="width:${value}%;${value?'min-width:4px;':''}"></i></span></span>`;
    };
    return `<span class="mini" role="group" aria-label="분석 점수">${meter('ad','광고 의심')}${meter('trust','후기 신뢰')}</span>`;
  };
  // 광고 분석 랭킹 행 (홈 #ad · list.html?type=ad 공용) — rank: 1-based 표시 순번
  H.adRowHTML = (t, rank, opts={})=>{
    if(!opts.editorial){
      return `
      <a class="idx-row" href="${H.detailHref(t.id)}">
        <span class="rank">${String(rank).padStart(2,'0')}</span>
        <span class="t">
          <span class="it-cat">${H.esc(t.cat)} · ${H.esc(t.buzz)}</span>
          <span class="it-title">${H.esc(t.title)}</span>
          <span class="label it-label ${H.esc(t.labelCls||'mid')}">${H.esc(t.label)}</span>
          ${H.summary(t)?`<span class="it-desc">${H.esc(H.summary(t, 96))}</span>`:''}
        </span>
        ${H.scoreMetersHTML(t)}
      </a>`;
    }
    const thumb = H.thumbHTML(t);
    const tags = (t.tags||[]).slice(0,5).map(tag=>`<span class="it-tag">#${H.esc(tag)}</span>`).join('');
    const analyzedDate = t.analyzedAt ? t.analyzedAt.replace(/-/g,'.') : '';
    return `
    <a class="idx-row has-thumb" href="${H.detailHref(t.id)}">
      ${thumb}
      <span class="rank">${String(rank).padStart(2,'0')}</span>
      <span class="t">
        <span class="it-cat"><span>${H.esc(t.cat)}</span>${t.buzz?`<span aria-hidden="true">·</span><span>${H.esc(t.buzz)}</span>`:''}</span>
        <span class="it-title">${H.esc(t.title)}</span>
        ${H.summary(t)?`<span class="it-desc">${H.esc(H.summary(t, 96))}</span>`:''}
        ${tags?`<span class="it-tags">${tags}</span>`:''}
        <span class="it-foot"><span class="label it-label ${H.esc(t.labelCls||'mid')}">${H.esc(t.label)}</span>${analyzedDate?`<span class="it-date">분석 ${H.esc(analyzedDate)}</span>`:''}</span>
      </span>
      ${H.scoreMetersHTML(t)}
    </a>`;
  };
  // 요즘 트렌드 카드 (홈 #trend · list.html?type=trend 공용)
  H.trendCardHTML = (t)=>`
    <a class="chip-card" href="${H.detailHref(t.id)}">
      ${H.coverHTML(t)}
      <div class="cc-meta">
        <div class="cc-stage">${H.esc(t.stage)}</div>
        <div class="cc-title">${H.esc(t.title)}</div>
        ${H.summary(t)?`<div class="cc-desc">${H.esc(H.summary(t, 72))}</div>`:''}
        ${t.pureKorean?`<div class="cc-pure">우리말 · ${H.esc(t.pureKorean.split('(')[0].trim())}</div>`:''}
        ${t.prompt?`<div class="cc-prompt">프롬프트 포함</div>`:''}
        <div class="cc-foot">${t.analyzedAt?`분석 ${H.esc(t.analyzedAt.replace(/-/g,'.'))}`:''}</div>
      </div>
    </a>`;
  H.toast = (msg)=>{
    let el=H.q('.toast'); if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
    el.textContent=msg; el.classList.add('show');
    clearTimeout(H._tt); H._tt=setTimeout(()=>el.classList.remove('show'),1900);
  };

  /* ---------- 신조어 신선도: 한물간 단어는 사전 '최신'에서 빠지고 '지난 유행어'로 보관 ---------- */
  // 한물 조건: stage에 끝물/한물/지남 표시 OR analyzedAt이 14일+ 미갱신(재확인 안 된 옛 단어).
  H.SLANG_STALE_DAYS = 14;
  H.isFreshSlang = (t)=>{
    if(t.fresh===false) return false;                       // 사람이 '지남'으로 마킹
    if(/끝물|한물|지남|옛유행|outdated/.test(t.stage||'')) return false;
    const d = t.analyzedAt || t.collectedAt;
    if(d){ const days = (Date.now() - new Date(d+'T00:00:00').getTime())/864e5; if(days >= H.SLANG_STALE_DAYS) return false; }
    return true;
  };

  /* ---------- 공유 (네이티브 공유 시트 → 실패 시 링크 복사) ---------- */
  H.share = async (opts)=>{
    const data = { title: opts.title||'한끗', text: opts.text||'', url: opts.url||location.href };
    try{
      if(navigator.share){ await navigator.share(data); return 'shared'; }
    }catch(e){ if(e && e.name==='AbortError') return 'cancel'; }
    try{
      await navigator.clipboard.writeText((data.text?data.text+'\n':'')+data.url);
      H.toast && H.toast('링크를 복사했어요 — 붙여넣기 하세요');
      return 'copied';
    }catch(e){ H.toast && H.toast('공유를 지원하지 않는 환경이에요'); return 'fail'; }
  };

  /* ---------- 테마: 라이트 기본 + 토글 + localStorage 기억 ---------- */
  const THEME_KEY='hangeut.theme';
  H.theme = {
    get(){ try{ return LS.getItem(THEME_KEY)==='dark' ? 'dark' : 'light'; }catch(e){ return 'light'; } },
    apply(t){ if(global.document && document.documentElement) document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light'); },
    set(t){ t=(t==='dark')?'dark':'light'; try{ LS.setItem(THEME_KEY,t); }catch(e){} H.theme.apply(t); H.updateThemeBtn(t); },
    toggle(){ H.theme.set(H.theme.get()==='dark'?'light':'dark'); }
  };
  H.updateThemeBtn = (t)=>{
    const b=H.q && H.q('.theme-toggle');
    if(!b) return;
    const dark=t==='dark', label=dark?'라이트 모드':'다크 모드';
    if(document.body.classList.contains('app-redesign')){
      b.innerHTML=`<span class="nav-icon icon-${dark?'sun':'moon'}" aria-hidden="true"></span><span class="nav-label">${label}</span>`;
    } else b.textContent=dark?'☀':'🌙';
    b.setAttribute('aria-label',label);
  };
  H.theme.apply(H.theme.get());  // 로드 즉시 적용(테마 깜빡임 최소화)

  /* ---------- masthead, injected into [data-mast] ---------- */
  H.NAV_CATEGORIES = [['맛집','utensils'],['디저트','cake-slice'],['카페·핫플','coffee'],['신조어','message-square'],['노래·챌린지','music'],['패션','shirt'],['AI 프롬프트','sparkles']];
  H.normalizeCategory = (cat)=>({'음식':'맛집','핫플':'카페·핫플','밈':'신조어','유행어':'신조어'}[cat]||cat||'전체');
  // Refresh active links without rebuilding the menu or losing drawer/focus state.
  H.syncMastCurrent = ()=>{
    const host=H.q('[data-mast]'); if(!host)return;
    const current = new URL(location.href);
    const currentHref = current.pathname.split('/').pop() || 'index.html';
    const currentListType = current.searchParams.get('type') || 'trend';
    const currentCat = H.normalizeCategory(current.searchParams.get('cat'));
    host.querySelectorAll('#mastNav a').forEach(a=>{
      a.classList.remove('is-active'); a.removeAttribute('aria-current');
      const target = new URL(a.href, location.href);
      const samePage = target.pathname.split('/').pop()===currentHref;
      const sameListType = currentHref!=='list.html' || target.searchParams.get('type')===currentListType;
      if(samePage && sameListType){
        a.classList.add('is-active');
        a.setAttribute('aria-current',currentCat!=='전체'?'location':'page');
      }
    });
    host.querySelectorAll('.nav-categories a').forEach(a=>{
      a.classList.remove('is-active'); a.removeAttribute('aria-current');
      if(currentHref==='list.html' && currentListType==='trend' && H.normalizeCategory(new URL(a.href).searchParams.get('cat'))===currentCat){
        a.classList.add('is-active'); a.setAttribute('aria-current','page');
      }
    });
  };
  H.renderMast = ()=>{
    const host=H.q('[data-mast]'); if(!host) return;
    if(!document.body.classList.contains('home-redesign')) document.body.classList.add('app-redesign');
    host.className='mast';
    const menu = [
      ['index.html','오늘의 한끗','house'],
      ['list.html?type=ad','광고일까 진짜일까','scan-search'],
      ['list.html?type=trend','요즘 트렌드','chart-no-axes-combined'],
      ['dictionary.html','MZ 사전','book-open'],
      ['me.html','내 보관함','bookmark']
    ];
    const categories = H.NAV_CATEGORIES;
    host.innerHTML=`<div class="wrap">
      <div class="mast-brand"><a class="wordmark" href="index.html" aria-label="한끗 홈">한<b>끗</b></a></div>
      <button class="nav-toggle" type="button" aria-label="메뉴 접기" aria-expanded="true" aria-controls="mastPanel"><span class="nav-icon icon-panel-left-close" aria-hidden="true"></span></button>
      <div class="mast-panel" id="mastPanel" tabindex="-1">
        <button class="drawer-close" type="button" aria-label="메뉴 닫기"><span class="nav-icon icon-x" aria-hidden="true"></span></button>
        <nav id="mastNav" aria-label="주 메뉴">${menu.map(([url,label,icon])=>`<a href="${url}" title="${label}" aria-label="${label}"><span class="nav-icon icon-${icon}" aria-hidden="true"></span><span class="nav-label">${label}</span></a>`).join('')}</nav>
        <nav class="nav-categories" aria-label="트렌드 카테고리"><span class="nav-section-label">카테고리</span>${categories.map(([cat,icon])=>`<a href="list.html?type=trend&cat=${encodeURIComponent(cat)}"><span class="nav-icon icon-${icon}" aria-hidden="true"></span><span class="nav-label">${H.esc(cat)}</span></a>`).join('')}</nav>
        <button class="theme-toggle" type="button" aria-label="테마 전환"></button>
      </div>
    </div><button class="nav-scrim" type="button" aria-label="메뉴 닫기" tabindex="-1" hidden></button>`;
    H.syncMastCurrent();
    const tg=host.querySelector('.nav-toggle'), panel=host.querySelector('.mast-panel');
    const close=host.querySelector('.drawer-close'), scrim=host.querySelector('.nav-scrim');
    const compact=global.matchMedia('(max-width:1024px)');
    let collapsed=read('hangeut.navCollapsed',false)===true, opened=false;
    const backgroundState=new Map();
    const sync=()=>{
      document.body.classList.toggle('nav-collapsed',collapsed);
      host.classList.toggle('nav-open',opened);
      document.body.classList.toggle('nav-open',opened);
      panel.inert=compact.matches && !opened;
      scrim.hidden=!opened;
      if(compact.matches && opened){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','사이트 메뉴');}
      else {panel.removeAttribute('role');panel.removeAttribute('aria-modal');panel.removeAttribute('aria-label');}
      const label=compact.matches?(opened?'메뉴 닫기':'메뉴 열기'):(collapsed?'메뉴 펼치기':'메뉴 접기');
      tg.setAttribute('aria-label',label); tg.title=label;
      tg.setAttribute('aria-expanded',String(compact.matches?opened:!collapsed));
      tg.innerHTML=compact.matches||collapsed?'<span class="nav-icon icon-menu" aria-hidden="true"></span>':label;
    };
    const setOpen=(value,restore=true)=>{
      opened=Boolean(value) && compact.matches;
      if(opened){
        [...document.body.children].filter(el=>el!==host && !['SCRIPT','STYLE'].includes(el.tagName)).forEach(el=>{if(!backgroundState.has(el))backgroundState.set(el,el.inert);el.inert=true;});
      }else {backgroundState.forEach((value,el)=>{el.inert=value;});backgroundState.clear();}
      sync();
      if(opened)global.requestAnimationFrame(()=>{if(opened)close.focus({preventScroll:true});});
      else if(restore)tg.focus({preventScroll:true});
    };
    tg.addEventListener('click',()=>{
      if(compact.matches)setOpen(!opened);
      else {collapsed=!collapsed;write('hangeut.navCollapsed',collapsed);sync();}
    });
    close.addEventListener('click',()=>setOpen(false));
    scrim.addEventListener('click',()=>setOpen(false));
    panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(opened)setOpen(false,false);}));
    document.addEventListener('keydown',e=>{
      if(!opened)return;
      if(e.key==='Escape'){e.preventDefault();setOpen(false);return;}
      if(e.key==='Tab'){
        const items=[...panel.querySelectorAll('a[href],button')].filter(el=>el.getClientRects().length && !el.disabled);
        const first=items[0],last=items[items.length-1];
        if(e.shiftKey && (document.activeElement===first || !panel.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && (document.activeElement===last || !panel.contains(document.activeElement))){e.preventDefault();first.focus();}
      }
    });
    compact.addEventListener('change',()=>{const focusInside=panel.contains(document.activeElement);setOpen(false,false);if(compact.matches && focusInside)tg.focus();});
    sync();
    const tb=host.querySelector('.theme-toggle');
    if(tb){ H.updateThemeBtn(H.theme.get()); tb.addEventListener('click',()=> H.theme.toggle()); }
  };

  /* ---------- reveal on scroll (pure enhancement; default visible) ---------- */
  H.initReveals = ()=>{
    const els=H.qa('.reveal'); if(!els.length) return;
    const reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!('IntersectionObserver' in global) || reduce) return;
    els.forEach(e=>e.classList.add('pre'));
    const io=new IntersectionObserver((ents)=>{ ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.remove('pre'); io.unobserve(e.target);} }); },{threshold:0.08});
    els.forEach(e=>io.observe(e));
    setTimeout(()=>els.forEach(e=>e.classList.remove('pre')), 1500);
  };

  /* ---------- per-page boot ---------- */
  H.boot = ()=>{ H.renderMast(); H.initReveals(); };

  global.H = H;
})(window);
