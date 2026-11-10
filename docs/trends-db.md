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

## P2 — DB 원본 전환 (2026-11-10, 브랜치 claude/trends-db-p2, 로컬 커밋·미설치)
목표: DB 가 원본, `trends.json` 은 같은 내용으로 함께 써지는 결과물(git 유지) → 읽기 쪽(사이트·블로그·Hermes 스킬·Actions)은 불변.

- `backend/scripts/lib/trends-store.mjs` — `load()`/`save()`. 쓰기 3곳(`restage.mjs`·`recheck-ad.mjs`·`auto-build.mjs`)이 `trends.json` 직접 읽기·쓰기 대신 이걸 쓴다. 나머지(읽기 전용) 스크립트는 그대로.
  - `load()`: DB 에서 읽는다. 단 `trends.json` 이 store 밖에서 바뀌었으면(해시 `backend/out/pipeline/trends-mirror.json` 불일치: 사람 수정·git pull) **파일이 이긴다** → DB 를 파일로 맞춘 뒤 파일 내용 반환. DB 오류면 경고만 하고 파일 폴백.
  - `save()`: 바뀐 행만 upsert·delete(이력은 트리거) → `trends.json` 을 예전과 같은 형식으로 기록. DB 쓰기 실패해도 파일은 쓰고(봇 안 끊김) 다음 `load()` 가 DB 를 따라잡음. 한 번에 DB 행의 10%+ 삭제는 거부.
- `backend/scripts/trends-sync.mjs` — 대시보드 편집 자동 반영(방식 가). DB export ≠ `trends.json` 이면 validate → refresh → git commit·pull --rebase·push(main 에서만, git 락 준수). 같으면 조용히 종료, 검증 실패면 아무것도 안 건드리고 로그. `--dry`·`--no-git`.
  launchd: `tools/mac/com.az2mz.trends-sync.plist`(3분 간격) → `job.sh trends-sync` → 로그 `backend/out/pipeline/trends-sync.log`.
- 트리거 변경: 순서(`sort_idx`)만 바뀐 update 는 이력·`updated_at` 에서 제외(새 항목이 앞에 들어가면 전 행 순서가 밀리기 때문). `trends.sql` 의 두 함수 갱신, 실제 DB 에도 적용함.
- 시험: store selftest(가짜 DB: 파일 승·DB 승·삭제 가드·장애 폴백 등 10건) · 실제 DB 로 `recheck-ad --no-git`(DB·파일 동시 기록, `--verify` 동일) · `restage --pick`·`auto-build --dry`(읽기 경로) · 대시보드 편집 시뮬레이션(PATCH → `trends-sync` 가 파일·trends.js 반영, validate 통과, 재실행 무동작) · 원복 확인. **`auto-build` 의 실제 쓰기 경로(후보 게시)는 후보가 없어 이번엔 실행하지 못함** — 같은 `save()` 호출이라 위험은 낮지만 다음 21:30 실행 로그로 확인할 것.
- 설치 순서(merge 후): ① P1 미러 plist 는 **설치하지 않는다**(store 와 겹침 — 필요 없어짐) ② 봇 시각(13:30·17:30·21:05·21:15·21:30·21:50) 사이에 머지 ③ `trends-sync` plist 설치 ④ 첫 봇 실행 로그에서 `[trends-store]` 경고 확인.
- 남은 위험: 대시보드 편집이 export 되기 전(최대 3분)에 봇이 같은 행을 저장하면 봇 값이 이긴다(이전 값은 history 에 남음).
