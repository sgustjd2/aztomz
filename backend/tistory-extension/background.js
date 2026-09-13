/* 서비스 워커 — 로컬 서버(blog-extension-server.mjs)와의 통신, 그리고 TinyMCE 본문 주입만 맡는다.
   content.js(격리 월드)는 window.tinymce 를 직접 못 본다 — 그건 티스토리 페이지 자신의 전역이라
   chrome.scripting.executeScript(world:'MAIN') 으로만 접근할 수 있다. 그래서 이 파일이 필요하다.

   로컬 서버 fetch 를 여기서 하는 이유: content script 의 fetch 는 페이지(티스토리)의 CSP 에 걸릴 수
   있지만, 서비스 워커는 확장 자체의 컨텍스트라 host_permissions 로 선언한 곳(localhost)에 자유롭다. */

const SERVER = 'http://localhost:8137';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse).catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
  return true; // 비동기 응답을 위해 채널을 열어둔다
});

async function handle(msg, sender) {
  switch (msg.type) {
    case 'GET_PENDING': {
      const r = await fetch(`${SERVER}/pending`);
      if (!r.ok) throw new Error(`서버 응답 ${r.status} — node backend/scripts/blog-extension-server.mjs 를 먼저 실행했나요?`);
      return { ok: true, data: await r.json() };
    }
    case 'GET_DRAFT': {
      const r = await fetch(`${SERVER}/draft/${encodeURIComponent(msg.slug)}`);
      if (!r.ok) throw new Error(`초안 조회 실패(${r.status}): ${msg.slug}`);
      return { ok: true, data: await r.json() };
    }
    case 'SET_TINYMCE_CONTENT': {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN',
        func: (html) => {
          try {
            const ed = window.tinymce && (window.tinymce.activeEditor || window.tinymce.editors[0]);
            if (!ed) return { ok: false, error: 'tinymce 에디터를 못 찾음(에디터가 기본모드인지 확인)' };
            ed.setContent(html);
            ed.fire('change');
            ed.save && ed.save();
            return { ok: true, len: (ed.getBody()?.innerHTML || '').length };
          } catch (e) {
            return { ok: false, error: String(e.message || e) };
          }
        },
        args: [msg.html],
      });
      return result.result;
    }
    case 'MARK_PUBLISHED': {
      const r = await fetch(`${SERVER}/mark-published`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload),
      });
      if (!r.ok) throw new Error(`발행 기록 실패(${r.status})`);
      return { ok: true, data: await r.json() };
    }
    default:
      throw new Error(`알 수 없는 메시지: ${msg.type}`);
  }
}
