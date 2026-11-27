/* 한끗 — 회원·댓글·좋아요 (Supabase)
   설정: assets/supabase-config.js (window.HANGEUT_SUPABASE). 비어 있으면 H.social.enabled=false 이고 아무것도 안 그린다.
   권한은 DB의 RLS가 막는다(backend/supabase/schema.sql). 이 파일은 화면과 호출만 맡는다.
   app.js 다음에 불러온다. */
(function (global) {
  const H = global.H;
  const cfg = global.HANGEUT_SUPABASE || {};
  const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const S = H.social = { enabled: !!(cfg.url && cfg.anonKey), client: null, user: null };
  const base = () => new URL('.', location.href).href;

  /* ---------- 연결 ---------- */
  let readyP = null;
  S.ready = () => readyP || (readyP = new Promise((resolve, reject) => {
    if (!S.enabled) return resolve(null);
    const start = () => {
      S.client = global.supabase.createClient(cfg.url, cfg.anonKey);
      S.client.auth.onAuthStateChange((event, session) => {
        S.user = session ? session.user : null;
        if (event === 'PASSWORD_RECOVERY') S.recovery = true;
        S.mountMast();
      });
      S.client.auth.getSession().then(({ data }) => { S.user = data.session ? data.session.user : null; resolve(S.client); }, reject);
    };
    if (global.supabase && global.supabase.createClient) return start();
    const s = document.createElement('script');
    s.src = SDK; s.async = true;
    s.onload = start; s.onerror = () => reject(new Error('sdk_load_failed'));
    document.head.appendChild(s);
  }));

  /* ---------- 오류 문구 ---------- */
  S.msg = (e) => {
    if (!e) return '';
    const code = e.code || '';
    const m = String(e.message || e);
    if (code === 'invalid_credentials' || /Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
    if (code === 'email_not_confirmed' || /Email not confirmed/i.test(m)) return '메일함에서 가입 확인 링크를 먼저 눌러 주세요.';
    if (code === 'user_already_exists' || /already registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
    if (code === 'weak_password' || /Password should be/i.test(m)) return '비밀번호는 8자 이상으로 정해 주세요.';
    if (/rate limit|over_email_send_rate_limit/i.test(code + m)) return '요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.';
    if (code === '23505') return '이미 쓰는 닉네임이에요.';
    if (code === '23514') return '입력 길이를 확인해 주세요.';
    if (m === 'sdk_load_failed' || /Failed to fetch|NetworkError/i.test(m)) return '연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.';
    return '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.';
  };
  const must = ({ data, error }) => { if (error) throw error; return data; };

  /* ---------- 계정 ---------- */
  S.signUp = async (email, password) => {
    const c = await S.ready();
    return must(await c.auth.signUp({ email, password, options: { emailRedirectTo: base() + 'login.html?confirmed=1' } }));
  };
  S.signIn = async (email, password) => must(await (await S.ready()).auth.signInWithPassword({ email, password }));
  S.signOut = async () => must(await (await S.ready()).auth.signOut());
  S.resetPassword = async (email) => must(await (await S.ready()).auth.resetPasswordForEmail(email, { redirectTo: base() + 'me.html?reset=1' }));
  S.updatePassword = async (password) => must(await (await S.ready()).auth.updateUser({ password }));
  S.myProfile = async () => {
    const c = await S.ready(); if (!S.user) return null;
    return must(await c.from('profiles').select('id,nickname,created_at').eq('id', S.user.id).single());
  };
  S.updateNickname = async (nickname) => {
    const c = await S.ready();
    return must(await c.from('profiles').update({ nickname }).eq('id', S.user.id));
  };
  S.deleteAccount = async () => {
    const c = await S.ready();
    must(await c.rpc('delete_my_account'));
    await c.auth.signOut();
  };

  /* 로그인 뒤 돌아갈 곳 — 같은 사이트의 페이지만 허용 */
  S.safeNext = (v) => (/^[a-z]+\.html(\?[\w=&%.\-]*)?(#[\w-]+)?$/.test(v || '') ? v : '');
  S.loginHref = (anchor) => 'login.html?next=' + encodeURIComponent(
    (location.pathname.split('/').pop() || 'index.html') + location.search + (anchor ? '#' + anchor : ''));

  /* ---------- 좋아요 ---------- */
  S.likeState = async (trendId) => {
    const c = await S.ready();
    const row = must(await c.from('like_counts').select('likes').eq('trend_id', trendId).maybeSingle());
    let mine = false;
    if (S.user) mine = !!must(await c.from('likes').select('trend_id').eq('trend_id', trendId).eq('user_id', S.user.id).maybeSingle());
    return { count: row ? row.likes : 0, mine };
  };
  S.setLike = async (trendId, on) => {
    const c = await S.ready();
    if (on) must(await c.from('likes').insert({ trend_id: trendId }));
    else must(await c.from('likes').delete().eq('trend_id', trendId).eq('user_id', S.user.id));
  };

  /* ---------- 댓글 ---------- */
  S.listComments = async (trendId) => {
    const c = await S.ready();
    return must(await c.from('comments').select('id,body,created_at,user_id,profiles(nickname)')
      .eq('trend_id', trendId).order('created_at', { ascending: false }).limit(100));
  };
  S.addComment = async (trendId, body) => must(await (await S.ready()).from('comments').insert({ trend_id: trendId, body }));
  S.removeComment = async (id) => must(await (await S.ready()).from('comments').delete().eq('id', id));

  /* ---------- 화면: 메뉴의 로그인/내 정보 링크 ---------- */
  S.mountMast = () => {
    if (!S.enabled) return;
    const nav = H.q('#mastNav'); if (!nav) return;
    let a = nav.querySelector('[data-account]');
    if (!a) { a = document.createElement('a'); a.setAttribute('data-account', ''); nav.appendChild(a); }
    const label = S.user ? '내 정보' : '로그인';
    a.href = S.user ? 'me.html' : S.loginHref();
    a.title = label; a.setAttribute('aria-label', label);
    a.innerHTML = `<span class="nav-icon icon-user" aria-hidden="true"></span><span class="nav-label">${label}</span>`;
    const here = location.pathname.split('/').pop();
    if (here === 'me.html' || here === 'login.html') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  };

  /* ---------- 화면: 상세 페이지 좋아요 버튼 ---------- */
  S.mountLike = async (btn, trendId) => {
    if (!S.enabled || !btn) return;
    const num = btn.querySelector('.like-n');
    let st = { count: 0, mine: false }, busy = false;
    const paint = () => {
      btn.setAttribute('aria-pressed', st.mine ? 'true' : 'false');
      btn.classList.toggle('is-on', st.mine);
      num.textContent = st.count ? String(st.count) : '';
    };
    try { await S.ready(); st = await S.likeState(trendId); paint(); } catch (e) { /* 개수만 못 그림 — 버튼은 유지 */ }
    btn.addEventListener('click', async () => {
      if (busy) return;
      try { await S.ready(); } catch (e) { H.toast(S.msg(e)); return; }
      if (!S.user) { location.href = S.loginHref(); return; }
      busy = true;
      const prev = { ...st };
      st = { mine: !st.mine, count: Math.max(0, st.count + (st.mine ? -1 : 1)) }; paint();
      try { await S.setLike(trendId, st.mine); }
      catch (e) { st = prev; paint(); H.toast(S.msg(e)); }
      busy = false;
    });
  };

  /* ---------- 화면: 상세 페이지 댓글 ---------- */
  const fmtTime = (iso) => {
    const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '방금';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  S.mountComments = async (sec, trendId) => {
    if (!S.enabled || !sec) return;
    const form = sec.querySelector('.cmt-form-slot'), list = sec.querySelector('.cmt-list'), count = sec.querySelector('.cmt-n');
    list.innerHTML = '<li class="cmt-empty">댓글을 불러오는 중이에요…</li>';
    try { await S.ready(); } catch (e) { list.innerHTML = `<li class="cmt-empty">${H.esc(S.msg(e))}</li>`; return; }

    const drawForm = () => {
      if (!S.user) {
        // 비로그인: 입력란처럼 보이는 링크 — 누르면 로그인 후 이 댓글 자리로 돌아온다
        form.innerHTML = `<a class="cmt-gate" href="${H.esc(S.loginHref('comments'))}">
            <span class="cmt-gate-ph">이 트렌드, 직접 겪어 보셨나요?</span>
            <span class="cmt-gate-cta">로그인하고 댓글 쓰기</span></a>`;
        return;
      }
      form.innerHTML = `<form class="cmt-form" novalidate>
          <label class="sr-only" for="cmt-body">댓글</label>
          <textarea id="cmt-body" name="body" rows="3" maxlength="500" placeholder="이 트렌드, 직접 겪어 보셨나요?" required></textarea>
          <div class="cmt-form-row"><span class="cmt-count" aria-live="polite">0 / 500</span>
            <button class="btn accent" type="submit">등록</button></div>
          <p class="cmt-err" role="alert"></p>
        </form>`;
      const f = form.querySelector('form'), ta = f.querySelector('textarea'), cnt = f.querySelector('.cmt-count'), err = f.querySelector('.cmt-err'), btn = f.querySelector('button');
      ta.addEventListener('input', () => { cnt.textContent = `${ta.value.length} / 500`; err.textContent = ''; });
      f.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const body = ta.value.trim();
        if (!body) { err.textContent = '내용을 입력해 주세요.'; ta.focus(); return; }
        btn.disabled = true;
        try { await S.addComment(trendId, body); ta.value = ''; cnt.textContent = '0 / 500'; await drawList(); }
        catch (e) { err.textContent = S.msg(e); }
        btn.disabled = false;
      });
    };

    const drawList = async () => {
      let rows;
      try { rows = await S.listComments(trendId); }
      catch (e) { list.innerHTML = `<li class="cmt-empty">${H.esc(S.msg(e))}</li>`; return; }
      count.textContent = rows.length ? `${rows.length}개` : '';
      if (!rows.length) { list.innerHTML = '<li class="cmt-empty">아직 댓글이 없어요. 첫 댓글을 남겨 주세요.</li>'; return; }
      list.innerHTML = rows.map((r) => {
        const mine = S.user && r.user_id === S.user.id;
        const nick = (r.profiles && r.profiles.nickname) || '알 수 없음';
        return `<li class="cmt" data-id="${r.id}">
          <div class="cmt-head"><b class="cmt-nick">${H.esc(nick)}</b><time datetime="${H.esc(r.created_at)}">${fmtTime(r.created_at)}</time>
            ${mine ? '<button class="cmt-del" type="button">삭제</button>' : ''}</div>
          <p class="cmt-body">${H.esc(r.body)}</p></li>`;
      }).join('');
      list.querySelectorAll('.cmt-del').forEach((b) => b.addEventListener('click', async () => {
        if (!global.confirm('이 댓글을 삭제할까요? 되돌릴 수 없어요.')) return;
        const id = Number(b.closest('.cmt').dataset.id);
        b.disabled = true;
        try { await S.removeComment(id); await drawList(); } catch (e) { b.disabled = false; H.toast(S.msg(e)); }
      }));
    };

    drawForm();
    await drawList();
    // 로그인하고 돌아온 경우(#comments): 댓글 자리로 이동하고 입력란에 커서
    if (location.hash === '#comments') {
      sec.scrollIntoView({ block: 'start' });
      const ta = sec.querySelector('textarea'); if (ta) ta.focus({ preventScroll: true });
    }
  };

  // 메뉴는 페이지 스크립트의 H.boot()가 그린다 — 그 뒤(DOMContentLoaded)에 링크를 붙인다
  if (S.enabled) S.ready().then(() => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', S.mountMast);
    else S.mountMast();
  }, () => {});
})(window);
