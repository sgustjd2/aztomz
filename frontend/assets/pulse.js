/* ============================================================
   한끗 · 트렌드 펄스 — 페이지 로직 (정적, 백엔드 0)
   데이터: window.PULSE_DATA (data/pulse.js). 헬퍼: 기존 H.* 재사용.
   빠른 아이디어는 공개 트렌드 콘텐츠를 바탕으로 화면에서 펼쳐 본다.
   ============================================================ */
(function (global) {
  'use strict';
  const H = global.H || (global.H = {});
  const D = global.PULSE_DATA || { generatedAt: null, trends: [], daily: [] };

  const CATS = ['전체', '테크', 'K뷰티', '헬스', '푸드', '금융', '교육', '패션', '엔터', '라이프', '등산', '관광'];
  const PI = { Google: 'G', YouTube: 'YT', Instagram: 'IG', TikTok: 'TT', X: 'X' };

  /* ---------- 점수 → tier/라벨 (한끗 토큰 기반) ---------- */
  function tierOf(total) {
    const t = (typeof total === 'number') ? total : 8;
    if (t >= 10) return { tier: 'peak', label: '즉시 실행', mark: '▲ ' };
    if (t >= 8) return { tier: 'good', label: '유망', mark: '' };
    if (t >= 6) return { tier: 'mid', label: '관찰', mark: '' };
    return { tier: 'warn', label: '보류', mark: '' };
  }

  /* ---------- 스파크라인: SVG 문자열, stroke=currentColor (다크 대응) ---------- */
  function spark(data, w, h) {
    w = w || 90; h = h || 30;
    if (!Array.isArray(data) || data.length < 2) return '';
    const mx = Math.max.apply(null, data), mn = Math.min.apply(null, data), r = (mx - mn) || 1;
    const pts = data.map((v, i) => ((i / (data.length - 1)) * w).toFixed(1) + ',' + (h - ((v - mn) / r) * (h - 4) - 2).toFixed(1)).join(' ');
    return `<svg class="tp-spark-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">` +
      `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function platformsHTML(pl) {
    return (pl || []).map((p) => `<span class="tp-pi" title="${H.esc(p)}">${PI[p] || H.esc(p)}</span>`).join('');
  }

  // 빠른 창업 아이디어 3개: 데이터에 t.ideas 있으면 사용, 없으면 angle+템플릿으로 생성
  function quickIdeasOf(t) {
    if (Array.isArray(t.ideas) && t.ideas.length) {
      return t.ideas.slice(0, 3).map((x) => (typeof x === 'string' ? x : (x.title || x.text || '')));
    }
    const parts = (t.angle || '').split(/\s*또는\s*/).map((s) => s.trim()).filter(Boolean);
    const out = parts.slice();
    const tmpl = [`${t.kw} 전문 미디어·커뮤니티 (콘텐츠 비즈니스)`, `${t.kw} 데이터·큐레이션 도구 (SaaS)`, `${t.kw} 입문자용 교육·템플릿 마켓`];
    for (const x of tmpl) { if (out.length >= 3) break; if (!out.includes(x)) out.push(x); }
    return out.slice(0, 3);
  }

  /* ---------- 트렌드 카드 ---------- */
  H.pulse = H.pulse || {};
  H.pulse.card = function (t, opts) {
    opts = opts || {};
    const tt = tierOf(t.total);
    const stamp = opts.today ? '이번 주' : tt.label;
    return `<article class="tp-card" data-id="${H.esc(t.id)}">
      <div class="tp-body">
        <div class="tp-card-head">
          <span class="tp-cat">${H.esc(t.cat)}</span>
          <span class="tp-growth">+${H.esc(t.gr)}%</span>
          <span class="tp-badge ${tt.tier}">${H.esc(stamp)}</span>
        </div>
        <h3 class="tp-kw">${H.esc(t.kw)}</h3>
        <div class="tp-meta">
          <span class="tp-pl">${platformsHTML(t.pl)}</span>
          ${(t.date || D.generatedAt) ? `<time class="tp-date" datetime="${H.esc(t.date || D.generatedAt)}">수집 ${H.fmtISO(t.date || D.generatedAt)}</time>` : ''}
          <span class="tp-spark ${tt.tier}">${spark(t.sp, 66, 20)}</span>
        </div>
        <p class="tp-why">${H.esc(t.why)}</p>
        ${t.angle ? `<div class="tp-angle"><b>핵심 각도</b> · ${H.esc(t.angle)}</div>` : ''}
        <button class="tp-more" type="button" aria-expanded="false" aria-controls="tpIdeas-${H.esc(t.id)}-${opts.today ? 'week' : 'radar'}">아이디어 3개 보기</button>
        <div class="tp-ideas" id="tpIdeas-${H.esc(t.id)}-${opts.today ? 'week' : 'radar'}" hidden>
          <div class="tp-ideas-h">빠른 창업 아이디어 3</div>
          <ol class="tp-idea-list">${quickIdeasOf(t).map((s) => `<li>${H.esc(s)}</li>`).join('')}</ol>

        </div>
      </div>
    </article>`;
  };

  /* ---------- 상태 ---------- */
  const S = { cat: '전체', q: '', view: 'weekly' };

  /* ---------- 필터/검색/정렬 ---------- */
  function filtered() {
    const q = S.q.trim().toLowerCase();
    return D.trends
      .filter((t) => (S.cat === '전체' || t.cat === S.cat) &&
        (!q || t.kw.toLowerCase().includes(q) || (t.why || '').toLowerCase().includes(q) || (t.angle || '').toLowerCase().includes(q)))
      .sort((a, b) => b.gr - a.gr);
  }

  function renderList() {
    const list = filtered();
    H.q('#tpList').innerHTML = list.map((t, i) => H.pulse.card(t, { rank: i + 1 })).join('');
    H.q('#tpEmpty').hidden = list.length > 0;
    const c = H.q('#tpCount'); if (c) c.textContent = `${list.length}개`;
  }

  function renderFilter() {
    H.q('#tpCatFilter').innerHTML = CATS.map((c) => {
      const n = c === '전체' ? D.trends.length : D.trends.filter((t) => t.cat === c).length;
      return `<button class="cat-chip${c === S.cat ? ' on' : ''}" aria-pressed="${c === S.cat}" data-cat="${H.esc(c)}">${H.esc(c)} <span class="cc-n">${n}</span></button>`;
    }).join('');
  }

  function renderDaily() {
    const box = H.q('#tpDaily'); if (!box) return;
    const daily = (D.daily || []);
    if (!daily.length) {
      box.innerHTML = `<div class="tp-daily-empty">아직 이번 주 트렌드가 없어요. 매주 자동으로 채워집니다.</div>`;
      return;
    }
    box.innerHTML = daily.map((t) => H.pulse.card(t, { today: true })).join('');
  }

  /* ---------- 공개 트렌드 보기 전환 ---------- */
  function renderTabs() {
    const tabs = [
      { k: 'weekly', l: '이번 주 트렌드' },
      { k: 'radar', l: `트렌드 레이더 ${D.trends.length}개` }
    ];
    H.q('#tpTabs').innerHTML = tabs.map((t) =>
      `<button class="tp-tab${S.view === t.k ? ' on' : ''}" aria-pressed="${S.view === t.k}" data-view="${t.k}">${t.l}</button>`).join('');
    H.q('#tpWeekly').hidden = S.view !== 'weekly';
    H.q('#tpRadar').hidden = S.view !== 'radar';
  }

  function setView(v) { if(!['weekly','radar'].includes(v))return; S.view=v; renderTabs(); }

  /* ---------- 이벤트 ---------- */
  function wire() {
    // 탭
    H.q('#tpTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]'); if (!b) return; setView(b.dataset.view);
    });
    // 카테고리 칩
    H.q('#tpCatFilter').addEventListener('click', (e) => {
      const b = e.target.closest('.cat-chip'); if (!b || b.dataset.cat === S.cat) return;
      S.cat = b.dataset.cat; renderFilter(); renderList();
    });
    // 검색(디바운스)
    let tmr; H.q('#tpSearch').addEventListener('input', (e) => {
      clearTimeout(tmr); const v = e.target.value;
      tmr = setTimeout(() => { S.q = v; renderList(); }, 120);
    });
    const handleCardArea = (e) => {
      const card = e.target.closest('.tp-card'); if (!card) return;
      const ideas = H.q('.tp-ideas', card);
      if (ideas) {
        ideas.hidden = !ideas.hidden;
        const disclosure = H.q('.tp-more', card);
        if (disclosure) {
          disclosure.setAttribute('aria-expanded', String(!ideas.hidden));
          disclosure.textContent = ideas.hidden ? '아이디어 3개 보기' : '아이디어 접기';
        }
        card.classList.toggle('open', !ideas.hidden);
      }
    };
    // 카드 펼침 + 빠른 아이디어
    H.q('#tpRadar').addEventListener('click', handleCardArea);
    H.q('#tpWeekly').addEventListener('click', handleCardArea);

  }

  /* ---------- 발행 라인(데이터 신선도) ---------- */
  H.pulse.feedFreshness = () => H.freshness(global.PULSE_DATA && global.PULSE_DATA.generatedAt);

  /* ---------- init ---------- */
  H.pulse.init = function () {
    const fresh = H.q('#tpFresh');
    if (fresh) {
      fresh.innerHTML = `트렌드 ${D.trends.length}건` +
        (D.generatedAt ? ` · 기준일 ${H.fmtISO(D.generatedAt)}` : '');
    }
    const views=['weekly','radar'];
    S.view = views.includes(H.param('tab')) ? H.param('tab') : 'weekly';
    renderTabs(); renderFilter(); renderList(); renderDaily();
    wire();
  };

})(window);
