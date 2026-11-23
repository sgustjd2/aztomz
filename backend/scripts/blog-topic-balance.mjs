#!/usr/bin/env node
/* 네이버 주제 묶음 균형표 (읽기 전용). job.sh 가 회차 직전 backend/out/blog/.topic-balance.txt 로 저장 → 스킬 1단계에서 Read.
   묶음 7개로 분류해 오늘·최근 7일 편수를 세고, 이번 회차에서 고르면 안 되는 묶음(상한)과 가장 적게 나온 묶음을 알려준다.
   분류: 메타 coverSpec.cat 이 장소·맛집·제철 음식을 가리키면 그것을 따르고, 나머지(대부분 '생활정보')는 제목·slug 키워드로 가른다. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'blog');
const GROUPS = ['장소·맛집', '신청·제도', '가전·비용', '차량·난방·공과금', '제철 음식·보관·살림', '쇼핑·세일', '시즌 이벤트'];
const RULES = [
  ['시즌 이벤트', /김장|수능|연말|크리스마스|성탄|설날|추석|명절|발렌타인|새해|송년/],
  ['쇼핑·세일', /세일|할인|블랙프라이데이|블프|특가|프로모션|쿠폰|사전예약|오픈런|핫딜|기프티콘|환불|예매/],
  ['차량·난방·공과금', /타이어|배터리|자동차|차량|운전|난방|보일러|전기요금|전기세|가스요금|수도요금|공과금|관리비|동파|누진|열선|히터|주유/],
  ['가전·비용', /가전|필터|교체|수리|세탁기|건조기|냉장고|에어컨|청소기|공기청정|전열교환|제습|가습|TV|티비|유지비|설치|AS/],
  ['제철 음식·보관·살림', /제철|보관|손질|레시피|담그|김치|식재료|세탁|청소|곰팡이|밀프렙|냉동|해동|반찬|세제|세정/],
  ['장소·맛집', /가는 길|주차|입장료|맛집|카페|메뉴|웨이팅|여행|명소|등산|하늘다리|케이크|팝업|브런치|산책|축제/],
  ['신청·제도', /신청|지원금|급여|장학금|바우처|연금|제도|휴가|수당|환급|자격|보험료|지급|대상|감면|혜택/],
];
const classify = (slug, title) => {
  let meta = {};
  try { meta = JSON.parse(readFileSync(join(outDir, `${slug}.json`), 'utf8')); } catch { /* 메타 없으면 제목만 */ }
  const cat = String(meta?.coverSpec?.cat || '');
  const text = `${title} ${slug}`;
  if (/카페·핫플|맛집/.test(cat) || meta?.categoryId === 'hangeut-trend') return '장소·맛집';
  if (/제철|음식/.test(cat) && !/김장/.test(text)) return '제철 음식·보관·살림';
  for (const [g, re] of RULES) if (re.test(text)) return g;
  return '미분류';
};

const kst = (at) => new Date(Date.parse(String(at).replace(' ', 'T') + 'Z') + 9 * 3600e3);
const ymd = (d) => d.toISOString().slice(0, 10);
let posted = {};
try { posted = JSON.parse(readFileSync(join(outDir, 'posted-naver.json'), 'utf8')); } catch { /* 없음 */ }
const now = new Date(Date.now() + 9 * 3600e3);
const today = ymd(now);
const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 일 … 6 토
const placeCap = [4, 5, 6].includes(dow) ? 3 : 2;
const cutoff7 = ymd(new Date(now.getTime() - 6 * 86400e3));
const cutoff3 = ymd(new Date(now.getTime() - 2 * 86400e3));
const t = Object.fromEntries([...GROUPS, '미분류'].map((g) => [g, 0]));
const w = { ...t };
const recent3 = [];
let nToday = 0, nWeek = 0;
for (const [slug, v] of Object.entries(posted)) {
  if (!v?.at) continue;
  const d = ymd(kst(v.at));
  if (d < cutoff7) continue;
  const g = classify(slug, v.title || '');
  w[g]++; nWeek++;
  if (d === today) { t[g]++; nToday++; }
  if (d >= cutoff3) recent3.push(`${d} [${g}] ${v.title}`);
}
const cap = (g) => (g === '장소·맛집' ? placeCap : 2);
const blocked = GROUPS.filter((g) => t[g] >= cap(g) || (nWeek >= 10 && w[g] / nWeek > 0.35));
const open = GROUPS.filter((g) => !blocked.includes(g));
const least = [...open].sort((a, b) => w[a] - w[b] || t[a] - t[b]).slice(0, 3);
const used = GROUPS.filter((g) => t[g] > 0).length;
const left = 7 - nToday;
const row = (o) => GROUPS.map((g) => `${g} ${o[g]}`).join(' / ') + (o['미분류'] ? ` / 미분류 ${o['미분류']}` : '');
console.log(`# 주제 묶음 균형표 (${today} KST, 요일 ${'일월화수목금토'[dow]}) — 시각 표의 유형은 우선순위일 뿐, 상한에 걸린 묶음은 이번 회차에서 고르지 않는다`);
console.log(`오늘 ${nToday}편: ${row(t)}`);
console.log(`최근 7일 ${nWeek}편: ${row(w)}`);
console.log(`상한: 한 묶음 하루 2편(장소·맛집은 목·금·토 3편 — 오늘 한도 ${placeCap}), 최근 7일 점유 35% 초과 묶음 제외, 하루 7편은 최소 4개 묶음`);
console.log(`이번 회차에서 고르지 않을 묶음: ${blocked.join(', ') || '없음'}`);
console.log(`가장 적게 나온 후보 묶음(상한 걸리면 여기서 고른다): ${least.join(', ') || '없음'}`);
if (left > 0 && used + left < 4) console.log(`주의: 오늘 쓴 묶음 ${used}개, 남은 ${left}편 — 최소 4개 묶음이 되려면 아직 안 쓴 묶음에서 골라야 한다`);
console.log('최근 3일 글(같은 사안은 하루 1편, 같은 키워드 계열은 3일 안에 다시 쓰지 않는다):');
for (const r of recent3.sort().reverse()) console.log(`  ${r}`);
