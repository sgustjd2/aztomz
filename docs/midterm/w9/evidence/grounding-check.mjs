#!/usr/bin/env node
// 검증 04(설명=원문) 근거 — 고른 항목의 출처 본문을 auto-build 와 같은 방식(ddgs extract, 전체 길이)으로 읽고
// auto-build 가 쓰는 근거 대조(lib/grounding.mjs groundingCheck)를 그대로 돌린다. 읽기 전용(데이터 수정 없음).
// 사용(레포 루트): node docs/midterm/w9/evidence/grounding-check.mjs id1,id2,... [본문저장폴더]
// ponytail: auto-build 는 '관련성 통과' 출처 본문만 대조하지만 여기선 읽힌 본문 전부로 대조한다(관련성 판정은 check-source 로 따로).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extract } from '../../../../backend/scripts/lib/websearch.mjs';
import { groundingCheck } from '../../../../backend/scripts/lib/grounding.mjs';

const ids = (process.argv[2] || '').split(',').filter(Boolean);
const outDir = process.argv[3];
if (outDir) mkdirSync(outDir, { recursive: true });
const data = JSON.parse(readFileSync('backend/data/trends.json', 'utf-8'));
const trends = data.trends || data;
const pairs = (t) => (t.src || []).map((s) => Array.isArray(s) ? [s[0], s[1]] : [s.name || s.title || '', s.url || s.href || '']).filter(([, u]) => u);

const rows = [];
for (const id of ids) {
  const t = trends.find((x) => x.id === id);
  if (!t) { rows.push({ id, error: 'trends.json 에 없음' }); continue; }
  const src = pairs(t), names = [], bodies = [], read = [];
  for (const [i, [name, url]] of src.entries()) {
    const body = extract(url, { maxChars: Infinity });
    read.push({ name, url, chars: body.length });
    if (body) { names.push(name); bodies.push(body); }
    if (outDir) writeFileSync(join(outDir, `${id}.${i}.txt`), `${name}\n${url}\n\n${body}`);
  }
  const g = bodies.length ? groundingCheck(t, names, bodies) : { pass: null, block: [], warn: [] };
  rows.push({ id, title: t.title, analyzedAt: t.analyzedAt, sources: read, readable: bodies.length, grounding: g });
  console.log(`${g.pass === true ? '✅ 통과' : g.pass === false ? '✋ 보류감' : '— 본문 0'}  ${id}  (출처 ${src.length} · 읽힘 ${bodies.length})` +
    (g.block.length ? `\n     block: ${g.block.join(' / ')}` : '') + (g.warn.length ? `\n     warn: ${g.warn.join(' / ')}` : ''));
}
const n = rows.filter((r) => r.grounding);
console.log(`\n합계: ${n.length}건 · 통과 ${n.filter((r) => r.grounding.pass === true).length} · 보류감 ${n.filter((r) => r.grounding.pass === false).length} · 본문 0 ${n.filter((r) => r.grounding.pass === null).length}`);
if (outDir) writeFileSync(join(outDir, 'grounding-result.json'), JSON.stringify(rows, null, 2));
