/* 격리 월드(isolated world) — DOM 은 페이지와 공유하지만 페이지의 JS 전역(window.tinymce 등)은
   못 본다. 그래서 이 파일은 "보이는 입력창을 채우는 것"만 하고, 본문 주입은 background.js 에 맡긴다. */

/* React 등으로 관리되는 입력창은 el.value = x 로 바꿔도 프레임워크가 모른다(내부 상태와 어긋나
   발행 시 초기화·유실될 수 있다). 네이티브 setter 로 값을 넣고 input 이벤트를 직접 쏴야 프레임워크가
   변경을 감지한다 — React 컨트롤드 인풋에 흔히 쓰는 표준 우회법이다. */
function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressEnter(el) {
  for (const type of ['keydown', 'keypress', 'keyup']) {
    el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ask(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra }).then((res) => {
    if (!res || res.ok === false) throw new Error(res?.error || `${type} 실패`);
    return res.data ?? res;
  });
}

async function fillTitle(title) {
  const el = document.querySelector('#post-title-inp')
    || document.querySelector('input[placeholder*="제목"]')
    || document.querySelector('textarea[placeholder*="제목"]');
  if (!el) return false;
  el.focus();
  setNativeValue(el, title);
  return true;
}

/* 카테고리는 네이티브 select 가 아니라 #category-btn 커스텀 드롭다운이다(blog-publish.mjs 와 동일 구조). */
async function fillCategory(name) {
  if (!name) return false;
  const btn = document.querySelector('#category-btn');
  if (!btn) return false;
  btn.click();
  await sleep(300);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*[-–]?\\s*(.*/)?${esc}\\s*$`);
  const candidates = [...document.querySelectorAll('[role="option"], li a, li button, li')];
  const hit = candidates.find((el) => re.test((el.textContent || '').trim()));
  if (hit) { hit.click(); return true; }
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return false;
}

async function fillTags(tags) {
  const el = document.querySelector('#tagText') || document.querySelector('input[placeholder*="태그"]');
  if (!el) return false;
  for (const tag of tags || []) {
    el.focus();
    setNativeValue(el, tag);
    pressEnter(el);
    await sleep(150);
  }
  return true;
}

function buildPanel() {
  const box = document.createElement('div');
  box.id = 'hangeut-draft-helper';
  box.style.cssText = `
    position:fixed;top:70px;right:16px;width:300px;z-index:99999;
    background:#1f2430;color:#f2f2f2;border-radius:10px;padding:14px;
    font:13px/1.5 -apple-system,"Malgun Gothic",sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);
  `;
  box.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <span>한끗 초안 도우미</span>
      <span id="hg-close" style="cursor:pointer;opacity:.6">✕</span>
    </div>
    <select id="hg-select" style="width:100%;margin-bottom:8px;padding:6px;border-radius:6px;background:#0e1116;color:#eee;border:1px solid #3a4050"></select>
    <button id="hg-load" style="width:100%;padding:8px;border:0;border-radius:6px;background:#f0b429;color:#1f2430;font-weight:700;cursor:pointer">불러오기</button>
    <div id="hg-status" style="margin-top:10px;font-size:12px;color:#b7bdc9;white-space:pre-wrap"></div>
    <div id="hg-cover" style="margin-top:8px"></div>
  `;
  document.body.appendChild(box);
  box.querySelector('#hg-close').onclick = () => box.remove();
  return box;
}

function setStatus(box, text) { box.querySelector('#hg-status').textContent = text; }

async function populateSelect(box) {
  const select = box.querySelector('#hg-select');
  select.innerHTML = '<option>불러오는 중…</option>';
  try {
    const list = await ask('GET_PENDING');
    if (!list.length) { select.innerHTML = '<option value="">(초안 없음 — blog-assemble.mjs 먼저 실행)</option>'; return; }
    select.innerHTML = list
      .map((d) => `<option value="${d.slug}">${d.published ? '✓ ' : ''}${d.title}${d.published ? ' (발행됨)' : ''}</option>`)
      .join('');
  } catch (e) {
    select.innerHTML = '<option value="">(서버 연결 실패)</option>';
    setStatus(box, `⚠ ${e.message}`);
  }
}

let loadedSlug = null;
let loadedTitle = null;
let publishReported = false;

async function loadDraft(box, slug) {
  setStatus(box, '불러오는 중…');
  box.querySelector('#hg-cover').innerHTML = '';
  try {
    const draft = await ask('GET_DRAFT', { slug });

    await fillTitle(draft.title);
    await fillCategory(draft.category);
    await sleep(200);

    const bodyResult = await ask('SET_TINYMCE_CONTENT', { html: draft.body });
    await fillTags(draft.tags);

    loadedSlug = slug;
    loadedTitle = draft.title;
    publishReported = false;

    const lines = [`✓ 제목·카테고리·태그·본문(${bodyResult.len}자) 채움`];
    if (draft.hasUnresolvedFigures) lines.push('⚠ 본문에 처리 안 된 그림 마커([FIG:...])가 있습니다 — 수동 확인 필요');
    if (!draft.hasCover) lines.push('· 커버 이미지 없음');
    setStatus(box, lines.join('\n'));

    if (draft.hasCover) {
      box.querySelector('#hg-cover').innerHTML = `
        <div style="margin-bottom:4px">대표 이미지(직접 첨부 필요):</div>
        <img src="http://localhost:8137/cover/${encodeURIComponent(slug)}" style="width:100%;border-radius:6px;margin-bottom:4px">
        <div style="font-size:11px;color:#9aa0ab">첨부 → 사진에서 backend/out/blog/${slug}.cover.png 선택</div>
      `;
    }
  } catch (e) {
    setStatus(box, `✗ ${e.message}`);
  }
}

/* 사람이 실제로 발행 버튼을 누르고 캡차까지 통과하면 URL 이 /숫자 로 바뀐다. 그 순간을 잡아
   posted.json 에 자동 기록한다(별도 조작 없이) — 원래 blog-publish.mjs 가 하던 것과 같은 기록이라
   이후 내부링크·중복방지 로직이 계속 정상 동작한다. */
function watchForPublish() {
  setInterval(() => {
    if (!loadedSlug || publishReported) return;
    if (/^\/\d+\/?$/.test(location.pathname)) {
      publishReported = true;
      ask('MARK_PUBLISHED', { payload: { slug: loadedSlug, url: location.href, title: loadedTitle } })
        .then(() => console.log('[한끗 초안 도우미] posted.json 기록됨:', loadedSlug, location.href))
        .catch((e) => console.warn('[한끗 초안 도우미] 발행 기록 실패:', e.message));
    }
  }, 1500);
}

(function init() {
  const box = buildPanel();
  populateSelect(box);
  box.querySelector('#hg-load').onclick = () => {
    const slug = box.querySelector('#hg-select').value;
    if (slug) loadDraft(box, slug);
  };
  watchForPublish();
})();
