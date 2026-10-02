/* Limit Breaker: a 120-frame turntable (one full turn) drawn to a canvas.
   Scroll turns the statue and moves the camera in on details; dragging spins it by hand. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let small = innerWidth < 860;

  const N = 120, FW = 1080, FH = 830, BG = '25,25,25';
  /* ---------- frames ---------- */
  const imgs = new Array(N).fill(null);
  let dirty = true, loadedCount = 0;
  const loaderBar = $('#loaderBar'), loaderPct = $('#loaderPct');
  function load(i) {
    return new Promise(res => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { imgs[i] = im; dirty = true; loadedCount++; res(); };
      im.onerror = () => res();
      im.src = `media/spin/${String(i).padStart(3, '0')}.webp`;
    });
  }
  (async () => {
    // every fourth frame first (enough to turn smoothly), then the rest
    const order = []; for (const step of [4, 2, 1]) for (let i = 0; i < N; i += step) if (!order.includes(i)) order.push(i);
    const first = order.slice(0, 30); let done = 0;
    await Promise.race([Promise.all(first.map(i => load(i).then(() => { done++; loaderBar.style.width = (done / 30 * 100) + '%'; loaderPct.textContent = `Loading ${Math.round(done / 30 * 100)}%`; }))), new Promise(r => setTimeout(r, 8000))]);
    $('#loader').classList.add('is-done');
    setTimeout(startIntro, 450);
    let k = 30; const next = () => { if (k < order.length) load(order[k++]).then(next); };
    for (let c = 0; c < 6; c++) next();
  })();
  const layer = src => { const im = new Image(); im.decoding = 'async'; im.onload = () => (dirty = true); im.src = src; return im; };
  const baseImg = layer('media/base.webp'), heroImg = layer('media/hero.webp');
  const FEET = 0.724;   // where the figure's feet sit in the frame, as a fraction of its height
  function frame(i) {
    i = ((i % N) + N) % N;
    if (imgs[i]) return imgs[i];
    for (let d = 1; d < N / 2; d++) { const a = imgs[(i - d + N) % N], b = imgs[(i + d) % N]; if (a) return a; if (b) return b; }
    return null;
  }

  /* ---------- camera: which point of the frame sits where on screen, and how large ---------- */
  // [p, scale, frameX, frameY, screenX, screenY]; frame and screen coordinates are 0..1
  const KEYS = () => small ? [
    [0.00, 1.00, .5, .50, .5, .30], [0.14, 1.00, .5, .50, .5, .34], [0.30, 1.00, .5, .50, .5, .34],
    [0.40, 2.10, .5, .24, .5, .36], [0.54, 2.10, .5, .24, .5, .36], [0.62, 1.90, .5, .76, .5, .36], [0.76, 1.90, .5, .76, .5, .36],
    [0.86, 1.05, .5, .50, .5, .32], [1.00, 1.10, .5, .50, .5, .30]
  ] : [
    [0.00, 1.00, .5, .50, .62, .535], [0.14, 1.04, .5, .50, .36, .53], [0.30, 1.04, .5, .50, .36, .53],
    [0.40, 2.25, .5, .24, .66, .50], [0.54, 2.25, .5, .24, .66, .50], [0.62, 2.05, .5, .76, .36, .54], [0.76, 2.05, .5, .76, .36, .54],
    [0.86, 1.05, .5, .50, .50, .53], [1.00, 1.08, .5, .50, .64, .535]
  ];
  let keys = KEYS();
  function cam(p) {
    let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], t = ease(range(p, a[0], b[0]));
    return a.map((v, k) => lerp(v, b[k], t));
  }
  // turns of the statue by scroll position: slow while we look closely, fast in the open
  const TURN = [[0, 0], [0.3, 1], [0.54, 1.3], [0.76, 1.72], [0.92, 3], [1, 3]];
  function turns(p) { let i = 0; while (i < TURN.length - 2 && p > TURN[i + 1][0]) i++; const a = TURN[i], b = TURN[i + 1]; return lerp(a[1], b[1], range(p, a[0], b[0])); }
  const CHAP = [[0, '00 · Intro'], [0.14, '01 · Sculpt'], [0.36, '02 · Paint'], [0.58, '03 · Base'], [0.8, '04 · 360°']];

  /* ---------- canvases ---------- */
  const stage = $('#stage'), cv = $('#spin'), ctx = cv.getContext('2d'), em = $('#embers'), ectx = em.getContext('2d');
  const aura = $('#aura'), ghost = $('#ghost'), ghostSpans = $$('span', ghost), deg = $('#deg');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    small = innerWidth < 860; keys = KEYS();
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = Math.round(innerWidth * dpr); H = Math.round(stage.clientHeight * dpr);
    for (const c of [cv, em, $('#fx')]) { c.width = W; c.height = H; }
    ctx.imageSmoothingQuality = 'high'; dirty = true;
  }
  addEventListener('resize', resize); resize();

  function edge(x0, y0, x1, y1, rx, ry, rw, rh) {   // feather one edge of the footage into the page background
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(${BG},1)`); g.addColorStop(1, `rgba(${BG},0)`);
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
  }
  function draw(f, c, o) {
    const base = small ? Math.min(H * 0.5, W * 1.15 * FH / FW) : H * 0.9;
    const h = base * c[1], w = h * FW / FH, x = c[4] * W - c[2] * w, y = c[5] * H - c[3] * h;
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
    const split = o.split && baseImg.complete && heroImg.complete && baseImg.naturalWidth && heroImg.naturalWidth;
    if (split) {
      ctx.globalAlpha = o.ground; ctx.drawImage(baseImg, x, y + o.dip * h, w, h);                 // the broken ground, already in place
      const hh = h * o.sq, hy = y + o.oy * H + FEET * h * (1 - o.sq);                             // squash about the feet
      if (o.streak > 0.01) for (let g = 4; g >= 1; g--) { ctx.globalAlpha = o.streak * 0.09 * (5 - g); ctx.drawImage(heroImg, x, hy - g * 0.085 * H, w, hh); }
      ctx.globalAlpha = 1; ctx.drawImage(heroImg, x, hy, w, hh);
    } else {
      const i0 = Math.floor(f), k = f - i0, a = frame(i0);
      if (!a) return { x, y, w, h };
      ctx.drawImage(a, x, y, w, h);
      if (k > 0.04) { ctx.globalAlpha = k; ctx.drawImage(frame(i0 + 1), x, y, w, h); ctx.globalAlpha = 1; }
    }
    const fx = w * 0.14, fy = h * 0.12;
    edge(x, 0, x + fx, 0, x - 1, y - 1, fx + 1, h + 2); edge(x + w, 0, x + w - fx, 0, x + w - fx, y - 1, fx + 1, h + 2);
    edge(0, y, 0, y + fy, x - 1, y - 1, w + 2, fy + 1); edge(0, y + h, 0, y + h - fy, x - 1, y + h - fy, w + 2, fy + 1);
    return { x, y, w, h };
  }

  /* ---------- entrance: the statue drops in, the ground breaks, then it takes its place in the hero ---------- */
  const fxc = $('#fx'), fctx = fxc.getContext('2d'), flash = $('#flash');
  const HOLD = +(new URLSearchParams(location.search).get('introAt') || 0);   // test aid: freeze the entrance at a moment
  const FALL = 0.62, LAND = 0.75, intro = { on: false, waiting: true, t: 0, hit: false, ix: 0, iy: 0, age: 9 };
  let shards = [], dust = [], cracks = [];
  function startIntro() {
    if (reduced || scrollY > 40) { intro.waiting = false; document.body.classList.remove('intro'); dirty = true; return; }
    Object.assign(intro, { on: true, waiting: false, t: 0, hit: false, age: 9 }); shards = []; dust = []; cracks = []; dragTurns = 0; dragVel = 0; kiPower = 0;
    document.body.classList.add('intro'); lenis && lenis.stop(); document.documentElement.style.overflow = 'hidden';
  }
  function endIntro() {
    intro.on = false; stage.style.transform = ''; lenis && lenis.start(); document.documentElement.style.overflow = ''; dirty = true;
  }
  function impact(ix, iy) {
    intro.ix = ix; intro.iy = iy; intro.age = 0;
    const u = W / 1400;
    for (let i = 0; i < (small ? 36 : 72); i++) {
      const a = -Math.PI * (0.08 + Math.random() * 0.84), sp = (380 + Math.random() * 1250) * u, n = 3 + Math.floor(Math.random() * 3), r = (5 + Math.random() * 20) * u * dpr;
      shards.push({ x: ix + (Math.random() - 0.5) * 220 * u, y: iy - Math.random() * 14, vx: Math.cos(a) * sp * 1.25, vy: Math.sin(a) * sp, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 16,
        life: 0, max: 0.9 + Math.random() * 0.9, shade: 70 + Math.floor(Math.random() * 90),
        pts: Array.from({ length: n }, (_, k) => { const q = k / n * 6.283 + Math.random() * 0.7, rr = r * (0.55 + Math.random() * 0.6); return [Math.cos(q) * rr, Math.sin(q) * rr]; }) });
    }
    for (let i = 0; i < (small ? 40 : 90); i++) { const s = (Math.random() - 0.5) * 0.5;
      ki.push({ x: ix + s * box.w, y: iy - Math.random() * 0.05 * box.h, vx: s * box.w * 1.6, vy: -(0.9 + Math.random() * 1.5) * box.h, r: (0.05 + Math.random() * 0.09) * box.w, life: 0, max: 0.35 + Math.random() * 0.45, w: Math.random() * 6.28 }); }
    for (let i = 0; i < 16; i++) dust.push({ x: ix, y: iy, vx: (Math.random() - 0.5) * 1500 * u, vy: -(30 + Math.random() * 190) * u, r: (40 + Math.random() * 90) * u * dpr, life: 0, max: 0.8 + Math.random() * 0.7 });
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * 6.283 + Math.random() * 0.4, len = (0.1 + Math.random() * 0.2) * W, pts = [[0, 0]];
      for (let s = 1; s <= 6; s++) { const d = len * s / 6, j = (Math.random() - 0.5) * 0.3; pts.push([Math.cos(a + j) * d, Math.sin(a + j) * d * 0.26]); }   // flattened: the cracks lie on the ground
      cracks.push(pts);
    }
  }
  const flame = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    g.translate(32, 64); g.scale(1, 2);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(205,228,255,.75)'); gr.addColorStop(0.62, 'rgba(120,165,255,.3)'); gr.addColorStop(1, 'rgba(90,130,255,0)');
    g.fillStyle = gr; g.fillRect(-32, -32, 64, 64); return c;
  })();
  let ki = [], kiPower = 0, kiCarry = 0, box = { x: 0, y: 0, w: 1, h: 1 };
  function energy(dt, power) {
    const cx = box.x + box.w * 0.5, feet = box.y + box.h * FEET, bw = box.w, bh = box.h;
    kiCarry += power * dt * (small ? 60 : 110);
    while (kiCarry >= 1) { kiCarry--;
      const side = Math.random() < 0.72 ? (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.1) : (Math.random() - 0.5) * 0.12;   // mostly around the outline
      ki.push({ x: cx + side * bw, y: feet - Math.random() * 0.16 * bh, vx: side * bw * 0.25, vy: -(0.45 + Math.random() * 0.75) * bh, r: (0.035 + Math.random() * 0.06) * bw, life: 0, max: 0.45 + Math.random() * 0.5, w: Math.random() * 6.28 });
    }
    fctx.globalCompositeOperation = 'lighter';
    ki = ki.filter(q => (q.life += dt) < q.max);
    for (const q of ki) {
      const k = q.life / q.max; q.x += (q.vx + Math.sin(q.w + q.life * 14) * bw * 0.05) * dt; q.y += q.vy * dt;
      const r = q.r * (1 - k * 0.55);
      fctx.globalAlpha = Math.sin(k * Math.PI) * 0.2 * Math.min(1.4, power + 0.4);
      fctx.drawImage(flame, q.x - r * 0.7, q.y - r * 3.2, r * 1.4, r * 6.4);   // tall, thin tongues
    }
    fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
  }
  function effects(dt) {
    fctx.clearRect(0, 0, W, H);
    if (kiPower > 0.01 || ki.length) energy(dt, kiPower);
    if (intro.age > 3) { flash.style.opacity = '0'; return; }
    const A = (intro.age = HOLD && intro.on ? Math.min(intro.age + dt, Math.max(0, HOLD - FALL)) : intro.age + dt), { ix, iy } = intro, g = 2600 * (W / 1400);
    // ground cracks: shoot out, then fade before the statue moves off
    const grow = clamp(A / 0.14), fade = 1 - clamp((A - 0.55) / 0.5);
    if (fade > 0) { fctx.lineJoin = 'round'; cracks.forEach((pts, n) => {
      fctx.beginPath(); fctx.moveTo(ix, iy);
      const upto = grow * (pts.length - 1);
      for (let s = 1; s <= Math.ceil(upto); s++) { const k = Math.min(1, upto - (s - 1)), a = pts[s - 1], b = pts[s]; fctx.lineTo(ix + lerp(a[0], b[0], k), iy + lerp(a[1], b[1], k)); }
      fctx.strokeStyle = `rgba(255,${150 + n * 6},70,${(0.85 * fade).toFixed(3)})`; fctx.lineWidth = (5 - n * 0.2) * dpr; fctx.stroke();
      fctx.strokeStyle = `rgba(8,8,8,${(0.9 * fade).toFixed(3)})`; fctx.lineWidth = 1.8 * dpr; fctx.stroke();
    }); }
    // shockwave + flash
    const ring = clamp(A / 0.6);
    if (ring < 1) { fctx.beginPath(); fctx.ellipse(ix, iy, ring * W * 0.5, ring * W * 0.13, 0, 0, 6.283); fctx.strokeStyle = `rgba(255,190,120,${(0.7 * (1 - ring)).toFixed(3)})`; fctx.lineWidth = (10 * (1 - ring) + 1) * dpr; fctx.stroke(); }
    flash.style.opacity = A < 0.28 ? (0.8 * (1 - A / 0.28)).toFixed(3) : '0';
    flash.style.transform = `translate3d(${(ix / dpr).toFixed(1)}px,${(iy / dpr).toFixed(1)}px,0)`;
    // dust
    for (const d of dust) { d.life += dt; if (d.life > d.max) continue; const k = d.life / d.max; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= Math.exp(-dt * 3.2);
      const r = d.r * (1 + k * 2.4), gr = fctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r); gr.addColorStop(0, `rgba(150,146,140,${(0.3 * (1 - k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(150,146,140,0)');
      fctx.fillStyle = gr; fctx.fillRect(d.x - r, d.y - r, r * 2, r * 2); }
    // rock shards
    for (const s of shards) { s.life += dt; if (s.life > s.max) continue;
      s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      const al = clamp((s.max - s.life) / 0.3), c = Math.cos(s.rot), n = Math.sin(s.rot);
      fctx.beginPath(); s.pts.forEach(([px, py], k) => { const X = s.x + px * c - py * n, Y = s.y + px * n + py * c; k ? fctx.lineTo(X, Y) : fctx.moveTo(X, Y); }); fctx.closePath();
      fctx.fillStyle = `rgba(${s.shade},${s.shade},${s.shade + 6},${al.toFixed(3)})`; fctx.fill();
      fctx.strokeStyle = `rgba(215,215,220,${(al * 0.5).toFixed(3)})`; fctx.lineWidth = dpr; fctx.stroke(); }
  }

  /* ---------- embers: light dust rising past the statue, faster while you scroll ---------- */
  const P = Array.from({ length: small ? 26 : 54 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.02 + Math.random() * 0.05, w: Math.random() * 6.28, hot: Math.random() < 0.7 }));
  function embers(dt, vel, cx) {
    ectx.clearRect(0, 0, W, H);
    for (const q of P) {
      q.y -= (q.v + vel * 0.9) * dt; q.w += dt * 1.3;
      if (q.y < -0.05) { q.y = 1.05; q.x = Math.random(); }
      const x = (lerp(q.x, cx, 0.35) + Math.sin(q.w) * 0.012) * W, y = q.y * H, r = Math.max(0.2, q.r * dpr * (1 + vel * 6));
      ectx.globalAlpha = clamp(0.18 + vel * 3, 0, 0.75) * (0.5 + 0.5 * Math.sin(q.w * 1.7));
      ectx.fillStyle = q.hot ? '#ff8a2a' : '#7f9bff';
      ectx.beginPath(); ectx.arc(x, y, r, 0, 6.283); ectx.fill();
    }
  }

  /* ---------- scroll + drag ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  const track = $('#journey');
  const span = () => Math.max(1, track.offsetHeight - innerHeight);
  const goto = p => { const y = track.offsetTop + p * span(); lenis ? lenis.scrollTo(y, { duration: 2 }) : scrollTo({ top: y, behavior: 'smooth' }); };
  $$('[data-goto]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goto(+a.dataset.goto); }));
  $$('a[href^="#"]:not([data-goto])').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));
  let dragTurns = 0, dragVel = 0, dragging = false, lastX = 0;
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; dragging = true; lastX = e.clientX; dragVel = 0; stage.classList.add('is-drag'); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (!dragging) return; const d = (e.clientX - lastX) / innerWidth; lastX = e.clientX; dragTurns += d * 1.2; dragVel = d * 1.2; dirty = true; });
  const endDrag = () => { dragging = false; stage.classList.remove('is-drag'); };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);

  /* ---------- loop ---------- */
  const caps = $$('.cap').map(el => ({ el, a: +el.dataset.from, b: +el.dataset.to, side: el.classList.contains('cap--right') || el.classList.contains('cap--left') }));
  const hudLabel = $('#hudLabel'), hudBar = $('#hudBar');
  let p = -1, lastP = -2, last = performance.now(), vel = 0, chap = -1, lastDeg = -1;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    lenis && lenis.raf(now);
    const r = track.getBoundingClientRect(), target = clamp(-r.top / span());
    const prev = p;
    p = p < 0 ? target : p + (target - p) * (1 - Math.exp(-dt * 6));
    vel += (Math.min(1, Math.abs(p - prev) / Math.max(dt, 0.001) * 0.9) - vel) * (1 - Math.exp(-dt * 6));   // 0..1 scroll energy
    if (!dragging && Math.abs(dragVel) > 0.00005) { dragTurns += dragVel; dragVel *= Math.exp(-dt * 4); dirty = true; }
    const onStage = r.bottom > -40;
    stage.style.visibility = onStage ? 'visible' : 'hidden';
    document.body.classList.toggle('past', r.bottom < innerHeight * 0.55);
    if (!onStage) return;

    const c = cam(p), o = { oy: 0, sq: 1, streak: 0, split: false, ground: 1, dip: 0 };
    let ui = intro.waiting ? 0 : 1;
    if (intro.on) {
      const T = (intro.t = HOLD ? Math.min(intro.t + dt, HOLD) : intro.t + dt), u = T - FALL;
      o.split = T < FALL + LAND; o.ground = ease(clamp(T / 0.2));
      if (u < 0) { const k = T / FALL; o.oy = -(1 - k * k * k) * 1.25; o.streak = k * k; }              // falling, accelerating
      else {
        o.sq = 1 - 0.1 * Math.exp(-u * 8) * Math.cos(u * 19);                                            // land, compress, recover
        o.dip = 0.012 * Math.exp(-u * 10);                                                               // the ground takes the hit
        const sh = Math.exp(-u * 6.5) * 16;
        stage.style.transform = sh > 0.3 ? `translate3d(${((Math.random() - 0.5) * sh).toFixed(1)}px,${((Math.random() - 0.5) * sh).toFixed(1)}px,0)` : '';
      }
      c[4] = lerp(0.5, c[4], ease(range(T, 1.75, 2.6)));                                                 // then move it over to its place in the hero
      ui = ease(range(T, 1.9, 2.75));
      if (T > 1.9) document.body.classList.remove('intro');
      if (T > 2.8) endIntro();
      kiPower = u < 0 ? 0 : lerp(1.5, 0.6, clamp(u / 1.6));                                              // flares on landing, then burns steadily
      dirty = true;
    }
    if (intro.waiting) { ctx.clearRect(0, 0, W, H); return; }
    if (!intro.on && !intro.waiting) { const want = 0.6 * (1 - range(p, 0.03, 0.12)) + 0.45 * range(p, 0.9, 0.97); kiPower += (want - kiPower) * (1 - Math.exp(-dt * 4)); }   // the aura belongs to the hero and the finale
    if (dirty || Math.abs(p - lastP) > 0.00002) {
      dirty = false; lastP = p;
      const t = turns(p) + dragTurns, f = (((t % 1) + 1) % 1) * N;
      box = draw(f, c, o);
      if (intro.on && !intro.hit && intro.t >= FALL) { intro.hit = true; impact(box.x + box.w * 0.5, box.y + box.h * (FEET + 0.03)); }
      const cx = (box.x + box.w * 0.5) / dpr, cy = (box.y + box.h * 0.5) / dpr;
      aura.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) scale(${(c[1] * 0.9).toFixed(3)})`;
      const d = Math.round((((t % 1) + 1) % 1) * 360) % 360;
      if (d !== lastDeg) { lastDeg = d; deg.textContent = String(d).padStart(3, '0') + '°'; }

      const g = 1 - range(p, 0.1, 0.2) + range(p, 0.84, 0.92);       // the big type shows at the start and the end
      ghost.style.opacity = (clamp(g) * ui).toFixed(3);
      ghostSpans[0].style.transform = `translate3d(${(-p * 60).toFixed(1)}vw,0,0)`;
      ghostSpans[1].style.transform = `translate3d(${(p * 60 - (p > 0.5 ? 60 : 0)).toFixed(1)}vw,0,0)`;

      caps.forEach(q => {
        const k = clamp((p - q.a) / 0.018) * clamp((q.b - p) / 0.018), off = (1 - k) * (p < (q.a + q.b) / 2 ? 30 : -30);
        q.el.style.opacity = k.toFixed(3); q.el.style.visibility = k > 0.001 ? 'visible' : 'hidden';
        q.el.style.transform = q.side && !small ? `translateY(calc(-50% + ${off.toFixed(1)}px))` : `translateY(${off.toFixed(1)}px)`;
      });
      let ch = 0; while (ch < CHAP.length - 1 && p >= CHAP[ch + 1][0]) ch++;
      if (ch !== chap) { chap = ch; hudLabel.textContent = CHAP[ch][1]; }
      hudBar.style.transform = `scaleX(${p.toFixed(4)})`;
    }
    aura.style.opacity = ((0.55 + vel * 0.45) * (intro.on ? clamp((intro.t - FALL) * 3) : ui)).toFixed(3);
    effects(dt);
    if (!reduced) embers(dt, vel, c[4]);
  }
  requestAnimationFrame(tick);

  $('.nav__brand').addEventListener('click', () => { if (scrollY < 40 && !intro.on) startIntro(); });

  /* ---------- below the stage ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('[data-reveal]').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  if (!reduced) $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5; el.style.transitionDelay = '0ms'; el.style.transform = `rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 9).toFixed(2)}deg) translateZ(14px)`; });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
  const form = $('#form'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    note.textContent = /^\S+@\S+\.\S+$/.test(email) ? 'This is a concept page, so nothing was sent. The form is ready to connect.' : 'Please enter a valid email address.';
  });
})();
