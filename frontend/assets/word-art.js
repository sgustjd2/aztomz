/* 한끗 — MZ 사전 미리보기 그림
   단어마다 AI(Codex)가 line-art-animation 화풍으로 그린 움직이는 SVG 가 assets/word-art/ 에 있다.
   그림이 아직 없는 새 단어는 아래의 간단한 선 아이콘을 제목·뜻 키워드로 골라 보여 준다. 모양은 dict.css */
(function (w) {
  'use strict';
  var H = w.H; if (!H) return;
  var c = function (x, y, r, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + (extra || '') + '/>'; };
  var p = function (d) { return '<path d="' + d + '"/>'; };
  var r = function (x, y, wd, h, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + wd + '" height="' + h + '" rx="' + (rx || 0) + '"/>'; };
  var dot = function (x, y, s) { return '<circle class="f" cx="' + x + '" cy="' + y + '" r="' + (s || 2.6) + '"/>'; };
  var t = function (x, y, size, s) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '">' + s + '</text>'; };
  var spark = function (x, y, s) { return p('M' + x + ' ' + (y - s) + 'q' + s * .15 + ' ' + s * .85 + ' ' + s + ' ' + s + 'q' + -s * .85 + ' ' + s * .15 + ' ' + -s + ' ' + s + 'q' + -s * .15 + ' ' + -s * .85 + ' ' + -s + ' ' + -s + 'q' + s * .85 + ' ' + -s * .15 + ' ' + s + ' ' + -s + 'z'); };
  var heart = function (x, y, s) { return p('M' + x + ' ' + (y + s) + 'C' + (x - s * 1.6) + ' ' + y + ' ' + (x - s * 1.1) + ' ' + (y - s * 1.2) + ' ' + x + ' ' + (y - s * .35) + 'C' + (x + s * 1.1) + ' ' + (y - s * 1.2) + ' ' + (x + s * 1.6) + ' ' + y + ' ' + x + ' ' + (y + s) + 'z'); };
  var face = function (x, y, R, mouth) { return c(x, y, R) + dot(x - R * .35, y - R * .15) + dot(x + R * .35, y - R * .15) + p(mouth || ('M' + (x - R * .35) + ' ' + (y + R * .3) + 'q' + R * .35 + ' ' + R * .32 + ' ' + R * .7 + ' 0')); };
  var bubble = function (x, y, wd, h) { return p('M' + (x + 10) + ' ' + y + 'h' + (wd - 20) + 'q10 0 10 10v' + (h - 20) + 'q0 10-10 10H' + (x + 26) + 'l-14 12 3-12h-5q-10 0-10-10V' + (y + 10) + 'q0-10 10-10z'); };

  var ART = {
    bubble: bubble(14, 20, 68, 44) + dot(34, 42, 3) + dot(48, 42, 3) + dot(62, 42, 3),
    exam: r(24, 14, 42, 62, 5) + p('M34 30h22M34 42h22M34 54h12') + p('M60 70l18-28 7 4-18 28-9 5z'),
    chartdown: p('M16 16v62h64') + p('M26 30l16 18 12-9 22 27') + p('M76 52v14H62') + c(70, 24, 10) + p('M70 19v5l4 3'),
    hourglass: p('M26 14h44M26 82h44M30 14q0 22 18 34q18-12 18-34M30 82q0-22 18-34q18 12 18 34') + p('M40 74q8-10 16 0') + dot(48, 58, 2),
    laugh: c(48, 48, 32) + p('M32 38l8 5-8 5M64 38l-8 5 8 5') + p('M30 58h36q-4 16-18 16T30 58z'),
    trophy: p('M32 16h32v22a16 16 0 0 1-32 0zM32 22H18q0 18 17 20M64 22h14q0 18-17 20M48 54v14M34 80h28l-4-12H38z') + p('M82 56l8 4M80 68l7 8'),
    hearts: heart(38, 46, 22) + heart(70, 28, 10) + heart(72, 66, 7),
    cart: p('M12 18h10l9 42h40l9-30H28') + c(38, 74, 6) + c(66, 74, 6) + heart(52, 42, 9),
    icedcup: p('M26 30h44l-6 52H32z') + p('M22 30h52M56 30l8-22h10') + r(36, 44, 12, 12, 3) + r(50, 56, 11, 11, 3) + p('M14 14v16M6 22h16M8 16l12 12M20 16L8 28'),
    book: p('M48 24q-14-10-34-6v52q20-4 34 6q14-10 34-6V18q-20-4-34 6zM48 24v52') + p('M22 32q9-2 18 2M22 44q9-2 18 2') + spark(66, 40, 9),
    suitcase: r(16, 30, 64, 48, 8) + p('M34 30V18h28v12M30 30v48M66 30v48') + c(48, 54, 9) + p('M48 45v-6M48 69v-6M39 54h-4M61 54h-4'),
    dumbbell: p('M26 48h44M18 32v32M28 26v44M68 26v44M78 32v32M10 42v12M86 42v12') + p('M40 18l8 8 14-14'),
    hook: p('M58 10v44q0 18-16 18T26 56l10 6') + c(58, 10, 4) + r(60, 54, 28, 22, 4) + p('M60 56l14 11 14-11') + p('M14 82h40'),
    code: r(10, 18, 76, 60, 8) + p('M10 32h76M30 46l-10 9 10 9M54 46l10 9-10 9M48 42L38 68') + spark(80, 70, 8),
    confetti: p('M20 78L38 36l24 24zM28 62l12 8M34 48l18 18') + p('M58 30q4-14 18-14M64 46q14-6 20 4M50 22l-4-12') + dot(72, 32) + dot(56, 14) + dot(82, 62),
    tear: c(48, 48, 32) + dot(36, 40) + dot(60, 40) + p('M36 62q12-8 24 0') + p('M30 48q-8 12 0 14t0-14zM66 48q-8 12 0 14t0-14z'),
    shine: c(48, 52, 26) + p('M36 46l4 6 4-6M52 46l4 6 4-6M38 64q10 9 20 0') + spark(18, 22, 10) + spark(78, 20, 12) + spark(84, 72, 7),
    donut: c(48, 48, 30) + c(48, 48, 10) + p('M20 42q8 12 16 2q8 12 18 0q8 12 22-2') + p('M30 28l4 3M58 24l2 5M70 34l-5 2M40 22v5'),
    robot: r(22, 30, 52, 42, 12) + c(36, 48, 5) + c(60, 48, 5) + p('M38 62h20M48 30V18M14 46v14M82 46v14M34 72v12M62 72v12') + c(48, 13, 5),
    cheer: p('M20 82l10-36 26 26zM30 46q14-4 26 26') + t(66, 34, 24, '!') + p('M52 28l-4-14M70 54l16-2M78 70l8 8') + dot(84, 24),
    brush: p('M60 12q18 6 12 22L56 62l-14-9 16-28q-6-8 2-13z') + p('M42 53q-14 2-14 16q0 10-14 13q22 8 34-4q8-8 8-16') + p('M12 24l12 12m0-12L12 36'),
    shirt: p('M32 16L12 30l9 16 11-5v41h32V41l11 5 9-16-20-14q-16 12-32 0z') + p('M40 52l16 16m0-16L40 68'),
    exit: r(46, 14, 34, 68, 4) + c(24, 22, 8) + p('M26 32l-8 20 16 10-4 20M18 52L8 66M26 38l16 8') + dot(54, 50)
  };

  // 단어별 그림이 있는 id (frontend/assets/word-art/<id>.svg, Codex + line-art-animation 화풍으로 생성)
  var DRAWN = {};
  ('46cm-bodywash-meme-2026-11 WORD-2026-0026 WORD-2026-0027 WORD-2026-0029 WORD-2026-0030 WORD-2026-0031 WORD-2026-0033 aboha age-reaction-challenge-2026 ai-exam-cheating-satire-meme ai-slop aiching-emoji-self-intro-meme ajaseu aljaldakkalsen aura-farming bad-acting-challenge-2026 bamti banana-54000-ai-meme brain-physical bukangi-shark chaek-eop-kwae chaepohagesseo-meme-2026 chagall-slang clanker clown-meme-2026 cutter-toe deluru destroy-company-challenge destroy-company-meme dokpamin dong-gyeol-geon-jo dopa-gaki-slang eoljuga flex-slang gam-da-sal gapbunssa geoje-yaho ggugguggu gidae-con glaze godsaeng gukrul gyeongdo haeinssa hallelyaru hyunbaek-core-slang inoegom-vesper jangwonyoung-slang jemmini jensen-huang-love-meme jisoo-laurel-meme-2026-11 jungjijeong jungkkeongma kikangseu kimpung korean-superintelligence-meme-2026-11 kwonroot-take-the-l lucky-vicky maknagwi-slang maxxing-word-of-year-2026 mbtichan mothae-solo nanrijabeth nerd-nam neujoh old-keukeu ounwan parasocial poor-upbringing-meme ppaenan-jiwongeum-meme promise-of-two-pm-meme samsung-stock-half-price-meme seusegwon simu-love simulove six-seven smishing-ai t1-ti-won-meme tmi-slang ton-mang-jinchang tradwife ttalk-meme-2026 vibe-coding waho-slang wax-pop-ball-texture-play-2026 yareu yareumdapda young-keukeu').split(' ').forEach(function (i) { DRAWN[i] = 1; });

  // 그림이 아직 없는 새 단어: 제목·뜻의 키워드로 고른다(앞에서부터 처음 맞는 것)
  var RULES = [[/AI|인공지능|챗봇|로봇/i, 'robot'], [/시험|수능|공부/, 'exam'], [/주식|투자|코인/, 'chartdown'], [/퇴근|퇴사|회사|직장/, 'exit'],
    [/챌린지|안무|춤/, 'cheer'], [/커피|음료|카페/, 'icedcup'], [/음식|먹|디저트|빵/, 'donut'], [/옷|패션|코디|스타일/, 'shirt'], [/화장|꾸미/, 'brush'],
    [/연애|사랑|설렘|좋아/, 'hearts'], [/게임|경기|야구|승/, 'trophy'], [/책|독서/, 'book'], [/운동|헬스/, 'dumbbell'], [/여행|휴가|호텔/, 'suitcase'],
    [/소비|구매|쇼핑/, 'cart'], [/웃|ㅋㅋ|유머/, 'laugh'], [/눈물|슬|억울|우울/, 'tear'], [/감탄|환호|신나/, 'confetti'], [/칭찬|예쁘|멋/, 'shine'],
    [/시간|하루/, 'hourglass'], [/문자|사기|해킹/, 'hook'], [/코드|개발/, 'code']];
  var TONES = ['pink', 'lilac', 'peach', 'butter', 'mint', 'sky'];

  H.wordArt = function (item) {
    if (Object.prototype.hasOwnProperty.call(DRAWN, item.id))   // 움직이는 SVG 그림(종이 바탕 고정)
      return '<span class="wa wa-pic tone-paper" aria-hidden="true"><img src="assets/word-art/' + encodeURIComponent(item.id) + '.svg" alt="" width="320" height="240" loading="lazy" decoding="async"></span>';
    var key = null, text = (item.title || '') + ' ' + (item.def || '');
    for (var i = 0; i < RULES.length && !key; i++) if (RULES[i][0].test(text)) key = RULES[i][1];
    key = key || 'bubble';
    var h = 0, id = String(item.id || '');
    for (var j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) >>> 0;
    return '<span class="wa tone-' + TONES[h % TONES.length] + '" aria-hidden="true"><svg viewBox="0 0 96 96" focusable="false">' + (ART[key] || ART.bubble) + '</svg></span>';
  };
})(window);
