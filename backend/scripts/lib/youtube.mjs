/* ============================================================
   유튜브 데이터 API — 곡 실재 검증

   LLM 은 "덜 알려진 최신곡"을 시키면 없는 아티스트·곡명·연도를 그럴듯하게 지어낸다.
   여기서 통과 못 한 곡은 글에서 뺀다(개수를 채우려 남기지 않는다).
   ============================================================ */
import { env } from './env.mjs';

const API = 'https://www.googleapis.com/youtube/v3';

/** 공식 채널로 볼 만한 신호. 아티스트 공식/VEVO/토픽 채널. */
const officialish = (title, channel, artist) => {
  const c = channel.toLowerCase();
  const a = artist.toLowerCase();
  return c.includes('vevo') || c.endsWith(' - topic') || c.includes('official')
    || c.includes(a) || a.includes(c.replace(/ - topic$/, '').trim());
};

/**
 * 곡 하나를 검증한다.
 * @returns {Promise<null | {artist,title,videoId,url,channel,publishedYear,views,officialChannel}>}
 */
export async function verifySong({ artist, title }, { maxViews = null, yearFrom = null, yearTo = null } = {}) {
  const q = `${artist} ${title}`;
  const searchUrl = `${API}/search?part=snippet&type=video&maxResults=5`
    + `&q=${encodeURIComponent(q)}&key=${env('YOUTUBE_API_KEY')}`;

  const sres = await fetch(searchUrl, { signal: AbortSignal.timeout(20000) });
  if (!sres.ok) throw new Error(`YouTube search ${sres.status}: ${(await sres.text()).slice(0, 200)}`);
  const items = (await sres.json()).items || [];
  if (!items.length) return null;

  // 아티스트명이 제목이나 채널명에 실제로 걸리는 것만 후보로 본다(동명이곡·오검색 방지).
  // "泰葉 (Yasuha)" 처럼 로마자 병기가 붙은 이름은 괄호를 지워야 실제 영상 제목과 맞는다 —
  // 안 지우면 "artist (romanized)" 라는 조합 문자열 그대로를 찾게 되어 사실상 항상 실패한다.
  const strip = (s) => s.toLowerCase().split('(')[0].trim();
  const a = strip(artist);
  const t2 = strip(title);
  const cand = items.find((it) => {
    const t = (it.snippet.title || '').toLowerCase();
    const c = (it.snippet.channelTitle || '').toLowerCase();
    return (t.includes(a) || c.includes(a)) && t.includes(t2);
  }) || items.find((it) => (it.snippet.title || '').toLowerCase().includes(t2));
  if (!cand) return null;

  const videoId = cand.id.videoId;
  const vres = await fetch(`${API}/videos?part=snippet,statistics&id=${videoId}&key=${env('YOUTUBE_API_KEY')}`,
    { signal: AbortSignal.timeout(20000) });
  if (!vres.ok) throw new Error(`YouTube videos ${vres.status}`);
  const v = (await vres.json()).items?.[0];
  if (!v) return null;

  const publishedYear = Number((v.snippet.publishedAt || '').slice(0, 4));
  const views = Number(v.statistics?.viewCount || 0);
  const channel = v.snippet.channelTitle || '';

  // 업로드 연도는 발매 연도가 아니다(옛날 곡은 나중에 올라온다).
  // 그래서 yearFrom/yearTo 는 '최신곡' 프로파일에서만 넘긴다.
  if (yearFrom && publishedYear < yearFrom) return null;
  if (yearTo && publishedYear > yearTo) return null;
  if (maxViews && views > maxViews) return null;

  return {
    artist, title, videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    channel, publishedYear, views,
    officialChannel: officialish(v.snippet.title || '', channel, artist),
  };
}

/* ───────────────────── 곡 발굴 (검색 우선) ─────────────────────
   "LLM 이 곡을 떠올리고 → 검증" 순서는 덜 알려진 곡에서 회수율이 0 이다
   (2026-07-25 실측: J-POP 후보 8곡 전부 존재하지 않는 곡이었다).
   그래서 순서를 뒤집는다 — **실제로 있는 곡을 먼저 찾아** LLM 에 넘긴다. */

/* 모음집·메들리·커버는 '곡 하나'가 아니다. 검색 결과의 상당수가 이것들이라 반드시 걸러야 한다. */
const COMPILATION = /메들리|모음|플레이리스트|명곡집|메듣기|メドレー|名曲集|コレクション|ヒットソング|懐メロ|\d+\s*選|playlist|mix\b|medley|best of|greatest hits|compilation|top\s*\d+|full album|\balbum\b/i;
const NOT_A_SONG = /cover|커버|카바|reaction|리액션|teaser|티저|shorts|보컬\s*연습|instrumental|karaoke|가라오케|노래방|inst\.|off vocal/i;

/** ISO8601 재생시간(PT3M25S) → 초 */
function durationSec(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0;
}

/** "Artist - Title (Official MV)" 같은 제목에서 아티스트/곡명을 뽑는다. 해시태그·홍보문구는 버린다. */
function splitTitle(videoTitle, channelTitle) {
  const clean = videoTitle
    .replace(/#\S+/g, ' ')                                    // 해시태그 제거
    .replace(/[\[(【][^\])】]*(?:official|mv|m\/v|music video|audio|lyric|visualizer|ver\.?|4k|hd)[^\])】]*[\])】]/gi, '')
    .replace(/\s*[/|｜]\s*(?:official|mv).*$/i, '')
    .replace(/[『』「」]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  const m = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (m && m[1].length <= 40 && m[2].length <= 60) return { artist: m[1].trim(), title: m[2].trim() };
  // 채널이 아티스트인 경우(공식/Topic 채널). 제목에서 따옴표 안을 곡명으로 본다.
  const quoted = clean.match(/"([^"]{1,50})"/);
  return {
    artist: channelTitle.replace(/ - Topic$/i, '').replace(/\s*(Official.*|공식.*)$/i, '').trim(),
    title: (quoted ? quoted[1] : clean).trim(),
  };
}

/**
 * 검색어 여러 개로 실제 곡을 찾아온다.
 * @param {string[]} queries
 * @returns {Promise<Array>} 조건을 만족하는 실존 곡들
 */
export async function discoverSongs(queries, {
  maxViews = null, minViews = 3000, publishedAfter = null, publishedBefore = null,
  perQuery = 15, limit = 24, minSec = 90, maxSec = 600, maxSubscribers = null,
} = {}) {
  const key = env('YOUTUBE_API_KEY');
  const ids = new Map();   // videoId → 검색어(어느 질의로 걸렸는지)

  for (const q of queries) {
    const u = new URL(`${API}/search`);
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('type', 'video');
    u.searchParams.set('videoCategoryId', '10');       // Music
    u.searchParams.set('maxResults', String(perQuery));
    u.searchParams.set('q', q);
    u.searchParams.set('key', key);
    if (publishedAfter) u.searchParams.set('publishedAfter', `${publishedAfter}T00:00:00Z`);
    if (publishedBefore) u.searchParams.set('publishedBefore', `${publishedBefore}T00:00:00Z`);

    const res = await fetch(u, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.warn(`  ⚠ 검색 실패("${q}") ${res.status}`); continue; }
    for (const it of (await res.json()).items || []) {
      if (it.id?.videoId && !ids.has(it.id.videoId)) ids.set(it.id.videoId, q);
    }
  }
  if (!ids.size) return [];

  // 통계·재생시간은 50개씩 묶어서 한 번에
  const found = [];
  const dropped = { compilation: 0, notSong: 0, duration: 0, views: 0, parse: 0 };
  const all = [...ids.keys()];
  for (let i = 0; i < all.length; i += 50) {
    const batch = all.slice(i, i + 50);
    const res = await fetch(`${API}/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}&key=${key}`,
      { signal: AbortSignal.timeout(20000) });
    if (!res.ok) continue;
    for (const v of (await res.json()).items || []) {
      const raw = v.snippet.title || '';
      // 검색 결과의 절반은 곡이 아니다 — 메들리·모음집·커버·쇼츠 홍보클립.
      if (COMPILATION.test(raw)) { dropped.compilation++; continue; }
      if (NOT_A_SONG.test(raw)) { dropped.notSong++; continue; }
      const sec = durationSec(v.contentDetails?.duration);
      if (sec < minSec || sec > maxSec) { dropped.duration++; continue; }   // 쇼츠·1시간짜리 제외
      const views = Number(v.statistics?.viewCount || 0);
      if (views < minViews) { dropped.views++; continue; }   // 사실상 아무도 안 본 것(스팸·AI채널)
      if (maxViews && views > maxViews) { dropped.views++; continue; }      // '숨은 곡' 상한
      const { artist, title } = splitTitle(raw, v.snippet.channelTitle || '');
      if (!title || !artist || title.length > 60) { dropped.parse++; continue; }
      found.push({
        artist, title,
        videoId: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        channel: v.snippet.channelTitle || '',
        publishedYear: Number((v.snippet.publishedAt || '').slice(0, 4)),
        views,
        officialChannel: officialish(v.snippet.title || '', v.snippet.channelTitle || '', artist),
        channelId: v.snippet.channelId,
        durationSec: sec,
        // LLM 이 지어내지 않고 쓸 수 있는 유일한 1차 자료. 곡 설명은 반드시 여기에 근거해야 한다.
        description: (v.snippet.description || '').replace(/\s+/g, ' ').slice(0, 600),
        foundBy: ids.get(v.id),
      });
    }
  }

  console.log(`  · 검색 ${ids.size}건 → 곡 ${found.length}건 `
    + `(모음집 ${dropped.compilation} · 곡아님 ${dropped.notSong} · 길이 ${dropped.duration} · 조회수 ${dropped.views} · 파싱 ${dropped.parse} 제외)`);

  /* 채널 구독자 수를 붙인다. 단 이걸로 **자르지는 않는다** —
     대형 아티스트의 묻힌 곡이야말로 진짜 '숨겨진 명곡'이기 때문이다.
     대신 hiddenRatio(조회수 ÷ 구독자)를 지표로 준다. 낮을수록 "그 아티스트 규모에 비해 안 들린 곡". */
  const chIds = [...new Set(found.map((s) => s.channelId).filter(Boolean))];
  const subs = new Map();
  for (let i = 0; i < chIds.length; i += 50) {
    const res = await fetch(`${API}/channels?part=statistics&id=${chIds.slice(i, i + 50).join(',')}&key=${key}`,
      { signal: AbortSignal.timeout(20000) });
    if (!res.ok) continue;
    for (const c of (await res.json()).items || []) subs.set(c.id, Number(c.statistics?.subscriberCount || 0));
  }
  for (const s of found) {
    s.subscribers = subs.get(s.channelId) ?? null;
    s.hiddenRatio = s.subscribers ? Number((s.views / s.subscribers).toFixed(3)) : null;
    s.artistScale = s.subscribers == null ? '?' : s.subscribers >= 500000 ? '대형' : s.subscribers >= 50000 ? '중견' : '신인·소규모';
  }
  if (maxSubscribers) found.splice(0, found.length, ...found.filter((s) => (s.subscribers ?? 0) <= maxSubscribers));

  // 한 채널이 목록을 독점하지 않게 아티스트당 1곡.
  // 정렬은 hiddenRatio 우선 — 대형 아티스트라도 '규모 대비 안 들린 곡'이면 앞으로 온다.
  const perArtist = new Set();
  return found
    .sort((a, b) => (a.hiddenRatio ?? 9) - (b.hiddenRatio ?? 9) || a.views - b.views)
    .filter((s) => { const k = s.channel.toLowerCase(); if (perArtist.has(k)) return false; perArtist.add(k); return true; })
    .slice(0, limit);
}

/* ───────────────────── 상위 댓글 ─────────────────────
   LLM 은 못 들어본 곡의 '소리'를 쓸 수 없다. 지어내면 환각이다.
   실제 청자 반응(댓글)이 유일한 1차 자료다 — 어떤 대목이 좋았는지, 언제 듣는지가 여기 있다.

   ⚠ 댓글은 남이 쓴 글이고, **가사 전문이 댓글로 달리는 일이 아주 흔하다.**
     그래서 원문을 그대로 쓰지 않는다. 프롬프트에서 "요약만, 인용 금지" 를 강제한다. */
const LYRIC_DUMP = /(\n.*){4,}/;   // 여러 줄로 끊긴 댓글 = 가사 붙여넣기일 확률이 높다

export async function fetchTopComments(videoId, { max = 12 } = {}) {
  const u = `${API}/commentThreads?part=snippet&videoId=${videoId}`
    + `&order=relevance&maxResults=${max}&textFormat=plainText&key=${env('YOUTUBE_API_KEY')}`;
  const res = await fetch(u, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return [];   // 댓글 사용중지된 영상 등 — 조용히 빈 배열
  return ((await res.json()).items || [])
    .map((it) => {
      const s = it.snippet?.topLevelComment?.snippet || {};
      return { text: (s.textOriginal || '').trim(), likes: Number(s.likeCount || 0) };
    })
    .filter((c) => c.text && !LYRIC_DUMP.test(c.text) && c.text.length <= 300)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 8)
    .map((c) => ({ text: c.text.replace(/\s+/g, ' '), likes: c.likes }));
}

/** 곡 목록에 상위 댓글을 붙인다(곡당 API 1회). */
export async function attachComments(songs) {
  for (const s of songs) {
    try { s.topComments = await fetchTopComments(s.videoId); }
    catch { s.topComments = []; }
  }
  return songs;
}

/** 여러 곡을 검증하고 통과분만 돌려준다. 실패는 사유와 함께 로그. */
export async function verifySongs(songs, opt = {}) {
  const ok = [];
  for (const s of songs) {
    try {
      const r = await verifySong(s, opt);
      if (r) { ok.push(r); console.log(`  ✅ ${s.artist} - ${s.title} (${r.publishedYear}, ${r.views.toLocaleString()}회)`); }
      else console.log(`  ❌ ${s.artist} - ${s.title} — 실재/조건 확인 실패, 제외`);
    } catch (e) {
      console.log(`  ⚠ ${s.artist} - ${s.title} — 검증 오류(${e.message.slice(0, 60)}), 제외`);
    }
  }
  return ok;
}

/* 자가검사(오프라인, API 호출 없음): node backend/scripts/lib/youtube.mjs
   "artist (Romanized)" 형식이 매칭을 깨뜨리던 실제 버그(2026-07-25, 泰葉 공식 영상 누락)의 회귀 테스트. */
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const a = (cond, msg) => { if (!cond) { console.error('✗', msg); process.exitCode = 1; } else console.log('✓', msg); };
  const strip = (s) => s.toLowerCase().split('(')[0].trim();
  // 로마자 병기 아티스트명이 지워진 뒤에도 실제 제목·채널과 맞는지
  a(strip('泰葉 (Yasuha)') === '泰葉', '아티스트명 괄호 스트립');
  a(strip('フライディ・チャイナタウン (Friday Chinatown)') === 'フライディ・チャイナタウン', '제목 괄호 스트립');
  const title = 'Fly-day Chinatown / Yasuha Official Lyric Video'.toLowerCase();
  a(title.includes(strip('フライディ・チャイナタウン (Friday Chinatown)')) === false,
    '(참고) 로마자 제목엔 가나 원제가 안 걸린다 — 한자/가나 아티스트는 레이블 공식 업로드를 놓칠 수 있다. verifySong 매칭이 아니라 조사 단계에서 로마자 질의를 추가로 돌려 보완할 것');
}
