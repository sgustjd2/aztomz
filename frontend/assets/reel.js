/* 한끗 — 홈 모션그래픽 (12초, 4장면)
   영상 파일이 아니라 코드로 그린 타임라인이다(Web Animations API). 그래서 가볍고 선명하며, 점수 장면은 최신 분석 데이터를 쓴다.
   · 모든 움직임을 같은 12초 타임라인에 올려 재생·정지·탐색이 한 번에 된다.
   · 화면 밖에서는 멈추고, '동작 줄이기'면 자동 재생하지 않고 마지막 장면을 보여 준다(재생 버튼은 있음).
   장면 그림은 aria-hidden, 내용은 설명 문장으로 전달한다. 모양은 reel.css. */
(function (w, d) {
  'use strict';
  var H = w.H, root = d.getElementById('reel');
  if (!H || !root || !root.animate) return;
  var list = H.TRENDS.filter(function (t) { return t.type === '신뢰분석'; })
    .sort(function (a, b) { return (b.analyzedAt || '').localeCompare(a.analyzedAt || ''); });
  var item = list[0];
  if (!item) return;
  var T = 12, still = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v) { return Math.max(0, Math.min(100, Number(v) || 0)); };
  var ad = clamp(item.ad), trust = clamp(item.trust), esc = H.esc;
  var meter = function (cls, label) {
    return '<div class="rl-meter ' + cls + '"><span class="rl-mlabel">' + label + '</span><b class="rl-num">0</b><span class="rl-track"><i></i></span></div>';
  };

  root.innerHTML =
    '<p class="sr-only">한끗 소개 모션그래픽: 후기 문장에서 대가성 문구를 찾고, 광고 의심도와 후기 신뢰도를 따로 점수로 보여 줍니다. 최근 분석 ' +
      esc(item.title) + ': 광고 의심 ' + ad + ', 후기 신뢰 ' + trust + ' (추정치).</p>' +
    '<div class="rl-stage" aria-hidden="true">' +
      '<div class="rl-scene rl-s1">' +
        '<div class="rl-line"><span class="rl-w1">이 맛집,</span></div>' +
        '<div class="rl-line"><span class="rl-hit"><i></i><span class="rl-w2">광고야?</span></span></div>' +
        ['#내돈내산', '#협찬', '#체험단', '#웨이팅', '#또갈집'].map(function (c, i) { return '<span class="rl-chip rl-chip' + (i + 1) + '">' + c + '</span>'; }).join('') +
      '</div>' +
      '<div class="rl-scene rl-s2">' +
        '<h3 class="rl-h">문장부터<br>훑어요</h3>' +
        '<div class="rl-paper"><span class="rl-tag">예시 후기</span>' +
          '<p class="rl-p">오늘 다녀온 카페 후기예요</p>' +
          '<p class="rl-p rl-key"><i></i><span>업체에서 <b>제공받아</b> 작성했어요</span></p>' +
          '<p class="rl-p">분위기가 정말 좋았어요</p>' +
          '<span class="rl-lens"></span></div>' +
        '<span class="rl-found">대가성 문구 발견</span>' +
      '</div>' +
      '<div class="rl-scene rl-s3">' +
        '<h3 class="rl-h">점수 두 개로<br>따로 재요</h3>' +
        '<div class="rl-board"><span class="rl-tag">최근 분석</span><strong class="rl-title">' + esc(item.title) + '</strong>' +
          meter('rl-ad', '광고 의심') + meter('rl-trust', '후기 신뢰') +
          '<span class="rl-foot">추정치 · 분석 ' + esc(H.fmtISO(item.analyzedAt)) + '</span></div>' +
      '</div>' +
      '<div class="rl-scene rl-s4">' +
        '<img class="rl-mascot" src="assets/mascot.png" alt="" width="200" height="200">' +
        '<div class="rl-end"><div class="rl-line"><span class="rl-logo">한끗</span></div>' +
          '<div class="rl-line"><span class="rl-slogan">광고일까, 진짜일까</span></div>' +
          '<span class="rl-count">광고 분석 ' + list.length + '건</span></div>' +
        [1, 2, 3, 4, 5, 6].map(function (n) { return '<i class="rl-star rl-star' + n + '"></i>'; }).join('') +
      '</div>' +
      '<div class="rl-wipe"><i></i><i></i></div>' +
    '</div>' +
    '<div class="rl-bar">' +
      '<button type="button" class="rl-play" aria-label="모션 재생"></button>' +
      '<input type="range" class="rl-seek" min="0" max="' + T * 1000 + '" step="50" value="0" aria-label="모션 재생 위치">' +
      '<a class="rl-cta" href="list.html?type=ad">광고 분석 보기</a>' +
    '</div>';
  root.hidden = false;

  var q = function (s) { return root.querySelector(s); }, anims = [];
  // frames: [초, 속성, (다음 프레임까지의) easing]
  function tl(sel, frames) {
    root.querySelectorAll(sel).forEach(function (el) {
      var kf = frames.map(function (f) { return Object.assign({ offset: f[0] / T, easing: f[2] || 'linear' }, f[1]); });
      if (kf[0].offset > 0) kf.unshift(Object.assign({}, kf[0], { offset: 0 }));
      if (kf[kf.length - 1].offset < 1) kf.push(Object.assign({}, kf[kf.length - 1], { offset: 1 }));
      var a = el.animate(kf, { duration: T * 1000, iterations: Infinity, fill: 'both' });
      a.pause(); anims.push(a);
    });
  }
  var OUT = 'cubic-bezier(.16,1,.3,1)', POP = 'cubic-bezier(.3,1.6,.5,1)';
  var rise = function (sel, at, dur) { tl(sel, [[at, { translate: '0 115%' }, OUT], [at + (dur || .5), { translate: '0 0' }]]); };
  var pop = function (sel, at) { tl(sel, [[at, { opacity: 0, scale: '0' }, POP], [at + .45, { opacity: 1, scale: '1' }]]); };
  var scene = function (sel, from, to) {
    var f = [];
    if (from > 0) f.push([0, { visibility: 'hidden' }], [from - .001, { visibility: 'hidden' }]);
    f.push([from, { visibility: 'visible' }]);
    if (to < T) f.push([to - .001, { visibility: 'visible' }], [to, { visibility: 'hidden' }]);
    tl(sel, f);
  };
  scene('.rl-s1', 0, 2.95); scene('.rl-s2', 2.95, 5.95); scene('.rl-s3', 5.95, 9.25); scene('.rl-s4', 9.25, T);

  // 장면 전환: 비스듬한 두 장의 판이 지나가며 가린 순간에 장면이 바뀐다
  [['.rl-wipe i:first-child', 0], ['.rl-wipe i:last-child', .07]].forEach(function (p) {
    var l = p[1], f = [[0, { translate: '0 0' }], [.02 + l, { translate: '0 0' }, 'cubic-bezier(.7,0,.3,1)'], [.4 + l, { translate: '115% 0' }, 'steps(1, end)']];   // 지나간 뒤엔 다음 전환까지 화면 밖에서 대기
    [2.95, 5.95, 9.25].forEach(function (c) {
      f.push([c - .4 + l, { translate: '-115% 0' }, 'cubic-bezier(.7,0,.3,1)'], [c - .05 + l, { translate: '0 0' }],
        [c + .02 + l, { translate: '0 0' }, 'cubic-bezier(.7,0,.3,1)'], [c + .4 + l, { translate: '115% 0' }, 'steps(1, end)']);
    });
    f.push([11.55 + l, { translate: '-115% 0' }, 'cubic-bezier(.7,0,.3,1)'], [11.9 + l, { translate: '0 0' }]);
    tl(p[0], f);
  });

  // 1) 질문
  rise('.rl-w1', .25);
  tl('.rl-hit i', [[.8, { scale: '0 1' }, OUT], [1.15, { scale: '1 1' }]]);
  rise('.rl-w2', .95);
  tl('.rl-hit', [[1.9, { rotate: '0deg' }], [2.05, { rotate: '-4deg' }], [2.2, { rotate: '3deg' }], [2.35, { rotate: '-1.5deg' }], [2.5, { rotate: '0deg' }]]);
  [1, 2, 3, 4, 5].forEach(function (n) {
    var at = .35 + n * .22;
    tl('.rl-chip' + n, [[at, { opacity: 0, translate: '60cqw 0' }, OUT], [at + .55, { opacity: 1, translate: '0 0' }], [2.9, { opacity: 1, translate: '0 ' + (n % 2 ? '-2cqw' : '2cqw') }]]);
  });
  // 2) 문장 훑기
  tl('.rl-s2 .rl-h', [[3.0, { translate: '-8cqw 0', opacity: 0 }, OUT], [3.5, { translate: '0 0', opacity: 1 }]]);
  tl('.rl-paper', [[3.05, { translate: '0 40%', rotate: '8deg' }, OUT], [3.65, { translate: '0 0', rotate: '-2deg' }]]);
  tl('.rl-lens', [[3.5, { left: '-6%', top: '14%' }, 'ease-in-out'], [4.0, { left: '70%', top: '24%' }, 'ease-in-out'], [4.4, { left: '2%', top: '48%' }, 'ease-in-out'], [5.2, { left: '62%', top: '48%' }]]);
  tl('.rl-key i', [[4.4, { scale: '0 1' }, 'ease-in-out'], [5.1, { scale: '1 1' }]]);
  tl('.rl-found', [[5.05, { opacity: 0, scale: '2.4', rotate: '10deg' }, POP], [5.45, { opacity: 1, scale: '1', rotate: '-6deg' }]]);
  // 3) 점수 (숫자는 아래 draw 에서)
  tl('.rl-s3 .rl-h', [[6.0, { translate: '-8cqw 0', opacity: 0 }, OUT], [6.5, { translate: '0 0', opacity: 1 }]]);
  tl('.rl-board', [[6.05, { translate: '50% 0', opacity: 0 }, OUT], [6.6, { translate: '0 0', opacity: 1 }]]);
  tl('.rl-ad .rl-track i', [[6.7, { scale: '0 1' }, OUT], [7.8, { scale: ad / 100 + ' 1' }]]);
  tl('.rl-trust .rl-track i', [[7.2, { scale: '0 1' }, OUT], [8.3, { scale: trust / 100 + ' 1' }]]);
  // 4) 마무리
  tl('.rl-mascot', [[9.3, { translate: '0 -120%', scale: '1 1' }, 'cubic-bezier(.5,0,1,1)'], [9.75, { translate: '0 0', scale: '1.18 .82' }, OUT],
    [9.95, { translate: '0 -18%', scale: '.94 1.08' }, 'ease-in'], [10.2, { translate: '0 0', scale: '1.06 .95' }, OUT], [10.4, { translate: '0 0', scale: '1 1' }]]);
  rise('.rl-logo', 9.85); rise('.rl-slogan', 10.15);
  pop('.rl-count', 10.5);
  [1, 2, 3, 4, 5, 6].forEach(function (n) {
    var at = 9.75 + n * .05;
    tl('.rl-star' + n, [[at, { opacity: 0, scale: '0', rotate: '0deg' }, OUT], [at + .5, { opacity: 1, scale: '1.2', rotate: '120deg' }], [11.5, { opacity: 1, scale: '.8', rotate: '200deg' }]]);
  });

  // ---------- 재생 제어 ----------
  var play = q('.rl-play'), seek = q('.rl-seek'), nums = root.querySelectorAll('.rl-num');
  var playing = false, wanted = !still, visible = false, raf = 0;
  var now = function () { return (Number(anims[0].currentTime) || 0) % (T * 1000); };
  var ramp = function (s, a, b) { var p = Math.max(0, Math.min(1, (s - a) / (b - a))); return 1 - Math.pow(1 - p, 3); };
  function draw() {
    var ms = now(), s = ms / 1000;
    nums[0].textContent = Math.round(ad * ramp(s, 6.7, 7.8));
    nums[1].textContent = Math.round(trust * ramp(s, 7.2, 8.3));
    seek.value = Math.round(ms);
    seek.style.setProperty('--p', ms / (T * 10) + '%');
  }
  function loop() { draw(); if (playing) raf = requestAnimationFrame(loop); }
  function seekTo(ms) { anims.forEach(function (a) { a.currentTime = ms; }); draw(); }
  function sync() {
    var on = wanted && visible;
    if (on !== playing) {
      playing = on; cancelAnimationFrame(raf);
      var at = Number(anims[0].currentTime) || 0;
      anims.forEach(function (a) { a.currentTime = at; if (on) a.play(); else a.pause(); });
      if (on) loop(); else draw();
    }
    play.classList.toggle('is-playing', wanted);
    play.setAttribute('aria-label', wanted ? '모션 일시정지' : '모션 재생');
  }
  play.onclick = function () { wanted = !wanted; sync(); };
  q('.rl-stage').onclick = play.onclick;
  seek.oninput = function () {
    var ms = Math.min(Number(seek.value), T * 1000 - 1);   // sync() 가 막대 값을 다시 쓰므로 먼저 읽는다
    wanted = false; sync(); seekTo(ms);
  };
  if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { visible = es[0].intersectionRatio >= .35; sync(); }, { threshold: [0, .35] }).observe(q('.rl-stage'));
  else visible = true;
  seekTo(still ? 11000 : 0);
  sync();
})(window, document);
