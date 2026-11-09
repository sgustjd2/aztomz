/* ============================================================
   한끗 · 게시 결과를 사람 말로 (디스코드 문구의 단일 원본)

   auto-build 출력(SUMMARY 줄 + ⛔ 스키마 오류 줄)을 받아 이유·조치를 한 문장씩 돌려준다.
   pipeline-review.mjs 마지막 줄(Hermes hangeut-approve가 그대로 전함)과 discord-reactions.mjs가 같이 쓴다.
   SUMMARY JSON 원문은 로그 파일에만 남기고 디스코드에는 보내지 않는다(2026-11-10).
   ============================================================ */

export function parseSummary(out = '') {
  const line = String(out).split('\n').reverse().find((l) => l.startsWith('SUMMARY '));
  try { return line ? JSON.parse(line.slice(8)) : null; } catch { return null; }
}

// ⛔ 스키마 검증 실패 아래 "  · [#281 id] title 누락" 줄 → "title 누락" (중복 제거)
function schemaErrors(out = '') {
  const errs = String(out).split('\n').filter((l) => /^\s+· /.test(l)).map((l) => l.replace(/^\s+·\s*(\[[^\]]*\]\s*)?/, '').trim());
  return [...new Set(errs)];
}

const FIX_QUEUE = '`.pipeline/review-queue.json`에서 이 후보를 고친 뒤 ✅를 다시 누르세요.';
const HELD = {
  no_title: { why: '후보에 제목(title)이 없어요.', action: FIX_QUEUE },
  no_id: { why: '후보에 id가 없어요.', action: '다음 수집에서 다시 만들게 🗑️로 버리세요.' },
  grounding: { why: '본문에 출처에 없는 수치·표현이 있어요.', action: '해당 문장을 확인하고 ✅ 또는 🗑️를 고르세요.' },
};

// summary(+원문 out) → { ok, why, action }. 성공이면 why·action 없음.
export function explain(summary, out = '') {
  if (!summary) return { ok: false, why: '스크립트가 결과 없이 끝났어요.', action: '`backend/out/discord-reactions.log`를 확인하세요.' };
  const { outcome, mode } = summary;
  if (outcome === 'pushed') return { ok: true };
  if (outcome === 'files_only' || outcome === 'git_deferred') {
    return { ok: true, why: '사이트 파일엔 반영됐지만 배포(git push)가 미뤄졌어요.', action: '다음 자동 실행이 같이 올려요. 급하면 수동으로 push하세요.' };
  }
  if (outcome === 'schema_fail') {
    const errs = schemaErrors(out);
    if (errs.some((e) => /title 누락/.test(e))) return { ok: false, ...HELD.no_title };
    return { ok: false, why: `데이터 형식 오류 — ${errs.slice(0, 2).join(', ') || '세부 내용은 로그에'}.`, action: FIX_QUEUE };
  }
  const h = summary.heldItems?.[0];
  if (h && HELD[h.code]) return { ok: false, ...HELD[h.code] };
  if (h?.code === 'no_valid_source') {
    return mode === 'approved'
      ? { ok: false, why: '살아 있는 출처가 하나도 없어요(모두 404이거나 안 열림).', action: '🗑️로 버리세요.' }
      : { ok: false, why: '출처에서 이 주제를 다룬 내용을 찾지 못했어요.', action: '출처를 확인하고 ✅ 또는 🗑️를 고르세요.' };
  }
  if (summary.duplicate) return { ok: false, why: '이미 사이트에 있는 항목이에요.', action: '🗑️로 버리세요.' };
  return { ok: false, why: `게시되지 않았어요(${outcome || '결과 없음'}).`, action: '`backend/out/discord-reactions.log`를 확인하세요.' };
}

// 보류 사유 코드 → 짧은 사람 말(검수 카드용)
export function heldReason(code, mode = 'auto') {
  if (HELD[code]) return HELD[code].why;
  return explain({ outcome: 'no_publish', mode, heldItems: [{ code }] }).why;
}

// 디스코드 결과 메시지: 제목 줄 · 결과 한 줄 · 이유 · 조치 (없는 줄은 뺀다)
export function resultMessage({ icon, head, subject, counts, why, action }) {
  const c = counts && `게시 ${counts.published ?? 0} · 보류 ${counts.held ?? 0} · 실패 ${counts.failed ?? 0}`;
  return [`${icon} **${head}**${subject ? ` · ${subject}` : ''}`, c, why && `이유: ${why}`, action && `조치: ${action}`]
    .filter(Boolean).join('\n');
}
