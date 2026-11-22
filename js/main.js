/* ==========================================================================
   LA CHAPELLE OCCULTE — animations & interactions
   GSAP + ScrollTrigger + Lenis (copies locales dans js/vendor).
   Règles de fluidité : courbes expo/power3, transform & opacity en priorité,
   stagger partout, respect de prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const CFG = window.CHAPELLE || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isSmall = () => innerWidth < 960;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------------
     1. Contacts pilotés par la config (fonctionne même sans GSAP)
     ------------------------------------------------------------------ */
  function fmtPhone(p) {
    const d = String(p).replace(/[^\d+]/g, '');
    const fr = d.replace(/^\+33/, '0');
    return /^0\d{9}$/.test(fr) ? fr.replace(/(\d\d)(?=\d)/g, '$1 ') : p;
  }
  function initContacts() {
    const phone = (CFG.phone || '').trim();
    const email = (CFG.email || '').trim();
    if (phone) {
      $$('[data-needs="phone"]').forEach((el) => el.removeAttribute('hidden'));
      $$('[data-tel]').forEach((a) => a.setAttribute('href', 'tel:' + phone.replace(/\s+/g, '')));
      $$('[data-tel-label]').forEach((s) => (s.textContent = 'Appeler le ' + fmtPhone(phone)));
      const fab = $('#fab');
      if (fab) {
        fab.setAttribute('href', 'tel:' + phone.replace(/\s+/g, ''));
        fab.querySelector('span').textContent = 'Appeler';
        fab.querySelector('use').setAttribute('href', '#i-phone');
      }
    }
    if (email) {
      $$('[data-needs="email"]').forEach((el) => el.removeAttribute('hidden'));
      $$('[data-mail]').forEach((a) => a.setAttribute('href', 'mailto:' + email));
    }
    if (phone || email) {
      try {
        const node = $('#ld-json');
        const ld = JSON.parse(node.textContent);
        if (phone) ld.telephone = phone;
        if (email) ld.email = email;
        node.textContent = JSON.stringify(ld);
      } catch (e) { /* données structurées inchangées */ }
    }
  }

  /* ------------------------------------------------------------------
     2. Horaires : « ouvert / fermé » en direct (heure de Paris)
     ------------------------------------------------------------------ */
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function parisNow() {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: CFG.fuseau || 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const o = {};
    fmt.formatToParts(new Date()).forEach((p) => (o[p.type] = p.value));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
    return { day, min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
  }
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const label = (hhmm) => hhmm.replace(':', 'h');
  function initStatus() {
    const H = CFG.horaires || {};
    const now = parisNow();
    const today = H[now.day];
    let text, open = false;
    if (today && now.min >= toMin(today[0]) && now.min < toMin(today[1])) {
      open = true;
      text = 'Ouvert · jusqu’à ' + label(today[1]);
    } else {
      let next = null;
      for (let add = 0; add < 8 && !next; add++) {
        const d = (now.day + add) % 7;
        const h = H[d];
        if (!h) continue;
        if (add === 0 && now.min >= toMin(h[0])) continue;
        next = { add, d, h };
      }
      if (next) {
        const when = next.add === 0 ? 'aujourd’hui' : next.add === 1 ? 'demain' : DAYS[next.d];
        text = 'Fermé · rouvre ' + when + ' à ' + label(next.h[0]);
      } else text = 'Fermé';
    }
    $$('[data-status]').forEach((el) => { el.classList.toggle('is-open', open); el.querySelector('span').textContent = text; });
    const row = $('.hours__table tr[data-day="' + now.day + '"]');
    if (row) row.classList.add('is-today');
  }

  /* ------------------------------------------------------------------
     3. Séparateurs « arcades » (rangée d'arcs brisés, générée en SVG)
     ------------------------------------------------------------------ */
  let lastN = 0;
  function buildArcades() {
    const n = Math.max(6, Math.min(22, Math.round(innerWidth / 120)));
    if (n === lastN) return;
    lastN = n;
    const W = 1600, w = W / n;
    let d = 'M0 101 L0 100';
    for (let i = 0; i < n; i++) {
      const x = i * w;
      d += ` L${x.toFixed(1)} 100 C${x.toFixed(1)} 46 ${(x + w * 0.22).toFixed(1)} 12 ${(x + w / 2).toFixed(1)} 0 C${(x + w * 0.78).toFixed(1)} 12 ${(x + w).toFixed(1)} 46 ${(x + w).toFixed(1)} 100`;
    }
    d += ` L${W} 101 Z`;
    $$('.arcade').forEach((el) => {
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
    });
  }
  buildArcades();
  let rsT;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(buildArcades, 200); });

  initContacts();
  initStatus();
  setInterval(initStatus, 60000);

  /* ------------------------------------------------------------------
     4. Garde-fou : si GSAP n'est pas disponible, le site reste lisible
     ------------------------------------------------------------------ */
  const loader = $('#loader');
  if (!window.gsap || !window.ScrollTrigger) {
    if (loader) loader.classList.add('is-done');
    return;
  }
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  html.classList.add('is-loading');

  /* ---- Ogive : polygones identiques à ceux du CSS (pour les révélations) ---- */
  const OG = [[0, 100], [0, 45.9], [4, 28.9], [8, 22.4], [12, 17.7], [16, 13.9], [20, 10.9], [25, 7.8], [30, 5.3], [35, 3.3], [40, 1.8], [45, 0.7], [50, 0], [55, 0.7], [60, 1.8], [65, 3.3], [70, 5.3], [75, 7.8], [80, 10.9], [84, 13.9], [88, 17.7], [92, 22.4], [96, 28.9], [100, 45.9], [100, 100]];
  const poly = (pts) => 'polygon(' + pts.map((p) => p[0] + '% ' + p[1] + '%').join(',') + ')';
  const OG_FULL = poly(OG);
  const OG_HIDE = poly(OG.map((p) => [p[0], 100]));

  /* ---- Split text (lettres / mots avec masque) ---- */
  function split(el, mode) {
    const out = [];
    const frag = document.createElement('span');
    const walk = (node, target) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'words') {
              const w = document.createElement('span'); w.className = 'w';
              const c = document.createElement('span'); c.className = 'c'; c.textContent = tok;
              w.appendChild(c); target.appendChild(w); out.push(c);
            } else {
              const word = document.createElement('span');
              word.style.cssText = 'display:inline-block;white-space:nowrap';
              Array.from(tok).forEach((ch) => {
                const w = document.createElement('span'); w.className = 'w';
                const c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
                w.appendChild(c); word.appendChild(w); out.push(c);
              });
              target.appendChild(word);
            }
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { target.appendChild(n.cloneNode()); return; }
          const clone = n.cloneNode(false); target.appendChild(clone); walk(n, clone);
        }
      });
    };
    walk(el, frag);
    el.textContent = '';
    while (frag.firstChild) el.appendChild(frag.firstChild);
    return out;
  }

  /* ------------------------------------------------------------------
     5. Smooth scroll (Lenis) branché sur le ticker GSAP
     ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis;
  }
  const stopScroll = () => { if (lenis) lenis.stop(); html.classList.add('is-loading'); };
  const startScroll = () => { if (lenis) lenis.start(); html.classList.remove('is-loading'); };

  function scrollToHash(hash, quick) {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null || target === undefined) return;
    if (lenis) lenis.scrollTo(target, { duration: quick ? 0.01 : 1.7, easing: (t) => 1 - Math.pow(1 - t, 4), offset: 0 });
    else if (target === 0) scrollTo({ top: 0 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    e.preventDefault();
    closeMenu();
    scrollToHash(hash);
  });

  /* ------------------------------------------------------------------
     6. Initialisation : états de départ du hero
     ------------------------------------------------------------------ */
  const video = $('.hero__video');
  const saveData = navigator.connection && (navigator.connection.saveData || /(^|-)2g$|3g/.test(navigator.connection.effectiveType || ''));
  if (video) {
    if (reduce || saveData) { video.removeAttribute('autoplay'); video.pause(); if (saveData) { video.removeAttribute('src'); $$('source', video).forEach((s) => s.remove()); video.load(); } }
    else video.play().catch(() => {});
  }
  const heroChars = $$('.hero__title .split').flatMap((el) => split(el, 'chars'));
  if (!reduce) {
    gsap.set(heroChars, { yPercent: 118, rotate: 5 });
    gsap.set(['.hero__eyebrow', '.hero__lead', '.hero__cta', '.hero__foot'], { opacity: 0, y: 28 });
    gsap.set('.hero__skyline', { opacity: 0, yPercent: 10 });
    gsap.set('.hero__video', { scale: 1.2 });
  }

  /* ------------------------------------------------------------------
     7. Loader → grande ouverture des portes
     ------------------------------------------------------------------ */
  const num = $('#loadNum');
  function heroIntro() {
    if (reduce) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__video', { scale: 1.04, duration: 3.2, ease: 'power2.out' }, 0)
      .to('.hero__skyline', { opacity: 0.92, yPercent: 0, duration: 2, ease: 'power3.out' }, 0.1)
      .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 1.2 }, 0.25)
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.5, stagger: { each: 0.035, from: 'start' } }, 0.2)
      .to('.hero__lead', { opacity: 1, y: 0, duration: 1.3 }, 0.9)
      .to('.hero__cta', { opacity: 1, y: 0, duration: 1.3 }, 1.05)
      .to('.hero__foot', { opacity: 1, y: 0, duration: 1.2 }, 1.3);
  }
  async function runLoader() {
    if (reduce || !loader) {
      if (num) num.textContent = '100';
      if (loader) await new Promise((r) => gsap.to(loader, { autoAlpha: 0, duration: 0.4, onComplete: r }));
      loader && loader.classList.add('is-done');
      return;
    }
    const parts = $$('.loader__eye .ld');
    gsap.timeline()
      .to(parts, { strokeDashoffset: 0, duration: 1.5, stagger: 0.14, ease: 'power2.inOut' }, 0)
      .to('.loader__eye .ld-ticks', { opacity: 1, duration: 0.8 }, 0.6)
      .to('.loader__eye .ld-pupil', { scale: 1, duration: 0.9, ease: 'back.out(2.2)' }, 1.1)
      .from('.loader__name', { opacity: 0, y: 14, letterSpacing: '0.9em', duration: 1.3, ease: 'power3.out' }, 0.4);
    gsap.to('.loader__eye .ld-ticks', { rotation: 360, svgOrigin: '100 100', duration: 14, ease: 'none', repeat: -1 });

    const prog = { v: 0 };
    const paint = () => { if (num) num.textContent = Math.round(prog.v); };
    const ready = Promise.race([
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }))
      ]),
      wait(3200)
    ]);
    await Promise.all([
      new Promise((r) => gsap.to(prog, { v: 92, duration: 1.9, ease: 'power2.out', onUpdate: paint, onComplete: r })),
      ready
    ]);
    await new Promise((r) => gsap.to(prog, { v: 100, duration: 0.45, ease: 'power1.out', onUpdate: paint, onComplete: r }));
    await wait(120);

    await new Promise((resolve) => {
      gsap.timeline({ onComplete: resolve })
        .to('.loader__core', { opacity: 0, scale: 0.92, duration: 0.6, ease: 'power2.in' })
        .to('.loader__light', { opacity: 1, duration: 0.5 }, '<')
        .to('.loader__door--l', { xPercent: -101, duration: 1.5, ease: 'expo.inOut' }, '-=0.05')
        .to('.loader__door--r', { xPercent: 101, duration: 1.5, ease: 'expo.inOut' }, '<')
        .to('.loader__light', { opacity: 0, duration: 1 }, '<0.3')
        .add(heroIntro, '-=1.15');
    });
    loader.classList.add('is-done');
  }

  /* ------------------------------------------------------------------
     8. Navigation, progression, menu mobile
     ------------------------------------------------------------------ */
  const nav = $('#nav');
  const fab = $('#fab');
  let navHidden = false;
  function setupNav() {
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.25 } });
    const book = $('#reserver');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 40);
        const menuOpen = $('#menu').classList.contains('is-open');
        const shouldHide = !reduce && self.direction === 1 && y > 280 && !menuOpen;
        if (shouldHide !== navHidden && (shouldHide || self.direction === -1 || y <= 280)) {
          navHidden = shouldHide;
          gsap.to(nav, { yPercent: shouldHide ? -105 : 0, duration: 0.6, ease: 'power3.out', overwrite: true });
        }
        if (fab) {
          const r = book ? book.getBoundingClientRect() : null;
          const inBook = r && r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.2;
          fab.classList.toggle('is-on', y > innerHeight * 0.7 && !inBook);
        }
      }
    });
    nav.addEventListener('focusin', () => { if (navHidden) { navHidden = false; gsap.to(nav, { yPercent: 0, duration: 0.4, overwrite: true }); } });
  }

  const menu = $('#menu');
  const burger = $('#burger');
  let menuTl = null;
  function buildMenu() {
    const links = $$('.menu__links a');
    gsap.set($$('.menu__links a span, .menu__links a small'), { yPercent: 120 });
    menuTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
      .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 3rem) 2.4rem)', duration: 1.1 }, 0)
      .to($$('.menu__links a span, .menu__links a small'), { yPercent: 0, duration: 1, stagger: 0.035, ease: 'expo.out' }, 0.35)
      .from('.menu__foot', { opacity: 0, y: 16, duration: 0.8, ease: 'power3.out' }, 0.7);
    burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    links.forEach((a) => a.setAttribute('tabindex', '0'));
  }
  function openMenu() {
    if (!menuTl) return;
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu');
    if (navHidden) { navHidden = false; gsap.to(nav, { yPercent: 0, duration: 0.3 }); }
    stopScroll(); menuTl.timeScale(1).play();
  }
  function closeMenu() {
    if (!menuTl || !menu.classList.contains('is-open')) return;
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu');
    menuTl.timeScale(1.6).reverse().eventCallback('onReverseComplete', () => { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); });
    startScroll();
  }

  /* ------------------------------------------------------------------
     9. Braises (canvas) — premier plan du hero
     ------------------------------------------------------------------ */
  function embers() {
    const c = $('.hero__embers');
    if (!c || reduce) return;
    const ctx = c.getContext('2d');
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const sctx = sprite.getContext('2d');
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(0.25, 'rgba(227,153,74,.7)'); g.addColorStop(1, 'rgba(227,153,74,0)');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 64, 64);
    let w = 0, h = 0, dpr = 1, raf = 0, running = false;
    const N = isSmall() ? 26 : 64;
    const ps = Array.from({ length: N }, () => ({}));
    const spawn = (p, init) => {
      p.x = Math.random() * w; p.y = init ? Math.random() * h : h + 20;
      p.s = Math.random() * 9 + 3; p.vy = -(Math.random() * 0.55 + 0.18); p.vx = (Math.random() - 0.5) * 0.25;
      p.a = Math.random() * 0.55 + 0.25; p.t = Math.random() * 6.28; p.f = Math.random() * 0.03 + 0.012;
    };
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); ps.forEach((p) => spawn(p, true));
    addEventListener('resize', resize);
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.t += p.f; p.x += p.vx + Math.sin(p.t) * 0.28; p.y += p.vy;
        const k = Math.max(0, Math.min(1, p.y / h));
        if (p.y < -20) spawn(p, false);
        ctx.globalAlpha = p.a * (0.35 + k * 0.65) * (0.7 + 0.3 * Math.sin(p.t * 3));
        ctx.drawImage(sprite, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver((es) => {
      const on = es[0].isIntersecting;
      if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe($('.hero'));
  }

  /* ------------------------------------------------------------------
     10. Scroll-driven : hero, marquee, révélations, parallax, compteurs…
     ------------------------------------------------------------------ */
  function setupHero() {
    if (reduce) return;
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__video', { yPercent: 9, ease: 'none' }, 0)
      .to('.hero__skyline', { yPercent: 16, ease: 'none' }, 0)
      .to('.hero__content', { yPercent: -16, ease: 'none' }, 0)
      .to('.hero__content', { opacity: 0, ease: 'power1.in', duration: 0.6 }, 0.1);
    if (finePointer) {
      const layers = [['.hero__video', 14], ['.hero__skyline', -26], ['.hero__content', -8]].map(([sel, amp]) => ({
        amp, x: gsap.quickTo(sel, 'x', { duration: 1.4, ease: 'power3' }), y: gsap.quickTo(sel, 'y', { duration: 1.4, ease: 'power3' })
      }));
      $('.hero').addEventListener('mousemove', (e) => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        layers.forEach((l) => { l.x(nx * l.amp); l.y(ny * l.amp * 0.6); });
      });
    }
  }

  function setupMarquee() {
    if (reduce) return;
    const tweens = $$('.marquee__row').map((row) => {
      const dir = parseFloat(row.dataset.dir) || -1;
      const track = $('.marquee__track', row);
      return gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, ease: 'none', duration: 38, repeat: -1 });
    });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 6);
        tweens.forEach((tw) => gsap.to(tw, { timeScale: self.direction * boost, duration: 0.5, overwrite: true }));
      }
    });
    ScrollTrigger.addEventListener('scrollEnd', () => tweens.forEach((tw) => gsap.to(tw, { timeScale: Math.sign(tw.timeScale()) || 1, duration: 1.2, overwrite: true })));
  }

  function setupReveals() {
    if (reduce) return;
    // Titres : mot par mot, masque qui monte
    $$('.h2 .split, .cta__title .split').forEach((el) => {
      const words = split(el, 'words');
      gsap.from(words, { yPercent: 115, duration: 1.3, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('.eyebrow').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from(el, { opacity: 0, x: -24, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    // Blocs génériques
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 54, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    ['.section-head__p', '.book__intro > p', '.book__points', '.cta__lead', '.cta__actions', '.rev__score', '.find__addr', '.hours', '.route', '.find__actions', '.gal__more', '.serv__hint'].forEach((sel) => {
      $$(sel).forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
    });
    $$('.faq details').forEach((el, i) => gsap.from(el, { y: 30, opacity: 0, duration: 0.9, delay: i * 0.05, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 94%', once: true } }));
    gsap.from('.wiz', { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.wiz', start: 'top 88%', once: true } });
    gsap.from('.rev__viewport', { y: 70, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.rev__viewport', start: 'top 90%', once: true } });
    gsap.from('.find__map', { clipPath: 'inset(0 0 100% 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.find__map', start: 'top 85%', once: true } });
  }

  function setupImages() {
    if (reduce) return;
    // Artistes : cadre ogive qui s'ouvre + cercle qui s'agrandit, image qui glisse dans son cadre
    $$('.artist').forEach((art) => {
      const a = $('.artist__fig--a', art), b = $('.artist__fig--b', art), media = $('.artist__media', art);
      gsap.fromTo(a, { clipPath: OG_HIDE }, { clipPath: OG_FULL, duration: 1.8, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: media, start: 'top 80%', once: true } });
      gsap.fromTo(b, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 1.9, delay: 0.25, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: media, start: 'top 78%', once: true } });
      [a, b].forEach((fig) => {
        gsap.fromTo($('img', fig), { yPercent: -7, scale: 1.17 }, { yPercent: 7, scale: 1.17, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
        const sp = parseFloat(fig.dataset.speed) || 0;
        gsap.fromTo(fig, { y: sp * 420 }, { y: -sp * 420, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    // Fonds : parallax doux
    ['.stats__bg img', '.cta__bg img'].forEach((sel) => {
      const img = $(sel); if (!img) return;
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Galerie : rideau (rect) ou ogive, puis décalage de profondeur
    $$('.gal__item').forEach((li, i) => {
      const isOg = li.classList.contains('ogive');
      gsap.fromTo(li, { clipPath: isOg ? OG_HIDE : 'inset(100% 0% 0% 0%)' }, { clipPath: isOg ? OG_FULL : 'inset(0% 0% 0% 0%)', duration: 1.7, delay: (i % 4) * 0.1, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
      gsap.from($('img', li), { scale: 1.35, duration: 2.2, delay: (i % 4) * 0.1, ease: 'expo.out', clearProps: 'transform', scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
      const sp = parseFloat(li.dataset.speed) || 0;
      if (sp && !isSmall()) gsap.fromTo(li, { y: sp * 380 }, { y: -sp * 380, ease: 'none', scrollTrigger: { trigger: '.gal__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  function setupCounters() {
    $$('.count').forEach((el) => {
      const to = parseFloat(el.dataset.to) || 0, dec = parseInt(el.dataset.dec || '0', 10), sfx = el.dataset.suffix || '';
      const paint = (v) => { el.innerHTML = v.toFixed(dec).replace('.', ',') + (sfx ? '<span class="sfx">' + sfx + '</span>' : ''); };
      if (reduce) { paint(to); return; }
      const o = { v: 0 }; paint(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: 2.4, ease: 'power3.out', onUpdate: () => paint(o.v), onComplete: () => paint(to) })
      });
    });
    if (!reduce) gsap.from('.stats__grid li', { y: 60, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.stats__grid', start: 'top 85%', once: true } });
  }

  /* ---- Storytelling pinné + défilement horizontal + versions mobiles ---- */
  function setupMedia() {
    const mm = gsap.matchMedia();

    mm.add('(min-width: 960px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)', () => {
      html.classList.add('is-pinned-layout');
      const steps = $$('.story .step');
      const dots = $$('.story__dots li');
      const n = steps.length;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.story__pin', start: 'top top', end: () => '+=' + Math.round(innerHeight * 0.95 * n),
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.min(n - 1, Math.floor(self.progress * n + 0.001));
            dots.forEach((d, k) => d.classList.toggle('is-on', k <= i));
          }
        }
      });
      dots[0] && dots[0].classList.add('is-on');
      tl.fromTo('.story__bg img', { yPercent: -7 }, { yPercent: 7, duration: n }, 0);
      steps.forEach((st, i) => {
        const body = $('.step__body', st), fig = $('.step__fig', st), img = $('img', fig), num = $('.step__num', st);
        if (i > 0) {
          gsap.set(st, { autoAlpha: 0 });
          tl.fromTo(st, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, i - 0.06)
            .fromTo(fig, { clipPath: OG_HIDE }, { clipPath: OG_FULL, duration: 0.5, ease: 'power3.inOut' }, i - 0.06)
            .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 0.7, ease: 'power2.out' }, i - 0.06)
            .fromTo(num, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, i + 0.04)
            .fromTo($$('h3, p', body), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power3.out' }, i + 0.08);
        }
        if (i < n - 1) {
          tl.to(body, { y: -50, opacity: 0, duration: 0.2, ease: 'power2.in' }, i + 0.78)
            .to(fig, { scale: 0.94, opacity: 0, duration: 0.2, ease: 'power2.in' }, i + 0.78)
            .to(st, { autoAlpha: 0, duration: 0.02 }, i + 0.98);
        }
      });
      return () => html.classList.remove('is-pinned-layout');
    });

    mm.add('(min-width: 960px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)', () => {
      html.classList.add('is-hscroll');
      const track = $('.serv__track'), pin = $('.serv__pin'), vp = $('.serv__viewport');
      const dist = () => {
        const cs = getComputedStyle(vp);
        return Math.max(0, track.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) - innerWidth);
      };
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true }
      });
      $$('.scard:not(.scard--end)').forEach((card) => {
        gsap.fromTo($('img', card), { scale: 1.22, xPercent: -7 }, { scale: 1.22, xPercent: 7, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(card, { opacity: 0.25, y: 40, ease: 'power2.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 105%', end: 'left 70%', scrub: true } });
      });
      return () => html.classList.remove('is-hscroll');
    });

    // Version allégée : mobile, tablette ou mouvement réduit → empilé, révélations simples
    mm.add('(max-width: 959px), (max-height: 599px)', () => {
      if (reduce) return;
      $$('.step').forEach((st) => {
        gsap.from($$('.step__body > *', st), { y: 40, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: st, start: 'top 82%', once: true } });
        gsap.fromTo($('.step__fig', st), { clipPath: OG_HIDE }, { clipPath: OG_FULL, duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: st, start: 'top 75%', once: true } });
      });
      $$('.scard').forEach((c, i) => gsap.from(c, { opacity: 0, y: 40, duration: 0.9, delay: Math.min(i, 2) * 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.serv__viewport', start: 'top 90%', once: true } }));
    });
  }

  /* ---- Tilt 3D + reflet lumineux, boutons magnétiques, curseur ---- */
  function setupPointerFX() {
    if (!finePointer || reduce) return;
    $$('.tilt').forEach((el) => {
      const rect = () => el.getBoundingClientRect();
      el.addEventListener('pointermove', (e) => {
        const r = rect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%');
        gsap.to(el, { rotationY: (px - 0.5) * 12, rotationX: (0.5 - py) * 12, transformPerspective: 900, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' });
        el.classList.remove('is-tilting');
      });
    });
    $$('[data-magnetic]').forEach((el) => {
      const lab = $('.btn__label', el);
      const xt = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1,.5)' }), yt = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1,.5)' });
      const lx = lab ? gsap.quickTo(lab, 'x', { duration: 0.8, ease: 'elastic.out(1,.5)' }) : null, ly = lab ? gsap.quickTo(lab, 'y', { duration: 0.8, ease: 'elastic.out(1,.5)' }) : null;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        xt(dx * 0.28); yt(dy * 0.4); if (lx) { lx(dx * 0.12); ly(dy * 0.18); }
      });
      el.addEventListener('pointerleave', () => { xt(0); yt(0); if (lx) { lx(0); ly(0); } });
    });
    // Curseur étoile
    const cur = $('.cursor');
    if (cur) {
      const x = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), y = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      addEventListener('pointermove', (e) => { cur.classList.add('is-on'); x(e.clientX); y(e.clientY); }, { passive: true });
      document.addEventListener('pointerover', (e) => cur.classList.toggle('is-link', !!e.target.closest('a, button, summary, label, [data-magnetic], .gal__btn')));
      document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    }
  }

  /* ---- Avis : carrousel (flèches, glisser, lecture auto) ---- */
  function setupReviews() {
    const vp = $('.rev__viewport'), track = $('.rev__track');
    if (!vp || !track) return;
    const cards = $$('.rcard', track), prev = $('[data-prev]'), next = $('[data-next]'), cur = $('[data-cur]'), total = $('[data-total]');
    let i = 0, timer = null, drag = null, hovering = false;
    total.textContent = cards.length;
    const pad = () => parseFloat(getComputedStyle(vp).paddingLeft) || 0;
    const maxX = () => Math.max(0, track.scrollWidth - (vp.clientWidth - pad() * 2));
    const posOf = (k) => Math.min(cards[k].offsetLeft, maxX());
    const mark = () => { cards.forEach((c, k) => c.classList.toggle('is-active', k === i)); cur.textContent = i + 1; };
    function go(k, instant) {
      i = (k + cards.length) % cards.length;
      gsap.to(track, { x: -posOf(i), duration: instant || reduce ? 0 : 1.15, ease: 'expo.out', overwrite: true });
      mark();
    }
    const play = () => { stop(); if (reduce) return; timer = setInterval(() => { if (!hovering && !drag) go(i + 1); }, 6500); };
    const stop = () => clearInterval(timer);
    prev.addEventListener('click', () => { go(i - 1); play(); });
    next.addEventListener('click', () => { go(i + 1); play(); });
    vp.addEventListener('mouseenter', () => (hovering = true));
    vp.addEventListener('mouseleave', () => (hovering = false));
    vp.addEventListener('focusin', () => (hovering = true));
    vp.addEventListener('focusout', () => (hovering = false));
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { x: e.clientX, tx: gsap.getProperty(track, 'x'), moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) { drag.moved = true; vp.classList.add('is-drag'); }
      if (drag.moved) gsap.set(track, { x: Math.max(-maxX() - 60, Math.min(60, drag.tx + dx)) });
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      const moved = drag.moved; drag = null; vp.classList.remove('is-drag');
      if (!moved) return;
      const x = -gsap.getProperty(track, 'x');
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const d = Math.abs(posOf(k) - x); if (d < bd) { bd = d; best = k; } });
      go(best); play();
    });
    vp.setAttribute('tabindex', '0');
    vp.setAttribute('aria-label', 'Avis clients — utilise les flèches du clavier pour naviguer');
    vp.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { go(i + 1); play(); } if (e.key === 'ArrowLeft') { go(i - 1); play(); } });
    addEventListener('resize', () => go(i, true));
    new IntersectionObserver((es) => (es[0].isIntersecting ? play() : stop()), { threshold: 0.25 }).observe(vp);
    mark();
  }

  /* ---- Lightbox de la galerie ---- */
  function setupLightbox() {
    const lb = $('#lightbox'); if (!lb) return;
    const img = $('img', lb), cap = $('figcaption', lb), items = $$('.gal__btn');
    const btnClose = $('.lightbox__close', lb), prev = $('.lightbox__nav--prev', lb), next = $('.lightbox__nav--next', lb);
    let idx = 0, opener = null;
    function show(k) {
      idx = (k + items.length) % items.length;
      const src = $('img', items[idx]);
      img.src = src.currentSrc || src.src; img.alt = src.alt; cap.textContent = items[idx].dataset.cap || '';
    }
    function open(k, from) {
      opener = from; show(k);
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      stopScroll(); btnClose.focus({ preventScroll: true });
    }
    function close() {
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
      startScroll(); if (opener) opener.focus({ preventScroll: true });
    }
    items.forEach((b, k) => b.addEventListener('click', () => open(k, b)));
    btnClose.addEventListener('click', close);
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        const f = [btnClose, prev, next]; const a = document.activeElement; const k = f.indexOf(a);
        e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* ---- FAQ : accordéon exclusif ---- */
  function setupFaq() {
    const ds = $$('.faq details');
    ds.forEach((d) => d.addEventListener('toggle', () => { if (d.open) ds.forEach((o) => { if (o !== d) o.open = false; }); }));
  }

  /* ---- Footer : grand nom qui monte au scroll ---- */
  function setupFooter() {
    if (reduce) return;
    $$('.foot__giant span').forEach((line, i) => {
      const chars = split(line, 'chars');
      gsap.fromTo(chars, { yPercent: 105 }, { yPercent: 0, ease: 'none', stagger: 0.02, scrollTrigger: { trigger: '.foot__giant', start: 'top 98%', end: 'top 45%', scrub: 0.6 } });
    });
  }

  /* ------------------------------------------------------------------
     11. Démarrage
     ------------------------------------------------------------------ */
  // Chaque module est isolé : si l'un échoue, le reste du site continue de fonctionner.
  const safe = (fn, name) => { try { fn(); } catch (err) { console.error('[chapelle:' + name + ']', err); } };
  safe(buildMenu, 'menu');
  safe(setupNav, 'nav');
  safe(setupHero, 'hero');
  safe(setupMarquee, 'marquee');
  safe(setupReveals, 'reveals');
  safe(setupImages, 'images');
  safe(setupCounters, 'counters');
  safe(setupMedia, 'media');
  safe(setupPointerFX, 'pointer');
  safe(setupReviews, 'reviews');
  safe(setupLightbox, 'lightbox');
  safe(setupFaq, 'faq');
  safe(setupFooter, 'footer');
  safe(embers, 'embers');

  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(refresh, 80));
  addEventListener('load', () => setTimeout(refresh, 120));

  runLoader().then(() => {
    startScroll();
    refresh();
    if (location.hash && location.hash.length > 1) setTimeout(() => scrollToHash(location.hash, true), 100);
  });

  // Rend à l'utilisateur le défilement si la page est restaurée (retour arrière)
  addEventListener('pageshow', (e) => { if (e.persisted) startScroll(); });
})();
