// 근거 대조 게이트 — 항목 서술(excerpt·verdict·article·reasons 등, shops 는 가게별 대조)의 '구체 사실'이 검증 통과 출처 본문에 있는지 문자열로 대조.
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
// 후기·기사 수 주장 — 게시 때 검증 실패 출처가 빠져도 '후기 두 건'·'서로 다른 후기' 서술이 남던 문제(2026-11-27 신뢰분석 64건 점검에서 15건).
// 숫자(2건)는 NUM_RE 가 이미 본문 대조하므로 한글 수사만 본다. 남은(검증 통과) 출처 수보다 많으면 막는다.
const KOR_N = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8 };
const DOC = '(?:방문 후기|후기|리뷰|방문기|글(?!자)|기사|보도|게시물|포스팅)';
const KN = '(한|두|세|네|다섯|여섯|일곱|여덟)';
const COUNT_RE = new RegExp(`${DOC}\\s*(?:도|는|가|이)?\\s*${KN}\\s*(?:건|개|편)|${KN}\\s*(?:건|개|편)의?\\s*${DOC}|(?<![가-힣])${KN}\\s+${DOC}`, 'g');
// 수사 없이 '둘 이상'을 말하는 표현 — 남은 출처가 1개면 막는다. '다른 후기는 없어요'처럼 부정이 뒤따르면 제외.
const PLURAL_RE = /(?:또 )?다른 (?:방문 후기|후기|글(?!자)|리뷰|방문기|게시물)(?:는|은|에서|에는|도)(?![^.]{0,14}(?:없|않|쌓|기다|필요|더 ))|(?:후기|리뷰|방문기|게시물)들(?:은|이|에서|을|의|도)?|몇 건|여러 건|여러 (?:방문 )?후기|둘 이상|별도 (?:방문 )?후기(?!를)/;
const DISTINCT_RE = /서로 다른 (?:작성자|계정|후기|블로그|방문 후기|글|출처)|각기 다른 (?:작성자|계정)/;
const NUM_RE = /\d[\d,.]*\s*(?:번 출구|번출구|만 건|만 회|만 뷰|만회|억 뷰|억 회|곳|개|명|만 ?원|원|%|배(?!속)|건|잔|호점|호선|km|kg)/g;

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
// ddgs extract 는 HTML 을 돌려주기도 한다 — 스크립트·스타일(광고 슬롯 크기 '280' 같은 숫자)이 근거로 잡히지 않게 태그째 걷어낸다.
const stripHtml = (s) => String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

// 사실 주장이 들어가는 필드만 — q(강조 박스)·prompts(창작 프롬프트)·tags 는 제외.
export function claimText(t) {
  const parts = [t.excerpt, t.pull, t.verdict, t.stageMsg, t.buzz, t.satTxt];
  for (const b of t.article || []) if (Array.isArray(b) && b[0] !== 'q') parts.push(Array.isArray(b[1]) ? b[1].join(' ') : b[1]);
  // shops 의 rep·note 는 auto-build verifyShops 가 가게별로(그 가게 링크 본문까지) 대조하고 근거 없는 줄만 지운다 — 항목 보류 사유에서 뺀다(2026-11-27).
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
  const nSrc = srcNames.length;
  for (const m of text.matchAll(COUNT_RE)) {
    const n = KOR_N[m[1] || m[2] || m[3]];
    // 한 페이지가 여러 후기를 모은 경우(뽈레·더쿠 목록 등)는 본문에 같은 수가 적혀 있으면 인정한다
    if (n > nSrc && !B.includes(norm(m[0])) && !B.includes(`${n}건`) && !B.includes(`${n}개`)) block.push(`출처 ${nSrc}개인데 '${m[0].trim()}'`);
  }
  if (nSrc < 2 && PLURAL_RE.test(text) && !PLURAL_RE.test(stripHtml(all))) block.push(`출처 ${nSrc}개인데 '${text.match(PLURAL_RE)[0]}'`);
  if (nSrc < 2 && DISTINCT_RE.test(text) && !DISTINCT_RE.test(all)) block.push(`출처 ${nSrc}개인데 '${text.match(DISTINCT_RE)[0]}'`);
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
  const two = groundingCheck({ excerpt: '최근 방문 후기 두 건을 찾았어요. 다른 후기는 웨이팅을 다뤘어요.' }, ['블로그'], ['방문 후기 웨이팅 20분']);
  assert.ok(two.block.some((b) => b.includes('후기 두 건')), '출처 1개인데 두 건: ' + two.block);
  assert.equal(groundingCheck({ excerpt: '후기 두 건을 확인했어요' }, ['a', 'b'], ['x', 'y']).pass, true, '출처 2개면 두 건 OK');
  assert.equal(groundingCheck({ excerpt: '확인된 후기는 한 건뿐이에요' }, ['a'], ['x']).pass, true, '한 건');
  assert.ok(!groundingCheck({ verdict: '두 후기 모두 맛있다고 했어요' }, ['a'], ['x']).pass, "'두 후기'");
  assert.equal(groundingCheck({ verdict: '리뷰 세 개가 올라온 페이지' }, ['뽈레'], ['리뷰 3개 · 좋음']).pass, true, '목록 페이지 본문에 같은 수');
  assert.ok(!groundingCheck({ verdict: '서로 다른 작성자의 후기' }, ['a'], ['x']).pass, '서로 다른 작성자 + 출처 1개');
  assert.equal(groundingCheck({ verdict: '세 글자로 줄인 말' }, ['a'], ['x']).pass, true, "'글자'는 문서 아님");
  assert.ok(!groundingCheck({ excerpt: '한 후기는 맛을, 다른 후기는 웨이팅을 다뤘어요' }, ['a'], ['x']).pass, "'다른 후기는' + 출처 1개");
  assert.equal(groundingCheck({ verdict: '교차 확인할 다른 후기는 없어요' }, ['a'], ['x']).pass, true, '부정');
  assert.ok(!groundingCheck({ satTxt: '검색된 후기들은 대체로 긍정' }, ['a'], ['x']).pass, "'후기들'");
  assert.equal(groundingCheck({ satTxt: '검색된 후기들은 대체로 긍정' }, ['a', 'b'], ['x', 'y']).pass, true, '출처 2개면 복수 OK');
  assert.equal(groundingCheck({ verdict: '음료 평가는 별도 후기를 더 확인하기' }, ['a'], ['x']).pass, true, '권유문');
  assert.equal(groundingCheck({ verdict: '두 사람의 반응' }, ['a'], ['x']).pass, true, "'두 사람'은 문서 수 아님");
  const vibe = groundingCheck({ verdict: '요즘 대세' }, [], [body]);
  assert.equal(vibe.pass, true); assert.equal(vibe.warn.length, 1);
  console.log('✓ grounding selftest 통과');
}
