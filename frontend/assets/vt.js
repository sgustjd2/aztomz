/* 한끗 — 페이지 이동 애니메이션 방향 (View Transitions)
   <head> 에서 바로 읽어야 한다: 새 페이지의 pagereveal 은 첫 화면 직전에 한 번만 오므로
   body 끝의 app.js 에 두면 이미 지나간 뒤라 방향이 붙지 않는다.
   메뉴 순서(홈 → 광고 분석 → 트렌드 → 사전 → 상세)로 앞으로 가면 'forward', 되돌아가면 'back'.
   방향을 모르면(navigation.activation 미지원 등) CSS 기본 전환(살짝 올라오며 나타남)을 쓴다. */
(function (w) {
  'use strict';
  var rank = function (href) {
    try {
      var u = new URL(href, location.href), p = u.pathname;
      if (/\/trend(\.html|\/)/.test(p)) return 9;              // 상세(정적 trend/*.html·trend.html)
      var f = p.split('/').pop() || 'index.html';
      if (f === 'index.html') return 0;
      if (f === 'list.html') return u.searchParams.get('type') === 'ad' ? 1 : 2;
      if (f === 'pulse.html') return 2.5;
      if (f === 'dictionary.html') return 3;
    } catch (_) {}
    return null;
  };
  var type = function (from, to) {
    var a = rank(from), b = rank(to);
    return (a == null || b == null || a === b) ? null : (b > a ? 'forward' : 'back');
  };
  // 같은 사이트 안 이동으로 들어왔으면(=페이지 전환 애니메이션이 돈다) 표시해 둔다.
  // app.js 의 등장 애니메이션은 이때 첫 화면을 다시 움직이지 않는다(두 번 움직이면 어지럽다).
  try {
    var act0 = w.navigation && w.navigation.activation, nav = performance.getEntriesByType('navigation')[0];
    var from = act0 ? (act0.from && act0.from.url) : document.referrer;
    var kind = act0 ? act0.navigationType : (nav && nav.type);
    if ('onpagereveal' in w && from && new URL(from).origin === location.origin && kind !== 'reload'
        && !w.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.dataset.vt = '1';
  } catch (_) {}
  // 탭 숨김·빠른 연속 이동으로 전환이 취소되면 거부된 promise 가 남으므로 조용히 처리
  var quiet = function (vt) { ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { vt[k] && vt[k].catch(function () {}); }); };
  w.addEventListener('pageswap', function (e) {
    var vt = e.viewTransition; if (!vt) return; quiet(vt);
    var t = e.activation && e.activation.entry ? type(location.href, e.activation.entry.url) : null;
    if (t) vt.types.add(t);
  });
  w.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition; if (!vt) return; quiet(vt);
    var act = w.navigation && w.navigation.activation;
    var t = act && act.from ? type(act.from.url, act.entry.url) : null;
    if (t) vt.types.add(t);
  });
})(window);
