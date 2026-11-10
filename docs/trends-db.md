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

## P0 결과 (2026-11-10)
- 테이블 생성·권한 확인, selftest 통과.
- 메인의 최신 trends.json(286건)을 import → export: `diff`·`cmp` 모두 비어 있음(바이트 동일), `--verify` OK. 재import 해도 `trends_history` 0행(내용 불변이면 이력 안 남음).
- export 결과에 `validate-trends.mjs` 통과(286건, cat 7분류, id 유니크).
- 참고: 데이터는 281건이 아니라 286건.

## P1 — trends.json → DB 미러 (2026-11-10)
- `trends-db.mjs --mirror`: 파일 sha1 이 `backend/out/pipeline/trends-mirror.json` 의 기록과 같으면 아무것도 안 함(네트워크 호출 없음). 다르면 import. 파싱 실패(쓰는 중)·빈 배열은 건너뛰고, 항목 수가 직전보다 10%+ 줄면 거부(`--force` 로 우회).
- launchd: `tools/mac/com.az2mz.trends-mirror.plist`(WatchPaths = 메인 `backend/data/trends.json` + 10분 간격 보험) → `tools/mac/job.sh trends-mirror` → 로그 `backend/out/pipeline/trends-mirror.log`. **이 브랜치가 메인에 합쳐진 뒤에** `cp` → `launchctl load` 로 설치한다(지금은 설치 안 함 — 메인 job.sh 에 케이스가 없다).
- 한 방향(JSON→DB)이다. 대시보드에서 고친 값은 다음 미러 때 JSON 값으로 덮인다(history 에는 남음). 대시보드 편집을 살리는 건 P2(DB 원본 전환).
- 시험(수동, 스크래치 파일): 첫 실행 import · 재실행 무동작 · 100건으로 줄인 파일 거부 · 깨진 파일 건너뜀 · 제목 수정 반영+원복 모두 확인. 이때 `trends_history` 에 시험 행 2건(dubai-choco)이 남았다(service_role 에 삭제 권한이 없어 둠).
