#!/usr/bin/env node
/* ============================================================
   한끗 — 트렌드 데이터 스키마 검증 (스모크 게이트)
   backend/data/trends.json 이 구조적으로 멀쩡한지 점검한다.
   auto-build.mjs 가 새 항목을 push 하기 전에 호출하는 안전망:
   id 누락·중복, 미지정 type, cat 정규 7분류 이탈, analyzedAt 형식 오류를
   배포 전에 잡아 깨진 데이터가 라이브로 나가는 것을 막는다.

   실행(수동/CI): node backend/scripts/validate-trends.mjs
   프로그램적 사용: import { validateTrends } from './validate-trends.mjs'
   ============================================================ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 트렌드 cat 정규 7분류 (CLAUDE.md 철칙). 세분 카테고리 신설 금지.
export const CATS = ['디저트', '맛집', '카페·핫플', '신조어', '노래·챌린지', '패션', 'AI 프롬프트'];
const TYPES = ['신뢰분석', '트렌드'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
// trend.html 유행 단계(stage-box)가 쓰는 정규 라벨. 파이프라인 내부값(예: "curate")이 그대로
// 새면 화면에 원문 그대로 노출된다 — WORD-2026-00xx 배치가 실제로 이렇게 깨졌던 사례.
const STAGES = ['발견', '상승', '상승 → 피크', '피크', '피크 → 하락', '안정화', '안정화 → 끝물', '하락 (한물감)', '밈화'];
// verdict는 사람이 쓴 한 줄 판단 문장이어야 한다. "provisional" 같은 영문 placeholder가
// 그대로 남으면 화면에 그대로 노출된다.
const PLACEHOLDER_VERDICT = /^[A-Za-z\s]+$/;
const ARTICLE_TYPES = ['h', 'p', 'q', 'ul'];

/**
 * @param {Array} trends
 * @returns {{ok:boolean, errors:string[], warnings:string[]}}
 */
export function validateTrends(trends) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(trends)) return { ok: false, errors: ['trends 가 배열이 아님'], warnings };
  if (trends.length === 0) return { ok: false, errors: ['trends 가 비어 있음'], warnings };

  const seen = new Set();
  trends.forEach((t, i) => {
    const at = `[#${i} ${t && t.id ? t.id : t && t.title ? t.title : '(이름없음)'}]`;
    if (!t || typeof t !== 'object') { errors.push(`${at} 항목이 객체가 아님`); return; }
    if (!t.id || typeof t.id !== 'string') errors.push(`${at} id 누락/비문자열`);
    else if (seen.has(t.id)) errors.push(`${at} id 중복: ${t.id}`);
    else seen.add(t.id);
    if (!TYPES.includes(t.type)) errors.push(`${at} type 부적합: ${JSON.stringify(t.type)} (허용: ${TYPES.join('/')})`);
    if (!t.title || typeof t.title !== 'string') errors.push(`${at} title 누락`);
    if (!t.cat || !CATS.includes(t.cat)) errors.push(`${at} cat 정규 7분류 이탈: ${JSON.stringify(t.cat)}`);
    if (!ISO.test(t.analyzedAt || '') || Number.isNaN(Date.parse(t.analyzedAt))) errors.push(`${at} analyzedAt 날짜형식(YYYY-MM-DD) 오류: ${JSON.stringify(t.analyzedAt)}`);
    // 신뢰분석은 점수가 핵심 — 0~100 범위 점검
    if (t.type === '신뢰분석') {
      for (const k of ['ad', 'trust']) {
        if (typeof t[k] !== 'number' || t[k] < 0 || t[k] > 100) errors.push(`${at} ${k} 0~100 숫자 아님: ${JSON.stringify(t[k])}`);
      }
      if (t.sat && !['pos', 'neg', 'mix'].includes(t.sat)) warnings.push(`${at} sat 값 비표준: ${JSON.stringify(t.sat)} (pos/neg/mix)`);
    } else {
      // 트렌드 타입은 scoresBlock()이 stage-box(유행 단계)를 그린다 — 두 필드 다 필수.
      if (!STAGES.includes(t.stage)) errors.push(`${at} stage 비정규값(내부 파이프라인 값 유출 의심): ${JSON.stringify(t.stage)} (허용: ${STAGES.join('/')})`);
      if (!t.stageMsg || typeof t.stageMsg !== 'string') errors.push(`${at} stageMsg 누락 — 화면에 undefined로 노출됨`);
    }
    // verdict(한끗 판단)·article(자세히 읽기)은 모든 타입에서 렌더링되는 공통 섹션.
    if (!t.verdict || typeof t.verdict !== 'string') errors.push(`${at} verdict 누락`);
    else if (PLACEHOLDER_VERDICT.test(t.verdict)) errors.push(`${at} verdict가 placeholder로 보임: ${JSON.stringify(t.verdict)}`);
    if (t.article !== undefined) {
      if (!Array.isArray(t.article)) errors.push(`${at} article이 배열이 아님`);
      else t.article.forEach((b, bi) => {
        if (!Array.isArray(b) || !ARTICLE_TYPES.includes(b[0])) {
          errors.push(`${at} article[${bi}] 형식 오류(["h"|"p"|"q"|"ul", 내용] 튜플이어야 함): ${JSON.stringify(b).slice(0, 80)}`);
        }
      });
    }
    if (!Array.isArray(t.src) || t.src.length === 0) warnings.push(`${at} 출처(src) 없음`);
  });

  return { ok: errors.length === 0, errors, warnings };
}

// ── 단독 실행: backend/data/trends.json 읽어 검증, 실패 시 종료코드 1
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === (() => { try { return fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, '/')}`)); } catch { return process.argv[1]; } })();
if (isMain || (process.argv[1] && process.argv[1].endsWith('validate-trends.mjs'))) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const jsonPath = join(repoRoot, 'backend', 'data', 'trends.json');
  const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const trends = Array.isArray(data) ? data : data.trends;
  const { ok, errors, warnings } = validateTrends(trends);
  if (warnings.length) console.warn('⚠ 경고:\n' + warnings.map((w) => '  · ' + w).join('\n'));
  if (!ok) {
    console.error(`⛔ 스키마 검증 실패 (${errors.length}건):\n` + errors.map((e) => '  · ' + e).join('\n'));
    process.exit(1);
  }
  console.log(`✓ 스키마 검증 통과: ${trends.length} trends, cat 7분류 준수, id 유니크` + (warnings.length ? `, 경고 ${warnings.length}건` : ''));
}
