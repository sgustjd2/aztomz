/* 한끗 — MZ 사전 미리보기 그림 (AI가 직접 그린 선 그림, 96×96)
   단어마다 뜻에 맞는 그림(MAP)을 고른다. 새로 수집된 단어는 제목·뜻의 키워드(RULES)로 고르고, 없으면 말풍선.
   외부 이미지·생성 서비스를 쓰지 않아 용량이 작고 라이트·다크 모두 선명하다. 바탕색·선색은 dict.css 의 .tone-* */
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
    banana: p('M24 26q4 40 46 38q8 0 10-6q-28 0-38-32l-6-10-8 3z') + p('M30 24q8 34 46 36') + t(72, 30, 20, '?'),
    bag: r(22, 32, 52, 46, 6) + p('M35 40V28a13 13 0 0 1 26 0v12') + spark(76, 22, 8),
    sticks: p('M30 76L52 20M46 78l18-58M62 78l12-50') + p('M52 20l-3 9M64 20l-3 10M74 28l-3 9') + heart(24, 28, 9),
    wink: c(48, 48, 30) + p('M34 42q4-5 10 0') + dot(60, 40, 3.2) + p('M34 56q14 14 28 0') + spark(80, 18, 9),
    glasses: c(30, 52, 14) + c(66, 52, 14) + p('M44 50q4-5 8 0M16 48l-6-8M80 48l6-8') + p('M32 26l16-8 16 8-16 8z') + p('M40 30v8q8 5 16 0v-8'),
    masks: p('M14 24h34v18q0 22-17 28Q14 64 14 42z') + dot(24, 38) + dot(38, 38) + p('M23 54q8-8 16 0') + p('M52 34h30v16q0 20-15 26q-9-3-12-12') + dot(61, 48) + dot(73, 48) + p('M60 60q7 7 14 0'),
    popball: c(44, 52, 24) + c(44, 52, 12) + p('M70 30l10-8M74 46h12M66 18l3-10') + dot(34, 40, 3),
    rocket: p('M48 12q20 14 18 40l-8 12H38l-8-12q-2-26 18-40z') + c(48, 36, 7) + p('M30 52l-12 14 14 2M66 52l12 14-14 2M42 70l-3 14M54 70l3 14M48 70v16'),
    dice: r(14, 28, 32, 32, 7) + t(30, 52, 24, '6') + r(50, 40, 32, 32, 7) + t(66, 64, 24, '7') + p('M54 22q8-10 18-4'),
    dream: p('M28 62q-16 0-14-14q2-10 13-9q3-18 23-16q15 1 18 15q14 0 14 12q0 12-15 12z') + c(30, 74, 4) + c(20, 84, 2.5) + spark(50, 44, 9),
    slop: r(18, 20, 60, 44, 6) + p('M26 64q0 16 7 16t7-12q2 18 9 18t8-22q1 10 7 10t7-10') + p('M36 34l8 8m0-8l-8 8M56 34l8 8m0-8l-8 8'),
    megaphone: p('M18 40v18h14l36 18V20L32 40z') + p('M26 58l5 20h10l-5-18M76 36q8 12 0 26M84 28q14 20 0 42'),
    brain: p('M44 22q-12-8-20 4q-14 2-10 18q-8 14 8 20q2 16 22 10z') + p('M52 22q12-8 20 4q14 2 10 18q8 14-8 20q-2 16-22 10z') + p('M48 20v56M30 38q10 0 10 10M66 56q-10 0-10-10') + spark(84, 18, 8),
    bottle: r(32, 36, 32, 46, 9) + p('M40 36V24h16v12M40 24l-3-10h22M38 56h20M38 64h14') + spark(76, 32, 9),
    clockdown: c(44, 46, 28) + p('M44 28v18l12 8') + p('M72 62l10 18M82 80l-12-2M82 80l3-12'),
    hourglass: p('M26 14h44M26 82h44M30 14q0 22 18 34q18-12 18-34M30 82q0-22 18-34q18 12 18 34') + p('M40 74q8-10 16 0') + dot(48, 58, 2),
    unplug: r(28, 16, 30, 54, 7) + p('M38 62h10') + p('M64 40q22-6 20-24q-20 0-20 24zM64 40l-6 10') + p('M16 82q16-12 34 0'),
    laugh: c(48, 48, 32) + p('M32 38l8 5-8 5M64 38l-8 5 8 5') + p('M30 58h36q-4 16-18 16T30 58z'),
    sale: p('M18 18h30l32 32-30 30-32-32z') + c(32, 32, 5) + p('M42 62l22-22') + c(46, 46, 3) + c(60, 56, 3),
    door: r(22, 14, 40, 68, 4) + dot(52, 50, 3) + t(70, 36, 18, 'z') + t(80, 22, 13, 'z') + p('M14 82h60'),
    trophy: p('M32 16h32v22a16 16 0 0 1-32 0zM32 22H18q0 18 17 20M64 22h14q0 18-17 20M48 54v14M34 80h28l-4-12H38z') + p('M82 56l8 4M80 68l7 8'),
    hearts: heart(38, 46, 22) + heart(70, 28, 10) + heart(72, 66, 7),
    spark: spark(44, 46, 28) + spark(74, 22, 11) + spark(72, 72, 8),
    balloon: p('M48 12q24 2 24 26q-2 22-24 28q-22-6-24-28Q24 14 48 12z') + p('M42 66l6 6 6-6M48 72q-10 8 0 16') + dot(40, 36) + dot(56, 36) + p('M40 50q8-7 16 0'),
    braingym: p('M34 14q-14 0-14 12q-8 6 0 16q4 10 18 6V16') + p('M42 14q14 0 14 12q8 6 0 16q-4 10-18 6') + p('M26 70h44M20 60v20M28 56v28M68 56v28M76 60v20'),
    clover: c(36, 32, 13) + c(60, 32, 13) + c(36, 54, 13) + c(60, 54, 13) + p('M52 62q4 18 18 22') + spark(80, 20, 8),
    ages: c(22, 52, 8) + p('M12 80q0-18 10-18t10 18') + c(48, 40, 10) + p('M34 80q0-26 14-26t14 26') + c(76, 28, 9) + p('M64 80q0-38 12-38t12 38'),
    fingergun: p('M18 52h42q8 0 8-6t-8-6H42l-6-10q-8-4-9 4v6q-11 2-11 14v6q2 16 18 16h12q10 0 10-8H44q-6 0-6-6') + p('M76 38l10-5M78 48h12M76 58l10 5'),
    click: p('M36 30l36 24-17 3 10 19-9 5-10-20-12 13z') + p('M30 16v-9M16 24l-7-6M46 18l6-8M14 40H5'),
    candy: c(40, 38, 24) + p('M40 22q16 2 14 18q-3 12-15 10q-9-3-6-12q4-7 11-4M57 55l24 28') + spark(78, 22, 8),
    cart: p('M12 18h10l9 42h40l9-30H28') + c(38, 74, 6) + c(66, 74, 6) + heart(52, 42, 9),
    checklist: r(20, 16, 52, 66, 6) + p('M38 16v-6h16v6') + p('M30 34l5 5 9-10M30 54l5 5 9-10M52 36h12M52 56h12M30 70h34'),
    flag: p('M28 84V14M28 18q14-8 28 0t24 0v30q-10 8-24 0t-28 0') + p('M18 84h22') + spark(76, 70, 9),
    sunrise: p('M18 66h60M28 66a20 20 0 0 1 40 0') + p('M48 34V22M24 42l-8-8M72 42l8-8M12 56H4M92 56h-8M28 78h40'),
    icedcup: p('M26 30h44l-6 52H32z') + p('M22 30h52M56 30l8-22h10') + r(36, 44, 12, 12, 3) + r(50, 56, 11, 11, 3) + p('M14 14v16M6 22h16M8 16l12 12M20 16L8 28'),
    book: p('M48 24q-14-10-34-6v52q20-4 34 6q14-10 34-6V18q-20-4-34 6zM48 24v52') + p('M22 32q9-2 18 2M22 44q9-2 18 2') + spark(66, 40, 9),
    teacup: p('M18 40h50v16q0 22-25 22T18 56zM68 46h6q10 0 10 9t-18 11') + p('M32 28q-6-6 0-12M46 28q-6-6 0-12M12 84h66'),
    suitcase: r(16, 30, 64, 48, 8) + p('M34 30V18h28v12M30 30v48M66 30v48') + c(48, 54, 9) + p('M48 45v-6M48 69v-6M39 54h-4M61 54h-4'),
    gavel: p('M30 22l22 22M22 30l22 22M26 26l12-12 22 22-12 12zM44 44l30 30-6 6-30-30') + p('M14 82h36'),
    dumbbell: p('M26 48h44M18 32v32M28 26v44M68 26v44M78 32v32M10 42v12M86 42v12') + p('M40 18l8 8 14-14'),
    snow: p('M48 12v72M17 30l62 36M79 30L17 66') + p('M40 18l8 8 8-8M40 78l8-8 8 8M16 42l12-3-3-11M80 54l-12 3 3 11M80 42l-12-3 3-11M16 54l12 3-3 11'),
    star: p('M48 10l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z') + dot(40, 44) + dot(56, 44) + p('M40 54q8 7 16 0'),
    info: bubble(14, 14, 68, 52) + t(48, 50, 26, 'i') + p('M78 76h10M72 84l8 6'),
    diamond: p('M26 22h44l16 20-38 40L10 42zM10 42h76M34 42l14 40 14-40-6-20M34 42l6-20') + spark(84, 18, 8),
    cafepin: p('M48 86Q20 56 20 38a28 28 0 0 1 56 0q0 18-28 48z') + p('M34 30h22v10q0 10-11 10t-11-10zM56 32h4q6 0 5 6t-10 5') + p('M40 22v-4M48 22v-4'),
    hook: p('M58 10v44q0 18-16 18T26 56l10 6') + c(58, 10, 4) + r(60, 54, 28, 22, 4) + p('M60 56l14 11 14-11') + p('M14 82h40'),
    kidcap: c(48, 56, 24) + p('M26 46q2-28 24-28q20 0 21 26l-45 2M70 42q14 0 18 6') + dot(40, 58) + dot(56, 58) + p('M42 68q6 5 12 0') + c(50, 14, 4),
    code: r(10, 18, 76, 60, 8) + p('M10 32h76M30 46l-10 9 10 9M54 46l10 9-10 9M48 42L38 68') + spark(80, 70, 8),
    confetti: p('M20 78L38 36l24 24zM28 62l12 8M34 48l18 18') + p('M58 30q4-14 18-14M64 46q14-6 20 4M50 22l-4-12') + dot(72, 32) + dot(56, 14) + dot(82, 62),
    swirl: p('M50 48q8 0 6 8t-14 6q-14-6-8-20t24-10q20 6 16 28t-32 24q-30-2-30-32t30-38q28-6 44 14'),
    cane: c(40, 30, 16) + dot(34, 28) + dot(46, 28) + p('M34 38q6-4 12 0') + p('M24 82q0-28 16-28t16 28M64 46q12-6 12 6v32') + p('M26 18q6-10 14-8'),
    thanks: p('M30 82V50l-10-12q-5-8 3-10l12 12V20q0-7 6-7t6 7v22M54 42V20q0-7 6-7t6 7v20l12-12q8-2 4 8L66 56v26') + heart(48, 62, 8),
    tear: c(48, 48, 32) + dot(36, 40) + dot(60, 40) + p('M36 62q12-8 24 0') + p('M30 48q-8 12 0 14t0-14zM66 48q-8 12 0 14t0-14z'),
    baseball: c(46, 48, 30) + p('M26 26q18 22 0 44M66 26q-18 22 0 44') + p('M22 36l7 3M22 60l7-3M70 36l-7 3M70 60l-7-3') + spark(84, 18, 8),
    lamp: p('M46 38v46M32 84h28') + p('M34 12h24l6 22H28zM46 12V6') + p('M38 38h16') + p('M40 22h12M38 29h16') + heart(74, 52, 9),
    ltake: r(16, 16, 56, 64, 10) + p('M34 32v32h22') + p('M72 40l16-6M72 52h18M72 64l14 8'),
    shark: p('M8 62q22-4 30-30q16 6 20 24q14 0 24-14q0 16-6 22') + p('M8 72q8-7 16 0t16 0t16 0t16 0t16 0M16 84q8-6 16 0t16 0t16 0t16 0') + dot(44, 48),
    shine: c(48, 52, 26) + p('M36 46l4 6 4-6M52 46l4 6 4-6M38 64q10 9 20 0') + spark(18, 22, 10) + spark(78, 20, 12) + spark(84, 72, 7),
    crown: p('M16 68V28l18 16 14-26 14 26 18-16v40zM16 80h64') + dot(48, 56, 4),
    hammer: p('M18 82V34h30v48M26 46h6M38 46h4M26 58h6M38 58h4M10 82h50') + p('M56 28l16-16 14 14-8 8-6-6-22 24-7-7 22-23z') + p('M54 46l-6-10 10 2'),
    mountain: p('M8 76l28-44 18 28 10-14 24 30z') + p('M28 44l8 6 7-7') + bubble(54, 8, 34, 22) + t(71, 24, 13, '야호'),
    clown: c(48, 52, 26) + c(48, 54, 7) + p('M34 42v8M62 42v8M34 66q14 12 28 0') + c(20, 38, 9) + c(76, 38, 9) + p('M36 28l12-18 12 18') + c(48, 9, 4),
    palette: p('M48 14q36 2 36 32q-2 18-20 14q-12-2-10 10q2 14-14 12Q12 76 14 46q4-32 34-32z') + c(32, 40, 5) + c(48, 30, 5) + c(66, 38, 5) + c(32, 60, 5),
    chase: c(60, 18, 8) + p('M56 28L42 46l16 12-6 24M42 46L24 42M56 34l20 10M44 56L28 72H16') + p('M10 22h18M6 32h14'),
    solo: heart(34, 48, 20) + p('M68 36l-4 10 8 6-6 12') + p('M70 30q16 4 14 22q-2 16-16 24'),
    donut: c(48, 48, 30) + c(48, 48, 10) + p('M20 42q8 12 16 2q8 12 18 0q8 12 22-2') + p('M30 28l4 3M58 24l2 5M70 34l-5 2M40 22v5'),
    oneway: r(14, 20, 40, 58, 7) + face(34, 44, 11) + p('M62 34q8 8 0 16M70 26q16 16 0 32') + heart(80, 74, 8),
    robot: r(22, 30, 52, 42, 12) + c(36, 48, 5) + c(60, 48, 5) + p('M38 62h20M48 30V18M14 46v14M82 46v14M34 72v12M62 72v12') + c(48, 13, 5),
    apron: p('M16 44L48 16l32 28M24 40v42h48V40') + heart(48, 56, 11) + p('M60 22V14h10v16'),
    aura: c(48, 34, 11) + p('M30 80q0-30 18-30t18 30') + p('M20 70q-14-26 4-46M76 70q14-26-4-46M10 80q-14-36 6-64M86 80q14-36-6-64') + spark(48, 12, 7),
    chatlove: bubble(8, 16, 46, 32) + heart(31, 32, 8) + r(50, 46, 38, 30, 9) + c(62, 61, 3) + c(76, 61, 3) + p('M69 46v-8'),
    nomad: r(22, 40, 52, 34, 4) + p('M12 80h72M34 74h28') + p('M18 24l28-6 10-14 6 2-5 15 20 8-2 6-24-4-14 10-5-3 8-10-22 2z'),
    cheer: p('M20 82l10-36 26 26zM30 46q14-4 26 26') + t(66, 34, 24, '!') + p('M52 28l-4-14M70 54l16-2M78 70l8 8') + dot(84, 24),
    brush: p('M60 12q18 6 12 22L56 62l-14-9 16-28q-6-8 2-13z') + p('M42 53q-14 2-14 16q0 10-14 13q22 8 34-4q8-8 8-16') + p('M12 24l12 12m0-12L12 36'),
    shirt: p('M32 16L12 30l9 16 11-5v41h32V41l11 5 9-16-20-14q-16 12-32 0z') + p('M40 52l16 16m0-16L40 68'),
    freeze: p('M48 8l32 18v38L48 84 16 64V26zM48 46l32-20M48 46L16 26M48 46v38') + heart(48, 28, 8),
    smize: p('M10 46q18-26 38 0q-18 22-38 0zM52 46q18-26 36 0q-18 22-36 0z') + c(29, 46, 7) + c(70, 46, 7) + dot(29, 46) + dot(70, 46) + p('M34 74h28') + t(82, 24, 16, 'AI'),
    bots: r(12, 16, 72, 50, 6) + p('M22 54l14-14 10 8 16-22M52 26h10v10') + p('M24 78h48M48 66v12') + dot(74, 52) + dot(66, 52) + dot(58, 52),
    pan: c(38, 52, 26) + p('M64 52h26') + p('M28 52q4-14 16-8q12 2 6 14q-8 12-18 4z') + p('M28 18q-6-5 0-11M44 18q-6-5 0-11'),
    exit: r(46, 14, 34, 68, 4) + c(24, 22, 8) + p('M26 32l-8 20 16 10-4 20M18 52L8 66M26 38l16 8') + dot(54, 50)
  };

  var MAP = {
    'ai-exam-cheating-satire-meme': 'exam', 'promise-of-two-pm-meme': 'chartdown', 'banana-54000-ai-meme': 'banana', 'hyunbaek-core-slang': 'bag',
    'ppaenan-jiwongeum-meme': 'sticks', 'bamti': 'shirt', 'aiching-emoji-self-intro-meme': 'wink', 'nerd-nam': 'glasses', 'bad-acting-challenge-2026': 'masks',
    'wax-pop-ball-texture-play-2026': 'popball', 'maxxing-word-of-year-2026': 'rocket', 'six-seven': 'dice', 'deluru': 'dream', 'ai-slop': 'slop',
    'jisoo-laurel-meme-2026-11': 'megaphone', 'korean-superintelligence-meme-2026-11': 'brain', '46cm-bodywash-meme-2026-11': 'bottle', 'mbtichan': 'bubble',
    'WORD-2026-0029': 'hourglass', 'WORD-2026-0031': 'unplug', 'young-keukeu': 'laugh', 'samsung-stock-half-price-meme': 'sale', 'maknagwi-slang': 'door',
    't1-ti-won-meme': 'trophy', 'jensen-huang-love-meme': 'hearts', 'gam-da-sal': 'spark', 'gidae-con': 'balloon', 'brain-physical': 'braingym',
    'lucky-vicky': 'clover', 'age-reaction-challenge-2026': 'ages', 'chaepohagesseo-meme-2026': 'fingergun', 'ttalk-meme-2026': 'click', 'dopa-gaki-slang': 'candy',
    'WORD-2026-0030': 'cart', 'aljaldakkalsen': 'checklist', 'jungkkeongma': 'flag', 'godsaeng': 'sunrise', 'eoljuga': 'icedcup', 'neujoh': 'spark',
    'dokpamin': 'book', 'aboha': 'teacup', 'kikangseu': 'suitcase', 'gukrul': 'gavel', 'ounwan': 'dumbbell', 'gapbunssa': 'snow', 'haeinssa': 'star',
    'tmi-slang': 'info', 'flex-slang': 'diamond', 'seusegwon': 'cafepin', 'WORD-2026-0026': 'hook', 'jemmini': 'robot', 'vibe-coding': 'code',
    'hallelyaru': 'confetti', 'yareu': 'cheer', 'nanrijabeth': 'swirl', 'old-keukeu': 'cane', 'ajaseu': 'thanks', 'poor-upbringing-meme': 'tear',
    'chaek-eop-kwae': 'baseball', 'inoegom-vesper': 'lamp', 'kwonroot-take-the-l': 'ltake', 'bukangi-shark': 'shark', 'yareumdapda': 'shine',
    'jangwonyoung-slang': 'crown', 'destroy-company-meme': 'hammer', 'geoje-yaho': 'mountain', 'destroy-company-challenge': 'hammer', 'clown-meme-2026': 'clown',
    'chagall-slang': 'palette', 'gyeongdo': 'chase', 'mothae-solo': 'solo', 'glaze': 'donut', 'clanker': 'robot', 'parasocial': 'oneway', 'tradwife': 'apron',
    'aura-farming': 'aura', 'simulove': 'chatlove', 'jungjijeong': 'bubble', 'WORD-2026-0033': 'nomad', 'waho-slang': 'cheer', 'ggugguggu': 'brush',
    'ton-mang-jinchang': 'palette', 'dong-gyeol-geon-jo': 'freeze', 'smishing-ai': 'smize', 'WORD-2026-0027': 'bots', 'kimpung': 'pan', 'cutter-toe': 'exit',
    'simu-love': 'chatlove'
  };
  // 새 단어: 제목·뜻의 키워드로 고른다(앞에서부터 처음 맞는 것)
  var RULES = [[/AI|인공지능|챗봇|로봇/i, 'robot'], [/시험|수능|공부/, 'exam'], [/주식|투자|코인/, 'chartdown'], [/퇴근|퇴사|회사|직장/, 'exit'],
    [/챌린지|안무|춤/, 'cheer'], [/커피|음료|카페/, 'icedcup'], [/음식|먹|디저트|빵/, 'donut'], [/옷|패션|코디|스타일/, 'shirt'], [/화장|꾸미/, 'brush'],
    [/연애|사랑|설렘|좋아/, 'hearts'], [/게임|경기|야구|승/, 'trophy'], [/책|독서/, 'book'], [/운동|헬스/, 'dumbbell'], [/여행|휴가|호텔/, 'suitcase'],
    [/소비|구매|쇼핑/, 'cart'], [/웃|ㅋㅋ|유머/, 'laugh'], [/눈물|슬|억울|우울/, 'tear'], [/감탄|환호|신나/, 'confetti'], [/칭찬|예쁘|멋/, 'shine'],
    [/시간|하루/, 'hourglass'], [/문자|사기|해킹/, 'hook'], [/코드|개발/, 'code']];
  var TONES = ['pink', 'lilac', 'peach', 'butter', 'mint', 'sky'];

  H.wordArt = function (item) {
    var key = MAP[item.id];
    if (!key) {
      var text = (item.title || '') + ' ' + (item.def || '');
      for (var i = 0; i < RULES.length && !key; i++) if (RULES[i][0].test(text)) key = RULES[i][1];
      key = key || 'bubble';
    }
    var h = 0, id = String(item.id || '');
    for (var j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) >>> 0;
    return '<span class="wa tone-' + TONES[h % TONES.length] + '" aria-hidden="true"><svg viewBox="0 0 96 96" focusable="false">' + (ART[key] || ART.bubble) + '</svg></span>';
  };
  H.wordArtKeys = Object.keys(ART);
  H.wordArtMap = MAP;
})(window);
