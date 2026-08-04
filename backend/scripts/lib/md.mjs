/* ============================================================
   마크다운 → HTML (블로그 본문용)

   post-build.mjs 와 blog-assemble.mjs 가 함께 쓴다.
   ============================================================ */
/* ───────────────────── 마크다운 → HTML ─────────────────────
   변환기를 붙이지 않고 직접 쓴다. 허용 태그만 만들어내므로 그 자체가 살균이다
   (LLM 이 <script> 를 뱉어도 통과할 경로가 없다). blog-build.mjs 와 같은 인라인 스타일. */
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const QUOTE = 'border-left:4px solid #111;margin:1.6em 0;padding:2px 0 2px 16px;font-weight:600;color:#111;';
const HR = 'border:0;border-top:1px solid #e5e7eb;margin:2.4em 0;';
/* 영상 임베드 — 티스토리는 <style> 을 걷어내므로 반응형을 인라인 스타일로만 만든다.
   패딩 트릭(16:9 = 56.25%)이라 aspect-ratio 미지원 환경에서도 비율이 유지된다. */
const EMBED_BOX = 'position:relative;padding-bottom:56.25%;height:0;margin:1.6em 0;border-radius:12px;overflow:hidden;background:#000;';
const EMBED_FRAME = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';
const EMBED_CAP = 'font-size:.9em;color:#6b7280;margin:-.8em 0 1.8em;text-align:center;';
const CODE = 'white-space:pre-wrap;word-break:break-word;background:#f6f7f9;border-radius:10px;padding:14px 16px;';
// 본문 그림 — 캡션에 출처를 붙일 수 있게 figure/figcaption 으로 감싼다.
const FIG_BOX = 'margin:1.8em 0;';
const FIG_CAP = 'font-size:.9em;color:#6b7280;margin-top:.7em;text-align:center;line-height:1.6;';
const FIG_SRC = 'color:#9ca3af;';
const TABLE = 'border-collapse:collapse;width:100%;margin:1.4em 0;';
const TD = 'border:1px solid #e5e7eb;padding:8px 10px;text-align:left;';

/** 인라인: **굵게**, `코드`, [텍스트](url) */
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // URL 안에 괄호가 있으면(위키백과 "Foo_(bar)" 류) 여기서 멈추던 걸 한 겹까지 허용한다 —
    // 안 그러면 작가가 [text](url) 대신 <url> 오토링크로 매번 우회해야 했다(실제로 두 번 겪음).
    .replace(/\[([^\]]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function md2html(md) {
  const out = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 코드블록
    if (/^```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre style="${CODE}"><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    /* 본문 그림 — [FIG: <figId> | 캡션] 또는 [FIG: <figId> | 캡션 | 출처명 | 출처URL]
       실제 이미지는 blog-publish 가 티스토리 CDN 에 올린 뒤 <!--FIG:id--> 자리에 끼워 넣는다
       (커버의 <!--COVER--> 와 같은 방식). 여기서는 자리와 캡션만 만든다.
       그림 정의는 글 메타의 figures[] 에 있고, blog-assemble 이 짝이 맞는지 검사한다. */
    const fig = line.match(/^\s*\[FIG:\s*([A-Za-z0-9_-]+)\s*(?:\|\s*([^|\]]*?))?\s*(?:\|\s*([^|\]]*?))?\s*(?:\|\s*(https?:\/\/[^\s\]]+))?\s*\]\s*$/i);
    if (fig) {
      const [, fid, cap, srcName, srcUrl] = fig;
      const credit = srcUrl
        ? ` <span style="${FIG_SRC}">출처 — <a href="${esc(srcUrl)}" target="_blank" rel="noopener">${esc(srcName || srcUrl)}</a></span>`
        : (srcName ? ` <span style="${FIG_SRC}">출처 — ${esc(srcName)}</span>` : '');
      out.push(`<figure style="${FIG_BOX}"><!--FIG:${esc(fid)}-->`
        + ((cap || '').trim() || srcName
          ? `<figcaption style="${FIG_CAP}">${esc((cap || '').trim())}${credit}</figcaption>` : '')
        + '</figure>');
      i++; continue;
    }
    // 이미지 '자리표시자'(아직 그림이 없는 것) → 주석으로만 남긴다.
    // 남의 이미지 URL 이 새는 걸 원천 차단하려는 것이고, 화면에는 아무것도 안 나온다.
    if (/^\s*\[IMG:/i.test(line)) {
      out.push(`<!-- ${esc(line.trim())} -->`);
      i++; continue;
    }
    // 영상 임베드 — [YT: <videoId>] 또는 [YT: <videoId> | 캡션]
    // videoId 만 받는다(URL 을 통째로 받으면 임의 도메인이 iframe 으로 들어온다).
    // 실재·임베드 가능 여부는 blog-assemble.mjs 가 oembed 로 검사한다.
    const yt = line.match(/^\s*\[YT:\s*([A-Za-z0-9_-]{11})\s*(?:\|\s*(.*?))?\]\s*$/i);
    if (yt) {
      const cap = (yt[2] || '').trim();
      out.push(`<div style="${EMBED_BOX}"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}"`
        + ` style="${EMBED_FRAME}" loading="lazy" title="${cap ? esc(cap) : '유튜브 영상'}"`
        + ' allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"'
        + ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>'
        + (cap ? `\n<p style="${EMBED_CAP}">${inline(cap)}</p>` : ''));
      i++; continue;
    }
    // 구분선
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(`<hr style="${HR}">`);
      i++; continue;
    }
    // 표
    if (/^\|/.test(line) && /^\s*\|[-\s|:]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<table style="${TABLE}"><thead><tr>`
        + head.map((h) => `<th style="${TD}background:#fafafa">${inline(h)}</th>`).join('')
        + '</tr></thead><tbody>'
        + rows.map((r) => '<tr>' + r.map((c) => `<td style="${TD}">${inline(c)}</td>`).join('') + '</tr>').join('')
        + '</tbody></table>');
      continue;
    }
    // 목록
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${tag}>`);
      continue;
    }
    // 인용
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote style="${QUOTE}">${inline(body.join(' '))}</blockquote>`);
      continue;
    }
    // 제목 — H1 은 티스토리 제목과 겹치므로 H2 로 내린다
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = Math.min(4, Math.max(2, h[1].length));
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    // 문단
    if (line.trim()) {
      const body = [];
      while (i < lines.length && lines[i].trim()
        && !/^(#{1,6}\s|```|\||>|\s*[-*]\s|\s*\d+\.\s|\s*\[IMG:|\s*\[YT:|\s*-{3,}\s*$|\s*\*{3,}\s*$)/i.test(lines[i])) {
        body.push(lines[i++]);
      }
      // 위 분기 중 어디도 처리하지 못한 stop 패턴(예: videoId 형식이 틀린 [YT:] 줄)은
      // body 가 빈 채로 남아 i 가 안 늘어난다 → 무한루프. 그냥 문단으로 먹고 전진시킨다.
      if (!body.length) body.push(lines[i++]);
      out.push(`<p>${inline(body.join(' '))}</p>`);
      continue;
    }
    i++;
  }
  return out.join('\n');
}

/* 자가검사: node backend/scripts/lib/md.mjs
   임베드·구분선은 문단 흡수에 먹히기 쉬워(정규식 한 곳만 빠뜨려도 <p> 안으로 빨려든다) 검사를 남긴다. */
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const a = (cond, msg) => { if (!cond) { console.error('✗', msg); process.exitCode = 1; } else console.log('✓', msg); };
  const h = md2html('앞 문단\n[YT: dQw4w9WgXcQ | 캡션]\n---\n뒤 문단\n\n- 목록\n\n> 인용');
  a(/<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ"/.test(h), '유튜브 임베드 생성');
  a(!/<p>[^<]*\[YT:/.test(h), '임베드가 문단에 흡수되지 않음');
  a(/<hr /.test(h) && !/<li>-/.test(h), '--- 는 hr (목록으로 오인 안 함)');
  a(/<p>앞 문단<\/p>/.test(h) && /<p>뒤 문단<\/p>/.test(h), '앞뒤 문단 분리');
  a(/캡션<\/p>/.test(h), '캡션 렌더');
  a(/<ul><li>목록/.test(h) && /<blockquote/.test(h), '기존 목록·인용 회귀 없음');
  a(md2html('[YT: javascript:alert(1)]').includes('[YT:'), 'videoId 형식이 아니면 임베드 안 함');
  const wikiLink = md2html('[문서](https://ja.wikipedia.org/wiki/MONOCHROME_(%E5%90%89%E7%94%B0))');
  a(/href="https:\/\/ja\.wikipedia\.org\/wiki\/MONOCHROME_\(%E5%90%89%E7%94%B0\)"/.test(wikiLink),
    'URL 안 괄호 한 겹(위키백과 Foo_(bar) 류)이 링크를 안 끊음');
  a(!/\)<\/a>\)/.test(wikiLink), '괄호 포함 URL 뒤에 남는 ) 없음');
}
