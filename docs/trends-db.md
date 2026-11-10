# 트렌드 DB (Supabase) — P0

`backend/data/trends.json` 을 Supabase(Postgres)로 옮기는 1단계. DB 를 원본으로 삼되 `trends.json` 은 DB 에서 내보내는 결과물로 git 에 계속 남긴다 → 읽기 쪽(사이트·블로그 스크립트·Hermes·Actions)은 그대로.

## 테이블 (`backend/supabase/trends.sql` — SQL Editor 에 실행, 재실행 안전)
- `public.trends` — 1행 = 트렌드 1건. 스칼라 필드는 컬럼(id PK, type, cat, cover_cat, analyzed_at, title, ad, trust, sat, label, verdict, stage …), 배열·객체(shops·recs·src·video·images·article·reasons·tags)와 모르는 필드(`extra`)는 **json**.
  - jsonb 가 아니라 `json`: jsonb 는 객체 키 순서를 바꿔 파일을 되살릴 수 없다.
  - `sort_idx`(파일 안 순서), `key_order`(원본 키 순서·null 키 보존)로 왕복 바이트 동일을 보장. 대시보드에서 새로 넣은 행은 key_order 없이 표준 순서·null 생략.
  - `updated_at` 은 트리거가 내용이 바뀐 update 에서만 갱신.
- `public.trends_history` — update·delete 직전 행 전체를 jsonb 로 자동 저장(내용이 실제로 바뀐 경우만). 감사·롤백용.
- `public.trends_meta` — 최상위 `generatedAt` 보관.
- 보안: 셋 다 RLS on + 정책 0개, anon·authenticated 권한 회수, **service_role(secret 키)만** 접근. anon 키 조회는 401 `permission denied` 로 확인.

## 도구 `backend/scripts/trends-db.mjs` (의존성 0)
`--import` upsert · `--export [--out=]` · `--verify`(바이트 비교) · `--selftest`(네트워크 없음).
자격증명: 환경변수 또는 레포 루트 `.env`(worktree 면 메인 체크아웃 `.env`)의 `SUPABASE_URL`·`SUPABASE_SECRET_KEY`.

## P0 결과
- 테이블 생성·권한 확인 완료, selftest 통과(실데이터 286건 변환 왕복 바이트 동일).
- import/export 왕복 검증은 secret 키가 `.env` 에 들어간 뒤 수행(진행 상황은 보고 참고).
- 참고: 데이터는 281건이 아니라 286건(2026-11-10 기준).
