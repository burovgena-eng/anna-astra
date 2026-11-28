/* Anna Astra — интерактив: pinned-погружение, курсор, карты, форма.
   Чистая 3D-версия: без фото/видео веток. */
(function () {
  'use strict';

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var body = document.body;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var HAS_GSAP = !!window.gsap;
  var ANIM = HAS_GSAP && !REDUCED;

  /* страница всегда стартует сверху */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  html.classList.add(ANIM ? 'js-anim' : 'no-anim');
  if (ANIM && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function ss(a, b, x) {
    x = (x - a) / (b - a);
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  /* ---------- Прелоадер ---------- */
  var pre = qs('#preloader');
  function heroIn() {
    if (!ANIM) { qsa('[data-hero]').forEach(function (el) { el.style.opacity = 1; }); return; }
    gsap.to('[data-hero]', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 });
  }
  if (pre) {
    if (ANIM) {
      var num = qs('.pre-num', pre);
      var st = { v: 0 };
      var loaded = false, counted = false, exited = false;
      var tryExit = function () {
        if (exited || !loaded || !counted) return;
        exited = true;
        gsap.timeline({ onComplete: function () { pre.remove(); } })
          .to('.pre-wheel', { rotate: 200, transformOrigin: '50% 50%', duration: 0.7, ease: 'power3.inOut' })
          .to(pre, { opacity: 0, duration: 0.5, ease: 'power2.out', onStart: heroIn }, '-=0.2');
      };
      gsap.to(st, {
        v: 100, duration: 1.1, ease: 'power2.inOut',
        onUpdate: function () { num.textContent = String(Math.round(st.v)); },
        onComplete: function () { counted = true; tryExit(); }
      });
      var onReady = function () { loaded = true; tryExit(); };
      if (document.readyState === 'complete') onReady();
      else window.addEventListener('load', onReady, { once: true });
      setTimeout(function () { if (!loaded) { loaded = true; tryExit(); } }, 2600);
    } else { pre.remove(); heroIn(); }
  } else { heroIn(); }

  /* ---------- Навигация ---------- */
  var nav = qs('.nav');
  var burger = qs('.burger');
  function navState() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  function openMenu() { body.classList.add('menu-open'); if (burger) burger.setAttribute('aria-expanded', 'true'); }
  function closeMenu() {
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger) burger.addEventListener('click', function () {
    if (body.classList.contains('menu-open')) closeMenu(); else openMenu();
  });

  qsa('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id.length > 1 ? qs(id) : null;
      if (el) {
        e.preventDefault();
        closeMenu();
        el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Pinned-погружение ---------- */
  var heroUI = qs('.hero-ui');
  var hint = qs('.scroll-hint');
  var dim = qs('.page-dim');
  if (ANIM && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate: function (s) {
        var p = s.progress;
        window.__astraScroll = { hero: p };
        if (heroUI) {
          heroUI.style.opacity = String(Math.max(0, 1 - p / 0.22));
          heroUI.style.transform = 'translateY(' + (-p * 90) + 'px)';
        }
        if (hint) hint.style.opacity = String(Math.max(0, 1 - p / 0.1));
        if (dim) dim.style.opacity = String(ss(0.78, 1, p) * 0.55);
      }
    });

    qsa('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  } else {
    qsa('[data-reveal]').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------- Кастомный курсор ---------- */
  if (FINE && !REDUCED) {
    var dot = qs('.cursor-dot'), ring = qs('.cursor-ring'), label = qs('.cursor-label');
    if (dot && ring) {
      body.classList.add('has-cursor');
      var cx = -100, cy = -100, rx = -100, ry = -100;
      window.addEventListener('mousemove', function (e) { cx = e.clientX; cy = e.clientY; });
      document.addEventListener('mouseleave', function () { dot.style.opacity = 0; ring.style.opacity = 0; });
      document.addEventListener('mouseenter', function () { dot.style.opacity = 1; ring.style.opacity = 1; });
      (function loop() {
        rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
        dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        requestAnimationFrame(loop);
      })();
      qsa('a, button, .tcard, input, textarea, label').forEach(function (el) {
        el.addEventListener('mouseenter', function () {
          ring.classList.add('is-active');
          var host = el.closest ? el.closest('[data-cursor]') : null;
          if (host && label) label.textContent = host.getAttribute('data-cursor');
        });
        el.addEventListener('mouseleave', function () {
          ring.classList.remove('is-active');
          if (label) label.textContent = '';
        });
      });
    }
  }

  /* ---------- Магнитные кнопки ---------- */
  if (FINE && !REDUCED) {
    qsa('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var my = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = 'translate(0,0)'; });
    });
  }

  /* ---------- Таро-карты ---------- */
  function selectService(v) {
    var inp = qs('input[name="service"][value="' + v + '"]');
    if (inp) inp.checked = true;
  }
  qsa('.tcard').forEach(function (card) {
    var inner = qs('.tcard-inner', card);
    var toggle = function () {
      card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', card.classList.contains('is-flipped') ? 'true' : 'false');
    };
    card.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      toggle();
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    if (FINE && !REDUCED) {
      card.addEventListener('mousemove', function (e) {
        if (card.classList.contains('is-flipped')) return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.setProperty('--rx', (py * -9).toFixed(2) + 'deg');
        inner.style.setProperty('--ry', (px * 11).toFixed(2) + 'deg');
      });
      card.addEventListener('mouseleave', function () {
        inner.style.setProperty('--rx', '0deg');
        inner.style.setProperty('--ry', '0deg');
      });
    }
    qsa('[data-service]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectService(btn.getAttribute('data-service'));
        var b = qs('#booking');
        if (b) b.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  });

  /* ---------- FAQ ---------- */
  qsa('.faq-item').forEach(function (item) {
    var btn = qs('.faq-q', item), panel = qs('.faq-a', item);
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      qsa('.faq-item.open').forEach(function (o) {
        o.classList.remove('open');
        var p = qs('.faq-a', o); if (p) p.style.maxHeight = '';
        var b = qs('.faq-q', o); if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  window.addEventListener('resize', function () {
    qsa('.faq-item.open .faq-a').forEach(function (p) { p.style.maxHeight = p.scrollHeight + 'px'; });
  });

  /* ---------- Форма ---------- */
  var FORM_ENDPOINT = '';
  var form = qs('#bookingForm');
  var overlay = qs('#successOverlay');

  function showSuccess() {
    if (!overlay) return;
    overlay.classList.add('show');
    if (ANIM && qs('.succ-star', overlay)) {
      gsap.fromTo('.succ-star', { scale: 0.4, rotate: -50, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'back.out(1.7)' });
    }
    var c = qs('.succ-close', overlay); if (c) c.focus();
  }
  function hideSuccess() {
    if (!overlay) return;
    overlay.classList.remove('show');
  }
  if (overlay) {
    var cbtn = qs('.succ-close', overlay);
    if (cbtn) cbtn.addEventListener('click', hideSuccess);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hideSuccess(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideSuccess(); });
  }

  if (form) {
    var nameF = qs('#f-name'), contactF = qs('#f-contact'), dateF = qs('#f-date'),
        qF = qs('#f-question'), consentF = qs('#f-consent'),
        radiosWrap = qs('.service-radios', form), err = qs('.form-error', form),
        submitBtn = qs('.submit', form);
    if (dateF) dateF.min = new Date().toISOString().slice(0, 10);
    qsa('.sr-item input', form).forEach(function (r) {
      r.addEventListener('change', function () {
        qsa('.sr-item', form).forEach(function (w) {
          w.classList.toggle('checked', w.querySelector('input').checked);
        });
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var svc = qs('input[name="service"]:checked', form);
      var ok = true;
      function mark(el, bad) { if (el) { el.classList.toggle('invalid', bad); if (bad) ok = false; } }
      mark(nameF && nameF.closest('.field'), !(nameF && nameF.value.trim()));
      mark(contactF && contactF.closest('.field'), !(contactF && contactF.value.trim().length > 2));
      mark(radiosWrap, !svc);
      mark(consentF && consentF.closest('.consent'), !(consentF && consentF.checked));
      if (!ok) {
        if (err) err.textContent = 'Заполните выделенные поля — и заявка улетит к звёздам.';
        return;
      }
      if (err) err.textContent = '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }
      var payload = {
        name: nameF.value.trim(),
        contact: contactF.value.trim(),
        service: svc.value,
        date: (dateF && dateF.value) ? dateF.value : null,
        question: (qF && qF.value.trim()) ? qF.value.trim() : null
      };
      var finish = function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
        form.reset();
        qsa('.sr-item', form).forEach(function (w) { w.classList.remove('checked'); });
        showSuccess();
      };
      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        }).then(finish).catch(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
          if (err) err.textContent = 'Не удалось отправить. Напишите напрямую в Telegram.';
        });
      } else {
        console.info('[Anna Astra] Демо-режим формы. Подключите FORM_ENDPOINT — см. README.', payload);
        setTimeout(finish, 800);
      }
    });
  }

  var yearEl = qs('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
