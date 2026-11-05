# 에이전트가 지킬 것

1. 슬라이드는 `deckTemplateHtml` 에서 시작한다. 처음부터 새로 짜지 않는다.
2. 슬라이드 하나는 16:9(1920x1080) `<section class="slide">` 구조를 그대로 유지한다.
3. 색과 글꼴은 `tokens` 와 템플릿의 CSS 변수만 쓴다. 임의의 색을 만들지 않는다.
4. 본문은 명조 세리프(Nanum Myeongjo / Noto Serif KR)로 쓴다. 산세리프 본문은 금지다.
5. 이모지, 둥근 모서리, glassmorphism(반투명 블러), 그라디언트 배경은 쓰지 않는다.
6. 결과물은 외부 파일 참조 없이 열리는 HTML 한 파일이다.
7. 웹폰트는 CDN(Google Fonts, Pretendard) 링크만 허용한다.
8. 제출 전에 아래 do-dont 의 자가 검증 체크리스트를 확인한다.

---

## usage-rules

# 사용 규칙

단테랩스 디자인 시스템 v2의 컬러·타이포 조합 규칙.

## 컬러 분배

| 비율 | 역할 | 토큰 |
| --- | --- | --- |
| **60%** | 바탕 | `cream` |
| **25%** | 제목·본문 | `navy`, `gray` |
| **10%** | 브랜드 면 | `khaki` |
| **5%** | 포인트 | 밝은 면 `blue`, 어두운 면 `yellow` |

포인트색은 한 화면에 한 가지만 쓴다.

## 포인트색 규칙

- 밝은 면(cream)의 포인트는 `--accent-brand`(blue). yellow는 cream 위에서 읽히지 않는다.
- 어두운 면(navy, khaki)의 포인트는 `--accent-on-dark`(yellow). blue는 navy 위에서 묻힌다.
- khaki는 포인트가 아니라 면이다. 한 단어 강조나 작은 글자에 쓰지 않는다.
- navy와 khaki는 서로 위에 올리지 않는다(대비 2.9:1). 각각 cream과만 짝을 짓는다.

## 접근성 규칙

1. **본문 크기의 링크는 `--text-link`(blue-strong).** `blue`는 큰 글자와 면 요소에 쓴다.
2. **모든 텍스트는 AA 이상.** navy 또는 gray on cream이 기본. khaki 위의 yellow는 큰 글자에만.
3. **색만으로 의미 전달 금지.** 상태 표시에는 아이콘·라벨 병기.
4. **포커스 링**은 `--color-blue` 2px outline.

## Typography Pairing 규칙

- 한 화면에 Serif는 **2종까지** (예: Nanum Myeongjo heading + Noto Serif KR body)
- Sans는 메타 역할 + typography.md 예외 목록에서만
- italic은 Playfair 인용·장식 한정 (Nanum Myeongjo italic 미사용)

## 어두운 면

v2는 어두운 면을 정식으로 둔다. `--bg-inverse`(navy)와 `--bg-board`(khaki) 위에서는 `--text-on-dark`, `--text-on-dark-muted`, `--accent-on-dark`를 쓴다. 자세한 짝은 [color.md](color.md).

## Do / Don't

### ✓ DO

```css
.article-body {
  color: var(--text-primary);
  background: var(--bg-canvas);
}
.cta-link {
  color: var(--text-link); /* = blue-strong */
}
.hero-word {
  color: var(--accent-brand); /* = blue. 어두운 면에서는 --accent-on-dark */
  font: var(--type-hero);
}
```

### ✗ DON'T

```css
/* 어두운 면에 밝은 면의 포인트색을 쓰지 않는다 */
.on-navy .point {
  color: var(--accent-brand);
  font-size: 16px;
}

/* 본문을 Pretendard sans로 치환 금지 */
.article-body {
  font-family: var(--font-sans);
}
```

---

## v2: Spacing · Radius · Shadow · Motion

자세한 사용 규칙은 각 토큰 문서 참조:

- [spacing.md](spacing.md) — 9스텝, 듀얼 네이밍
- [radius.md](radius.md) — 8px 상한, full은 pill 예외
- [shadow.md](shadow.md) — editorial emboss, ink-tint 전용
- [motion.md](motion.md) — 종이가 미끄러지는 움직임, 바운스는 로고에만, reduce-motion 자동 대응

### 핵심 페어링·금지

- shadow와 `border: 1px solid border.default` 동시 사용 금지 (헤어라인 인셋이 중복)
- shadow는 navy-tint 전용 — blue/yellow/khaki hex 그림자 금지
- radius 8px 초과 금지 — `--radius-full`은 pill·circle 명시 예외
- motion은 스프링·바운스 금지, `transition: all`은 hover/focus 한정

---

## do-dont

# Do / Don't — 단테랩스 디자인 시스템

## 절대 금지 (Hard NO)

| ❌ 금지 | ✅ 대체 |
|---|---|
| 이모지 (`🚀✨🎉`) | em-dash, 중점(`·`), 모노그램 태그 (`— DANTE`, `EDITORIAL`) |
| Glassmorphism / `backdrop-filter: blur()` | 단단한 `--bg-surface` |
| Mesh gradient / 무지개 그라디언트 | Solid cream/navy + 라디얼 비네팅만 |
| 사진 배경, 반복 패턴, 핸드드로잉 일러스트 | 순수 타이포그래피 컴포지션 |
| Sans-serif body | Noto Serif KR 본문 |
| Border radius > 8px | 2px (태그) / 4px (카드/버튼) / 8px(2026-05+) |
| 컬러 드롭섀도 후광 (`box-shadow: 0 0 60px purple`) | navy-tint `--shadow-*` 토큰 |
| 버튼 hover에 lift/grow | 6% 다크닝, 카드만 lift |
| Black overlay (`rgba(0,0,0,0.6)`) | `rgba(9,34,63,0.4)` navy-fade |
| yellow on cream / blue on navy | 밝은 면 blue, 어두운 면 yellow |
| navy on khaki / khaki on navy (2.9:1) | 각각 cream과만 짝 |
| rust·주황 포인트, 4px rust stripe (v1) | blue/yellow 포인트, stripe 없음 |
| 한글 워드마크 "AI단테랩스"·"단테랩스.AI", 로고를 글자로 다시 치기 | `assets/logo/*.svg` |
| `blue`를 본문 크기 링크에 | `--text-link` (blue-strong `#245c9e`) |
| 포인트색 두 가지 동시 사용, 점유 > 5% | 한 화면 포인트 하나, 5% 이하 |
| 느낌표 / 1인칭 복수 / "We're excited!" 톤 | 단호한 마침표, 비인격 ("단테랩스는…") |
| Italic 한국어 | Italic은 Playfair Display Latin에만 |
| 4px 이상 굵은 underline | 1px → hover 2px |
| Bouncy / spring animation (로고 제외) | `--ease-page`/`--ease-ink`/`--ease-fold`, 180–480ms |
| Infinite loop / 자동 재생 모션 | 진입 1회 fade + translate, 끝 |
| 이미지 placeholder (Lorem Picsum) | 텍스트 컴포지션 또는 단테랩스 자산 |
| khaki를 한 단어 강조·작은 글자에 | khaki는 넓은 면(칠판)으로만 |

## 자주 발생하는 실수

### 1. "산세리프가 더 깔끔해 보이는데?"
**아니다.** 본문에 Pretendard 깔끔함을 적용하면 단테랩스가 아니다. 단테랩스는 *출판사 무드*를 의도적으로 만든다. 본문 = Noto Serif KR.

### 2. "버튼에 그림자 살짝 띄워서…"
**금지.** 버튼은 누름. 카드만 뜬다. press 시 `translateY(1px)`로 *내려간다*.

### 3. "히어로 배경에 부드러운 사진 깔면 좋을 듯"
**금지.** 단테랩스 히어로는 100% 타이포그래피. 사진을 쓸 거면 단테랩스가 아닌 다른 시스템이다.

### 4. "이모지 하나 정도는…"
**금지.** 하나도 안 됨. Unicode 픽토그래프(▲ ● ◆) 정도까지만 허용.

### 5. "노랑이 예쁘니까 크림 위에도?"
**금지.** cream 위의 yellow는 탁한 황토색이 되고 읽히지 않는다. 밝은 면 포인트는 blue다.

### 6. "둥근 버튼이 친근해 보이는데"
**금지.** 4px max. 12px / 24px 같은 둥글둥글한 라디우스는 단테랩스가 아니다.

### 7. "다크 모드 만들면?"
v2는 어두운 면(`--bg-inverse` navy, `--bg-board` khaki)을 정식으로 둔다. 텍스트는 `--text-on-dark`, 포인트는 `--accent-on-dark`. 임의 반전은 금지.

### 8. "그라디언트 배경 하나 정도는?"
**라디얼 비네팅만 허용** (`bg-canvas → bg-subtle`). 직선/원형 그라디언트, 무지개 X.

## 항상 해야 할 것 (Do)

✅ 토큰을 의미 토큰으로 사용 (`--text-primary` > `--color-navy`)
✅ 한국어 + 영문 섞을 때 영문 무게를 한 단계 낮추거나 italic Playfair
✅ 4코너 edge marks (`SEASON · 02`, `EST. 2024`)로 editorial 무드 강화
✅ 1px ledger hairline을 hero 위/아래에
✅ 메타 라벨에는 hairline prefix (`― CHANNEL ·`)
✅ transition은 motion 토큰(`--ease-*`, `--duration-*`)으로
✅ Focus는 2px `--color-blue` outline + 1px offset
✅ 반응형: h1 56→48px, h2 40→32px, h3 28→24px (≤767px)
✅ accessibility: `color.md` 대비표 준수. khaki 위 yellow는 큰 글자만

## 자가 검증 체크리스트 (제출 전)

- [ ] 본문 폰트가 세리프(Noto Serif KR)인가?
- [ ] 이모지 0개?
- [ ] 모서리 ≤ 8px?
- [ ] 면에 맞는 포인트(밝은 면 blue / 어두운 면 yellow) 하나만 썼나?
- [ ] 금지 색 조합(yellow on cream, blue·khaki on navy, navy on khaki)이 없나?
- [ ] 로고는 바탕에 맞는 SVG인가? rust·한글 워드마크가 남아 있지 않나?
- [ ] hero에 ledger hairline?
- [ ] 4코너 edge marks?
- [ ] 버튼 hover에 lift 없음?
- [ ] backdrop-filter 안 씀?
- [ ] 사진/패턴/메시 배경 없음?
- [ ] 메타 라벨 UPPERCASE + ls 0.16em+?
- [ ] 한국어 마침표로 끝?
- [ ] 느낌표 0개?

---

## color

# 컬러

단테랩스 디자인 시스템 v2의 색. 2026-09-18에 확정한 브랜드 팔레트다. v1의 paper · ink · rust는 [v1 저장소](https://github.com/dandacompany/dantelabs-design-system)에 그대로 있다.

출발점은 사진 한 장(카키 소파, 네이비 코듀로이 재킷, 크림 베개)이고, 구조는 Barbour Beacon을 따랐다. 녹색과 네이비가 두 축을 맡고, 명도가 확 다른 색이 포인트를 맡는다.

## 원색 (Tier 1)

| 토큰 | 값 | 역할 |
| --- | --- | --- |
| `--color-cream` | `#f3eee2` | 바탕 |
| `--color-cream-strong` | `#faf7ee` | 카드 등 떠 있는 면 |
| `--color-cream-soft` | `#e9e3d3` | 가라앉은 면, 구분 띠 |
| `--color-navy` | `#09223f` | 제목, 로고, 어두운 면 |
| `--color-navy-soft` | `#1f3a5c` | 어두운 면 위의 카드 |
| `--color-gray` | `#3f4346` | 본문 |
| `--color-gray-muted` | `#5f666d` | 캡션, 메타 |
| `--color-khaki` | `#5d6c58` | 브랜드 면 (칠판) |
| `--color-khaki-light` | `#a9b5a2` | 어두운 면 위의 카키 |
| `--color-blue` | `#2b6cb8` | 포인트 — 밝은 면 |
| `--color-blue-strong` | `#245c9e` | 본문 크기의 링크 |
| `--color-blue-light` | `#9cc0e6` | 어두운 면 위의 블루 |
| `--color-yellow` | `#ecc95f` | 포인트 — 어두운 면. 분필 노랑 |
| `--color-danger` | `#a63d33` | 오류 상태 전용. 브랜드 포인트로 쓰지 않는다 |

## 어떤 색이 어떤 색 위에 올라가는가

색상값보다 이 표가 규칙이다. 숫자는 WCAG 명도 대비이고 `tests/color-contrast.test.ts`가 고정한다.

| 바탕 | 올릴 수 있는 색 | 올리면 안 되는 색 |
| --- | --- | --- |
| cream | navy 13.8, gray 8.6, gray-muted 5.0, blue-strong 5.9, khaki 4.8, blue 4.6 | yellow (3 미만, 탁한 황토색이 된다) |
| navy | cream 13.8, yellow 10.0, blue-light 8.5, khaki-light 7.5 | khaki 2.9, blue 3.0, gray 1.6 |
| khaki | cream 4.8, yellow 3.5 (큰 글자만) | navy 2.9, blue, gray 1.8 |

**포인트색은 면에 따라 갈린다.** 밝은 면에서는 `--accent-brand`(blue), 어두운 면에서는 `--accent-on-dark`(yellow). 반대로 쓰지 않는다.

## 시맨틱 (Tier 2)

이름은 v1과 같다. v1 CSS를 쓰던 곳은 파일만 바꿔 끼우면 된다. 굵게 표시한 것은 v2에서 추가했다.

| 토큰 | 가리키는 색 |
| --- | --- |
| `--bg-canvas` / `--bg-surface` / `--bg-subtle` | cream / cream-strong / cream-soft |
| **`--bg-inverse`** / **`--bg-board`** | navy / khaki |
| `--text-primary` / `--text-secondary` / `--text-muted` | navy / gray / gray-muted |
| `--text-link` / `--text-meta` | blue-strong / gray-muted |
| **`--text-on-dark`** / **`--text-on-dark-muted`** | cream / khaki-light |
| `--accent-brand` | blue |
| **`--accent-on-dark`** | yellow |
| `--accent-alt` / `--highlight` | khaki / yellow |
| `--state-info` / `-success` / `-warning` / `-danger` | blue-strong / khaki / yellow / danger |

## 어두운 면

v1에는 공식 다크 모드가 없었다. v2는 두 가지 어두운 면을 정식으로 둔다.

```css
.on-navy  { background: var(--bg-inverse); color: var(--text-on-dark); }
.on-board { background: var(--bg-board);   color: var(--text-on-dark); }
.on-navy .point, .on-board .point { color: var(--accent-on-dark); }
```

네이비는 브랜드 색이 살아 있는 어두운 면이고, 카키는 칠판이다. 강의 슬라이드와 섹션 배경에는 카키가 어울린다.

## 비율

cream 60 · navy 25 · khaki 10 · 포인트 5. 포인트색은 한 화면에 한 가지만 쓴다.

## 하지 않는 것

- 주황 계열(v1의 rust)을 포인트로 쓰지 않는다.
- khaki를 포인트 자리(한 단어 강조, 작은 글자)에 두지 않는다. 채도가 낮고 navy와 같은 어두운 띠에 있어 묻힌다. 넓은 면일 때 힘이 난다.
- navy와 gray를 같은 위계에 나란히 쓰지 않는다. navy는 제목, gray는 본문이다.
- `--color-danger`를 장식이나 강조에 쓰지 않는다.

---

## typography

# 타이포그래피 가이드

단테랩스 디자인 시스템 v1의 타이포 스케일 사용 가이드. 스펙 §3 참조.

## 2-Track 구조

| Track         | 대상                                           | 사용처                                                     |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| **Editorial** | YouTube 배너·썸네일, 모션그래픽, 아티클 히어로 | `hero`·`display`·`accent`·`sub`·`meta`                     |
| **UI**        | 홈페이지 UI/UX, 아티클 본문                    | `h1`–`h4`, `body-lg`·`body`·`body-sm`, `caption`, `button` |

## Font Stack

| 역할            | Primary          | CSS 변수                        |
| --------------- | ---------------- | ------------------------------- |
| Editorial 한글  | Nanum Myeongjo   | `--font-editorial-ko`           |
| Editorial Latin | Playfair Display | `--font-editorial-en`           |
| UI 헤딩·본문    | Noto Serif KR    | `--font-heading`, `--font-body` |
| 메타·버튼·캡션  | Pretendard       | `--font-sans`                   |
| 코드            | JetBrains Mono   | `--font-mono`                   |

## Editorial Scale

| 클래스          | 크기  | 행간 | Weight | 용도                                    |
| --------------- | ----- | ---- | ------ | --------------------------------------- |
| `.type-hero`    | 128px | 1.15 | 800    | 썸네일 결정적 키워드                    |
| `.type-display` | 96px  | 1.10 | 700    | 히어로 긴 문장                          |
| `.type-accent`  | 64px  | 1.20 | 700    | 부분 강조                               |
| `.type-sub`     | 32px  | 1.40 | 400    | 보조 설명, CTA URL                      |
| `.type-meta`    | 18px  | 1.50 | 500    | 서명·시즌 (UPPERCASE + tracking 0.16em) |

큰 스케일 필요 시: `transform: scale(1.5)` 또는 `clamp()` 사용. 토큰은 고정.

## UI Scale

| 클래스          | 크기 | 행간 | Weight | 폰트                               |
| --------------- | ---- | ---- | ------ | ---------------------------------- |
| `.type-h1`      | 56px | 1.20 | 700    | Serif                              |
| `.type-h2`      | 40px | 1.25 | 700    | Serif                              |
| `.type-h3`      | 28px | 1.30 | 600    | Serif                              |
| `.type-h4`      | 22px | 1.35 | 600    | Serif                              |
| `.type-body-lg` | 20px | 1.65 | 400    | Serif                              |
| `.type-body`    | 16px | 1.65 | 400    | Serif (**기본**)                   |
| `.type-body-sm` | 14px | 1.50 | 400    | Serif                              |
| `.type-caption` | 13px | 1.40 | 500    | Sans                               |
| `.type-button`  | 14px | 1.00 | 600    | Sans (UPPERCASE + tracking 0.04em) |

### 반응형 (< 768px)

- `.type-h1` 56 → 48
- `.type-h2` 40 → 32
- `.type-h3` 28 → 24
- `.type-body` 16 유지

### Sans 오버라이드 예외 목록

다음 경우에 한해 `.num-tabular` 또는 `--font-sans`로 교체 허용:

1. 데이터 테이블의 숫자 셀
2. 폼 입력 필드
3. 숫자 전용 영역 (통계, 차트 라벨, 금액, 카운터)

**본문 paragraph·헤딩에는 절대 적용하지 않는다.**

### `.num-tabular` modifier

`.num-tabular`는 `.type-*` 클래스와 조합해 사용하는 **modifier** 클래스입니다 (네이밍이 `type-` 접두어를 따르지 않는 이유). `font-family: var(--font-sans) + font-variant-numeric: tabular-nums`를 적용해 표·숫자 영역에서 자릿수가 맞는 고정폭 숫자를 제공합니다.

```html
<td class="type-body num-tabular">1,234,567</td>
```

### `font` 축약 토큰 주의사항

`.type-*` utility는 `font: var(--type-X)` CSS 축약 속성을 사용합니다. 이는 `font-style`, `font-variant`, `font-stretch`, `font-feature-settings`, `font-variation-settings`, `font-kerning` 등을 **초기값으로 리셋**합니다. OpenType 기능(`font-feature-settings: "ss01"` 등)이 필요한 경우 `.type-*` 적용 이후에 따로 선언해야 합니다.

## 사용 예

```html
<article>
  <h1 class="type-h1">AI를 오케스트레이트하라</h1>
  <p class="type-body-lg">질문하는 시대는 끝나가고 있다…</p>
  <p class="type-body">단테랩스는 AI 자동화와…</p>
  <time class="type-body-sm" style="color: var(--text-meta);"
    >2026년 4월 24일</time
  >
</article>
```

## 폰트 로딩

자세한 내용은 스펙 §3.4 및 `css/fonts.css` 참조.
