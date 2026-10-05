# 2026-10-05 블로그 배치 — 사람 요청(/blog-run-today)

claim: `backend/out/blog/.daily-claim-2026-10-05`. 티스토리 이월분 5편(검증 완료) + 네이버 신규 5편. 티스토리 세션 만료 → 사용자 재로그인 후 발행.
## 티스토리 (이월분, 발행 완료)
- [x] galaxy-battery-protect — /515
- [x] vlm-watch-2026-10-01 — /516 (1차 캡차 실패 → 재시도 성공)
- [x] windows-bluetooth-fix — /517 (RSS 퍼머링크 실패 → 제목 대조로 /517 교정)
- [x] windows-sleep-settings — /518
- [x] chrome-saved-passwords — /519 (퍼머링크 /519로 교정)
## 네이버 (신규 집필·검증, 대기열 발행 완료)
- [x] kakao-ai-profile-decoration — 카카오톡 AI 꾸미기 · 팩트체크 통과 · verify 통과(warn 2)
- [x] ai-pixar-wedding-video — AI 픽사 식전영상 · 외주비용 인용 교정 · verify 통과(warn 3)
- [x] onion-storage-guide — 양파 보관법 · 출처 6건 · verify 통과(warn 2)
- [x] potato-storage-guide — 감자 보관법 · 근거 없는 권고 삭제 · 식약처 내용은 요약본 기준(원문 재대조 필요) · verify 통과(warn 2)
- [x] yuja-cheong-guide — 유자청 만들기 · 팩트체크 반려(blocker 1) 교정 · verify 통과(warn 1)
- [x] 커밋 c4bb079(조사 파일) · 418dc90(posted.json 강제 추가) push 완료
- [ ] 티스토리 임시 저장분(`/manage/newpost/`) 중복 확인 — 사람
- [ ] 감자 글 식약처 솔라닌·사과 속설 원문 재대조
- 예약 15:00 대기열을 수동으로 종료하고 `--gap=0-0`으로 연속 발행함(내일부터 기본 20~40분)

# 2026-10-04 블로그 배치 — 무인 /blog-daily

claim: `backend/out/blog/.daily-claim-2026-10-04`. 티스토리 세션 만료(10-03 로그) + 검증 통과 대기 5편 → 티스토리 신규 0편, 네이버 5편.
제외: purple-core-2026(티스토리 '퍼플 컬러 트렌드'와 같은 개념) · ⚠ 출처 1개 후보들
## 네이버
- [x] cigarette-pants-2026 — 시가렛 팬츠(한끗 트렌드) · 팩트체크 blocker 2(제목 '떴다'·desc '저물며') 코디네이터 교정 · verify 통과
- [x] jinju-lantern-festival-2026 — 진주남강유등축제 2026 · 1차 반려(blocker 3: 셔틀 '충돌' 지어냄 등) → 재작성 → 2차 통과 · selfreview 오수정(통행증) 원문 대조로 되돌림 · verify 통과(warn 2)
- [x] 로컬 커밋 8e1b941 (push 안 함) · 대기열 티스토리 5(이월분)/네이버 5
- [x] mussel-prep — 홍합 손질법 · 팩트체크 blocker 3(제목 해감 모순 등) 코디네이터 교정 · verify 통과(warn 2)
- [x] sesame-oil-storage — 참기름·들기름 보관법 · 1차 반려(blocker 4, 조사파일 과장) → 재작성 → 2차 반려(blocker 1) → 코디네이터 교정 · verify 통과(warn 1)
- [x] curtain-wash — 커튼 세탁법 · 팩트체크 blocker 4 코디네이터 교정 · verify 통과(warn 3)

# 2026-10-02 블로그 배치 — 무인 /blog-daily

claim: `backend/out/blog/.daily-claim-2026-10-02`. 어제 티스토리 3회 캡차 실패 → 검증 통과 미발행 4편(vlm-watch·bluetooth·sleep·chrome) 대기 중이라 티스토리는 신규 1편만.
제외: 토란(네이버 기발행) · 니트(티스토리 기발행) · kwonroot/yajang 등 출처 1개
## 티스토리
- [ ] (대기) vlm-watch-2026-10-01 · windows-bluetooth-fix · windows-sleep-settings · chrome-saved-passwords
- [x] galaxy-battery-protect — 갤럭시 배터리 보호 설정 · 팩트체크 blocker 1 코디네이터 교정 · verify 통과(warn 2)
## 네이버
- [x] sneakers-wash — 재조립·selfreview·verify 통과(warn 1: 직사광선 건조는 나이키 원문)
- [x] inoegom-vesper — 인외콤(한끗 트렌드) · 팩트체크 2라운드+코디네이터 교정 · verify 통과(warn 1)
- [x] bukangi-shark — 부캉이(한끗 트렌드) · 팩트체크 2라운드 · verify 통과(warn 1)
- [x] daebong-hongsi — 대봉감 홍시 후숙 · 팩트체크 2회 반려→코디네이터 교정 · verify 1회 차단(곰팡이 문장)→삭제 후 통과(warn 1)
- [x] mu-malaengi — 무말랭이 만들기 · 팩트체크 2회 반려→코디네이터 교정 · verify 1회 차단(자사 내부링크 오탐)→문구 수정 후 통과(warn 2)
- [x] 로컬 커밋 cc0ec6f (push 안 함) · 대기열 티스토리 5/네이버 5

# 2026-10-01 블로그 배치 (티스토리 5 + 네이버 5) — 무인 /blog-daily

claim: `backend/out/blog/.daily-claim-2026-10-01`. clean 트렌드 후보 1건(no-oo-zone-cafe). 나머지 자유 발굴.
제외: autumn-foliage-korea-2026(티스토리 '단풍 예상 시기 2026'과 중복) · 이불 세탁(티스토리 이불 고르는 법과 인접)
## 티스토리
- [ ] chrome-saved-passwords — 어제 검증 통과분(대기열)
- [ ] excel-freeze-panes — 엑셀 틀 고정
- [ ] iphone-battery-health — 아이폰 배터리 성능 확인
- [ ] windows-sleep-settings — 윈도우 11 절전·화면 꺼짐
- [ ] vlm-watch-2026-10-01 — 경량 VLM 주간
- [ ] windows-bluetooth-fix (예비)
## 네이버
- [ ] no-oo-zone-cafe — 노OO존(한끗 트렌드)
- [ ] airfryer-sweet-potato — 어제 2차 반려분, 코디네이터가 원문 재확인 후 교정
- [ ] quince-syrup — 모과청 만들기
- [ ] doraji-prep — 도라지 손질법
- [ ] old-pumpkin-prep — 늙은호박 손질
- [ ] sneakers-wash (예비) — 운동화 세탁법

# 2026-09-30 블로그 배치 (티스토리 5 + 네이버 5 이상) — 수동 /blog-run-today

claim: `backend/out/blog/.daily-claim-2026-09-30` (09:00 무인 /blog-daily 는 양보). 검색수요 게이트: NAVER_AD 자격증명 없음 → 못 돌림.
제외한 후보: 서울세계불꽃축제(2026은 9/5에 종료), frozen-dessert-boom-2026(09-25 네이버 cvs-autumn-dessert 와 겹침), yajang/opera-gloves(출처 1개·얇음)

## 후보 12편 (예비 = 각 플랫폼 1편) — workflow wf_e5c2fd47-867
### 티스토리
- [x] dev-digest-2026-09-30 — 개발·AI 다이제스트 → /508
- [x] ios27-update-guide — iOS 27 업데이트 방법·지원 기종 → /509
- [x] excel-remove-duplicates — 엑셀 중복값 찾기·제거 → /510
- [x] hwp-to-pdf — 한글(HWP) → PDF → /511 (캡차 1회, 사람이 해결)
- [x] git-undo-guide — git 되돌리기(restore·reset·revert) → /512
- [ ] chrome-saved-passwords (예비) — 검증 통과, 미발행(내일 대기열)
### 네이버
- [x] hoe-picnic-2026 — 회크닉(한끗 트렌드) → 네이버 224426836278
- [x] geumsan-ginseng-festival-2026 — 금산세계인삼축제 → 네이버 224426788712
- [x] washer-tub-clean — 세탁기 통세척
- [x] jeoneo-prep-guide — 전어 손질·안전
- [x] tsutsugamushi-prevention — 쯔쯔가무시 예방수칙
- [ ] airfryer-sweet-potato (예비) — 에어프라이어 군고구마

## 파이프라인 단계
- [x] 워크플로(조사→정리→집필→SEO→팩트체크) 완료 — 통과 9/12, 반려 3(dev-digest·chrome-saved-passwords 는 표 한 칸·요약 두 줄 교정 후 통과, airfryer 는 예비라 보류)
- [x] 통과분 순차 assemble (structure-log 중복 게이트) — 11편 차단 없음
- [x] selfreview → verify — 11편 blocker 0 (selfreview 가 chrome 편에 잘못 넣은 iOS 인증 문장은 원문 재확인 후 되돌림)
- [x] 티스토리 5편 발행 — /508~512, 캡차 2회(dev-digest·hwp) 사람이 해결, excel·hwp permalink 수동 교정
- [x] 네이버 5편 — blog-queue --only=naver 10:18~12:14 완료 5/5
- [x] 조사파일 커밋·푸시 — af73147→19b786c, main==origin/main
- [x] 마무리: main==origin/main, 세션 워크트리 없음(today-work-start-7d10f8 은 다른 세션 것이라 건드리지 않음)

# 2026-09-29 블로그 배치 (티스토리 5 + 네이버 5) — 무인 /blog-daily

claim: `backend/out/blog/.daily-claim-2026-09-29`. 블로그차트 플랜 소진 · clean 트렌드 후보 2건 중 1건만 사용.
- frozen-dessert-boom-2026 제외: 한정선 찹쌀떡과 같은 기사군 + 네이버 발행 cvs-autumn-dessert-2026(편의점 가을 디저트, 한정선 찹쌀떡 포함)과 겹침
- hanjeongseon-mochi 는 네이버 cvs-autumn-dessert-2026 과 유사문서 피하려고 티스토리 배정
- dev-trending(GitHub 주간)은 09-25 발행 → 이번 주 skip
검색수요 게이트: NAVER_AD 자격증명 없음 → 못 돌림.

## 티스토리
- [x] hanjeongseon-mochi — 한정선 과일 찹쌀떡 신뢰분석(hangeut-trust) · verify 0 blocker/2 warn
- [x] windows-startup-apps — 윈도우 11 시작프로그램 끄기 · 0/2 (서브에이전트 셸 거부 → 코디네이터가 조립·검증)
- [x] chrome-cache-clear — 크롬 캐시·쿠키 삭제 · 0/1, 2라운드
- [x] excel-dropdown-list — 엑셀 드롭다운 목록(데이터 유효성 검사) · 0/0
- [x] windows-update-pause — 윈도우 11 업데이트 일시중지 · 0/2 (코디네이터가 조립·검증)

## 네이버
- [x] lotus-root-prep — 연근 손질법·갈변·보관 · 0/2 (코디네이터가 조립·검증, selfreview 2건 교정)
- [x] padding-wash-guide — 패딩 세탁법(집 세탁·건조) · 0/1
- [x] gotgam-making — 곶감 만들기 · 0/1
- [x] acorn-picking-fine — 도토리·밤 주워도 되나(국립공원 과태료) · 0/3, 출처 간 처벌 수위 상충은 본문에 병기
- [x] jujube-tea-recipe — 대추차 만들기·대추 말리기 · 0/2

## 마무리
- [x] 서브에이전트 보고 근거 확인(출처 실재·verified 해시) — 4개 에이전트는 셸 거부로 조립·검증 못 해 코디네이터가 실행
- [x] 순차 재조립 → queue --list 가 20편 모두 후보로 인식(해시 유지)
- [x] blog-queue --list: 티스토리 10(오늘 5+어제 5) · 네이버 10
- [x] 커밋 5eff66d (푸시 안 함)

## Found
- 09-28 대기열 3회 전부 실패: 티스토리 DKAPTCHA, 네이버 본문 붙여넣기 빈 값(63자) → 어제 10편 미발행 적체
- 서브에이전트 일부가 Bash/PowerShell 거부됨(같은 세션인데 에이전트별로 갈림)
