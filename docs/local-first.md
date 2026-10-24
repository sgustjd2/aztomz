# 한끗 로컬 퍼스트 운영 전략

## 방향
한끗은 당분간 **정적 멀티페이지 + 정적 데이터 갱신 + 공개 콘텐츠 읽기/공유**로 운영한다. 서버 계정, 실시간 DB, 백엔드 API 없이 `frontend/`만 배포한다.

## 배포와 데이터
- Vercel 배포 대상은 `frontend/`뿐이다.
- canonical 트렌드 원본은 `backend/data/trends.json`이다.
- 브라우저가 읽는 `frontend/data/trends.js`는 `backend/scripts/refresh.mjs`가 생성한다.
- `frontend/data/trends.js`는 직접 편집하지 않는다.
- 데이터 수정 후 배포에 반영하려면 검증 후 `node backend/scripts/refresh.mjs`로 생성물을 갱신한다.

## 화면 설정과 제거된 기능
로그인 기능은 도입하지 않는다. 인증·계정·개인 저장·방문자 후기·보관함·개인 펄스 아이디어 저장 구현을 제거했다. 펄스의 공개 검색과 아이디어 펼침, 상세 공유는 유지한다.
`frontend/me.html`·`frontend/login.html`·`frontend/signup.html`은 삭제했으며 Vercel에서 기존 주소를 홈으로 영구 리다이렉트한다.

| 기능 | 저장 위치 | 동기화 |
|---|---|---|
| 테마 설정 | `localStorage`의 `hangeut.theme` | 없음 |
| 메뉴 접기 설정 | `localStorage`의 `hangeut.navCollapsed` | 없음 |

현재 코드는 과거 개인 저장 데이터를 읽거나 갱신하지 않으며 삭제 명령도 실행하지 않는다. 화면 설정은 다른 브라우저나 기기와 동기화되지 않는다.

## H.* 계약
`frontend/assets/app.js`의 `H.*`는 공개 정적 데이터 조회·렌더링·공유·화면 설정을 위한 헬퍼다. 인증 호환 API, `safeNext`, 계정/세션 키, 개인 저장소 함수와 기능 플래그는 제거했다.

## 신선도
- `analyzedAt`은 실제 재분석한 항목만 바꾼다.
- `generatedAt`은 정적 데이터 파일을 생성한 날짜다.
- 오래된 분석은 "갱신 필요"로 보여준다.
- 날짜만 오늘로 바꿔 최신처럼 보이게 하지 않는다.

## 현재 보류한 것
Supabase 같은 외부 백엔드 전환은 확정 계획에서 제외한다. 로그인·개인 저장·방문자 후기 기능은 현재 서비스 범위에 포함하지 않는다. 향후 범위 변경은 별도 기획으로 검토한다.
