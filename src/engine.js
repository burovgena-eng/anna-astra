// Порт render-ядра из Dioramas (github.com/blendi-remade/dioramas), MIT License.
// Адаптировано для Anna Astra: тот же HDR-пайплайн — N8AO, mip-bloom, AgX, SMAA, зерно, виньетка.
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode,
  SMAAEffect, VignetteEffect, NoiseEffect, BlendFunction,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

export { THREE };

const TONE = {
  agx: ToneMappingMode.AGX, aces: ToneMappingMode.ACES_FILMIC, neutral: ToneMappingMode.NEUTRAL,
  reinhard: ToneMappingMode.REINHARD2, linear: ToneMappingMode.LINEAR,
};

export class Engine {
  constructor({
    canvas, fov = 35, near = 0.1, far = 400, dpr = 1.75, exposure = 1, background = 0x000000,
    shadows = true, alpha = false, post = {}, fixedSize = null,
  } = {}) {
    this.canvas = canvas;
    this.maxDpr = dpr;
    this.fixedSize = fixedSize;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha, stencil: false, depth: true, powerPreference: 'high-performance',
    });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping; // тонмаппинг — в пост-стеке (сначала HDR-bloom)
    r.shadowMap.enabled = shadows;
    r.shadowMap.type = THREE.PCFShadowMap;
    if (background !== null && !alpha) r.setClearColor(background, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.ticks = [];
    this.afters = [];
    this.resizers = [];
    this.paused = false;
    this.exposure = exposure;
    this.running = false;

    this.post = post === false ? null : this._buildPost(post);
    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize);
    this.resize();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clock.stop(); else { this.clock.start(); }
    });
  }

  _buildPost(p) {
    const composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(this.scene, this.camera));
    let ao = null;
    if (p.ao !== false) {
      ao = new N8AOPostPass(this.scene, this.camera, 1, 1);
      Object.assign(ao.configuration, {
        aoRadius: 1.2, distanceFalloff: 1.0, intensity: 2.2, denoiseSamples: 8, denoiseRadius: 12,
        aoSamples: 16, halfRes: true, gammaCorrection: false, ...(p.ao ?? {}),
      });
      composer.addPass(ao);
    }
    const effects = [];
    const bloom = p.bloom === false ? null : new BloomEffect({
      intensity: 0.9, luminanceThreshold: 0.85, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.72, levels: 8,
      ...(p.bloom ?? {}),
    });
    if (bloom) effects.push(bloom);
    const tone = new ToneMappingEffect({ mode: TONE[p.tone ?? 'agx'] });
    effects.push(tone);
    const vignette = p.vignette === false ? null : new VignetteEffect({ offset: 0.3, darkness: 0.62, ...(p.vignette ?? {}) });
    if (vignette) effects.push(vignette);
    const noise = p.noise === false ? null : new NoiseEffect({ premultiply: false, blendFunction: BlendFunction.OVERLAY });
    if (noise) { noise.blendMode.opacity.value = p.noise ?? 0.06; effects.push(noise); }
    composer.addPass(new EffectPass(this.camera, ...effects));
    if (p.smaa !== false) composer.addPass(new EffectPass(this.camera, new SMAAEffect()));
    return { composer, ao, bloom, tone, vignette, noise };
  }

  get size() { return { w: this._w, h: this._h, dpr: this._dpr }; }

  resize() {
    const w = this.fixedSize?.w ?? this.canvas.clientWidth ?? innerWidth;
    const h = this.fixedSize?.h ?? this.canvas.clientHeight ?? innerHeight;
    this._w = w || innerWidth; this._h = h || innerHeight;
    this._dpr = Math.min(devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(this._dpr);
    this.renderer.setSize(this._w, this._h, false);
    this.camera.aspect = this._w / this._h;
    this.camera.updateProjectionMatrix();
    if (this.post) this.post.composer.setSize(this._w, this._h, false);
    for (const f of this.resizers) f(this._w, this._h, this._dpr);
  }

  onTick(fn) { this.ticks.push(fn); return () => { this.ticks = this.ticks.filter(f => f !== fn); }; }
  onAfterRender(fn) { this.afters.push(fn); }
  onResize(fn) { this.resizers.push(fn); fn(this._w, this._h, this._dpr); }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(this.clock.getDelta(), 1 / 20);
      this.time += dt;
      for (const f of this.ticks) f(dt, this.time);
      if (this.paused) return;
      this.render(dt);
      for (const f of this.afters) f(dt, this.time);
    };
    this.clock.start();
    requestAnimationFrame(loop);
  }

  render(dt) {
    if (this.post) this.post.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}

/** Студийное окружение, запечённое в PMREM: тёмный купол + мягкие панели-софтбоксы. */
export function studioEnvironment(renderer, {
  top = 0x1a1a1f, bottom = 0x050506, panels = [], blur = 0.04,
} = {}) {
  const s = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.4, 0.8, vP.y)), 1.); }',
    }),
  );
  s.add(dome);
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity), side: THREE.DoubleSide }));
    m.position.set(...p.pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, blur);
  pm.dispose();
  return rt.texture;
}

/** Вписать объект в размер и поставить на y=0. */
export function normalize(obj, size = 2, { ground = true, axis = 'max' } = {}) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3());
  const ref = axis === 'y' ? dim.y : axis === 'x' ? dim.x : Math.max(dim.x, dim.y, dim.z);
  obj.scale.multiplyScalar(size / ref);
  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z;
  obj.position.y -= ground ? box.min.y : c.y;
  return obj;
}

/** Подготовка модели: тени, анизотропия, интенсивность окружения. */
export function prepModel(obj, renderer, { cast = true, receive = true, env = 1, rough = null, metal = null } = {}) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = cast; o.receiveShadow = receive;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) if (m[k]) m[k].anisotropy = aniso;
      if ('envMapIntensity' in m) m.envMapIntensity = env;
      if (rough !== null) m.roughness = rough;
      if (metal !== null) m.metalness = metal;
    }
  });
  return obj;
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
