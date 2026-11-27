/* Anna Astra — «живые фото»: анимация сгенерированных изображений.

   assets/hero.jpg | hero.png — сцена с шаром:
     туманность в шаре дышит и медленно вращается, звёзды мерцают,
     свеча пульсирует тёплым светом, по столу ползёт туман,
     в луче дрейфуют пылинки; скролл — наезд к шару (origin = центр шара)
     и круговая маска-пролёт в космос (assets/cosmos.jpg|png).

   assets/cosmos.jpg | cosmos.png — космос: Ken Burns + мерцающие звёзды.

   Если есть assets/hero.mp4 — работает видео-режим (main.js), этот файл
   отключается классом html.has-hero-video. 3D-сцена — последний резерв.

   НАСТРОЙКА ПОД ВАШ КАДР: константы BALL и CANDLE ниже (доли кадра). */
(function () {
  'use strict';
  var html = document.documentElement;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ss(a, b, x) {
    x = (x - a) / (b - a);
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  /* ==== ПОДГОНКА ПОД КАДР ==== */
  var BALL = { x: 0.503, y: 0.345, r: 0.26 }; // центр шара (x — доля ширины, y — доля высоты), r — доля высоты
  var CANDLE = { x: 0.025, y: 0.21 };          // пламя свечи

  function loadFirst(urls, ok) {
    var i = 0;
    (function next() {
      if (i >= urls.length) return;
      var u = urls[i++];
      var im = new Image();
      im.onload = function () { ok(u); };
      im.onerror = next;
      im.src = u;
    })();
  }

  var seed = 1234567;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var heroWrap = document.querySelector('.hero-photo-wrap');
  var heroImg = document.getElementById('heroPhoto');
  var heroFx = document.getElementById('heroFx');
  var cosWrap = document.querySelector('.cosmos-photo-wrap');
  var cosImg = document.getElementById('cosmosPhoto');
  var cosFx = document.getElementById('cosmoFx');
  var dim = document.querySelector('.page-dim');

  var heroOn = false, cosOn = false, raf = null;
  var fx = null, cfx = null, W = 0, H = 0, CW = 0, CH = 0;
  var ballStars = [], motes = [], fogs = [], skyStars = [];

  function sizeAll() {
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (heroOn && heroFx) {
      W = window.innerWidth; H = window.innerHeight;
      heroFx.width = W * DPR; heroFx.height = H * DPR;
      fx = heroFx.getContext('2d');
      fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    if (cosOn && cosFx) {
      CW = window.innerWidth; CH = window.innerHeight;
      cosFx.width = CW * DPR; cosFx.height = CH * DPR;
      cfx = cosFx.getContext('2d');
      cfx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }

  function initHero() {
    var i;
    ballStars = [];
    for (i = 0; i < 46; i++) {
      var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.94;
      ballStars.push({ u: Math.cos(a) * rr, v: Math.sin(a) * rr, s: 0.7 + rnd() * 1.5, p: rnd() * Math.PI * 2, v2: 0.5 + rnd() * 1.2 });
    }
    motes = [];
    for (i = 0; i < 14; i++) {
      motes.push({ x: 0.04 + rnd() * 0.3, off: rnd(), v: 0.008 + rnd() * 0.02, s: 0.8 + rnd() * 1.7, p: rnd() * Math.PI * 2 });
    }
    fogs = [];
    for (i = 0; i < 3; i++) {
      fogs.push({ x: 0.12 + i * 0.32 + rnd() * 0.08, y: 0.6 + rnd() * 0.18, w: 0.55 + rnd() * 0.3, h: 0.2 + rnd() * 0.1, o: 0.045 + rnd() * 0.035, sp: 0.05 + rnd() * 0.05, ph: rnd() * Math.PI * 2 });
    }
  }

  function initCos() {
    var i;
    skyStars = [];
    for (i = 0; i < 110; i++) {
      skyStars.push({ x: rnd(), y: rnd(), s: 0.5 + rnd() * 1.6, p: rnd() * Math.PI * 2, v2: 0.4 + rnd() * 1.1 });
    }
  }

  function drawNebula(cx, cy, R, t) {
    fx.save();
    fx.beginPath(); fx.arc(cx, cy, R, 0, Math.PI * 2); fx.clip();
    fx.globalCompositeOperation = 'lighter';
    var i, a, g;
    for (i = 0; i < 4; i++) {
      a = t * 0.07 + i * Math.PI / 2;
      g = fx.createRadialGradient(cx + Math.cos(a) * R * 0.4, cy + Math.sin(a) * R * 0.4, 0, cx + Math.cos(a) * R * 0.4, cy + Math.sin(a) * R * 0.4, R * 0.85);
      g.addColorStop(0, 'rgba(150,120,225,0.16)');
      g.addColorStop(0.6, 'rgba(90,70,165,0.08)');
      g.addColorStop(1, 'rgba(60,40,110,0)');
      fx.fillStyle = g;
      fx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    g = fx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    g.addColorStop(0, 'rgba(242,214,150,0.16)');
    g.addColorStop(0.5, 'rgba(160,120,205,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fx.fillStyle = g;
    fx.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (i = 0; i < ballStars.length; i++) {
      var s = ballStars[i];
      var tw = 0.3 + 0.7 * Math.abs(Math.sin(t * s.v2 + s.p));
      fx.fillStyle = 'rgba(255,238,205,' + (0.5 * tw).toFixed(3) + ')';
      fx.beginPath();
      fx.arc(cx + s.u * R, cy + s.v * R, s.s, 0, Math.PI * 2);
      fx.fill();
    }
    fx.restore();
  }

  function drawHero(t) {
    if (!fx) return;
    fx.clearRect(0, 0, W, H);
    var cx = BALL.x * W, cy = BALL.y * H, R = BALL.r * H;
    drawNebula(cx, cy, R, t);

    fx.globalCompositeOperation = 'lighter';

    /* свеча */
    var f = 0.75 + 0.25 * Math.sin(t * 11 + 0.6) + 0.12 * Math.sin(t * 23 + 1.7);
    if (f < 0) f = 0;
    var gx = CANDLE.x * W, gy = CANDLE.y * H, gr = (0.13 + 0.025 * f) * H;
    var cg = fx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    cg.addColorStop(0, 'rgba(255,192,110,' + (0.16 * f).toFixed(3) + ')');
    cg.addColorStop(0.5, 'rgba(255,172,92,' + (0.08 * f).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(255,172,92,0)');
    fx.fillStyle = cg;
    fx.fillRect(0, 0, W, H);

    /* туман */
    for (var i = 0; i < fogs.length; i++) {
      var fo = fogs[i];
      var fxp = (fo.x + Math.sin(t * fo.sp + fo.ph) * 0.06) * W;
      var fy = fo.y * H;
      var fr = fo.w * W * 0.5;
      var fh = fo.h * H;
      fx.save();
      fx.translate(fxp, fy);
      fx.scale(1, fh / fr);
      var g2 = fx.createRadialGradient(0, 0, 0, 0, 0, fr);
      g2.addColorStop(0, 'rgba(152,140,205,' + (fo.o * (0.8 + 0.2 * Math.sin(t * 0.4 + fo.ph))).toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(152,140,205,0)');
      fx.fillStyle = g2;
      fx.beginPath(); fx.arc(0, 0, fr, 0, Math.PI * 2); fx.fill();
      fx.restore();
    }

    /* пылинки */
    for (var j = 0; j < motes.length; j++) {
      var m = motes[j];
      var yy = 0.8 - ((t * m.v + m.off) % 0.6);
      var xx = m.x + Math.sin(t * 0.3 + m.p) * 0.02;
      fx.fillStyle = 'rgba(255,222,172,' + (0.14 + 0.12 * Math.sin(t * 2 + m.p)).toFixed(3) + ')';
      fx.beginPath();
      fx.arc(xx * W, yy * H, m.s, 0, Math.PI * 2);
      fx.fill();
    }
    fx.globalCompositeOperation = 'source-over';
  }

  function drawCos(t) {
    if (!cfx) return;
    cfx.clearRect(0, 0, CW, CH);
    cfx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < skyStars.length; i++) {
      var s = skyStars[i];
      var tw = 0.25 + 0.75 * Math.abs(Math.sin(t * s.v2 + s.p));
      cfx.fillStyle = 'rgba(255,244,222,' + (0.4 * tw).toFixed(3) + ')';
      cfx.beginPath();
      cfx.arc(s.x * CW, s.y * CH, s.s, 0, Math.PI * 2);
      cfx.fill();
    }
    cfx.globalCompositeOperation = 'source-over';
  }

  function applyScroll() {
    var p = (window.__astraScroll && typeof window.__astraScroll.hero === 'number') ? window.__astraScroll.hero : 0;
    if (heroWrap) {
      var z = 1 + 1.7 * ss(0, 0.72, p);
      heroWrap.style.transform = 'scale(' + z.toFixed(4) + ')';
      heroWrap.style.filter = 'brightness(' + (1 - 0.32 * ss(0.3, 0.9, p)).toFixed(3) + ')';
    }
    if (cosWrap) {
      var r = 150 * ss(0.5, 0.92, p);
      var cp = 'circle(' + r.toFixed(1) + '% at ' + (BALL.x * 100).toFixed(1) + '% ' + (BALL.y * 100).toFixed(1) + '%)';
      cosWrap.style.opacity = r > 0.5 ? '1' : '0';
      cosWrap.style.clipPath = cp;
      cosWrap.style.webkitClipPath = cp;
      cosWrap.style.zIndex = p > 0.97 ? '0' : '3';
      if (dim && heroOn) dim.style.opacity = String(ss(0.78, 1, p) * 0.62);
    }
  }

  function loop(ts) {
    if (!heroOn && !cosOn) { raf = null; return; }
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    var t = ts / 1000;
    if (heroOn) drawHero(t);
    if (cosOn) drawCos(t);
    applyScroll();
  }

  function startLoop() {
    if (raf || REDUCED) return;
    raf = requestAnimationFrame(loop);
  }

  function reducedStatic() {
    sizeAll();
    if (heroOn) drawHero(0);
    if (cosOn) drawCos(0);
    if (cosWrap && cosOn) {
      cosWrap.style.opacity = '1';
      cosWrap.style.zIndex = '0';
      cosWrap.style.clipPath = 'none';
      cosWrap.style.webkitClipPath = 'none';
      if (dim) dim.style.opacity = '0.5';
    }
  }

  window.addEventListener('resize', function () {
    sizeAll();
    if (REDUCED) reducedStatic();
  });

  loadFirst(['assets/hero.jpg', 'assets/hero.png'], function (url) {
    if (!heroWrap || !heroImg || !heroFx) return;
    heroImg.src = url;
    heroOn = true;
    html.classList.add('has-photo-hero');
    var origin = (BALL.x * 100).toFixed(1) + '% ' + (BALL.y * 100).toFixed(1) + '%';
    heroWrap.style.transformOrigin = origin;
    heroImg.style.transformOrigin = origin;
    initHero();
    sizeAll();
    if (REDUCED) { reducedStatic(); } else { startLoop(); }
  });

  loadFirst(['assets/cosmos.jpg', 'assets/cosmos.png'], function (url) {
    if (!cosWrap || !cosImg || !cosFx) return;
    cosImg.src = url;
    cosOn = true;
    html.classList.add('has-cosmos-photo');
    initCos();
    sizeAll();
    if (REDUCED) { reducedStatic(); } else { startLoop(); }
  });
})();
