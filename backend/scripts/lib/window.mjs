// 발행용 크롬 창 위치 — 기본은 화면 가운데(캡차를 사람이 풀 수 있게). BLOG_OFFSCREEN=1 이면 화면 밖.
// ponytail: 1920x1080 기준 고정값(뷰포트 1440 폭) — 다른 해상도면 BLOG_WIN_POS="x,y" 로 덮어쓴다.
export const windowArgs = () =>
  process.env.BLOG_OFFSCREEN === '1' ? ['--window-position=-32000,-32000']
    : [`--window-position=${process.env.BLOG_WIN_POS || '230,0'}`];
