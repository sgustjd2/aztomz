// 광고/진짜 결정적 신호 점검 — 신뢰분석 항목의 출처 본문(ddgs extract, HTML 포함)에서 광고 의심·후기 신뢰를
// 움직이는 신호를 문자열로 찾는다. LLM 없음. auto-build(게시 시)·recheck-ad(매일 1건)가 같은 규칙을 쓴다.
//
// 지금까지 ad/trust 는 수집 LLM(hangeut-run 2단계 규칙)이 매기고, 스크립트는 출처 생존·관련성·근거 대조만 봤다.
// 그래서 "협찬 표시가 보이지 않았어요"라는 근거 문장도 실제 본문과 대조된 적이 없다(2026-11-27).
// 여기서 찾는 신호(사용자 지정 강한 신호 ①협찬 흔적 ②품앗이 + 출처 구성):
//   disclosure  협찬·원고료·체험단·제공받아 작성 등 대가성 고지(부정문 '협찬 아님'은 제외) → ad 61+ (스킬 규칙과 같음)
//   repeat      서로 다른 출처(작성자)가 같은 문장(30자+·제목어 포함)을 공유 → 템플릿 원고·보도자료 복붙 → ad +10
//   vendorPhoto '사진=○○ 제공'·'업체 제공 사진' 등 업체 제공 사진 → ad +5
//   burst       작성일이 읽힌 서로 다른 출처 3개+가 3일 안에 몰림 → ad +5 · trust −5
//   oneOrigin   출처가 전부 한 작성자(블로그 하나·같은 매체)에서 나옴 → trust 최대 40(후기 표본 부족)
// 재실행해도 점수가 계속 오르지 않게 처음 값을 adCheck.base 에 두고 매번 base 에서 다시 계산한다(멱등).
// ponytail: 문자열 신호라 인스타 품앗이 댓글·지도-SNS 괴리·사진 속 협찬 문구(이미지)는 못 본다. 그건 수집 LLM 판단 몫.
import { fileURLToPath } from 'node:url';

const AUTO = '한끗 자동 점검:';   // 이 접두어로 시작하는 근거는 스크립트가 쓴 것 — 재계산 때 지우고 다시 쓴다
const strip = (h) => String(h || '')
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
  .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[ \t\r\f\v]+/g, ' ');

// 대가성 고지 — 공정위 추천·보증 심사지침 문구 + 흔한 변형. 일반 동사 '제공되었습니다'는 안 걸리게 '제공받'만.
const DISCLOSURE = [
  /소정의\s*(원고료|수수료|활동비)/, /원고료를?\s*(지원|제공|지급)\s*받/, /(제품|서비스|음식|메뉴|식사|체험|숙박|이용권)[^.\n]{0,20}(무상\s*)?(으로\s*)?제공\s*받/,
  /(업체|브랜드|매장|가게|사장님)[^.\n]{0,8}(으로|로)부터[^.\n]{0,20}(제공|지원)\s*받/, /협찬\s*(을|를)?\s*받/, /#\s*협찬/, /#\s*광고(?![가-힣])/, /#\s*(AD|ad|Ad)\b/,
  /#\s*체험단/, /체험단\s*(으로|에|자격|활동|후기|리뷰|선정|참여|원고)/, /서포터즈\s*(로|활동|자격|으로)/, /유료\s*광고\s*(를\s*)?포함/,
  /파트너스\s*활동[^.\n]{0,20}수수료/, /수수료를?\s*(제공|지급)\s*받/, /광고\s*비를?\s*(받|지원)/,
];
// '협찬 아님'·'체험단 아니고 내돈내산' 같은 부정은 고지가 아니다 — 매칭 직후 12자 안에 부정어가 오면 버린다.
const NEG_AFTER = /^[^.\n]{0,12}(아님|아니|아닌|아녜|없|X|x|❌|no\b|NO\b)/;
const VENDOR_PHOTO = [/(사진|이미지|자료)\s*[=:]\s*[^\s,)\]]{1,20}\s*제공/, /(사진|이미지)\s*제공\s*[=:]/, /(업체|브랜드|매장|본사)\s*제공\s*(사진|이미지)(?!\s*\/)/, /제공\s*받은\s*(사진|이미지)/];

export function findDisclosure(text) {
  for (const re of DISCLOSURE) {
    const g = new RegExp(re.source, 'g');
    let m;
    while ((m = g.exec(text))) {
      if (NEG_AFTER.test(text.slice(m.index + m[0].length))) continue;
      return m[0].replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}
// 매거진 목록 기사의 이미지 캡션 '사진/ 업체 제공'이 이어 붙으면 '업체 제공 사진/'으로 읽힌다 — 다른 가게 사진이라 뺀다(2026-11-27 souldining-hbc 오탐).
const findVendorPhoto = (text) => { for (const re of VENDOR_PHOTO) { const m = text.match(re); if (m) return m[0].replace(/\s+/g, ' ').trim(); } return null; };

// 작성자 단위 출처 키 — 네이버 블로그는 blogId, 티스토리는 서브도메인, 브런치는 @작가, 나머지는 호스트.
export function originKey(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(m|www)\./, '');
    if (host === 'blog.naver.com') return 'naver:' + (u.searchParams.get('blogId') || u.pathname.split('/')[1] || '').toLowerCase();
    if (host === 'brunch.co.kr') return 'brunch:' + (u.pathname.split('/')[1] || '');
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube:' + u.pathname.split('/')[1];   // 영상 단위(채널은 URL로 모름)
    return host;
  } catch { return String(url); }
}

// 작성일: 메타·JSON-LD·네이버 blog_date 순. 못 읽으면 null(추정하지 않는다).
export function pubDate(html) {
  const h = String(html || '');
  const m = h.match(/(?:article:published_time|og:regDate|pubdate|date)["']\s+content=["'](\d{4})-?(\d{2})-?(\d{2})/i)
    || h.match(/content=["'](\d{4})-(\d{2})-(\d{2})[^"']*["']\s+(?:property|name)=["']article:published_time/i)
    || h.match(/"datePublished"\s*:\s*"(\d{4})-(\d{2})-(\d{2})/)
    || h.match(/class="(?:blog_date|se_publishDate|date)[^"]*"[^>]*>\s*(?:<span[^>]*>)?\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!m) return null;
  const d = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(d)) ? null : d;
}

const sentences = (text) => text.split(/(?<=[.!?。])\s+|\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 30 && /[가-힣]/.test(s));

// sources: [{ name, url, body }] — body 는 ddgs extract 원문(차단·빈 본문은 넣지 말 것). allUrls: 본문 못 읽은 것까지 전체 출처 URL.
export function adSignals(item, sources, allUrls = sources.map((s) => s.url)) {
  const kws = (item.title || '').replace(/[()'’"·,/]/g, ' ').split(/\s+/).filter((s) => s.length >= 2);
  const texts = sources.map((s) => ({ ...s, text: strip(s.body), origin: originKey(s.url), date: pubDate(s.body) }));
  const sig = {};

  const disc = texts.map((s) => ({ name: s.name, hit: findDisclosure(s.text) })).filter((x) => x.hit);
  if (disc.length) sig.disclosure = disc;
  const photo = texts.map((s) => ({ name: s.name, hit: findVendorPhoto(s.text) })).filter((x) => x.hit);
  if (photo.length) sig.vendorPhoto = photo;

  // 서로 다른 작성자 사이에서만 공유 문장을 센다(같은 블로그의 두 글은 repeat 가 아니라 oneOrigin 문제).
  const seen = new Map();
  for (const s of texts) for (const line of new Set(sentences(s.text))) {
    if (!kws.some((k) => line.includes(k))) continue;
    const key = line.replace(/[\s\p{P}]/gu, '');
    if (!seen.has(key)) seen.set(key, { line, origins: new Set() });
    seen.get(key).origins.add(s.origin);
  }
  const shared = [...seen.values()].filter((v) => v.origins.size >= 2);
  if (shared.length >= 2) sig.repeat = { count: shared.length, sample: shared[0].line.slice(0, 60) };

  const dated = new Map();
  for (const s of texts) if (s.date && !dated.has(s.origin)) dated.set(s.origin, s.date);
  if (dated.size >= 3) {
    const ds = [...dated.values()].sort();
    const span = (Date.parse(ds.at(-1)) - Date.parse(ds[0])) / 864e5;
    if (span <= 3) sig.burst = { from: ds[0], to: ds.at(-1), n: dated.size };
  }

  const origins = new Set(allUrls.map(originKey));
  if (allUrls.length && origins.size === 1) sig.oneOrigin = { origin: [...origins][0], n: allUrls.length };
  return sig;
}

// 라벨은 ad/trust 조합 규칙(hangeut-curate)에서 '좋음'이 신호와 모순될 때만 바꾼다 — 사람이 다듬은 mid 문구는 보존.
// 점수가 실제로 움직였을 때만 부른다. 이미 warn 인 라벨(사람이 쓴 '업체 홍보 영상뿐' 같은 문구)은 그대로 둔다.
function relabel(t) {
  if (t.labelCls === 'warn') return;
  if (t.ad >= 61 && t.trust <= 40) { t.label = '광고 가능성 높음, 방문 전 주의'; t.labelCls = 'warn'; }
  else if (t.labelCls === 'good' && (t.ad >= 61 || t.trust <= 40)) { t.label = t.ad >= 61 ? 'SNS 기대치 조절 필요' : '후기 적음, 판단 보류'; t.labelCls = 'mid'; }
}

// item 을 제자리에서 고친다. 반환: { changed, before:{ad,trust,label}, after, notes[] }
export function applyAdSignals(item, sig, today) {
  const prev = item.adCheck && item.adCheck.base;
  const base = prev || { ad: item.ad, trust: item.trust, label: item.label, labelCls: item.labelCls,
    reasons: item.reasons ? structuredClone(item.reasons) : undefined };
  const before = { ad: item.ad, trust: item.trust, label: item.label };
  let ad = base.ad, trust = base.trust;
  const adWhy = [], trustWhy = [];
  if (sig.disclosure) { ad = Math.max(ad, 61); adWhy.push(`출처 본문에 '${sig.disclosure[0].hit}' 같은 대가성 고지가 있어요 → 높음`); }
  if (sig.repeat) { ad += 10; adWhy.push(`서로 다른 출처가 같은 문장을 그대로 써요(템플릿 원고·보도자료 복붙 의심)`); }
  if (sig.vendorPhoto) { ad += 5; adWhy.push(`업체 제공 사진('${sig.vendorPhoto[0].hit}')을 쓴 출처가 있어요`); }
  if (sig.burst) { ad += 5; trust -= 5; adWhy.push(`출처 작성일이 ${sig.burst.from}~${sig.burst.to}에 몰려 있어요(단기 집중 노출)`); }
  if (sig.oneOrigin) { trust = Math.min(trust, 40); trustWhy.push(`출처가 모두 한 작성자(${sig.oneOrigin.origin.replace(/^naver:/, '네이버 블로그 ')})의 글이라 후기 표본이 부족해요`); }
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  item.ad = clamp(ad); item.trust = clamp(trust);
  item.label = base.label; item.labelCls = base.labelCls;
  if (item.ad !== base.ad || item.trust !== base.trust) relabel(item);

  // 근거 문장: 이전 자동 점검 문장을 지우고 새로 앞에 붙인다(화면 '왜 이 점수?'에 그대로 노출).
  // 봇 근거는 base.reasons(처음 값)에서 다시 시작한다. 예전 기록(base.reasons 없음)은 지금 근거에서 자동 문장만 뺀다.
  const src = 'reasons' in base ? structuredClone(base.reasons || {}) : (item.reasons && typeof item.reasons === 'object' ? item.reasons : {});
  item.reasons = src;
  // 협찬 고지를 실제로 찾았으면 '협찬·체험단 표시가 안 보였다'는 봇 근거는 사실과 반대라 뺀다(2026-11-27 eomme-cafe-gangnam).
  const denies = (r) => /(협찬|체험단|대가성|광고)[^.]{0,40}(않|없|안 보|아니)/.test(r);
  for (const [k, why] of [['ad', adWhy], ['trust', trustWhy]]) {
    const cur = [].concat(item.reasons[k] || []).filter((r) => typeof r === 'string' && !r.startsWith(AUTO) && !(k === 'ad' && sig.disclosure && denies(r)));
    if (why.length) cur.unshift(`${AUTO} ${why.join(' · ')}`);
    if (cur.length) item.reasons[k] = cur; else delete item.reasons[k];
  }
  const codes = Object.keys(sig);
  if (codes.length || prev) item.adCheck = { at: today, signals: codes, base };
  const after = { ad: item.ad, trust: item.trust, label: item.label };
  return { changed: before.ad !== after.ad || before.trust !== after.trust || before.label !== after.label, before, after, notes: [...adWhy, ...trustWhy] };
}

export const signalLine = (sig) => Object.keys(sig).map((k) => ({ disclosure: '협찬 고지', repeat: '같은 문장 반복', vendorPhoto: '업체 제공 사진', burst: '작성 시기 몰림', oneOrigin: '출처 한 작성자' }[k])).join('·');

// 셀프테스트: node backend/scripts/lib/ad-signals.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const assert = (await import('node:assert')).strict;
  assert.equal(findDisclosure('티슈도 트레이에 제공되었습니다'), null, '일반 동사 제공');
  assert.ok(findDisclosure('본 포스팅은 업체로부터 음식을 무상으로 제공받아 작성되었습니다'));
  assert.ok(findDisclosure('소정의 원고료를 지원받아 작성한 후기입니다'));
  assert.equal(findDisclosure('협찬 아님! 내돈내산 후기'), null, '부정문');
  assert.equal(findDisclosure('#협찬아님 #내돈내산'), null, '해시태그 부정');
  assert.ok(findDisclosure('#광고 #체험단'));
  assert.equal(findDisclosure('광고처럼 보이지만 아닙니다'), null);
  assert.equal(originKey('https://m.blog.naver.com/Foo_1/2241'), originKey('https://blog.naver.com/foo_1/999'));
  assert.equal(pubDate('<p class="blog_date"> <span class="txt">2026. 2. 2. 8:30</span>'), '2026-02-02');
  assert.equal(pubDate('<meta property="article:published_time" content="2026-11-20T09:00:00+09:00">'), '2026-11-20');
  const t = { title: '도레도레 모찌 치즈케이크', ad: 30, trust: 55, label: '믿고 가볼 만함', labelCls: 'good', reasons: { ad: ['협찬 표시는 안 보였어요.'] } };
  const tpl = '도레도레 모찌 치즈케이크는 쫀득한 모찌와 꾸덕한 치즈가 만나 인생 디저트로 손꼽히는 메뉴입니다.';
  const tpl2 = '도레도레 모찌 치즈케이크 한 조각이면 오후 내내 기분이 좋아지는 마법 같은 시간을 경험할 수 있어요.';
  const src = [
    { name: 'A', url: 'https://blog.naver.com/aaa/1', body: `<p class="blog_date"><span>2026. 11. 18.</span></p><p>${tpl}</p><p>${tpl2}</p><p>소정의 원고료를 지원받아 작성했습니다.</p>` },
    { name: 'B', url: 'https://blog.naver.com/bbb/2', body: `<p class="blog_date"><span>2026. 11. 19.</span></p><p>${tpl}</p><p>${tpl2}</p>` },
    { name: 'C', url: 'https://ccc.tistory.com/3', body: `<meta property="article:published_time" content="2026-11-20T10:00:00"><p>사진=도레도레 제공</p>` },
  ];
  const sig = adSignals(t, src);
  assert.deepEqual(Object.keys(sig).sort(), ['burst', 'disclosure', 'repeat', 'vendorPhoto'], JSON.stringify(sig));
  const r1 = applyAdSignals(t, sig, '2026-11-27');
  assert.equal(t.ad, 81); assert.equal(t.trust, 50); assert.equal(t.labelCls, 'mid', '좋음 라벨은 신호와 모순 → mid');
  assert.ok(t.reasons.ad[0].startsWith(AUTO) && t.reasons.ad.length === 1, '협찬 표시 없다는 봇 근거는 빠짐: ' + JSON.stringify(t.reasons.ad));
  assert.deepEqual(t.adCheck.base.reasons.ad, ['협찬 표시는 안 보였어요.'], '처음 근거는 base에 보존');
  applyAdSignals(t, sig, '2026-11-28');
  assert.equal(t.ad, 81, '재실행해도 누적 안 됨(멱등)'); assert.equal(t.reasons.ad.length, 1);
  applyAdSignals(t, {}, '2026-11-29');
  assert.equal(t.ad, 30, '신호가 사라지면 처음 점수로'); assert.deepEqual(t.reasons.ad, ['협찬 표시는 안 보였어요.'], '처음 근거로 복원');
  assert.ok(r1.changed);
  const solo = { title: '누데이크', ad: 20, trust: 60, label: '믿고 가볼 만함', labelCls: 'good' };
  const s2 = adSignals(solo, [], ['https://m.blog.naver.com/x/1', 'https://blog.naver.com/x/2']);
  assert.ok(s2.oneOrigin); applyAdSignals(solo, s2, '2026-11-27');
  assert.equal(solo.trust, 40); assert.equal(solo.labelCls, 'mid');
  assert.equal(adSignals({ title: '소울다이닝' }, [{ name: 'm', url: 'https://m.com/1', body: '3. 소수헌 사진/ 업체 제공 사진/ 업체 제공 스시' }]).vendorPhoto, undefined, '목록 기사 캡션');
  assert.ok(adSignals({ title: '바니에' }, [{ name: 'n', url: 'https://n.com/1', body: '팝업 오픈. (사진제공=신세계 센텀시티점) 마들렌' }]).vendorPhoto, '보도자료 사진');
  const warn = { title: '오하루', ad: 80, trust: 20, label: '업체 홍보 영상뿐, 판단 불가', labelCls: 'warn' };
  applyAdSignals(warn, { oneOrigin: { origin: 'youtube:x', n: 1 } }, 'x');
  assert.equal(warn.label, '업체 홍보 영상뿐, 판단 불가', '점수 그대로면 사람이 쓴 라벨 유지');
  const clean = { title: '누데이크', ad: 20, trust: 60 };
  assert.equal(applyAdSignals(clean, adSignals(clean, [], ['https://a.com/1', 'https://b.com/2']), 'x').changed, false);
  assert.equal(clean.adCheck, undefined, '신호 없고 이전 기록 없으면 필드 안 만듦');
  console.log('✓ ad-signals selftest 통과');
}
