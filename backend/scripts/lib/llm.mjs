/* ============================================================
   Gemini 호출 (SDK 없이 fetch 만 — 의존성 추가 안 함)

   초안은 flash, 검수는 pro. hermes 가 쓰는 유료 Tier-1 키를 그대로 쓴다.
   ============================================================ */
import { env } from './env.mjs';

export const MODEL = {
  draft: process.env.MODEL_DRAFT || 'gemini-2.5-flash',
  review: process.env.MODEL_REVIEW || 'gemini-2.5-pro',
};

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * @param {string} prompt
 * @param {{model?:string, json?:boolean, maxTokens?:number, retries?:number, parts?:object[], mediaResolution?:string}} opt
 *   parts: 텍스트 프롬프트 앞에 붙일 멀티모달 파트(예: [{fileData:{fileUri:'https://youtu.be/…'}}]).
 *          Gemini 2.5 는 유튜브 URL 을 그대로 받아 영상을 직접 본다(자막 스크래핑 불필요).
 *   mediaResolution: 'MEDIA_RESOLUTION_LOW' 면 영상 토큰을 크게 줄인다(발표처럼 음성이 내용을 담을 때 비용 절감).
 * @returns {Promise<string|object>} json:true 면 파싱된 객체
 */
export async function ask(prompt, opt = {}) {
  const model = opt.model || MODEL.draft;
  // 503(용량초과)은 유료 Tier-1 키로도 자주 뜬다(CLAUDE.md 참고). 5초·10초 두 번으론 못 넘긴다.
  const retries = opt.retries ?? 4;
  const body = {
    contents: [{ role: 'user', parts: [...(opt.parts || []), { text: prompt }] }],
    generationConfig: {
      temperature: opt.temperature ?? 0.7,
      // Gemini 2.5 는 **추론 토큰도 이 한도에 포함**된다. 8192 로는 JSON 이 중간에 잘린다
      // (2026-07-25 실측: 04_seo 응답이 description 중간에서 끊김). 넉넉히 잡는다.
      maxOutputTokens: opt.maxTokens ?? 32768,
      ...(opt.mediaResolution ? { mediaResolution: opt.mediaResolution } : {}),
      ...(opt.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000),
      });
      if (!res.ok) {
        const t = (await res.text()).slice(0, 300);
        // 503/429 는 용량 문제 — 잠깐 쉬고 재시도. 그 외는 즉시 실패(키·요청 오류).
        if ((res.status === 503 || res.status === 429) && i < retries) {
          const wait = Math.min(60000, 8000 * 2 ** i);   // 8s → 16s → 32s → 60s
          console.warn(`  · ${model} ${res.status} — ${wait / 1000}초 후 재시도 (${i + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${t}`);
      }
      const data = await res.json();
      const cand = data.candidates?.[0];
      const finish = cand?.finishReason || '?';
      const text = cand?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text) throw new Error(`빈 응답 (finishReason=${finish})`);
      // 잘린 응답을 파싱하면 "JSON 오류"로 보여 원인을 못 찾는다. 잘렸다고 분명히 말한다.
      if (finish === 'MAX_TOKENS') throw new Error(`응답이 토큰 한도에서 잘렸습니다(maxTokens=${body.generationConfig.maxOutputTokens}). 더 크게 주거나 입력을 줄이세요.`);
      if (!opt.json) return text;
      try { return JSON.parse(text); }
      catch { throw new Error(`JSON 파싱 실패 (finishReason=${finish}): ${text.slice(0, 200)}`); }
    } catch (e) {
      lastErr = e;
      if (i >= retries) break;
      if (!/503|429|timeout|fetch failed/i.test(e.message)) break;
    }
  }
  throw lastErr;
}
