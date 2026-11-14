#!/usr/bin/env node
/* 이미 발행한 글(네이버·티스토리)의 slug·제목·발행일을 최근 순으로 출력한다 (읽기 전용).
   job.sh 가 회차 시작 전에 backend/out/blog/.posted-titles.txt 로 저장 → 스킬이 Read 로 읽고 같은 주제를 피한다. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'blog');
const rows = [];
for (const [f, label] of [['posted-naver.json', '네이버'], ['posted.json', '티스토리']]) {
  let d = {};
  try { d = JSON.parse(readFileSync(join(outDir, f), 'utf8')); } catch { /* 없으면 건너뜀 */ }
  for (const [slug, v] of Object.entries(d)) rows.push({ at: String(v?.at || ''), label, slug, title: v?.title || '' });
}
rows.sort((a, b) => b.at.localeCompare(a.at));
console.log(`# 이미 발행한 글 ${rows.length}편 (최근 순) — 같은 제도·장소·대상을 다룬 글이 있으면 그 주제는 고르지 않는다`);
for (const r of rows) console.log(`${r.at.slice(0, 10)}\t${r.label}\t${r.slug}\t${r.title}`);
