/* Anna Astra — фоновая 3D-сцена (three.js r128, UMD):
   шейдерные звёзды, золотая пыль, созвездия, 3D-колесо зодиака */
(function () {
  'use strict';
  var canvas = document.getElementById('sky');
  if (!canvas || !window.THREE) { if (canvas) canvas.style.display = 'none'; return; }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var MOBILE = window.innerWidth < 760;

  var renderer, scene, camera, clock, rafId = null;
  var layers = [], dust = null, wheel = null, wheelMats = [], constLines = null;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  var STAR_VERT = [
    'attribute float aScale;',
    'attribute float aPhase;',
    'attribute float aSpeed;',
    'uniform float uTime;',
    'uniform float uPixelRatio;',
    'varying float vTw;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  float tw = 0.62 + 0.38 * sin(uTime * aSpeed + aPhase);',
    '  vTw = tw;',
    '  gl_PointSize = aScale * uPixelRatio * (260.0 / -mv.z) * (0.72 + 0.5 * tw);',
    '}'
  ].join('\n');

  var STAR_FRAG = [
    'uniform vec3 uColor;',
    'varying float vTw;',
    'void main() {',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  if (d > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.06, d);',
    '  gl_FragColor = vec4(uColor, a * vTw);',
    '}'
  ].join('\n');

  var DUST_VERT = [
    'attribute float aScale;',
    'attribute float aPhase;',
    'uniform float uTime;',
    'uniform float uPixelRatio;',
    'varying float vA;',
    'void main() {',
    '  vec3 p = position;',
    '  p.y = mod(p.y + uTime * (0.28 + aPhase * 0.12), 14.0) - 7.0;',
    '  p.x += sin(uTime * 0.25 + aPhase * 6.0) * 0.7;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  vA = 0.22 + 0.18 * sin(uTime * 1.4 + aPhase * 9.0);',
    '  gl_PointSize = aScale * uPixelRatio * (180.0 / -mv.z);',
    '}'
  ].join('\n');

  var DUST_FRAG = [
    'uniform vec3 uColor;',
    'varying float vA;',
    'void main() {',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  if (d > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.08, d);',
    '  gl_FragColor = vec4(uColor, a * vA);',
    '}'
  ].join('\n');

  function makeStarLayer(count, colorHex, sizeMin, sizeMax) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var scl = new Float32Array(count);
    var pha = new Float32Array(count);
    var spd = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 68;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = -(12 + Math.random() * 48);
      scl[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
      pha[i] = Math.random() * Math.PI * 2;
      spd[i] = 0.4 + Math.random() * 1.4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new THREE.Color(colorHex) }
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var pts = new THREE.Points(geo, mat);
    return { points: pts, positions: pos, mat: mat };
  }

  function makeDust(count) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var scl = new Float32Array(count);
    var pha = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = -(2 + Math.random() * 7);
      scl[i] = 0.5 + Math.random() * 1.2;
      pha[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new THREE.Color(0xE9CF9C) }
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  function drawFourPoint(ctx, x, y, R, r) {
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 2;
      var a2 = a + Math.PI / 4;
      ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      ctx.lineTo(x + Math.cos(a2) * r, y + Math.sin(a2) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  function makeWheelTexture() {
    var S = 1024;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    var cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);

    /* внешние риски */
    for (var i = 0; i < 72; i++) {
      var a = i / 72 * Math.PI * 2;
      var isLong = i % 6 === 0;
      var r1 = isLong ? 468 : 482;
      ctx.strokeStyle = 'rgba(226,196,140,' + (isLong ? 0.9 : 0.4) + ')';
      ctx.lineWidth = isLong ? 2.6 : 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * 500, cy + Math.sin(a) * 500);
      ctx.stroke();
    }

    /* знаки зодиака */
    var glyphs = ['\u2648', '\u2649', '\u264A', '\u264B', '\u264C', '\u264D', '\u264E', '\u264F', '\u2650', '\u2651', '\u2652', '\u2653'];
    ctx.fillStyle = '#E9CF9C';
    ctx.font = '500 58px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glyphs.forEach(function (g, i) {
      var a = -Math.PI / 2 + i / 12 * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 408, cy + Math.sin(a) * 408);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(g, 0, 0);
      ctx.restore();
    });

    /* круговая латинская надпись */
    var text = 'ANNA ASTRA \u00B7 ASTRA INCLINANT \u00B7 NON NECESSITANT \u00B7 ';
    ctx.fillStyle = 'rgba(226,196,140,0.7)';
    ctx.font = '600 26px Manrope, Arial, sans-serif';
    var chars = text.split('');
    chars.forEach(function (ch, i) {
      var a = i / chars.length * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 322, cy + Math.sin(a) * 322);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });

    /* внутренние кольца */
    ctx.strokeStyle = 'rgba(226,196,140,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, 262, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 236, 0, Math.PI * 2); ctx.stroke();

    /* центральная звезда */
    ctx.fillStyle = '#F2DCA8';
    drawFourPoint(ctx, cx, cy, 84, 20);

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makeGlowTexture() {
    var S = 256;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(242,220,168,0.55)');
    g.addColorStop(0.35, 'rgba(216,183,118,0.18)');
    g.addColorStop(1, 'rgba(216,183,118,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  function makeConstellation(starPositions) {
    var total = Math.floor(starPositions.length / 3);
    var pts = [], used = {}, tries = 0;
    while (pts.length < 14 && tries < 400) {
      tries++;
      var idx = Math.floor(Math.random() * total);
      if (used[idx]) continue;
      used[idx] = true;
      pts.push([starPositions[idx * 3], starPositions[idx * 3 + 1], starPositions[idx * 3 + 2]]);
    }
    var arr = [];
    for (var j = 0; j < pts.length - 1; j++) {
      arr.push(pts[j][0], pts[j][1], pts[j][2], pts[j + 1][0], pts[j + 1][1], pts[j + 1][2]);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
    var mat = new THREE.LineBasicMaterial({ color: 0xD8B776, transparent: true, opacity: 0.14 });
    return new THREE.LineSegments(geo, mat);
  }

  function applyLayout() {
    MOBILE = window.innerWidth < 760;
    if (wheel) {
      wheel.scale.setScalar(MOBILE ? 0.6 : 1);
      wheel.position.set(MOBILE ? 0 : 3.05, MOBILE ? 2.4 : 0.3, -3.2);
    }
    if (constLines) constLines.visible = !MOBILE;
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 0, 10);
    clock = new THREE.Clock();

    layers.push(makeStarLayer(MOBILE ? 420 : 1150, 0xF4EEDC, 0.6, 1.9));
    layers.push(makeStarLayer(MOBILE ? 180 : 520, 0xE9CF9C, 0.8, 2.3));
    layers.push(makeStarLayer(MOBILE ? 90 : 240, 0xA99BF0, 0.5, 1.4));
    layers.forEach(function (l) { scene.add(l.points); });

    dust = makeDust(MOBILE ? 50 : 130);
    scene.add(dust);

    constLines = makeConstellation(layers[0].positions);
    scene.add(constLines);

    /* Колесо зодиака */
    wheel = new THREE.Group();
    var ringMat1 = new THREE.MeshBasicMaterial({ color: 0xC9A96A, transparent: true, opacity: 0.5 });
    var ringMat2 = new THREE.MeshBasicMaterial({ color: 0xC9A96A, transparent: true, opacity: 0.26 });
    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.012, 8, 160), ringMat1);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.34, 0.008, 8, 160), ringMat2);
    var planeMat = new THREE.MeshBasicMaterial({ map: makeWheelTexture(), transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false });
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), planeMat);
    var glowMat = new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
    var glow = new THREE.Sprite(glowMat);
    glow.scale.set(9.5, 9.5, 1);
    glow.position.z = -0.6;
    wheel.add(ring1, ring2, plane, glow);
    wheel.rotation.x = -0.52;
    wheelMats = [
      { mat: ringMat1, base: 0.5 },
      { mat: ringMat2, base: 0.26 },
      { mat: planeMat, base: 0.92 },
      { mat: glowMat, base: 0.32 }
    ];
    scene.add(wheel);

    applyLayout();

    /* перерисовать текстуру после загрузки шрифтов */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        planeMat.map = makeWheelTexture();
        planeMat.needsUpdate = true;
      }).catch(function () {});
    }
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    layers.forEach(function (l) { l.mat.uniforms.uTime.value = t; });
    if (dust) dust.material.uniforms.uTime.value = t;

    var p = (window.__astraScroll && typeof window.__astraScroll.hero === 'number') ? window.__astraScroll.hero : 0;
    if (wheel) {
      wheel.rotation.z += 0.0016;
      wheel.position.y = (MOBILE ? 2.4 : 0.3) + p * 4.8;
      var f = Math.max(0, 1 - p * 1.45);
      wheelMats.forEach(function (m) { m.mat.opacity = m.base * f; });
    }
    if (constLines && constLines.material) {
      constLines.material.opacity = 0.1 + 0.06 * Math.sin(t * 0.7);
    }
    camera.position.z = 10 + p * 3;

    if (FINE && !REDUCED) {
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      camera.position.x = mouse.x * 0.55;
      camera.position.y = -mouse.y * 0.35 + p * 1.2;
    }
    camera.lookAt(0, 0, -6);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', applyLayout);

  if (FINE && !REDUCED) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId && !REDUCED) {
      clock.getDelta();
      animate();
    }
  });

  try {
    init();
    if (REDUCED) {
      renderer.render(scene, camera);
      window.addEventListener('resize', function () { applyLayout(); renderer.render(scene, camera); });
    } else {
      animate();
    }
  } catch (err) {
    canvas.style.display = 'none';
    if (window.console) console.warn('[Anna Astra] 3D-сцена недоступна:', err);
  }
})();
