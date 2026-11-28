// Anna Astra — точка входа (движок-ветка): скролл-хореография, UI, форма.
import { createWorld } from './world.js';

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;

window.__astraStatus?.push('✓ модуль main.js');
document.documentElement.classList.add('js');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ---------- 3D-сцена ---------- */
let world = null;
try {
  world = createWorld(qs('#sky'));
  window.__astraStatus?.push('✓ 3D-мир собран');
} catch (e) {
  console.warn('[Astra] движок не запустился:', e);
  window.__astraStatus?.push('✗ 3D-мир: ' + (e?.message || e));
}

/* ---------- Прелоадер ---------- */
const pre = qs('#preloader');
if (pre && !REDUCED) {
  const num = qs('.pre-num', pre);
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min(1, (now - t0) / 1100);
    if (num) num.textContent = String(Math.round(p * 100));
    if (p < 1) return requestAnimationFrame(tick);
    pre.classList.add('done');
    document.body.classList.add('loaded');
    setTimeout(() => pre.remove(), 700);
  })(t0);
} else if (pre) {
  pre.remove();
  document.body.classList.add('loaded');
}

/* ---------- Скролл-погружение (без библиотек) ---------- */
const heroUI = qs('.hero-ui');
const hint = qs('.scroll-hint');
const dim = qs('.page-dim');
const nav = qs('.nav');
function smooth(a, b, v) { let t = (v - a) / (b - a); t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function onScroll() {
  const y = scrollY;
  if (nav) nav.classList.toggle('scrolled', y > 40);
  const p = Math.max(0, Math.min(1, y / (2.6 * innerHeight)));
  if (world) world.setProgress(p);
  if (heroUI) {
    heroUI.style.opacity = String(Math.max(0, 1 - p / 0.22));
    heroUI.style.transform = 'translateY(' + (-p * 90) + 'px)';
  }
  if (hint) hint.style.opacity = String(Math.max(0, 1 - p / 0.1));
  if (dim) dim.style.opacity = String(smooth(0.78, 1, p) * 0.55);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Меню ---------- */
const burger = qs('.burger');
function openMenu() { document.body.classList.add('menu-open'); if (burger) burger.setAttribute('aria-expanded', 'true'); }
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  if (burger) burger.setAttribute('aria-expanded', 'false');
}
if (burger) burger.addEventListener('click', () => document.body.classList.contains('menu-open') ? closeMenu() : openMenu());

qsa('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  const el = id.length > 1 ? qs(id) : null;
  if (el) {
    e.preventDefault();
    closeMenu();
    el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
}));

/* ---------- Reveal ---------- */
if ('IntersectionObserver' in window && !REDUCED) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  qsa('[data-reveal]').forEach(el => io.observe(el));
} else {
  qsa('[data-reveal]').forEach(el => el.classList.add('in'));
}

/* ---------- Курсор ---------- */
if (FINE && !REDUCED) {
  const dot = qs('.cursor-dot'), ring = qs('.cursor-ring'), label = qs('.cursor-label');
  if (dot && ring) {
    document.body.classList.add('has-cursor');
    let cx = -100, cy = -100, rx = -100, ry = -100;
    addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    document.addEventListener('mouseleave', () => { dot.style.opacity = 0; ring.style.opacity = 0; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = 1; ring.style.opacity = 1; });
    (function loop() {
      rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
      dot.style.transform = `translate(${cx}px,${cy}px)`;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(loop);
    })();
    qsa('a, button, .tcard, input, textarea, label').forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('is-active');
        const host = el.closest('[data-cursor]');
        if (host && label) label.textContent = host.getAttribute('data-cursor');
      });
      el.addEventListener('mouseleave', () => { ring.classList.remove('is-active'); if (label) label.textContent = ''; });
    });
  }
}

/* ---------- Магнитные кнопки ---------- */
if (FINE && !REDUCED) {
  qsa('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.22}px,${(e.clientY - (r.top + r.height / 2)) * 0.3}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
  });
}

/* ---------- Таро-карты ---------- */
qsa('.tcard').forEach(card => {
  const inner = qs('.tcard-inner', card);
  const toggle = () => {
    card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', card.classList.contains('is-flipped') ? 'true' : 'false');
  };
  card.addEventListener('click', e => { if (!e.target.closest('a, button')) toggle(); });
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  if (FINE && !REDUCED) {
    card.addEventListener('mousemove', e => {
      if (card.classList.contains('is-flipped')) return;
      const r = card.getBoundingClientRect();
      inner.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -9 + 'deg');
      inner.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 11 + 'deg');
    });
    card.addEventListener('mouseleave', () => {
      inner.style.setProperty('--rx', '0deg');
      inner.style.setProperty('--ry', '0deg');
    });
  }
  qsa('[data-service]', card).forEach(btn => btn.addEventListener('click', () => {
    const inp = qs(`input[name="service"][value="${btn.getAttribute('data-service')}"]`);
    if (inp) inp.checked = true;
    qs('#booking')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  }));
});

/* ---------- FAQ ---------- */
qsa('.faq-item').forEach(item => {
  const btn = qs('.faq-q', item), panel = qs('.faq-a', item);
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    qsa('.faq-item.open').forEach(o => {
      o.classList.remove('open');
      const p = qs('.faq-a', o); if (p) p.style.maxHeight = '';
      const b = qs('.faq-q', o); if (b) b.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
addEventListener('resize', () => qsa('.faq-item.open .faq-a').forEach(p => { p.style.maxHeight = p.scrollHeight + 'px'; }));

/* ---------- Форма ---------- */
const FORM_ENDPOINT = ''; // https://formspree.io/f/XXXXXXXX
const form = qs('#bookingForm');
const overlay = qs('#successOverlay');
function showSuccess() {
  if (!overlay) return;
  overlay.classList.add('show');
  qs('.succ-close', overlay)?.focus();
}
function hideSuccess() { if (overlay) overlay.classList.remove('show'); }
qs('.succ-close', overlay || document)?.addEventListener('click', hideSuccess);
if (overlay) {
  overlay.addEventListener('click', e => { if (e.target === overlay) hideSuccess(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') hideSuccess(); });
}
if (form) {
  const nameF = qs('#f-name'), contactF = qs('#f-contact'), dateF = qs('#f-date'),
        qF = qs('#f-question'), consentF = qs('#f-consent'),
        radiosWrap = qs('.service-radios', form), err = qs('.form-error', form),
        submitBtn = qs('.submit', form);
  if (dateF) dateF.min = new Date().toISOString().slice(0, 10);
  qsa('.sr-item input', form).forEach(r => r.addEventListener('change', () => {
    qsa('.sr-item', form).forEach(w => w.classList.toggle('checked', w.querySelector('input').checked));
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const svc = qs('input[name="service"]:checked', form);
    let ok = true;
    const mark = (el, bad) => { if (el) { el.classList.toggle('invalid', bad); if (bad) ok = false; } };
    mark(nameF?.closest('.field'), !nameF?.value.trim());
    mark(contactF?.closest('.field'), !(contactF?.value.trim().length > 2));
    mark(radiosWrap, !svc);
    mark(consentF?.closest('.consent'), !consentF?.checked);
    if (!ok) { if (err) err.textContent = 'Заполните выделенные поля — и заявка улетит к звёздам.'; return; }
    if (err) err.textContent = '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }
    const payload = {
      name: nameF.value.trim(), contact: contactF.value.trim(), service: svc.value,
      date: dateF?.value || null, question: qF?.value.trim() || null,
    };
    const finish = () => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
      form.reset();
      qsa('.sr-item', form).forEach(w => w.classList.remove('checked'));
      showSuccess();
    };
    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
        .then(finish)
        .catch(() => {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
          if (err) err.textContent = 'Не удалось отправить. Напишите напрямую в Telegram.';
        });
    } else {
      console.info('[Anna Astra] Демо-режим формы. Подключите FORM_ENDPOINT.', payload);
      setTimeout(finish, 800);
    }
  });
}

const yearEl = qs('#year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
