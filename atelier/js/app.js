/* Northbeam: real footage scrubbed by scroll.
   Frames are pre-extracted image sequences (media/<segment>/NNN.webp) drawn to a canvas with frame blending,
   so the camera moves exactly as far as you scroll. The opening blueprint is line art generated from the
   same exterior frames, so the drawing and the real house line up as one turns into the other. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const small = Math.min(innerWidth, innerHeight) < 620 || innerWidth < 760;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DIR = small ? '-m' : '';

  /* ---------- timeline: scroll range -> footage segment ---------- */
  const SEQ = { ext: 90, bp: 90, door: 78, living: 110, kitchen: 80, dining: 80, bed: 80, bath: 72 };
  const SEGS = [
    { id: 'ext', a: 0, b: 0.25, from: 0, to: 89 },
    { id: 'door', a: 0.25, b: 0.345, from: 0, to: 77 },
    { id: 'living', a: 0.345, b: 0.52, from: 0, to: 109 },
    { id: 'kitchen', a: 0.52, b: 0.65, from: 0, to: 79 },
    { id: 'dining', a: 0.65, b: 0.74, from: 0, to: 79 },
    { id: 'bed', a: 0.74, b: 0.812, from: 0, to: 79 },
    { id: 'bath', a: 0.812, b: 0.895, from: 0, to: 71 },
    { id: 'ext', a: 0.895, b: 1.0001, from: 62, to: 4 }       // finale: pulling back from the house
  ];
  const FADE = 0.016;   // cross-dissolve width between segments
  const CHAPTERS = [['Blueprint', 0], ['Structure', 0.075], ['Realised', 0.155], ['Living', 0.345], ['Kitchen', 0.52], ['Dining', 0.65], ['Suite', 0.74], ['Handover', 0.895]];

  /* ---------- frame store with prioritised loading ---------- */
  const store = {};
  for (const id in SEQ) store[id] = new Array(SEQ[id]).fill(null);
  const src = (id, i) => `media/${id}${DIR}/${String(i).padStart(3, '0')}.webp`;
  let dirty = true;
  const asked = new Set();
  function load(id, i) {
    return new Promise(res => {
      if (store[id][i] || asked.has(id + i)) return res();
      asked.add(id + i);
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { store[id][i] = im; dirty = true; res(); };
      im.onerror = () => res();
      im.src = src(id, i);
    });
  }
  async function pool(jobs, n = 8, onTick) {
    let k = 0, done = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (k < jobs.length) { const j = jobs[k++]; await load(j[0], j[1]); done++; onTick && onTick(done / jobs.length); } }));
  }
  // background queue; the segment you are heading to always jumps to the front (coarse frames first)
  const queue = []; let active = 0, wanted = '';
  function pump() {
    while (active < 8 && queue.length) {
      const [id, i] = queue.shift();
      if (store[id][i] || asked.has(id + i)) continue;
      active++; load(id, i).then(() => { active--; pump(); });
    }
  }
  function demand(id) {
    if (wanted === id) return; wanted = id;
    const jobs = []; for (const step of [8, 4, 2, 1]) for (let i = 0; i < SEQ[id]; i += step) jobs.push([id, i]);
    queue.unshift(...jobs); pump();
  }
  function frame(id, i) {
    const arr = store[id];
    if (arr[i]) return arr[i];
    for (let d = 1; d < arr.length; d++) { if (arr[i - d]) return arr[i - d]; if (arr[i + d]) return arr[i + d]; }
    return null;
  }
  const loaderEl = $('#loader'), loaderBar = $('#loaderBar'), loaderPct = $('#loaderPct');
  (async () => {
    // pass 1: every third exterior + blueprint frame, enough to open the page
    const first = []; for (let i = 0; i < 90; i += 3) first.push(['ext', i], ['bp', i]);
    const timeout = new Promise(r => setTimeout(r, 9000));
    await Promise.race([pool(first, 10, f => { loaderBar.style.width = (f * 100) + '%'; loaderPct.textContent = String(Math.round(f * 100)).padStart(2, '0'); }), timeout]);
    loaderEl.classList.add('is-done'); document.body.classList.add('is-ready');
    // pass 2: the rest, in the order you will scroll through them
    const rest = [];
    for (let i = 0; i < 90; i++) if (i % 3) rest.push(['ext', i], ['bp', i]);
    for (const id of ['door', 'living', 'kitchen', 'dining', 'bed', 'bath']) {
      for (let i = 0; i < SEQ[id]; i += 2) rest.push([id, i]);
      for (let i = 1; i < SEQ[id]; i += 2) rest.push([id, i]);
    }
    queue.push(...rest); pump();
  })();

  /* ---------- canvases ---------- */
  const film = $('#film'), fctx = film.getContext('2d', { alpha: false });
  const lines = $('#lines'), lctx = lines.getContext('2d');
  const paper = $('#paper'), grade = $('#grade'), stage = $('#stage');
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.5);
    W = Math.round(innerWidth * dpr); H = Math.round(stage.clientHeight * dpr);
    for (const c of [film, lines]) { c.width = W; c.height = H; }
    fctx.imageSmoothingQuality = 'high';
    dirty = true;
  }
  addEventListener('resize', resize); resize();
  function cover(ctx, im, alpha, zoom = 1) {
    if (!im) return;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom, w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.globalAlpha = alpha; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  }
  let moving = false;
  function drawSeq(ctx, id, f, alpha, zoom) {
    const max = SEQ[id] - 1; f = clamp(f, 0, max);
    if (!moving) f = Math.round(f);            // at rest, show one sharp frame
    const i0 = Math.floor(f), i1 = Math.min(max, i0 + 1), k = f - i0;
    cover(ctx, frame(id, i0), alpha, zoom);
    if (k > 0.03 && i1 !== i0) cover(ctx, frame(id, i1), alpha * k, zoom);   // blend to the next frame for silky motion
  }

  /* ---------- scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) lenis = new Lenis({ duration: 1.35, smoothWheel: true, wheelMultiplier: 0.85, touchMultiplier: 1.5 });
  const track = $('#journey');
  const span = () => Math.max(1, track.offsetHeight - innerHeight);
  const goto = p => { const y = track.offsetTop + p * span(); lenis ? lenis.scrollTo(y, { duration: 2.2 }) : scrollTo({ top: y, behavior: 'smooth' }); };
  $$('[data-goto]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goto(+a.dataset.goto); }));
  $$('a[href^="#"]:not([data-goto])').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.8 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- chapter reel ---------- */
  const tabs = $('#tabs');
  const tabEls = CHAPTERS.map(([name, at], i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i>${name}`;
    b.addEventListener('click', () => goto(at + 0.012));
    tabs.appendChild(b); return b;
  });
  const tc = $('#tc'), reelBar = $('#reelBar'), nav = $('#nav');
  const caps = $$('.cap').map(el => ({ el, a: +el.dataset.from, b: +el.dataset.to, hero: el.classList.contains('cap--hero') }));
  const tilt = $$('[data-tilt]'), row = $('#spacesRow');

  /* ---------- frame loop ---------- */
  let p = -1, target = 0, lastP = -2, last = performance.now(), chapter = -1;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    lenis && lenis.raf(now);
    const r = track.getBoundingClientRect();
    target = clamp(-r.top / span());
    p = p < 0 ? target : p + (target - p) * (1 - Math.exp(-dt * 9));
    const onStage = r.bottom > -40;
    stage.style.visibility = onStage ? 'visible' : 'hidden';
    document.body.classList.toggle('past', r.bottom < innerHeight * 0.55);
    nav.classList.toggle('is-solid', r.bottom < 80);

    { let ti = 0; while (ti < SEGS.length - 1 && target >= SEGS[ti].b) ti++; demand(SEGS[ti].id); }
    const wasMoving = moving; moving = Math.abs(target - p) > 0.0004;
    if (wasMoving && !moving) dirty = true;
    if (onStage && (dirty || Math.abs(p - lastP) > 0.00002)) {
      dirty = false; lastP = p;
      /* footage */
      let i = 0; while (i < SEGS.length - 1 && p >= SEGS[i].b) i++;
      const S = SEGS[i], N = SEGS[i + 1];
      const t = range(p, S.a, S.b);
      drawSeq(fctx, S.id, lerp(S.from, S.to, t), 1, 1);
      if (N && p > S.b - FADE) drawSeq(fctx, N.id, N.from, ease(range(p, S.b - FADE, S.b)), 1);

      /* blueprint -> structure -> realised (first segment only) */
      const bp = 1 - ease(range(p, 0.05, 0.105));          // navy paper
      const ln = (1 - ease(range(p, 0.1, 0.165))) * (small ? 0.6 : 1);   // drawn lines
      const mono = 1 - ease(range(p, 0.105, 0.17));        // footage still in monochrome
      paper.style.opacity = bp.toFixed(3);
      lines.style.opacity = ln.toFixed(3);
      if (ln > 0.002 && i === 0) { lctx.globalAlpha = 1; lctx.clearRect(0, 0, W, H); drawSeq(lctx, 'bp', lerp(S.from, S.to, t), 1, 1); }
      const night = ease(range(p, 0.9, 0.95));
      film.style.filter = mono > 0.002 ? `grayscale(${mono.toFixed(3)}) brightness(${lerp(1, 0.62, mono).toFixed(3)}) contrast(${lerp(1, 1.15, mono).toFixed(3)})` : (night > 0.002 ? `saturate(${lerp(1, 1.15, night).toFixed(3)})` : 'none');
      grade.style.opacity = (night * 0.9).toFixed(3);

      /* captions */
      caps.forEach(c => {
        const k = clamp((p - c.a) / 0.014) * clamp((c.b - p) / 0.014);
        c.el.style.opacity = k.toFixed(3);
        c.el.style.visibility = k > 0.001 ? 'visible' : 'hidden';
        if (!small) c.el.style.transform = c.hero ? `translateY(calc(-46% + ${((1 - k) * (p < (c.a + c.b) / 2 ? 28 : -28)).toFixed(1)}px))` : `translateY(${((1 - k) * (p < (c.a + c.b) / 2 ? 22 : -22)).toFixed(1)}px)`;
      });

      /* reel */
      let ch = 0; while (ch < CHAPTERS.length - 1 && p >= CHAPTERS[ch + 1][1]) ch++;
      if (ch !== chapter) { chapter = ch; tabEls.forEach((b, k) => b.classList.toggle('is-on', k === ch)); }
      const secs = Math.round(p * 92);
      tc.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      reelBar.style.width = (p * 100).toFixed(2) + '%';
    }

    /* editorial motion below the film */
    if (!reduced) {
      tilt.forEach(el => {
        const b = el.getBoundingClientRect(); if (b.bottom < -100 || b.top > innerHeight + 100) return;
        const k = clamp((innerHeight - b.top) / (innerHeight + b.height));       // 0 entering, 1 leaving
        el.style.transform = small ? 'none' : `rotateY(${lerp(-22, 6, ease(k)).toFixed(2)}deg) rotateX(${lerp(7, -2, k).toFixed(2)}deg) translateZ(${lerp(-80, 30, ease(k)).toFixed(1)}px)`;
      });
      if (row && !small) {
        const b = row.getBoundingClientRect();
        if (b.bottom > -100 && b.top < innerHeight + 100) {
          const k = clamp((innerHeight - b.top) / (innerHeight + b.height));
          const over = Math.max(0, row.scrollWidth - innerWidth);
          row.style.transform = `translate3d(${(-over * ease(k)).toFixed(1)}px,0,0)`;
        }
      }
    }
  }
  requestAnimationFrame(tick);

  /* ---------- hover tilt on space cards ---------- */
  if (!small && !reduced) $$('[data-hover]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      el.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg) translateZ(18px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('[data-reveal]').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

  /* ---------- enquiry form (demo: nothing is sent anywhere) ---------- */
  const form = $('#form'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.elements.name.value.trim(), email = form.elements.email.value.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) { note.textContent = 'Please add your name and a valid email address.'; return; }
    note.textContent = `Thank you, ${name.split(' ')[0]}. This demo form is not connected yet, so nothing was sent.`;
    form.reset();
  });
})();
