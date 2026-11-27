/* Anna Astra — основная 3D-сцена (three.js r128). СТАРТУЕТ МГНОВЕННО.

   Комната гаданий → шар с живым космосом → пролёт сквозь стекло → космос
   как фон страницы. Прогресс: window.__astraScroll.hero (ScrollTrigger).

   Режимы: если в assets/ появились hero.mp4 (видео) или hero.jpg|png (фото),
   они перехватывают сцену (классы has-hero-video / has-photo-hero на <html>),
   а этот цикл сам останавливается. Пока файлов нет — canvas проявляется
   через класс mode-3d (плавно, без чёрной паузы и без вспышек).

   Объёмные объекты: карты с толщиной и золотыми торцами, огранённые руны,
   контактные тени, блик на стекле. */
(function () {
  'use strict';
  var canvas = document.getElementById('sky');
  if (!canvas || !window.THREE) { if (canvas) canvas.style.display = 'none'; return; }

  /* стили проявления сцены (один раз) */
  if (!document.getElementById('astra-mode-style')) {
    var st = document.createElement('style');
    st.id = 'astra-mode-style';
    st.textContent = '#sky{opacity:0;transition:opacity .8s ease}html.mode-3d #sky{opacity:1}';
    document.head.appendChild(st);
  }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var MOBILE = window.innerWidth < 760;

  var renderer, scene, camera, clock, rafId = null;
  var roomGroup, roomMats = [], backdropArr = [];
  var glassMat, cosmosMat, cosmosMesh;
  var fogPlanes = [], glows = [];
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function ss(a, b, x) {
    x = (x - a) / (b - a);
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  var COSMOS_VERT = [
    'varying vec3 vDir;',
    'void main() {',
    '  vDir = position;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var COSMOS_FRAG = [
    'varying vec3 vDir;',
    'uniform float uTime;',
    'uniform float uOpacity;',
    'uniform float uVivid;',
    'float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float noise(vec3 x) {',
    '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),',
    '                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),',
    '             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),',
    '                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);',
    '}',
    'float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }',
    'void main() {',
    '  vec3 d = normalize(vDir);',
    '  float n = fbm(d * 2.6 + vec3(0.0, uTime * 0.02, 0.0));',
    '  float n2 = fbm(d * 5.2 - vec3(uTime * 0.014, 0.0, 0.0));',
    '  vec3 col = mix(vec3(0.03, 0.02, 0.08), vec3(0.30, 0.23, 0.52), smoothstep(0.32, 0.85, n));',
    '  col = mix(col, vec3(0.82, 0.66, 0.36), smoothstep(0.70, 0.95, n2) * 0.5);',
    '  vec3 g = d * 240.0;',
    '  float s = step(0.9972, hash(floor(g)));',
    '  float tw = 0.8 + 0.2 * sin(uTime * 1.2 + hash(floor(g) + 7.0) * 40.0);',
    '  col += s * tw * vec3(0.92, 0.87, 0.72);',
    '  gl_FragColor = vec4(col * uVivid, uOpacity);',
    '}'
  ].join('\n');

  var GLASS_VERT = [
    'varying vec3 vN; varying vec3 vV;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vN = normalize(normalMatrix * normal);',
    '  vV = normalize(-mv.xyz);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var GLASS_FRAG = [
    'varying vec3 vN; varying vec3 vV;',
    'uniform float uOpacity; uniform vec3 uTint;',
    'void main() {',
    '  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);',
    '  vec3 col = mix(vec3(0.85, 0.92, 1.0), uTint, f);',
    '  gl_FragColor = vec4(col, (f * 0.85 + 0.05) * uOpacity);',
    '}'
  ].join('\n');

  function radialTexture(inner, outer, size) {
    var S = size || 256;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  function makeBackdropTexture() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 576;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(512, 240, 60, 512, 288, 640);
    g.addColorStop(0, '#1b1433');
    g.addColorStop(0.55, '#0e0a1d');
    g.addColorStop(1, '#06040d');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 576);
    return new THREE.CanvasTexture(c);
  }

  function drawOrnamentFrame(x, w, h) {
    x.strokeStyle = '#C9A96A'; x.lineWidth = 3; x.strokeRect(20, 20, w - 40, h - 40);
    x.strokeStyle = 'rgba(201,169,106,.55)'; x.lineWidth = 1.5; x.strokeRect(34, 34, w - 68, h - 68);
    x.strokeStyle = '#E9CF9C'; x.lineWidth = 2;
    [[20, 20, 1, 1], [w - 20, 20, -1, 1], [20, h - 20, 1, -1], [w - 20, h - 20, -1, -1]].forEach(function (k) {
      x.beginPath();
      x.moveTo(k[0] + 34 * k[2], k[1]); x.lineTo(k[0], k[1]); x.lineTo(k[0], k[1] + 34 * k[3]);
      x.stroke();
    });
  }

  function makeCardFaceTexture(idx) {
    var w = 512, h = 864;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#131020'; x.fillRect(0, 0, w, h);
    var vg = x.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 520);
    vg.addColorStop(0, 'rgba(216,183,118,.07)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    drawOrnamentFrame(x, w, h);
    x.strokeStyle = 'rgba(233,207,156,.8)'; x.lineWidth = 2;
    x.beginPath(); x.arc(w / 2, h / 2 - 20, 120, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(w / 2, h / 2 - 20, 104, 0, Math.PI * 2); x.stroke();
    x.save(); x.translate(w / 2, h / 2 - 20);
    x.strokeStyle = '#F2DCA8'; x.fillStyle = '#F2DCA8'; x.lineWidth = 4;
    if (idx === 0) {
      x.beginPath(); x.arc(0, 0, 64, -Math.PI / 2, Math.PI / 2, false);
      x.arc(-26, 0, 64, Math.PI / 2, -Math.PI / 2, true);
      x.closePath(); x.fill();
    } else if (idx === 1) {
      x.beginPath(); x.arc(0, 0, 42, 0, Math.PI * 2); x.fill();
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2;
        x.beginPath(); x.moveTo(Math.cos(a) * 56, Math.sin(a) * 56); x.lineTo(Math.cos(a) * 84, Math.sin(a) * 84); x.stroke();
      }
    } else if (idx === 2) {
      x.beginPath();
      for (var j = 0; j < 4; j++) {
        var aa = -Math.PI / 2 + j * Math.PI / 2, a2 = aa + Math.PI / 4;
        x.lineTo(Math.cos(aa) * 88, Math.sin(aa) * 88); x.lineTo(Math.cos(a2) * 20, Math.sin(a2) * 20);
      }
      x.closePath(); x.fill();
    } else {
      x.beginPath(); x.arc(0, 0, 46, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(0, 0, 86, 26, -0.35, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
    x.fillStyle = '#D8B776';
    x.font = '500 58px "Cormorant Garamond", Georgia, serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(['I', 'II', 'III', 'IV'][idx], w / 2, h - 86);
    for (var s = 0; s < 60; s++) {
      x.fillStyle = 'rgba(233,207,156,' + (Math.random() * 0.05) + ')';
      x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  function makeCardBackTexture() {
    var w = 512, h = 864;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#10131f'; x.fillRect(0, 0, w, h);
    var vg = x.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 540);
    vg.addColorStop(0, 'rgba(216,183,118,.10)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    drawOrnamentFrame(x, w, h);
    var cx = w / 2, cy = h / 2, i, aa, L;
    x.strokeStyle = 'rgba(233,207,156,.85)'; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, 150, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx, cy, 110, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 1.2;
    for (i = 0; i < 24; i++) {
      aa = i / 24 * Math.PI * 2;
      x.beginPath(); x.moveTo(cx + Math.cos(aa) * 110, cy + Math.sin(aa) * 110); x.lineTo(cx + Math.cos(aa) * 150, cy + Math.sin(aa) * 150); x.stroke();
    }
    x.fillStyle = 'rgba(233,207,156,.9)';
    for (i = 0; i < 8; i++) {
      aa = i / 8 * Math.PI * 2; L = i % 2 ? 58 : 96;
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(aa - 0.1) * L, cy + Math.sin(aa - 0.1) * L);
      x.lineTo(cx + Math.cos(aa) * L * 1.12, cy + Math.sin(aa) * L * 1.12);
      x.lineTo(cx + Math.cos(aa + 0.1) * L, cy + Math.sin(aa + 0.1) * L);
      x.closePath(); x.fill();
    }
    x.beginPath(); x.arc(cx, cy, 16, 0, Math.PI * 2); x.fill();
    for (var s = 0; s < 50; s++) {
      x.fillStyle = 'rgba(233,207,156,' + (Math.random() * 0.05) + ')';
      x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  var RUNES = [
    [[[.34, .12], [.34, .88]], [[.34, .30], [.68, .14]], [[.34, .52], [.68, .36]]],
    [[[.30, .12], [.30, .88]], [[.70, .12], [.70, .72], [.30, .88]]],
    [[[.38, .12], [.38, .88]], [[.38, .32], [.68, .47], [.38, .62]]],
    [[[.36, .12], [.36, .88]], [[.36, .28], [.68, .44]], [[.36, .48], [.68, .64]]],
    [[[.34, .12], [.34, .88]], [[.34, .16], [.68, .40], [.34, .60], [.68, .88]]]
  ];

  function makeRuneTexture(strokes) {
    var S = 256;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S * 0.52);
    g.addColorStop(0, '#3d3550'); g.addColorStop(0.7, '#282238'); g.addColorStop(1, '#191428');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(46, 20);
    x.quadraticCurveTo(S / 2, 6, S - 46, 22);
    x.quadraticCurveTo(S - 14, S / 2, S - 44, S - 22);
    x.quadraticCurveTo(S / 2, S - 8, 44, S - 24);
    x.quadraticCurveTo(12, S / 2, 46, 20);
    x.closePath(); x.fill();
    strokes.forEach(function (st) {
      [[2, 3, 'rgba(10,8,16,.8)', 15], [0, 0, '#E6D6AC', 9]].forEach(function (cfg) {
        x.strokeStyle = cfg[2];
        x.lineWidth = cfg[3]; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath();
        st.forEach(function (p, i) {
          var px = p[0] * S + cfg[0], py = p[1] * S + cfg[1];
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        });
        x.stroke();
      });
    });
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050309, 1);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 0.55, 6.5);
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0x50446e, 0.7));
    var warm = new THREE.PointLight(0xe9b96a, 1.2, 10);
    warm.position.set(-2.4, 1.7, 1.8);
    scene.add(warm);
    var cool = new THREE.PointLight(0x6f5fc0, 0.75, 12);
    cool.position.set(2.6, 2.3, -2.6);
    scene.add(cool);

    roomGroup = new THREE.Group();
    scene.add(roomGroup);

    var backdropProc = new THREE.Mesh(
      new THREE.PlaneGeometry(17, 9.6),
      new THREE.MeshBasicMaterial({ map: makeBackdropTexture(), transparent: true, opacity: 1 })
    );
    backdropProc.position.set(0, 0.4, -6);
    roomGroup.add(backdropProc);
    backdropArr.push(backdropProc);

    var backdropImg = new THREE.Mesh(
      new THREE.PlaneGeometry(17, 9.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.96, visible: false })
    );
    backdropImg.material.visible = false;
    backdropImg.position.set(0, 0.4, -5.95);
    roomGroup.add(backdropImg);
    backdropArr.push(backdropImg);
    new THREE.TextureLoader().load('assets/hero-room.jpg', function (tex) {
      tex.anisotropy = 4;
      backdropImg.material.map = tex;
      backdropImg.material.needsUpdate = true;
      backdropImg.material.visible = true;
      backdropProc.visible = false;
    }, undefined, function () {});

    var table = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.6, 0.28, 48),
      new THREE.MeshStandardMaterial({ color: 0x191322, roughness: 0.9, metalness: 0.05, transparent: true })
    );
    table.position.y = -0.99;
    roomGroup.add(table);

    var sheen = new THREE.Mesh(
      new THREE.CircleGeometry(4.3, 48),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(233,185,106,.16)', 'rgba(233,185,106,0)', 256), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.y = -0.849;
    roomGroup.add(sheen);

    var shadowTex = radialTexture('rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 256);
    function addShadow(x, z, s, op) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(s, s),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: op, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, -0.848, z);
      roomGroup.add(m);
    }
    addShadow(0, 0, 3.4, 0.55);

    var stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.46, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: 0x6b5631, metalness: 0.85, roughness: 0.35, transparent: true })
    );
    stand.position.y = -0.865;
    roomGroup.add(stand);

    cosmosMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.4 }, uVivid: { value: 0.55 } },
      vertexShader: COSMOS_VERT,
      fragmentShader: COSMOS_FRAG,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    cosmosMesh = new THREE.Mesh(new THREE.SphereGeometry(0.97, 48, 48), cosmosMat);
    cosmosMesh.position.set(0, 0.2, 0);
    scene.add(cosmosMesh);

    glassMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 1 }, uTint: { value: new THREE.Color(0xd8b776) } },
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      depthWrite: false
    });
    var glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 48, 48), glassMat);
    glass.position.set(0, 0.2, 0);
    scene.add(glass);

    var glowTex = radialTexture('rgba(242,220,168,.5)', 'rgba(242,220,168,0)', 256);
    var ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    ballGlow.scale.set(3.4, 3.4, 1);
    ballGlow.position.set(0, 0.2, -0.4);
    roomGroup.add(ballGlow);
    glows.push({ sprite: ballGlow, base: 3.4, op: 0.3, ph: 1.3, flicker: 0 });

    var hlTex = radialTexture('rgba(255,246,228,.9)', 'rgba(255,246,228,0)', 128);
    var hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: hlTex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    hl.scale.set(0.75, 0.75, 1);
    hl.position.set(-0.46, 0.76, 0.74);
    scene.add(hl);

    /* Карты — объёмные */
    var cardSideMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3a, roughness: 0.5, metalness: 0.35, transparent: true });
    var cardBackMat = new THREE.MeshStandardMaterial({ map: makeCardBackTexture(), roughness: 0.55, metalness: 0.2, transparent: true });
    var cardGeoBox = new THREE.BoxGeometry(0.78, 0.035, 1.3);
    function faceMat(i) {
      return new THREE.MeshStandardMaterial({ map: makeCardFaceTexture(i), roughness: 0.55, metalness: 0.2, transparent: true });
    }
    [[-1.75, 0.55, 0.5], [-1.6, 0.66, 0.66, 0.045]].forEach(function (d) {
      var m = new THREE.Mesh(cardGeoBox, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, cardBackMat, faceMat(0)]);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = d[2];
      m.position.set(d[0], -0.8325 + (d[3] || 0), d[1]);
      roomGroup.add(m);
      addShadow(d[0], d[1], 1.3, 0.4);
    });
    var rFlat = new THREE.Mesh(cardGeoBox, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, cardBackMat, faceMat(2)]);
    rFlat.rotation.x = -Math.PI / 2;
    rFlat.rotation.z = -0.35;
    rFlat.position.set(1.7, -0.8325, 0.8);
    roomGroup.add(rFlat);
    addShadow(1.7, 0.8, 1.3, 0.4);
    var lean = new THREE.Mesh(cardGeoBox, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, faceMat(1), cardBackMat]);
    lean.position.set(1.02, -0.24, 0.22);
    lean.rotation.set(-0.32, -0.5, 0.06);
    roomGroup.add(lean);
    addShadow(1.1, 0.5, 1.5, 0.45);

    /* Руны — объёмные огранённые камни */
    var stoneSide = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.95, transparent: true });
    var stoneGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.09, 7);
    var runeDefs = [[-0.9, 1.15, 0.3, 0], [-2.35, -0.3, -0.8, 1], [2.35, -0.15, 1.2, 2], [0.45, 1.6, -0.4, 3], [-1.35, -1.45, 2.0, 4]];
    runeDefs.forEach(function (d) {
      var topMat = new THREE.MeshStandardMaterial({ map: makeRuneTexture(RUNES[d[3]]), roughness: 0.9, transparent: true });
      var m = new THREE.Mesh(stoneGeo, [stoneSide, topMat, stoneSide]);
      m.position.set(d[0], -0.805, d[1]);
      m.rotation.y = d[2];
      m.scale.set(1 + rnd() * 0.25, 1, 1 + rnd() * 0.3);
      roomGroup.add(m);
      addShadow(d[0], d[1], 0.75, 0.4);
    });

    /* Туман */
    var fogTex = radialTexture('rgba(255,255,255,.55)', 'rgba(255,255,255,0)', 256);
    var fogDefs = MOBILE
      ? [[-2, 0.5, -1.2, 0x9a8cc8], [1.8, 0.1, -2, 0xd8b776]]
      : [[-2.4, 0.55, -1.3, 0x9a8cc8], [2.2, 0.25, -2.1, 0xd8b776], [0, -0.35, -3.1, 0x8a7fb0], [0.5, 0.7, -4.4, 0xb7a8f2]];
    fogDefs.forEach(function (d, i) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 4),
        new THREE.MeshBasicMaterial({ map: fogTex, color: d[3], transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.position.set(d[0], d[1], d[2]);
      m.userData.skipFade = true;
      roomGroup.add(m);
      fogPlanes.push({ mesh: m, bx: d[0], op: 0.16, sp: 0.18 + i * 0.07, ph: i * 1.7 });
    });

    /* Свечи */
    var candleGlow = radialTexture('rgba(255,196,120,.85)', 'rgba(255,196,120,0)', 128);
    [[-2.1, 0.85, 0.9, 1.5], [1.75, 0.6, 0.35, 1.1]].forEach(function (d, i) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: candleGlow, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.set(d[3], d[3], 1);
      s.position.set(d[0], d[1], d[2]);
      roomGroup.add(s);
      glows.push({ sprite: s, base: d[3], op: 0.5, ph: i * 2.6, flicker: 1 });
    });

    roomGroup.traverse(function (o) {
      if (o.isMesh && o.material && !o.userData.skipFade && o !== backdropImg) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function (mm) {
          mm.transparent = true;
          roomMats.push({ mat: mm, base: mm.opacity == null ? 1 : mm.opacity });
        });
      }
    });
    roomMats.push({ mat: backdropProc.material, base: 1 });
    roomMats.push({ mat: backdropImg.material, base: 0.96 });

    applyLayout();
    if (window.console) console.info('[Astra] режим: 3D (основная сцена). Апгрейд: assets/hero.mp4 или hero.jpg|png');
  }

  function applyLayout() {
    MOBILE = window.innerWidth < 760;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function camAt(p) {
    var startZ = MOBILE ? 7.4 : 6.5;
    var z, y;
    if (p < 0.45) {
      var t = ss(0, 1, p / 0.45);
      z = startZ - (startZ - 2.4) * t;
      y = 0.55 - (0.55 - 0.22) * t;
    } else if (p < 0.78) {
      var t2 = ss(0, 1, (p - 0.45) / 0.33);
      z = 2.4 - (2.4 - 1.05) * t2;
      y = 0.22 - (0.22 - 0.14) * t2;
    } else {
      var t3 = ss(0, 1, (p - 0.78) / 0.22);
      z = 1.05 - (1.05 - 0.34) * t3;
      y = 0.14 - (0.14 - 0.1) * t3;
    }
    return { x: Math.sin(p * Math.PI) * -0.22, y: y, z: z };
  }

  function sceneSuperseded() {
    return document.documentElement.classList.contains('has-hero-video') ||
           document.documentElement.classList.contains('has-photo-hero');
  }

  function animate() {
    if (sceneSuperseded()) { rafId = null; return; }
    rafId = requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    if (cosmosMat) cosmosMat.uniforms.uTime.value = t;
    cosmosMesh.rotation.y = t * 0.02;

    var P = (window.__astraScroll && typeof window.__astraScroll.hero === 'number') ? window.__astraScroll.hero : 0;

    var rf = 1 - ss(0.58, 0.8, P);
    roomGroup.visible = rf > 0.02;
    roomMats.forEach(function (m) { m.mat.opacity = m.base * rf; });

    var c = camAt(P);
    var amp = 0.4 * (1 - ss(0, 0.45, P));
    if (FINE && !REDUCED) {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
    }
    camera.position.set(c.x + mouse.x * amp, c.y - mouse.y * amp * 0.6 + Math.sin(t * 0.5) * 0.02, c.z);
    camera.lookAt(0, 0.16, 0);

    var fov = 55 + 9 * ss(0.45, 0.8, P);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }

    glassMat.uniforms.uOpacity.value = 1 - ss(0.52, 0.72, P);
    cosmosMat.uniforms.uOpacity.value = 0.4 + 0.6 * ss(0.05, 0.5, P);
    cosmosMat.uniforms.uVivid.value = 0.55 + 0.45 * ss(0.25, 0.75, P);

    fogPlanes.forEach(function (f) {
      f.mesh.position.x = f.bx + Math.sin(t * f.sp + f.ph) * 0.7;
      f.mesh.material.opacity = f.op * (0.75 + 0.25 * Math.sin(t * 0.45 + f.ph)) * rf;
    });
    glows.forEach(function (g) {
      var s = g.base * (g.flicker ? (0.9 + 0.07 * Math.sin(t * 11 + g.ph) + 0.04 * Math.sin(t * 23 + g.ph * 2)) : 1);
      g.sprite.scale.set(s, s, 1);
      g.sprite.material.opacity = g.op * rf;
    });

    var bs = 1 + 0.025 * ss(0, 1, P);
    backdropArr.forEach(function (b) {
      b.scale.set(bs, bs, 1);
      b.position.x = mouse.x * 0.18;
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', function () { if (renderer) applyLayout(); });

  if (FINE && !REDUCED) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId && !REDUCED && !sceneSuperseded() && scene) {
      clock.getDelta();
      animate();
    }
  });

  try {
    if (REDUCED) {
      init();
      renderer.render(scene, camera);
      window.addEventListener('resize', function () { applyLayout(); renderer.render(scene, camera); });
    } else {
      init();
      animate();
    }
  } catch (err) {
    canvas.style.display = 'none';
    if (window.console) console.warn('[Astra] 3D-сцена недоступна:', err);
  }

  /* страховка: если фото/видео так и не определились — проявляем 3D */
  setTimeout(function () {
    if (!document.documentElement.classList.contains('has-photo-hero') &&
        !document.documentElement.classList.contains('has-hero-video')) {
      document.documentElement.classList.add('mode-3d');
    }
  }, 3000);
})();
