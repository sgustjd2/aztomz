// 근거 대조 게이트 — 항목 서술(excerpt·verdict·article·shops 등)의 '구체 사실'이 검증 통과 출처 본문에 있는지 문자열로 대조.
// auto-build.mjs 가 관련성 검사를 통과한 출처 본문으로 호출한다. LLM 없음(결정적).
// 2026-10-08 trends.json 전수 감사(182항목 중 139 근거 없는 서술)에서 반복된 유형만 막는다:
//   · 출처에 없는 수치(170만 건·280%·13번 출구) · 출처에 없는 매체('연합뉴스 보도') · 출처에 없는 과장·확산 사실어(웨이팅·전국·체인·지점·급증…)
// ponytail: 문자열 대조라 유래·인물 바꿔치기, 뜻 좁히기, 오래된 출처로 '지금 피크' 같은 의미 오류는 못 잡는다.
//           그건 LLM 대조(blog-verify 식 claude -p)가 필요 — 하루 게시가 2건 안팎이라 붙여도 비용은 작다.
import { fileURLToPath } from 'node:url';

export const MEDIA = ['연합뉴스', '한국경제', '매일경제', '경향신문', '조선일보', '중앙일보', '동아일보', '한겨레', '서울신문', '머니투데이',
  '뉴시스', '뉴스1', '헤럴드경제', '한국일보', '국민일보', '세계일보', '문화일보', '이데일리', '아시아경제', '파이낸셜뉴스', '데일리안',
  '위키트리', '인사이트', '디스패치', '스포츠조선', '스포츠서울', '노컷뉴스', '오마이뉴스', '디지털타임스', '전자신문', '블로터',
  '에스콰이어', '코스모폴리탄', '하퍼스 바자', '네이트', 'SBS', 'KBS', 'MBC', 'JTBC', 'YTN', 'MBN', 'KNN', 'TV조선', '채널A',
  'CNN', 'BBC', '뉴욕타임스', '타임아웃', 'Time Out', '주간동아', '중부일보', '경기일보', '부산일보', '국제신문', '매일신문'];
// 사실처럼 읽히는 확산·인기 표현 — 출처 본문에 같은 말이 없으면 막는다(분위기어 '열풍·대세'는 경고만).
export const HYPE_BLOCK = ['웨이팅', '오픈런', '품절', '완판', '매진', '전국', '체인', '여러 지점', '지점 확대', '지점을 늘', '지점이 늘', '지점으로 늘', '급증', '폭증', '역대', '최초', '유일'];
export const HYPE_WARN = ['열풍', '대세', '돌풍', '대란', '강타', '점령', '피크'];
const NUM_RE = /\d[\d,.]*\s*(?:번 출구|번출구|만 건|만 회|만 뷰|만회|억 뷰|억 회|곳|개|명|만 ?원|원|%|배(?!속)|건|잔|호점|호선|km|kg)/g;

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
// ddgs extract 는 HTML 을 돌려주기도 한다 — 스크립트·스타일(광고 슬롯 크기 '280' 같은 숫자)이 근거로 잡히지 않게 태그째 걷어낸다.
const stripHtml = (s) => String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

// 사실 주장이 들어가는 필드만 — q(강조 박스)·prompts(창작 프롬프트)·tags 는 제외.
export function claimText(t) {
  const parts = [t.excerpt, t.pull, t.verdict, t.stageMsg, t.buzz, t.satTxt];
  for (const b of t.article || []) if (Array.isArray(b) && b[0] !== 'q') parts.push(Array.isArray(b[1]) ? b[1].join(' ') : b[1]);
  for (const s of t.shops || []) parts.push(s && s.rep, s && s.note);
  if (t.reasons && typeof t.reasons === 'object') parts.push(...Object.values(t.reasons).flat(Infinity).filter((v) => typeof v === 'string'));  // 점수 근거(화면 '근거' 줄)
  return parts.filter(Boolean).join('\n');
}

// srcNames: 출처 이름 목록(매체명 대조용), bodies: 검증 통과 출처 본문 문자열 배열
export function groundingCheck(t, srcNames, bodies) {
  // '유일한 출처'처럼 우리 근거 수준을 밝히는 메타 문장은 확산·과장 주장이 아니다.
  const text = claimText(t).replace(/유일한 출처/g, '');
  const all = bodies.map(stripHtml).join('\n');
  const B = norm(all);
  const BNC = B.replace(/,/g, '');   // 출처가 '3,300'(원 없이)로 써도 '3,300원'을 찾도록
  const names = srcNames.join(' ');
  const block = [], warn = [];
  for (const m of MEDIA) if (text.includes(m) && !names.includes(m) && !all.includes(m)) block.push(`출처에 없는 매체 '${m}'`);
  for (const n of new Set(text.match(NUM_RE) || [])) {
    const digits = n.match(/\d[\d,.]*/)[0].replace(/,/g, '');
    if (!B.includes(norm(n)) && !B.includes(digits) && !BNC.includes(digits) && !B.includes(norm(n.replace(/,/g, '')))) block.push(`출처에 없는 수치 '${n.trim()}'`);
  }
  for (const h of HYPE_BLOCK) if (text.includes(h) && !B.includes(norm(h))) block.push(`출처에 없는 표현 '${h}'`);
  for (const h of HYPE_WARN) if (text.includes(h) && !B.includes(norm(h))) warn.push(`출처에 없는 표현 '${h}'`);
  return { pass: block.length === 0, block, warn };
}

// 셀프테스트: node backend/scripts/lib/grounding.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const assert = (await import('node:assert')).strict;
  const body = '와글와글베이크샵 익선은 크로와상과 베이글을 합친 크로와글이 명물. 매일 07:30 - 21:00. 한국일보 보도. 말차 크림 3,500원';
  const ok = groundingCheck({ verdict: "익선동 한옥 베이커리, 크로와글이 대표 메뉴(한국일보). 말차 크림 3,500원." }, ['한국일보'], [body]);
  assert.equal(ok.pass, true, JSON.stringify(ok));
  const bad = groundingCheck({ verdict: '틱톡 130만 회 조회, 연합뉴스 보도, 체인 확장 중, 웨이팅 필수', article: [['q', '170만 건 인용은 강조 박스라 제외']] }, ['한국일보'], [body]);
  assert.equal(bad.pass, false);
  for (const s of ["'130만 회'", "'연합뉴스'", "'체인'", "'웨이팅'"]) assert.ok(bad.block.some((b) => b.includes(s)), s + ' 미검출: ' + bad.block);
  assert.ok(!bad.block.some((b) => b.includes('170만')), 'q 블록은 대상 아님');
  assert.equal(groundingCheck({ verdict: '다른 지점 후기라 근거로 안 씀' }, [], [body]).pass, true, "'지점' 단독은 확장 주장이 아님");
  const chain = groundingCheck({ verdict: '체인이 여러 지점으로 늘고' }, [], [body]).block.join();
  assert.ok(chain.includes("'체인'") && chain.includes("'여러 지점'"), chain);
  const ad = groundingCheck({ verdict: '냉장 디저트 280% 증가' }, [], ["<script>defineSlot([[336,280]])</script><p>냉장 디저트</p>"]);
  assert.equal(ad.pass, false, '스크립트 속 숫자는 근거가 아님');
  assert.equal(groundingCheck({ verdict: '읽을 수 있었던 유일한 출처는 블로그 1건' }, [], [body]).pass, true, '메타 문장');
  assert.equal(groundingCheck({ verdict: '세트 11,000원' }, [], ['세트 메뉴 11,000']).pass, true, '쉼표 숫자·원 생략');
  const vibe = groundingCheck({ verdict: '요즘 대세' }, [], [body]);
  assert.equal(vibe.pass, true); assert.equal(vibe.warn.length, 1);
  console.log('✓ grounding selftest 통과');
}
