# 한끗 일일 파이프라인 (중간 산출물)

Hermes 역할 스킬들이 시간차 cron으로 이어달리며 주고받는 중간 파일.

```
07:00 hangeut-collect (수집) → collect.json   분야별 화제 후보 3개씩(원자료, 분석 전)
07:20 hangeut-review  (검수) → review.json    각 후보를 PRD 9 룰셋으로 점수·근거·플래그
07:40 hangeut-curate  (정리) → curate.json    한끗 JSON 스키마 변환·중복제거 → 디스코드 초안 게시
(승인) hangeut-build  (개발) → data/trends.json 에 승인분 반영 + trends.js 재생성
(필요) hangeut-design (디자인) → 새 카드/카테고리 컴포넌트 제안
```

## 파일 스키마

**collect.json** (수집 산출)
```json
{ "date":"YYYY-MM-DD", "candidates":[
  { "tmpId":"slug", "cat":"디저트|음식|카페·핫플", "title":"이름",
    "where":"어디서 화제인지(X/커뮤니티/유튜브 등 + 양상)",
    "signals":"반복 문구·해시태그·노출 시점 등 관찰", "src":[["출처","url"]], "note":"1줄" } ] }
```

**review.json** (검수 산출) = collect 후보 + 평가
```json
{ "date":"YYYY-MM-DD", "reviewed":[
  { ...collect 필드..., "ad":정수0~100, "trust":정수0~100, "sat":"pos|neg|mix",
    "evidence":"점수 근거(어떤 신호로 그렇게 봤나)", "flag":"광고거품|저신뢰|정상" } ] }
```

**curate.json** (정리 산출) = 한끗 trends.json 스키마 + 분야 그룹
```json
{ "date":"YYYY-MM-DD", "items":[ { /* trends.json trends[] 한 항목과 동일 스키마 + analyzedAt */ } ] }
```

## 원칙
- 자동 게시 금지: curate 는 디스코드에 **검수용 초안**만 올린다. data/trends.json 반영은 사람 승인 후 hangeut-build 가.
- SNS 우선(X/커뮤니티/유튜브), 뉴스는 보조. 인스타/틱톡 직접 스크래핑 금지(ToS).
- 모든 점수는 추정치. 후기 신뢰도(믿을 만한가)와 만족도(좋다는가)는 별개 축.
