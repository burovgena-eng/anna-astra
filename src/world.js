// Anna Astra — сцена «Погружение» на движке Dioramas (N8AO + bloom + AgX).
// Комната гаданий → стеклянный шар с космосом → пролёт сквозь стекло → космос-фон.
import * as THREE from 'three';
import { Engine, studioEnvironment, normalize, prepModel, smooth } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MOBILE = innerWidth < 760;
window.__astraStatus?.push('✓ three 0.186 загружен');

const COSMOS_VERT = 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }';
const COSMOS_FRAG = [
  'varying vec3 vDir;',
  'uniform float uTime; uniform float uOpacity; uniform float uVivid;',
  'float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
  'float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);',
  '  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),',
  '             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z); }',
  'float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }',
  'void main(){',
  '  vec3 d = normalize(vDir);',
  '  float n = fbm(d*2.6 + vec3(0.0, uTime*0.02, 0.0));',
  '  float n2 = fbm(d*5.2 - vec3(uTime*0.014, 0.0, 0.0));',
  '  vec3 col = mix(vec3(0.03,0.02,0.08), vec3(0.30,0.23,0.52), smoothstep(0.32,0.85,n));',
  '  col = mix(col, vec3(0.82,0.66,0.36), smoothstep(0.70,0.95,n2)*0.5);',
  '  vec3 g = d*240.0;',
  '  float s = step(0.9972, hash(floor(g)));',
  '  float tw = 0.8 + 0.2*sin(uTime*1.2 + hash(floor(g)+7.0)*40.0);',
  '  col += s*tw*vec3(0.92,0.87,0.72);',
  '  gl_FragColor = vec4(col*uVivid, uOpacity);',
  '}'
].join('\n');

function radialTexture(inner, outer, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function drawOrnamentFrame(x, w, h) {
  x.strokeStyle = '#C9A96A'; x.lineWidth = 3; x.strokeRect(20, 20, w-40, h-40);
  x.strokeStyle = 'rgba(201,169,106,.55)'; x.lineWidth = 1.5; x.strokeRect(34, 34, w-68, h-68);
  x.strokeStyle = '#E9CF9C'; x.lineWidth = 2;
  [[20,20,1,1],[w-20,20,-1,1],[20,h-20,1,-1],[w-20,h-20,-1,-1]].forEach(k => {
    x.beginPath(); x.moveTo(k[0]+34*k[2], k[1]); x.lineTo(k[0], k[1]); x.lineTo(k[0], k[1]+34*k[3]); x.stroke();
  });
}

function makeCardFaceTexture(idx) {
  const w = 512, h = 864;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#131020'; x.fillRect(0, 0, w, h);
  const vg = x.createRadialGradient(w/2, h/2, 80, w/2, h/2, 520);
  vg.addColorStop(0, 'rgba(216,183,118,.07)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = vg; x.fillRect(0, 0, w, h);
  drawOrnamentFrame(x, w, h);
  x.strokeStyle = 'rgba(233,207,156,.8)'; x.lineWidth = 2;
  x.beginPath(); x.arc(w/2, h/2-20, 120, 0, Math.PI*2); x.stroke();
  x.beginPath(); x.arc(w/2, h/2-20, 104, 0, Math.PI*2); x.stroke();
  x.save(); x.translate(w/2, h/2-20);
  x.strokeStyle = '#F2DCA8'; x.fillStyle = '#F2DCA8'; x.lineWidth = 4;
  if (idx === 0) {
    x.beginPath(); x.arc(0, 0, 64, -Math.PI/2, Math.PI/2, false);
    x.arc(-26, 0, 64, Math.PI/2, -Math.PI/2, true);
    x.closePath(); x.fill();
  } else if (idx === 1) {
    x.beginPath(); x.arc(0, 0, 42, 0, Math.PI*2); x.fill();
    for (let i = 0; i < 12; i++) {
      const a = i/12*Math.PI*2;
      x.beginPath(); x.moveTo(Math.cos(a)*56, Math.sin(a)*56); x.lineTo(Math.cos(a)*84, Math.sin(a)*84); x.stroke();
    }
  } else if (idx === 2) {
    x.beginPath();
    for (let j = 0; j < 4; j++) {
      const aa = -Math.PI/2 + j*Math.PI/2, a2 = aa + Math.PI/4;
      x.lineTo(Math.cos(aa)*88, Math.sin(aa)*88); x.lineTo(Math.cos(a2)*20, Math.sin(a2)*20);
    }
    x.closePath(); x.fill();
  } else {
    x.beginPath(); x.arc(0, 0, 46, 0, Math.PI*2); x.fill();
    x.beginPath(); x.ellipse(0, 0, 86, 26, -0.35, 0, Math.PI*2); x.stroke();
  }
  x.restore();
  x.fillStyle = '#D8B776';
  x.font = '500 58px "Cormorant Garamond", Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(['I','II','III','IV'][idx], w/2, h-86);
  for (let s = 0; s < 60; s++) {
    x.fillStyle = 'rgba(233,207,156,' + (Math.random()*0.05) + ')';
    x.fillRect(Math.random()*w, Math.random()*h, 1.6, 1.6);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCardBackTexture() {
  const w = 512, h = 864;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#10131f'; x.fillRect(0, 0, w, h);
  const vg = x.createRadialGradient(w/2, h/2, 60, w/2, h/2, 540);
  vg.addColorStop(0, 'rgba(216,183,118,.10)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = vg; x.fillRect(0, 0, w, h);
  drawOrnamentFrame(x, w, h);
  const cx = w/2, cy = h/2;
  x.strokeStyle = 'rgba(233,207,156,.85)'; x.lineWidth = 2;
  x.beginPath(); x.arc(cx, cy, 150, 0, Math.PI*2); x.stroke();
  x.beginPath(); x.arc(cx, cy, 110, 0, Math.PI*2); x.stroke();
  x.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const aa = i/24*Math.PI*2;
    x.beginPath(); x.moveTo(cx+Math.cos(aa)*110, cy+Math.sin(aa)*110); x.lineTo(cx+Math.cos(aa)*150, cy+Math.sin(aa)*150); x.stroke();
  }
  x.fillStyle = 'rgba(233,207,156,.9)';
  for (let i = 0; i < 8; i++) {
    const aa = i/8*Math.PI*2, L = i%2 ? 58 : 96;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx+Math.cos(aa-0.1)*L, cy+Math.sin(aa-0.1)*L);
    x.lineTo(cx+Math.cos(aa)*L*1.12, cy+Math.sin(aa)*L*1.12);
    x.lineTo(cx+Math.cos(aa+0.1)*L, cy+Math.sin(aa+0.1)*L);
    x.closePath(); x.fill();
  }
  x.beginPath(); x.arc(cx, cy, 16, 0, Math.PI*2); x.fill();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const RUNES = [
  [[[.34,.12],[.34,.88]], [[.34,.30],[.68,.14]], [[.34,.52],[.68,.36]]],
  [[[.30,.12],[.30,.88]], [[.70,.12],[.70,.72],[.30,.88]]],
  [[[.38,.12],[.38,.88]], [[.38,.32],[.68,.47],[.38,.62]]],
  [[[.36,.12],[.36,.88]], [[.36,.28],[.68,.44]], [[.36,.48],[.68,.64]]],
  [[[.34,.12],[.34,.88]], [[.34,.16],[.68,.40],[.34,.60],[.68,.88]]]
];

function makeRuneTexture(strokes) {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(S*0.4, S*0.35, 10, S/2, S/2, S*0.52);
  g.addColorStop(0, '#3d3550'); g.addColorStop(0.7, '#282238'); g.addColorStop(1, '#191428');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(46, 20);
  x.quadraticCurveTo(S/2, 6, S-46, 22);
  x.quadraticCurveTo(S-14, S/2, S-44, S-22);
  x.quadraticCurveTo(S/2, S-8, 44, S-24);
  x.quadraticCurveTo(12, S/2, 46, 20);
  x.closePath(); x.fill();
  strokes.forEach(st => {
    [[2, 3, 'rgba(10,8,16,.8)', 15], [0, 0, '#E6D6AC', 9]].forEach(cfg => {
      x.strokeStyle = cfg[2]; x.lineWidth = cfg[3]; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath();
      st.forEach((p, i) => {
        const px = p[0]*S + cfg[0], py = p[1]*S + cfg[1];
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      });
      x.stroke();
    });
  });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const MODELS = [
  { name: 'astrolabe', local: 'assets/models/astrolabe.glb',
    remote: 'https://raw.githubusercontent.com/blendi-remade/dioramas/main/public/models/reliquary/astrolabe.glb',
    pos: [-1.95, -0.85, 0.05], size: 1.15, rotY: 0.55 },
  { name: 'quartz', local: 'assets/models/quartz.glb',
    remote: 'https://raw.githubusercontent.com/blendi-remade/dioramas/main/public/models/lithos/quartz.glb',
    pos: [2.05, -0.85, -0.5], size: 0.9, rotY: -0.4 },
  /* ВАША модель из Meshy: скачайте GLB и загрузите в assets/models/ — задайте pos/size */
];

export function createWorld(canvas) {
  window.__astraStatus?.push('✓ сборка сцены…');
  const engine = new Engine({
    canvas, fov: 45, background: 0x050309, exposure: 1.15,
    post: MOBILE
      ? { ao: false, bloom: { intensity: 0.9, luminanceThreshold: 0.75 }, tone: 'agx', vignette: { offset: 0.3, darkness: 0.6 }, noise: 0.04 }
      : { ao: { intensity: 2.4, aoRadius: 1.4, distanceFalloff: 1.1 }, bloom: { intensity: 1.15, luminanceThreshold: 0.72, mipmapBlur: true, radius: 0.7 }, tone: 'agx', vignette: { offset: 0.3, darkness: 0.62 }, noise: 0.05 },
  });
  const { scene, camera, renderer } = engine;

  scene.environment = studioEnvironment(renderer, {
    top: 0x191430, bottom: 0x05040a,
    panels: [
      { pos: [-6, 2, 3], size: [4, 3], intensity: 4, color: 0xffb45e },
      { pos: [6, 3, -2], size: [3, 5], intensity: 2, color: 0x8f7bff },
      { pos: [0, 7, 0], size: [6, 2], intensity: 1.5, color: 0xbfb4ff },
    ],
  });
  window.__astraStatus?.push('✓ PMREM-студийный свет');
  scene.fog = new THREE.FogExp2(0x050309, 0.04);
  camera.position.set(0, 0.55, 6.5);

  scene.add(new THREE.AmbientLight(0x3a3350, 0.9));
  const candle = new THREE.PointLight(0xffb45e, 60, 14, 2);
  candle.position.set(-2.3, 1.2, 1.6);
  candle.castShadow = true;
  candle.shadow.mapSize.set(1024, 1024);
  candle.shadow.bias = -0.002;
  scene.add(candle);
  const rim = new THREE.PointLight(0x8f7bff, 25, 16, 2);
  rim.position.set(2.6, 2.2, -2.4);
  scene.add(rim);

  const room = new THREE.Group();
  scene.add(room);
  const roomMats = [];
  const reg = o => o.traverse(n => {
    if (!n.isMesh || !n.material) return;
    (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
      m.transparent = true;
      m.envMapIntensity = m.envMapIntensity ?? 0.8;
      roomMats.push({ mat: m, base: m.opacity ?? 1 });
    });
  });

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 11),
    new THREE.MeshStandardMaterial({ color: 0x0c0a16, roughness: 1, metalness: 0 })
  );
  backdrop.position.set(0, 1.5, -7);
  room.add(backdrop); reg(backdrop);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.6, 0.28, 64),
    new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.55, metalness: 0.1 })
  );
  table.position.y = -0.99;
  table.receiveShadow = true;
  room.add(table); reg(table);

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.46, 0.14, 32),
    new THREE.MeshStandardMaterial({ color: 0x8a6a30, metalness: 0.9, roughness: 0.3 })
  );
  stand.position.y = -0.865;
  stand.castShadow = true;
  room.add(stand); reg(stand);

  const cosmosMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.5 }, uVivid: { value: 0.7 } },
    vertexShader: COSMOS_VERT, fragmentShader: COSMOS_FRAG,
    side: THREE.BackSide, transparent: true, depthWrite: false,
  });
  const cosmos = new THREE.Mesh(new THREE.SphereGeometry(0.965, 64, 48), cosmosMat);
  cosmos.position.set(0, 0.2, 0);
  scene.add(cosmos);

  const glassMat = MOBILE
    ? new THREE.MeshPhysicalMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, clearcoat: 1 })
    : new THREE.MeshPhysicalMaterial({ transmission: 1, thickness: 1.4, roughness: 0.06, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4, specularIntensity: 1 });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 48), glassMat);
  glass.position.set(0, 0.2, 0);
  scene.add(glass);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture('rgba(242,220,168,.5)', 'rgba(242,220,168,0)'),
    transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.set(3.6, 3.6, 1);
  halo.position.set(0, 0.2, -0.5);
  room.add(halo);

  const hl = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture('rgba(255,246,228,.9)', 'rgba(255,246,228,0)', 128),
    transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  hl.scale.set(0.8, 0.8, 1);
  hl.position.set(-0.45, 0.75, 0.72);
  scene.add(hl);

  const cardSideMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3a, roughness: 0.5, metalness: 0.35 });
  const cardBackMat = new THREE.MeshStandardMaterial({ map: makeCardBackTexture(), roughness: 0.55, metalness: 0.2 });
  const cardGeo = new THREE.BoxGeometry(0.78, 0.035, 1.3);
  const faceMat = i => new THREE.MeshStandardMaterial({ map: makeCardFaceTexture(i), roughness: 0.55, metalness: 0.2 });
  [[-1.75, 0.55, 0.5], [-1.6, 0.66, 0.66, 0.045]].forEach(d => {
    const m = new THREE.Mesh(cardGeo, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, cardBackMat, faceMat(0)]);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = d[2];
    m.position.set(d[0], -0.8325 + (d[3] || 0), d[1]);
    m.castShadow = true; m.receiveShadow = true;
    room.add(m);
  });
  const rFlat = new THREE.Mesh(cardGeo, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, cardBackMat, faceMat(2)]);
  rFlat.rotation.x = -Math.PI / 2;
  rFlat.rotation.z = -0.35;
  rFlat.position.set(1.7, -0.8325, 0.8);
  rFlat.castShadow = true;
  room.add(rFlat);
  const lean = new THREE.Mesh(cardGeo, [cardSideMat, cardSideMat, cardSideMat, cardSideMat, faceMat(1), cardBackMat]);
  lean.position.set(1.02, -0.24, 0.22);
  lean.rotation.set(-0.32, -0.5, 0.06);
  lean.castShadow = true;
  room.add(lean);

  const stoneSide = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.95 });
  const stoneGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.09, 7);
  [[-0.9, 1.15, 0.3, 0], [-2.35, -0.3, -0.8, 1], [2.35, -0.15, 1.2, 2], [0.45, 1.6, -0.4, 3], [-1.35, -1.45, 2.0, 4]].forEach(d => {
    const topMat = new THREE.MeshStandardMaterial({ map: makeRuneTexture(RUNES[d[3]]), roughness: 0.9 });
    const m = new THREE.Mesh(stoneGeo, [stoneSide, topMat, stoneSide]);
    m.position.set(d[0], -0.805, d[1]);
    m.rotation.y = d[2];
    m.scale.set(1 + Math.random()*0.25, 1, 1 + Math.random()*0.3);
    m.castShadow = true; m.receiveShadow = true;
    room.add(m);
  });
  reg(room); // регистрация всех материалов комнаты для фейда при погружении

  const fogTex = radialTexture('rgba(255,255,255,.55)', 'rgba(255,255,255,0)');
  const fogPlanes = [];
  (MOBILE
    ? [[-2, 0.5, -1.2, 0x9a8cc8], [1.8, 0.1, -2, 0xd8b776]]
    : [[-2.4, 0.55, -1.3, 0x9a8cc8], [2.2, 0.25, -2.1, 0xd8b776], [0, -0.35, -3.1, 0x8a7fb0], [0.5, 0.7, -4.4, 0xb7a8f2]]
  ).forEach((d, i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 4),
      new THREE.MeshBasicMaterial({ map: fogTex, color: d[3], transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    m.position.set(d[0], d[1], d[2]);
    room.add(m);
    fogPlanes.push({ mesh: m, bx: d[0], op: 0.14, sp: 0.18 + i*0.07, ph: i*1.7 });
  });

  const candleGlowTex = radialTexture('rgba(255,196,120,.85)', 'rgba(255,196,120,0)', 128);
  const glows = [];
  [[-2.1, 0.85, 0.9, 1.5], [1.75, 0.6, 0.35, 1.1]].forEach((d, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: candleGlowTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(d[3], d[3], 1);
    s.position.set(d[0], d[1], d[2]);
    room.add(s);
    glows.push({ sprite: s, base: d[3], op: 0.5, ph: i*2.6 });
  });

  /* PBR-модели: локальные assets/models/, затем репозиторий Dioramas */
  const gltfLoader = new GLTFLoader();
  function tryModel(cfg, url, onFail) {
    gltfLoader.load(url, gltf => {
      try {
        const obj = gltf.scene;
        normalize(obj, cfg.size, { ground: true });
        obj.rotation.y = cfg.rotY;
        obj.position.set(cfg.pos[0], -0.85, cfg.pos[2]);
        prepModel(obj, renderer, { cast: true, receive: true, env: 1 });
        room.add(obj);
        reg(obj);
        window.__astraStatus?.push('✓ модель: ' + cfg.name + (url.indexOf('assets') === 0 ? ' (локально)' : ' (Dioramas)'));
      } catch (e) { console.warn('[Astra] модель не размещена:', cfg.name, e); }
    }, undefined, () => { if (onFail) onFail(); else window.__astraStatus?.push('⚠ модель недоступна: ' + cfg.name); });
  }
  function loadModels() {
    MODELS.forEach(cfg => tryModel(cfg, cfg.local, () => tryModel(cfg, cfg.remote, null)));
  }
  import('https://unpkg.com/meshoptimizer@0.20.0/meshopt_decoder.module.js')
    .then(m => { gltfLoader.setMeshoptDecoder(m.MeshoptDecoder || m.default); })
    .catch(() => {})
    .finally(loadModels);

  /* ---- прогресс скролла ---- */
  let P = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => {
      mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function camAt(p) {
    const startZ = MOBILE ? 7.4 : 6.5;
    let z, y;
    if (p < 0.45) {
      const t = smooth(0, 1, p / 0.45);
      z = startZ - (startZ - 2.4) * t;
      y = 0.55 - (0.55 - 0.22) * t;
    } else if (p < 0.78) {
      const t2 = smooth(0, 1, (p - 0.45) / 0.33);
      z = 2.4 - (2.4 - 1.05) * t2;
      y = 0.22 - (0.22 - 0.14) * t2;
    } else {
      const t3 = smooth(0, 1, (p - 0.78) / 0.22);
      z = 1.05 - (1.05 - 0.34) * t3;
      y = 0.14 - (0.14 - 0.1) * t3;
    }
    return { x: Math.sin(p * Math.PI) * -0.22, y, z };
  }

  engine.onTick((dt, t) => {
    cosmosMat.uniforms.uTime.value = t;
    cosmos.rotation.y = t * 0.02;

    const rf = 1 - smooth(0.58, 0.8, P);
    room.visible = rf > 0.02;
    roomMats.forEach(m => { m.mat.opacity = m.base * rf; });

    glass.visible = P < 0.64;
    cosmosMat.uniforms.uOpacity.value = 0.5 + 0.5 * smooth(0.05, 0.5, P);
    cosmosMat.uniforms.uVivid.value = 0.7 + 0.3 * smooth(0.25, 0.75, P);

    const c = camAt(P);
    const amp = 0.4 * (1 - smooth(0, 0.45, P));
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.set(c.x + mouse.x * amp, c.y - mouse.y * amp * 0.6 + Math.sin(t * 0.5) * 0.02, c.z);
    camera.lookAt(0, 0.16, 0);
    camera.fov = 45 + 10 * smooth(0.45, 0.8, P);
    camera.updateProjectionMatrix();

    fogPlanes.forEach(f => {
      f.mesh.position.x = f.bx + Math.sin(t * f.sp + f.ph) * 0.7;
      f.mesh.material.opacity = f.op * (0.75 + 0.25 * Math.sin(t * 0.45 + f.ph)) * rf;
    });
    glows.forEach(g => {
      const s = g.base * (0.9 + 0.07 * Math.sin(t * 11 + g.ph) + 0.04 * Math.sin(t * 23 + g.ph * 2));
      g.sprite.scale.set(s, s, 1);
      g.sprite.material.opacity = g.op * rf;
    });
    halo.material.opacity = 0.28 * rf;
    candle.intensity = 60 * (0.92 + 0.06 * Math.sin(t * 11) + 0.03 * Math.sin(t * 23));
  });

  engine.start();
  window.__astraStatus?.push('✓ сцена собрана и запущена');
  console.info('[Astra] движок Dioramas активен: N8AO + bloom + AgX');
  return { setProgress(p) { P = p; } };
}
