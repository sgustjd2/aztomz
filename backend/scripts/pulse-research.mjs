#!/usr/bin/env node
/* ============================================================
   한끗 · 트렌드 펄스 — 요일별 분야 자동 조사 (GitHub Actions용)

   오늘(KST) 요일에 배정된 분야를 Gemini(OpenAI 호환 엔드포인트)로 조사해
   각 트렌드에 상세 창업 아이디어 3개를 붙여 backend/data/pulse.json 의
   daily[](주간 픽)에 추가하고, frontend/data/pulse.js 를 재생성한다.

   ▶ 빌트인 110개(trends)는 read-only — daily[]만 소유·변경.
   ▶ 일요일은 조사 안 함(종합 검수일). 키 없으면 안전 종료(daily 미변경).
   ▶ 결정적 id + KST 날짜 → 멱등. 롤링 윈도우(최근 N일)로 무한 증가 방지.

   env: GEMINI_API_KEY(필수) · GEMINI_BASE_URL(기본 OpenAI호환) · GEMINI_MODEL
   실행: node backend/scripts/pulse-research.mjs   (레포 루트에서)
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = join(repoRoot, 'backend', 'data', 'pulse.json');
const jsPath = join(repoRoot, 'frontend', 'data', 'pulse.js');

const KEY = process.env.GEMINI_API_KEY || '';
const BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const CATS = ['테크', 'K뷰티', '헬스', '푸드', '금융', '교육', '패션', '엔터', '라이프', '등산', '관광'];
const PLATFORMS = ['Google', 'YouTube', 'Instagram', 'TikTok', 'X'];
const WINDOW_DAYS = 14;   // daily 롤링 윈도우
const PER_CAT = 3;        // 분야당 트렌드 수

// 요일(0=일 … 6=토) → 분야. 일요일은 빈 배열(조사 X).
const ROTATION = {
  1: ['테크', '금융'], 2: ['K뷰티', '패션'], 3: ['헬스', '등산'],
  4: ['푸드', '관광'], 5: ['교육', '엔터'], 6: ['라이프'], 0: [],
};

// KST 기준 날짜·요일 (러너 타임존과 무관)
function kstParts() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return { iso: `${p.year}-${p.month}-${p.day}`, wd };
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const normKw = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');

async function callGemini(prompt) {
  if (!KEY) return { ok: false, skipped: true };
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.8, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return { ok: false, error: `API ${r.status} ${(await r.text()).slice(0, 160)}` };
    const d = await r.json();
    const txt = d?.choices?.[0]?.message?.content || '';
    return txt.trim() ? { ok: true, text: txt } : { ok: false, error: '빈 응답' };
  } catch (e) { return { ok: false, error: '네트워크: ' + (e && e.message) }; }
}

function buildPrompt(cat, excludeKws, today) {
  const ex = excludeKws.slice(0, 40).join(', ');
  return `너는 한국 창업 트렌드 분석가다. 오늘 ${today} 기준 '${cat}' 분야에서 지금 창업으로 이어질 만한 트렌드 ${PER_CAT}개를 뽑아라.

규칙:
- 아래 기존 키워드와 중복 금지: ${ex || '(없음)'}
- 실제로 화제가 될 법한 현실적인 것. 과장 금지(추정치).
- 각 트렌드에 서로 다른 결의 창업 아이디어 3개: ① 제품/SaaS ② 콘텐츠·커뮤니티 ③ 교육·툴/마켓. 각 한 줄로 "누구에게 뭘 파나"가 보이게.

아래 JSON 배열 '하나만' 출력(코드펜스·설명 금지):
[
  { "kw":"트렌드명", "pl":["${PLATFORMS.join('|')} 중 2~3개"], "gr":120~400 정수,
    "why":"왜 지금 뜨나 1문장", "angle":"핵심 사업 각도 1문장",
    "ideas":["아이디어1 — 한 줄","아이디어2 — 한 줄","아이디어3 — 한 줄"] }
]
정확히 ${PER_CAT}개. 한국어.`;
}

function parseJSON(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a >= 0 && b > a) { try { const arr = JSON.parse(t.slice(a, b + 1)); if (Array.isArray(arr) && arr.length) return arr; } catch { /* */ } }
  return null;
}

function normalize(raw, cat, idx, today) {
  const kw = String(raw?.kw || '').trim();
  if (!kw) return null;
  let pl = Array.isArray(raw.pl) ? PLATFORMS.filter((p) => raw.pl.includes(p)).slice(0, 3) : [];
  if (!pl.length) pl = ['Google', 'YouTube'];
  let gr = parseInt(raw.gr, 10);
  if (!Number.isFinite(gr)) gr = 150 + idx * 30;
  gr = clamp(gr, 100, 450);
  let ideas = Array.isArray(raw.ideas) ? raw.ideas.map((x) => String(x).trim()).filter(Boolean).slice(0, 3) : [];
  while (ideas.length < 3) ideas.push(`${kw} 관련 ${['서비스', '콘텐츠', '교육·툴'][ideas.length] || '아이템'}`);
  const dur = clamp(Math.floor(gr / 35), 4, 12);
  const sp = [];
  for (let j = 0; j < dur; j++) sp.push(Math.round(20 + (80 * j) / dur + (idx * 5) % 8));
  return {
    id: `r-${today}-${cat}-${idx + 1}`, kw, cat, pl, gr,
    vol: 200 + Math.floor(gr * 1.2), dur,
    sc: { g: 3, m: 2, c: 2, f: 2 },
    why: (raw.why && String(raw.why).trim()) || `${kw} 급상승`,
    angle: (raw.angle && String(raw.angle).trim()) || `${kw} 기반 서비스`,
    ideas, sp, total: 9, isDaily: true, date: today,
  };
}

/* ───────── main ───────── */
let data;
try { data = JSON.parse(await readFile(jsonPath, 'utf8')); }
catch { console.error('✗ backend/data/pulse.json 못 읽음 — 종료'); process.exit(0); }

const builtin = Array.isArray(data.trends) ? data.trends : [];
const prevDaily = Array.isArray(data.daily) ? data.daily : [];
const { iso: today, wd } = kstParts();
const cats = ROTATION[wd] || [];
console.log(`[펄스 조사] ${today} (요일=${wd}) → 분야: ${cats.join(' · ') || '(일요일 · 조사 없음)'}`);

const cutoff = new Date(today + 'T00:00:00');
cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
const recentDaily = prevDaily.filter((d) => d?.date && new Date(d.date + 'T00:00:00') >= cutoff);
const excludeSet = new Set([...builtin, ...recentDaily].map((t) => normKw(t.kw)));
const excludeKws = [...builtin, ...recentDaily].map((t) => t.kw);

const todaysNew = [];
if (!KEY) {
  console.log('⚠ GEMINI_API_KEY 없음 — daily 미변경(빌드 안전 종료)');
} else if (!cats.length) {
  console.log('· 일요일 — 조사 건너뜀(종합 검수일).');
} else {
  for (const cat of cats) {
    const r = await callGemini(buildPrompt(cat, excludeKws, today));
    if (r.skipped) break;
    if (!r.ok) { console.log(`  ⚠ ${cat} 조사 실패: ${r.error}`); continue; }
    const parsed = parseJSON(r.text);
    if (!parsed) { console.log(`  ⚠ ${cat} 파싱 실패`); continue; }
    let i = 0;
    for (const raw of parsed) {
      const n = normalize(raw, cat, i, today);
      if (!n) continue;
      const k = normKw(n.kw);
      if (excludeSet.has(k)) continue;
      excludeSet.add(k); excludeKws.push(n.kw); todaysNew.push(n); i++;
    }
    console.log(`  ✓ ${cat}: ${i}개`);
  }
}

// 오늘분 교체(누적 방지) + 최근 N일(오늘 제외) 유지
const olderDaily = recentDaily.filter((d) => d.date !== today);
data.daily = todaysNew.length ? [...todaysNew, ...olderDaily] : recentDaily;
data.generatedAt = today;

await writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
const banner = '/* AUTO-GENERATED by backend/scripts/pulse-research.mjs — 편집 금지. 원본: backend/data/pulse.json */\n';
await writeFile(jsPath, banner + 'window.PULSE_DATA = ' + JSON.stringify(data, null, 2) + ';\n', 'utf8');
console.log(`✓ pulse: generatedAt=${today}, daily=${data.daily.length} (오늘 신규 ${todaysNew.length})`);
