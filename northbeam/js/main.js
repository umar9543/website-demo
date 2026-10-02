/* Northbeam: page choreography (GSAP + ScrollTrigger + Lenis) */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const burger = $('#burger'), menu = $('#menu');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let towerReady = false;
  (window.NBJourneyReady || Promise.resolve()).then(() => (towerReady = true));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    // lerp-based easing: every wheel notch glides to rest instead of running a fixed-length tween
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' }) : target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 && id !== '#') return;
    const el = id === '#' || id === '#top' ? 0 : $(id);
    if (el === null) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
  }));

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 40);
      nav.classList.toggle('is-hidden', y > window.innerHeight && y > lastY && !menu.classList.contains('is-open'));
      lastY = y;
    }
  });

  function closeMenu() {
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu');
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    if (!open) return closeMenu();
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu');
    lenis && lenis.stop();
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Loader + hero intro ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), pctEl = $('#loaderPct'), txt = $('#loaderText');
  const steps = ['Setting out the site', 'Checking levels', 'Loading the building', 'Ready to build'];
  const prog = { v: 0 };
  gsap.to(prog, {
    v: 100, duration: reduced ? 0.2 : 1.6, ease: 'power2.inOut',
    onUpdate: () => {
      const v = Math.round(prog.v);
      bar.style.width = v + '%'; pctEl.textContent = v + '%';
      txt.textContent = steps[Math.min(steps.length - 1, Math.floor(v / 26))];
    },
    onComplete: () => {
      const started = performance.now();
      (function wait() {
        if (towerReady || performance.now() - started > 8000) { loader.classList.add('is-done'); heroIntro(); }
        else requestAnimationFrame(wait);
      })();
    }
  });

  function heroIntro() {
    if (reduced) return;
    gsap.from('.j-title', { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    gsap.from('.j-cap--hero .eyebrow, .j-lede, .j-actions .btn', { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.08, delay: 0.25, ease: 'expo.out' });
    gsap.from('.nav', { yPercent: -100, duration: 1, delay: 0.2, ease: 'expo.out' });
  }


  /* ---------- Word reveals ---------- */
  $$('.reveal').forEach(el => {
    const html = el.innerHTML.split(/(<br\s*\/?>)/i).map(part =>
      /<br/i.test(part) ? part : part.split(/(\s+)/).map(w => (w.trim() ? `<span class="w" style="overflow:hidden;vertical-align:top"><span class="w">${w}</span></span>` : w)).join('')
    ).join('');
    el.innerHTML = html;
    if (reduced) return;
    gsap.from($$('.w > .w', el), {
      yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  });

  /* ---------- Counters ---------- */
  $$('.count').forEach(el => {
    const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || '0', 10);
    const fmt = v => v.toFixed(dec);
    el.textContent = fmt(to);
    if (reduced) return;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.fromTo(o, { v: 0 }, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) })
    });
  });

  /* ---------- Services row stagger ---------- */
  if (!reduced) gsap.from('.svc__row', {
    autoAlpha: 0, y: 40, duration: 0.9, ease: 'power3.out', stagger: 0.08,
    scrollTrigger: { trigger: '.svc', start: 'top 80%', once: true }
  });

  /* ---------- Projects: horizontal track ---------- */
  const track = $('#track');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const trackTween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.projects__pin', start: 'top top', end: () => '+=' + dist(),
      pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1
    }
  });

  /* ---------- Project photos drift inside their frames ---------- */
  $$('.proj').forEach(card => {
    gsap.fromTo($('img', card), { xPercent: -6 }, {
      xPercent: 6, ease: 'none',
      scrollTrigger: { trigger: card, containerAnimation: trackTween, start: 'left right', end: 'right left', scrub: true }
    });
  });

  /* ---------- Image band: opens up as it enters ---------- */
  if (!reduced) {
    gsap.fromTo('#band', { clipPath: 'inset(16% 14% 16% 14%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.band', start: 'top 95%', end: 'top 15%', scrub: true }
    });
    gsap.fromTo('#band img', { yPercent: -8, scale: 1.15 }, {
      yPercent: 8, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- Services: image follows the cursor ---------- */
  const float = $('#svcFloat'), floatImg = $('#svcImg');
  if (float && window.matchMedia('(hover: hover)').matches) {
    gsap.set(float, { xPercent: -50, yPercent: -50, scale: 0.8 });
    const xTo = gsap.quickTo(float, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(float, 'y', { duration: 0.5, ease: 'power3' });
    let preloaded = false;
    $$('.svc__row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        if (!preloaded) { preloaded = true; $$('.svc__row').forEach(r => { const im = new Image(); im.src = r.dataset.img; }); }
        floatImg.src = row.dataset.img;
        float.classList.add('is-on');
        gsap.to(float, { scale: 1, rotate: gsap.utils.random(-4, 4), duration: 0.5, ease: 'power3.out' });
      });
      row.addEventListener('mouseleave', () => { float.classList.remove('is-on'); gsap.to(float, { scale: 0.8, duration: 0.4 }); });
    });
    $('.svc').addEventListener('mousemove', e => { xTo(e.clientX + 140); yTo(e.clientY); });
  }

  /* ---------- Contact form ---------- */
  const form = $('#form'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    ['#f-name', '#f-email'].forEach(id => {
      const input = $(id), field = input.closest('.field');
      const valid = id === '#f-email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) : input.value.trim().length > 1;
      field.classList.toggle('is-error', !valid);
      if (!valid) ok = false;
    });
    if (!ok) { note.textContent = 'Please add your name and a valid email address.'; return; }
    // Connect this to your form backend (Formspree, EmailJS, your API) here.
    note.textContent = `Thanks, ${$('#f-name').value.trim().split(' ')[0]}. An estimator will reply within two working days.`;
    form.reset();
  });

  /* ---------- Refresh after fonts/layout settle ---------- */
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
