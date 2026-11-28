/* 한끗 — 재미 요소 모션그래픽 (직접 그린 SVG + CSS, 외부 라이브러리 없음)
   · 페이지 머리말 오른쪽의 장면: 홈=마스코트, 광고 분석=돋보기, 트렌드=쑥쑥 막대, 사전=말풍선, 펄스=심전도
   · 상세: 점수 숫자 올라가기 + 게이지 차오름, 판정 도장
   · 공유 버튼: 반짝이 터짐
   모두 장식(aria-hidden)이고 '동작 줄이기' 설정에선 움직이지 않는다(그림은 완성 상태로 보임). 모양·움직임은 fun.css. */
(function (w, d) {
  'use strict';
  var still = w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var star = function (x, y, s, cls) {
    return '<path class="fx-star ' + cls + '" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9z"/>';
  };
  var review = function (x, y, cls) {
    return '<g class="fx-card ' + cls + '"><rect class="fx-paper" x="' + x + '" y="' + y + '" width="132" height="40" rx="10"/>' +
      '<circle class="fx-dim" cx="' + (x + 18) + '" cy="' + (y + 20) + '" r="9"/>' +
      '<rect class="fx-dim" x="' + (x + 34) + '" y="' + (y + 11) + '" width="76" height="6" rx="3"/>' +
      '<rect class="fx-dim" x="' + (x + 34) + '" y="' + (y + 23) + '" width="54" height="6" rx="3"/></g>';
  };
  var badge = function (x, y, text, cls) {
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="fx-badge ' + cls + '"><rect x="-27" y="-12" width="54" height="24" rx="12"/><text y="4.5" text-anchor="middle">' + text + '</text></g></g>';
  };
  var bubble = function (x, y, wd, text, cls) {
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="fx-bubble ' + cls + '"><path d="M12 0h' + (wd - 24) + 'a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H26l-11 10 2-10h-5A12 12 0 0 1 0 24V12A12 12 0 0 1 12 0z"/><text x="' + wd / 2 + '" y="23" text-anchor="middle">' + text + '</text></g></g>';
  };

  var SCENES = {
    ad:
      review(18, 8, 'fx-c1') + review(44, 58, 'fx-c2') + review(18, 108, 'fx-c3') +
      badge(168, 22, '광고?', 'fx-warn fx-b1') + badge(196, 76, '진짜!', 'fx-ok fx-b2') + badge(168, 126, '음…', 'fx-mid fx-b3') +
      '<g class="fx-lens"><circle class="fx-glass" cx="0" cy="0" r="24"/><path class="fx-handle" d="M17 17 36 36"/></g>',
    trend:
      '<path class="fx-base" d="M26 138h188"/>' +
      [[40, 36], [80, 58], [120, 48], [160, 98]].map(function (b, i) {
        return '<rect class="fx-bar fx-bar' + (i + 1) + '" x="' + b[0] + '" y="' + (138 - b[1]) + '" width="26" height="' + b[1] + '" rx="7"/>';
      }).join('') +
      '<path class="fx-line" pathLength="1" d="M42 88 90 64l40 10 52-52"/><path class="fx-tip" d="M166 20h18v18"/>' +
      star(210, 28, 1.2, 'fx-s1') + star(30, 44, .9, 'fx-s2') + star(138, 22, .7, 'fx-s3'),
    dict:
      bubble(14, 18, 86, '갓생', 'fx-u1') + bubble(124, 40, 96, 'ㅋㅋㅋ', 'fx-u2') + bubble(42, 92, 104, '이게 뭐야', 'fx-u3') +
      star(116, 20, .9, 'fx-s1') + star(196, 118, 1.1, 'fx-s2'),
    pulse:
      '<path class="fx-base" d="M14 84h212"/>' +
      '<path class="fx-beat" pathLength="1" d="M14 84h46l12-26 18 56 18-82 18 66 12-14h30l10-18 12 18h36"/>' +
      '<circle class="fx-dot" cx="226" cy="84" r="6"/>' + star(40, 36, .9, 'fx-s1') + star(190, 40, 1.1, 'fx-s2'),
    home:
      '<circle class="fx-ring" cx="120" cy="80" r="52"/><circle class="fx-ring fx-ring2" cx="120" cy="80" r="52"/>' +
      '<image class="fx-mascot" href="assets/mascot.png" x="76" y="36" width="88" height="88"/>' +
      badge(44, 40, '#맛집', 'fx-mid fx-o1') + badge(198, 48, '광고?', 'fx-warn fx-o2') + badge(182, 132, '#유행', 'fx-ok fx-o3') +
      star(56, 124, 1, 'fx-s1') + star(178, 14, .8, 'fx-s2')
  };

  function hero() {
    var page = location.pathname.split('/').pop() || 'index.html';
    var key = page === 'index.html' ? 'home' : page === 'dictionary.html' ? 'dict' : page === 'pulse.html' ? 'pulse'
      : page === 'list.html' ? (new URLSearchParams(location.search).get('type') === 'ad' ? 'ad' : 'trend') : null;
    var lead = key && d.querySelector('main .lead');
    if (!lead || lead.querySelector('.fx-hero')) return;
    lead.classList.add('has-fx');
    lead.insertAdjacentHTML('beforeend',
      '<svg class="fx-hero fx-' + key + '" viewBox="0 0 240 160" aria-hidden="true" focusable="false">' + SCENES[key] + '</svg>');
  }

  // 점수: 화면에 들어오면 0에서 올라가고 게이지가 차오른다
  function scores() {
    if (still || !('IntersectionObserver' in w)) return;
    d.querySelectorAll('.detail-page .score').forEach(function (box) {
      var node = box.querySelector('.s-num') && box.querySelector('.s-num').firstChild;
      var end = node && parseInt(node.nodeValue, 10);
      if (!(end >= 0)) return;
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        box.classList.add('fx-run');
        var t0 = performance.now(), dur = 1100, done = false;
        var finish = function () { done = true; node.nodeValue = end; };
        var step = function (t) {
          if (done) return;
          var p = Math.min(1, (t - t0) / dur);
          node.nodeValue = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step); else finish();
        };
        node.nodeValue = 0;
        requestAnimationFrame(step);
        setTimeout(finish, dur + 200);   // 백그라운드 탭에선 rAF 가 멈춘다 — 점수는 반드시 제값으로
      }, { threshold: .4 });
      io.observe(box);
    });
  }

  // 판정 도장: 대표 이미지 위에 쾅 (판정 문구는 제목 옆에 이미 글로 있으므로 장식)
  function stamp() {
    var cover = d.querySelector('.detail-page .detail-header > .cover');
    var label = d.querySelector('.detail-page .detail-meta .label');
    if (!cover || !label || !d.querySelector('.detail-page .scores') || cover.querySelector('.fx-stamp')) return;
    var cls = label.classList.contains('warn') ? 'warn' : label.classList.contains('good') ? 'good' : 'mid';
    var text = cls === 'warn' ? '주의!' : cls === 'good' ? '믿을만' : '보류';
    cover.insertAdjacentHTML('beforeend', '<span class="fx-stamp ' + cls + '" aria-hidden="true">' + text + '</span>');
  }

  // 공유 버튼: 반짝이
  function burst(e) {
    var btn = e.target.closest && e.target.closest('#shareBtn');
    if (!btn || still) return;
    var r = btn.getBoundingClientRect(), box = d.createElement('div');
    box.className = 'fx-burst'; box.setAttribute('aria-hidden', 'true');
    box.style.left = r.left + r.width / 2 + 'px'; box.style.top = r.top + r.height / 2 + 'px';
    for (var i = 0; i < 14; i++) {
      var s = d.createElement('i'), a = Math.PI * 2 * i / 14, len = 46 + (i % 3) * 18;
      s.style.setProperty('--x', Math.cos(a) * len + 'px'); s.style.setProperty('--y', Math.sin(a) * len + 'px');
      box.appendChild(s);
    }
    d.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 900);
  }

  var start = function () { hero(); stamp(); scores(); };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
  d.addEventListener('click', burst);
})(window, document);
