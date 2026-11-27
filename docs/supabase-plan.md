# Supabase 전환 계획 (2026-11-10 결정)

## 결정
- 회원가입·댓글·좋아요 같은 **사용자 데이터는 Supabase(호스팅 Postgres + Auth + RLS)**에 둔다.
- 맥 미니는 DB 서버가 아니다. 봇 실행과 **Supabase 일일 백업(pg_dump)**을 맡는다.
  이유: 맥이 꺼지거나 집 인터넷이 끊겨도 로그인·댓글이 살아 있어야 하고, 집 맥을 인터넷에 노출하지 않기 위해서다.
- 트렌드 콘텐츠는 당분간 지금처럼 `backend/data/trends.json` → `frontend/data/trends.js` → git push → Vercel 정적 배포로 둔다.

## 단계

| 단계 | 내용 | 기존 자동화 영향 |
|---|---|---|
| 1 | Supabase 프로젝트 생성 · `backend/supabase/schema.sql` 적용 · 맥 일일 백업 | 없음 |
| 2 | 프런트에 로그인·회원가입·댓글·좋아요 UI 추가(브라우저 → Supabase 직접, anon 키) | 없음 |
| 3 | trends.json을 Supabase `trends` 테이블로 단방향 미러(조회·검색용, 대시보드에서 열람) | 없음 |
| 4 | 편집 원본을 Supabase로 이전 — restage → recheck-ad → auto-build 순으로 하나씩, DB에서 JSON·JS를 만들어 push. 매 단계 출력이 기존과 같은지 대조 | 단계마다 대조 |
| 5 | GitHub Actions 2개·Hermes 스킬 12개를 DB 기준으로 정리 | 마지막 |

## 1단계 — 사용자가 할 일
1. https://supabase.com 에서 프로젝트 생성. 리전은 **Northeast Asia (Seoul)**. DB 비밀번호는 비밀번호 관리자에 보관.
2. Project Settings → API에서 세 값을 확인:
   - Project URL, `anon` public 키 → 브라우저에 들어가도 되는 공개값
   - `service_role` 키 → **비밀**. 맥 `.env`에만 둔다(커밋·출력 금지)
3. SQL Editor에 `backend/supabase/schema.sql`을 붙여 실행.
4. Authentication → URL Configuration: Site URL `https://az2mz.vercel.app`, Redirect URLs에 같은 주소와 로컬 개발 주소를 추가.
5. 로그인 수단을 정한다(아래 미결정).

맥 `.env`에 넣을 이름(값은 사용자가 직접 입력):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=        # pg_dump용 접속 문자열(DB 비밀번호 포함)
```

## 스키마 v1 요약 (`backend/supabase/schema.sql`)
- `profiles` — 가입 시 트리거로 자동 생성, 닉네임만 본인 수정 가능
- `comments` — 트렌드별 댓글(500자), 본인만 작성·수정(본문만)·삭제, 운영자 숨김 `is_hidden`
- `likes` — (trend_id, user_id) 하나, 본인만 추가·취소, `like_counts` 뷰로 개수 공개
- `trend_id`는 trends.json의 id 문자열(외래키 없음 — 트렌드는 아직 DB 밖)
- 운영자 작업(숨김·삭제)은 대시보드나 service_role로 한다

## 미결정
- 로그인 수단: 이메일+비밀번호 / 매직링크 / 카카오 / 구글
- 댓글 운영: 즉시 공개 + 신고 숨김 / 사전 검수
- 개인정보 처리방침·이용약관 페이지(회원가입 공개 전 필요)
