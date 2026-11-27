/* Anna Astra — «живые фото»: анимация сгенерированных изображений.

   Геометрия: позиция шара считается в ПИКСЕЛЯХ ОКНА через cover-математику —
   наезд, маска и эффекты всегда точно на шаре при любом окне.

   Погружение: при скролле мир вне шара гаснет (тоннель), стеклянная кромка
   загорается, туманность внутри ярчеет — затем маска раскрывает космос.

   Приоритет источников: assets/hero.jpg|png и assets/cosmos.jpg|png,
   затем временные CDN-ссылки. Если есть assets/hero.mp4 — видео-режим.
   3D стартует только если фото не загрузилось за 2.4 с.

   Диагностика: откройте консоль (F12) — строки с префиксом [Astra]
   показывают активный режим, источник картинки и координаты шара.

   НАСТРОЙКА ПОД КАДР: константы BALL и CANDLE ниже. */
(function () {
  'use strict';
  var html = document.documentElement;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;

  /* страница всегда стартует сверху — иначе можно попасть в середину pin-сцены */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* фолбэк высоты hero для браузеров без svh */
  var heroSec = document.getElementById('hero');
  if (heroSec) {
    heroSec.style.height = '100vh';
    heroSec.style.minHeight = '100vh';
    if (window.CSS && CSS.supports && CSS.supports('height', '100svh')) {
      heroSec.style.height = '100svh';
    }
  }

  function ss(a, b, x) {
    x = (x - a) / (b - a);
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  /* ==== ПОДГОНКА ПОД КАДР (доли ИСХОДНОГО изображения) ==== */
  var BALL = { x: 0.503, y: 0.345, r: 0.26 };
  var CANDLE = { x: 0.025, y: 0.21 };

  var HERO_URLS = [
    'assets/hero.jpg',
    'assets/hero.png',
    'https://z-cdn-media.chatglm.cn/files/7df0d152-e8c5-4b5f-b5c8-237abe7d8823.png?auth_key=1895760340-c767c8f537124e588073c175f8a3ccba-0-8bf4cbbfba3434c98bf46d82dac7d703'
  ];
  var COSMOS_URLS = [
    'assets/cosmos.jpg',
    'assets/cosmos.png',
    'https://z-cdn-media.chatglm.cn/files/0f212d37-0031-4b10-810e-f93ec29b0020.png?auth_key=1895760340-bea60c1de9154435bfd84ab60f4c4360-0-752013c124285942d0a271637755c628'
  ];

  function loadFirst(urls, ok, fail) {
    var i = 0;
    (function next() {
      if (i >= urls.length) { if (fail) fail(); return; }
      var u = urls[i++];
      var im = new Image();
      im.onload = function () { ok(u, im); };
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

  var heroOn = false, cosOn = false, cosImgLoaded = false, raf = null;
  var fx = null, cfx = null, W = 0, H = 0, CW = 0, CH = 0;
  var imgW = 1920, imgH = 1080;
  var geo = { bx: 0, by: 0, R: 0 };
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var ballStars = [], motes = [], fogs = [], skyStars = [];

  /* Центр шара в пикселях окна с учётом cover-обрезки */
  function computeGeo() {
    var s = Math.max(W / imgW, H / imgH);
    var dw = imgW * s, dh = imgH * s;
    var ox = (W - dw) / 2, oy = (H - dh) / 2;
    geo.bx = ox + BALL.x * dw;
    geo.by = oy + BALL.y * dh;
    geo.R = BALL.r * dh;
    window.__astraBall = { cx: geo.bx, cy: geo.by, R: geo.R };
  }

  function sizeAll() {
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (heroOn && heroFx) {
      W = window.innerWidth; H = window.innerHeight;
      heroFx.width = W * DPR; heroFx.height = H * DPR;
      fx = heroFx.getContext('2d');
      fx.setTransform(DPR, 0, 0, DPR, 0, 0);
      computeGeo();
      heroWrap.style.transformOrigin = geo.bx.toFixed(1) + 'px ' + geo.by.toFixed(1) + 'px';
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
    for (i = 0; i < 52; i++) {
      var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.94;
      ballStars.push({ u: Math.cos(a) * rr, v: Math.sin(a) * rr, s: 0.8 + rnd() * 1.7, p: rnd() * Math.PI * 2, v2: 0.6 + rnd() * 1.3 });
    }
    motes = [];
    for (i = 0; i < 22; i++) {
      motes.push({ x: 0.04 + rnd() * 0.32, off: rnd(), v: 0.01 + rnd() * 0.022, s: 0.9 + rnd() * 1.8, p: rnd() * Math.PI * 2 });
    }
    fogs = [];
    for (i = 0; i < 3; i++) {
      fogs.push({ x: 0.14 + i * 0.3 + rnd() * 0.08, y: 0.58 + rnd() * 0.2, w: 0.6 + rnd() * 0.3, h: 0.22 + rnd() * 0.1, o: 0.07 + rnd() * 0.045, sp: 0.06 + rnd() * 0.06, ph: rnd() * Math.PI * 2 });
    }
  }

  function initCos() {
    var i;
    skyStars = [];
    for (i = 0; i < 120; i++) {
      skyStars.push({ x: rnd(), y: rnd(), s: 0.5 + rnd() * 1.7, p: rnd() * Math.PI * 2, v2: 0.4 + rnd() * 1.2 });
    }
  }

  function drawNebula(cx, cy, R, t, p) {
    fx.save();
    fx.beginPath(); fx.arc(cx, cy, R, 0, Math.PI * 2); fx.clip();
    fx.globalCompositeOperation = 'lighter';
    /* дышит и ярчеет при погружении */
    fx.globalAlpha = Math.min(1, (0.72 + 0.28 * Math.sin(t * 0.45)) * (0.85 + 0.6 * (p || 0)));
    var i, a, g;
    for (i = 0; i < 4; i++) {
      a = t * 0.12 + i * Math.PI / 2;
      g = fx.createRadialGradient(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, 0, cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, R * 0.85);
      g.addColorStop(0, 'rgba(158,126,232,0.26)');
      g.addColorStop(0.6, 'rgba(94,72,170,0.13)');
      g.addColorStop(1, 'rgba(60,40,110,0)');
      fx.fillStyle = g;
      fx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    g = fx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.52);
    g.addColorStop(0, 'rgba(244,216,152,0.30)');
    g.addColorStop(0.5, 'rgba(168,126,212,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fx.fillStyle = g;
    fx.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (i = 0; i < ballStars.length; i++) {
      var s = ballStars[i];
      var tw = 0.25 + 0.75 * Math.abs(Math.sin(t * s.v2 + s.p));
      fx.fillStyle = 'rgba(255,240,210,' + (0.75 * tw).toFixed(3) + ')';
      fx.beginPath();
      fx.arc(cx + s.u * R, cy + s.v * R, s.s, 0, Math.PI * 2);
      fx.fill();
    }
    fx.restore();
  }

  function drawHero(t, p) {
    if (!fx) return;
    fx.clearRect(0, 0, W, H);
    drawNebula(geo.bx, geo.by, geo.R, t, p);

    fx.globalCompositeOperation = 'lighter';

    /* свеча */
    var f = 0.7 + 0.3 * Math.abs(Math.sin(t * 9 + 0.6)) + 0.18 * Math.sin(t * 23 + 1.7);
    if (f < 0.15) f = 0.15;
    var gx = CANDLE.x * W, gy = CANDLE.y * H, gr = (0.15 + 0.03 * f) * H;
    var cg = fx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    cg.addColorStop(0, 'rgba(255,192,110,' + (0.24 * f).toFixed(3) + ')');
    cg.addColorStop(0.5, 'rgba(255,172,92,' + (0.12 * f).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(255,172,92,0)');
    fx.fillStyle = cg;
    fx.fillRect(0, 0, W, H);

    /* туман */
    for (var i = 0; i < fogs.length; i++) {
      var fo = fogs[i];
      var fxp = (fo.x + Math.sin(t * fo.sp + fo.ph) * 0.07) * W;
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
      var xx = m.x + Math.sin(t * 0.35 + m.p) * 0.025;
      fx.fillStyle = 'rgba(255,224,176,' + (0.18 + 0.16 * Math.sin(t * 2.2 + m.p)).toFixed(3) + ')';
      fx.beginPath();
      fx.arc(xx * W, yy * H, m.s, 0, Math.PI * 2);
      fx.fill();
    }

    /* ТОННЕЛЬ: мир вне шара гаснет, кромка стекла загорается */
    if (p > 0.02) {
      var dk = ss(0.05, 0.85, p);
      fx.globalCompositeOperation = 'source-over';
      var dg = fx.createRadialGradient(geo.bx, geo.by, geo.R * 0.92, geo.bx, geo.by, Math.max(W, H) * 1.25);
      dg.addColorStop(0, 'rgba(3,2,8,' + (0.88 * dk).toFixed(3) + ')');
      dg.addColorStop(1, 'rgba(3,2,8,' + (0.96 * dk).toFixed(3) + ')');
      fx.fillStyle = dg;
      fx.fillRect(0, 0, W, H);
      fx.globalCompositeOperation = 'lighter';
      fx.strokeStyle = 'rgba(214,190,150,' + (0.12 + 0.5 * dk).toFixed(3) + ')';
      fx.lineWidth = 3;
      fx.beginPath(); fx.arc(geo.bx, geo.by, geo.R, 0, Math.PI * 2); fx.stroke();
      fx.strokeStyle = 'rgba(242,220,168,' + (0.3 * dk).toFixed(3) + ')';
      fx.lineWidth = 10;
      fx.beginPath(); fx.arc(geo.bx, geo.by, geo.R * 1.015, 0, Math.PI * 2); fx.stroke();
    }

    fx.globalCompositeOperation = 'source-over';
    fx.globalAlpha = 1;
  }

  function drawCos(t) {
    if (!cfx) return;
    cfx.clearRect(0, 0, CW, CH);
    cfx.globalCompositeOperation = 'lighter';
    /* если фото космоса нет — процедурная туманность */
    if (!cosImgLoaded) {
      for (var k = 0; k < 5; k++) {
        var bx = CW * (0.2 + 0.15 * k) + Math.sin(t * 0.05 + k * 1.3) * 40;
        var by = CH * (0.28 + 0.11 * (k % 4)) + Math.cos(t * 0.04 + k * 2) * 30;
        var br = CW * (0.2 + 0.06 * (k % 3));
        var hue = k % 2 ? '196,164,96' : '122,102,205';
        var g = cfx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, 'rgba(' + hue + ',0.15)');
        g.addColorStop(1, 'rgba(' + hue + ',0)');
        cfx.fillStyle = g;
        cfx.fillRect(bx - br, by - br, br * 2, br * 2);
      }
    }
    for (var i = 0; i < skyStars.length; i++) {
      var s = skyStars[i];
      var tw = 0.2 + 0.8 * Math.abs(Math.sin(t * s.v2 + s.p));
      cfx.fillStyle = 'rgba(255,246,226,' + (0.55 * tw).toFixed(3) + ')';
      cfx.beginPath();
      cfx.arc(s.x * CW, s.y * CH, s.s, 0, Math.PI * 2);
      cfx.fill();
    }
    cfx.globalCompositeOperation = 'source-over';
  }

  function applyScroll(p) {
    if (heroWrap && W) {
      var z = 1 + 2.3 * ss(0, 0.75, p);
      var damp = 1 - p;
      heroWrap.style.transform = 'translate(' + (mouse.x * 10 * damp).toFixed(1) + 'px,' + (mouse.y * 6 * damp).toFixed(1) + 'px) scale(' + z.toFixed(4) + ')';
      heroWrap.style.filter = 'brightness(' + (1 - 0.45 * ss(0.35, 0.85, p)).toFixed(3) + ')';
    }
    if (cosWrap && W) {
      var diag = Math.hypot(W, H);
      var r = ss(0.55, 0.92, p) * diag * 1.15;
      var cp = 'circle(' + r.toFixed(0) + 'px at ' + geo.bx.toFixed(0) + 'px ' + geo.by.toFixed(0) + 'px)';
      cosWrap.style.opacity = p > 0.5 ? '1' : '0';
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
    var p = (window.__astraScroll && typeof window.__astraScroll.hero === 'number') ? window.__astraScroll.hero : 0;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    try { if (heroOn) drawHero(t, p); } catch (e) {}
    try { if (cosOn) drawCos(t); } catch (e) {}
    applyScroll(p);
  }

  function startLoop() {
    if (raf || REDUCED) return;
    raf = requestAnimationFrame(loop);
  }

  function reducedStatic() {
    sizeAll();
    if (heroOn) drawHero(0, 0);
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

  if (FINE && !REDUCED) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  loadFirst(HERO_URLS, function (url, im) {
    if (!heroWrap || !heroImg || !heroFx) return;
    imgW = im.naturalWidth || 1920;
    imgH = im.naturalHeight || 1080;
    heroImg.src = url;
    heroOn = true;
    html.classList.add('has-photo-hero');
    initHero();
    sizeAll();
    if (window.console) console.info('[Astra] hero-фото OK (' + (url.indexOf('assets') === 0 ? 'assets' : 'CDN') + ') | шар px: ' + Math.round(geo.bx) + ',' + Math.round(geo.by) + ' R=' + Math.round(geo.R));
    if (REDUCED) { reducedStatic(); } else { startLoop(); }
  }, function () {
    if (window.console) console.info('[Astra] hero-фото недоступно — включается резервная 3D-сцена');
  });

  loadFirst(COSMOS_URLS, function (url, im) {
    if (!cosWrap || !cosImg || !cosFx) return;
    cosImg.src = url;
    cosImgLoaded = true;
    cosOn = true;
    html.classList.add('has-cosmos-photo');
    initCos();
    sizeAll();
    if (window.console) console.info('[Astra] космос: изображение (' + (url.indexOf('assets') === 0 ? 'assets' : 'CDN') + ')');
    if (REDUCED) { reducedStatic(); } else { startLoop(); }
  }, function () {
    if (!cosWrap || !cosFx) return;
    cosOn = true;
    html.classList.add('has-cosmos-photo');
    initCos();
    sizeAll();
    if (window.console) console.info('[Astra] космос: изображение недоступно — процедурный фон');
    if (REDUCED) { reducedStatic(); } else { startLoop(); }
  });
})();
