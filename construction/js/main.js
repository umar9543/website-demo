/* Northbeam: page choreography (GSAP + ScrollTrigger + Lenis) */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const burger = $('#burger'), menu = $('#menu');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
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
    // Chapters: land where the panel is fully shown
    if (el && el.classList && el.classList.contains('chapter')) {
      scrollToTarget(el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.35);
    } else scrollToTarget(el);
  }));

  /* ---------- Real footage, scrubbed by scroll ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const story = $('#story');
  const chapters = $$('.chapter', story);
  const clips = $$('.film__clip');
  const PHASES = ['Site', 'Pre-construction', 'Groundworks', 'Structural frame', 'Envelope', 'Handover'];
  const FLOORS = 14, WEEKS = 86;
  const small = innerWidth < 860;
  let loadPct = 0;

  // Sources: lighter encodes on phones. Hero loads first, the rest queue behind it.
  clips.forEach(v => { v.src = `media/${v.dataset.clip}${small ? '-m' : ''}.mp4`; });
  const hero = clips[0];
  hero.play().catch(() => {});
  let loadedCount = 0;
  const markLoaded = () => { loadedCount++; loadPct = loadedCount / clips.length; };
  hero.addEventListener('canplay', markLoaded, { once: true });
  (async function queue() {
    for (const v of clips.slice(1)) {
      v.preload = 'auto'; v.load();
      await new Promise(res => { const done = () => { markLoaded(); res(); }; v.addEventListener('canplaythrough', done, { once: true }); v.addEventListener('error', done, { once: true }); setTimeout(done, 15000); });
    }
  })();
  // iOS only seeks videos that have started once: prime them on the first touch.
  addEventListener('touchstart', () => clips.slice(1).forEach(v => v.play().then(() => v.pause()).catch(() => {})), { once: true, passive: true });

  const geo = { tops: [], hs: [], vh: innerHeight };
  function measure() {
    geo.vh = innerHeight;
    chapters.forEach((ch, i) => { const r = ch.getBoundingClientRect(); geo.tops[i] = r.top + scrollY; geo.hs[i] = r.height; });
  }
  measure();
  ScrollTrigger.addEventListener('refresh', measure);

  const want = clips.map(() => 0);           // target time per clip
  const shown = clips.map(() => 0);          // smoothed time per clip
  let heroPlaying = true;

  function update() {
    const y = scrollY, vh = geo.vh, n = chapters.length;
    // crossfade: each chapter's footage rises over the previous one as it scrolls in
    clips.forEach((v, i) => {
      const fade = i === 0 ? 1 : clamp((y - (geo.tops[i] - vh * 0.85)) / (vh * 0.55));
      const next = i < n - 1 ? clamp((y - (geo.tops[i + 1] - vh * 0.3)) / (vh * 0.3)) : 0;
      const visible = fade > 0 && next < 1;
      v.style.opacity = fade;
      v.style.visibility = visible || i === 0 ? 'visible' : 'hidden';
      // local progress through the chapter drives the clip's time
      const z = clamp((y - (geo.tops[i] - vh * 0.85)) / (geo.hs[i] - vh * 0.15));
      v.style.transform = `scale(${(1.08 - z * 0.08).toFixed(4)})`;
      if (i > 0 && v.duration) want[i] = z * (v.duration - 0.05);
    });
    // hero keeps playing at the top, freezes once the story starts
    const playHero = y < vh * 0.6;
    if (playHero !== heroPlaying) { heroPlaying = playHero; playHero ? hero.play().catch(() => {}) : hero.pause(); }

    for (let i = 1; i < clips.length; i++) {
      const v = clips[i];
      if (v.style.visibility === 'hidden' || !v.duration || v.readyState < 1) continue;
      shown[i] += (want[i] - shown[i]) * 0.18;
      if (!v.seeking && Math.abs(v.currentTime - shown[i]) > 0.04) v.currentTime = shown[i];
    }

    // HUD
    const storyEnd = geo.tops[n - 1] + geo.hs[n - 1] - vh;
    const pct = Math.round(clamp(y / storyEnd) * 100);
    let phase = 0;
    for (let k = 1; k < n; k++) if (y >= geo.tops[k] - vh * 0.5) phase = k;
    const frameP = clamp((y - (geo.tops[3] - vh * 0.5)) / geo.hs[3]);
    const level = phase > 3 ? FLOORS : Math.floor(frameP * FLOORS);
    hud.classList.toggle('is-off', phase === 0 || y > storyEnd + vh * 0.3);
    const key = pct + '|' + level + '|' + phase;
    if (key !== lastHud) {
      lastHud = key;
      hudPhase.textContent = PHASES[phase];
      hudFill.style.width = pct + '%';
      hudPct.textContent = pct + '%';
      hudLevel.textContent = `${pad(level)} / ${FLOORS}`;
      hudWeek.textContent = `Wk ${pad(Math.round(pct / 100 * WEEKS))} / ${WEEKS}`;
    }
  }
  const hud = $('#hud'), hudPhase = $('#hudPhase'), hudFill = $('#hudFill'), hudPct = $('#hudPct'), hudLevel = $('#hudLevel'), hudWeek = $('#hudWeek');
  let lastHud = '';
  gsap.ticker.add(update);

  // Pause all footage once the solid content covers it
  ScrollTrigger.create({
    trigger: '.content', start: 'top top',
    onEnter: () => { $('#film').style.visibility = 'hidden'; hero.pause(); },
    onLeaveBack: () => { $('#film').style.visibility = 'visible'; }
  });

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
  const steps = ['Setting out the site', 'Checking levels', 'Loading site footage', 'Ready to build'];
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
        if (loadPct > 0 || performance.now() - started > 6000) { loader.classList.add('is-done'); heroIntro(); }
        else requestAnimationFrame(wait);
      })();
    }
  });

  function heroIntro() {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .line > span', { yPercent: 110, duration: 1.3, stagger: 0.09 })
      .from('.hero .eyebrow', { autoAlpha: 0, y: 16, duration: 0.8 }, 0.2)
      .from('.hero__lede', { autoAlpha: 0, y: 20, duration: 0.9 }, 0.45)
      .from('.hero__actions .btn', { autoAlpha: 0, y: 20, duration: 0.8, stagger: 0.08 }, 0.55)
      .from('.nav', { yPercent: -100, duration: 1 }, 0.3);
  }

  /* ---------- Story choreography ---------- */
  // Hero copy lifts away as the build begins
  gsap.to('.hero', {
    yPercent: -12, autoAlpha: 0, ease: 'none',
    scrollTrigger: { trigger: '.chapter--hero', start: 'top top', end: 'bottom 40%', scrub: true }
  });
  const cue = $('.scroll-cue');
  gsap.ticker.add(() => { const o = clamp(1 - scrollY / 200); cue.style.opacity = o; cue.style.visibility = o > 0 ? 'visible' : 'hidden'; });

  chapters.slice(1).forEach((ch, i, arr) => {
    const panel = $('.panel', ch);
    const last = i === arr.length - 1;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ch, start: 'top 80%', end: last ? 'top 10%' : 'bottom bottom', scrub: true }
    });
    tl.fromTo(panel, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' })
      .from($$('.panel__num, h2, p, .specs div, .btn', panel), { autoAlpha: 0, y: 24, duration: 0.14, stagger: 0.025, ease: 'power2.out' }, 0.06);
    if (!last) tl.to(panel, { duration: 0.5 }).to(panel, { autoAlpha: 0, y: -50, duration: 0.2, ease: 'power2.in' });
    else tl.to(panel, { duration: 0.6 });
  });

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
  measure();
})();
