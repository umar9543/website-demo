p = 'E:/React/wordpress/figure/js/app.js'
t = open(p, encoding='utf8').read()
def R(a, b):
    global t
    assert t.count(a) >= 1, a[:60]
    t = t.replace(a, b, 1)

# loader end -> start the entrance
R("    $('#loader').classList.add('is-done');", "    $('#loader').classList.add('is-done');\n    setTimeout(startIntro, 450);")

# draw(): vertical offset, landing squash and fall streaks
a = t.index("  function draw(f, c) {"); b = t.index("  /* ---------- embers")
t = t[:a] + r"""  function draw(f, c, o) {
    const base = small ? Math.min(H * 0.5, W * 1.15 * FH / FW) : H * 0.9;
    const h0 = base * c[1], w = h0 * FW / FH, h = h0 * o.sq, x = c[4] * W - c[2] * w, y0 = c[5] * H - c[3] * h0;
    const y = y0 + (h0 - h) + o.oy * H;                       // squash keeps the feet planted; oy is the fall
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
    const i0 = Math.floor(f), k = f - i0;
    const a = frame(i0); if (!a) return { x, y: y0, w, h: h0 };
    if (o.streak > 0.01) for (let g = 3; g >= 1; g--) { ctx.globalAlpha = o.streak * 0.11 * (4 - g); ctx.drawImage(a, x, y - g * 0.07 * H, w, h); }
    ctx.globalAlpha = 1; ctx.drawImage(a, x, y, w, h);
    if (k > 0.04) { ctx.globalAlpha = k; ctx.drawImage(frame(i0 + 1), x, y, w, h); ctx.globalAlpha = 1; }
    const fx = w * 0.14, fy = h * 0.12;
    edge(x, 0, x + fx, 0, x - 1, y - 1, fx + 1, h + 2); edge(x + w, 0, x + w - fx, 0, x + w - fx, y - 1, fx + 1, h + 2);
    edge(0, y, 0, y + fy, x - 1, y - 1, w + 2, fy + 1); edge(0, y + h, 0, y + h - fy, x - 1, y + h - fy, w + 2, fy + 1);
    return { x, y: y0, w, h: h0 };
  }

  /* ---------- entrance: the statue drops in, the ground breaks, then it takes its place in the hero ---------- */
  const fxc = $('#fx'), fctx = fxc.getContext('2d');
  const FALL = 0.5, intro = { on: false, waiting: true, t: 0, hit: false, ix: 0, iy: 0, age: 9 };
  let shards = [], dust = [], cracks = [];
  function startIntro() {
    if (reduced || scrollY > 40) { intro.waiting = false; document.body.classList.remove('intro'); dirty = true; return; }
    Object.assign(intro, { on: true, waiting: false, t: 0, hit: false, age: 9 }); shards = []; dust = []; cracks = [];
    document.body.classList.add('intro'); lenis && lenis.stop(); document.documentElement.style.overflow = 'hidden';
  }
  function endIntro() {
    intro.on = false; stage.style.transform = ''; lenis && lenis.start(); document.documentElement.style.overflow = ''; dirty = true;
  }
  function impact(ix, iy) {
    intro.ix = ix; intro.iy = iy; intro.age = 0;
    const u = W / 1400;
    for (let i = 0; i < (small ? 30 : 52); i++) {
      const a = -Math.PI * (0.08 + Math.random() * 0.84), sp = (380 + Math.random() * 1250) * u, n = 3 + Math.floor(Math.random() * 3), r = (5 + Math.random() * 20) * u * dpr;
      shards.push({ x: ix + (Math.random() - 0.5) * 220 * u, y: iy - Math.random() * 14, vx: Math.cos(a) * sp * 1.25, vy: Math.sin(a) * sp, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 16,
        life: 0, max: 0.9 + Math.random() * 0.9, shade: 70 + Math.floor(Math.random() * 90),
        pts: Array.from({ length: n }, (_, k) => { const q = k / n * 6.283 + Math.random() * 0.7, rr = r * (0.55 + Math.random() * 0.6); return [Math.cos(q) * rr, Math.sin(q) * rr]; }) });
    }
    for (let i = 0; i < 16; i++) dust.push({ x: ix, y: iy, vx: (Math.random() - 0.5) * 1500 * u, vy: -(30 + Math.random() * 190) * u, r: (40 + Math.random() * 90) * u * dpr, life: 0, max: 0.8 + Math.random() * 0.7 });
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * 6.283 + Math.random() * 0.4, len = (0.1 + Math.random() * 0.2) * W, pts = [[0, 0]];
      for (let s = 1; s <= 6; s++) { const d = len * s / 6, j = (Math.random() - 0.5) * 0.3; pts.push([Math.cos(a + j) * d, Math.sin(a + j) * d * 0.26]); }   // flattened: the cracks lie on the ground
      cracks.push(pts);
    }
  }
  function effects(dt) {
    fctx.clearRect(0, 0, W, H);
    if (intro.age > 3) return;
    const A = (intro.age += dt), { ix, iy } = intro, g = 2600 * (W / 1400);
    // ground cracks: shoot out, then fade before the statue moves off
    const grow = clamp(A / 0.14), fade = 1 - clamp((A - 0.55) / 0.5);
    if (fade > 0) { fctx.lineJoin = 'round'; cracks.forEach((pts, n) => {
      fctx.beginPath(); fctx.moveTo(ix, iy);
      const upto = grow * (pts.length - 1);
      for (let s = 1; s <= Math.ceil(upto); s++) { const k = Math.min(1, upto - (s - 1)), a = pts[s - 1], b = pts[s]; fctx.lineTo(ix + lerp(a[0], b[0], k), iy + lerp(a[1], b[1], k)); }
      fctx.strokeStyle = `rgba(255,${150 + n * 6},70,${(0.85 * fade).toFixed(3)})`; fctx.lineWidth = (3.2 - n * 0.12) * dpr; fctx.stroke();
      fctx.strokeStyle = `rgba(8,8,8,${(0.9 * fade).toFixed(3)})`; fctx.lineWidth = 1.2 * dpr; fctx.stroke();
    }); }
    // shockwave + flash
    const ring = clamp(A / 0.6);
    if (ring < 1) { fctx.beginPath(); fctx.ellipse(ix, iy, ring * W * 0.5, ring * W * 0.13, 0, 0, 6.283); fctx.strokeStyle = `rgba(255,190,120,${(0.7 * (1 - ring)).toFixed(3)})`; fctx.lineWidth = (10 * (1 - ring) + 1) * dpr; fctx.stroke(); }
    if (A < 0.2) { const fl = fctx.createRadialGradient(ix, iy, 0, ix, iy, W * 0.38); fl.addColorStop(0, `rgba(255,230,190,${(0.75 * (1 - A / 0.2)).toFixed(3)})`); fl.addColorStop(1, 'rgba(255,200,140,0)'); fctx.fillStyle = fl; fctx.fillRect(0, 0, W, H); }
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

""" + t[b:]

R("    for (const c of [cv, em]) { c.width = W; c.height = H; }", "    for (const c of [cv, em, $('#fx')]) { c.width = W; c.height = H; }")

R("""    const c = cam(p);
    if (dirty || Math.abs(p - lastP) > 0.00002) {
      dirty = false; lastP = p;
      const t = turns(p) + dragTurns, f = (((t % 1) + 1) % 1) * N;
      const box = draw(f, c);""", r"""    const c = cam(p), o = { oy: 0, sq: 1, streak: 0 };
    let ui = intro.waiting ? 0 : 1;
    if (intro.on) {
      const T = (intro.t += dt), u = T - FALL;
      if (u < 0) { const k = T / FALL; o.oy = -(1 - k * k) * 1.3; o.streak = k; }                      // falling, accelerating
      else {
        o.sq = 1 - 0.075 * Math.exp(-u * 9) * Math.cos(u * 21);                                          // land, compress, recover
        const sh = Math.exp(-u * 6.5) * 16;
        stage.style.transform = sh > 0.3 ? `translate3d(${((Math.random() - 0.5) * sh).toFixed(1)}px,${((Math.random() - 0.5) * sh).toFixed(1)}px,0)` : '';
      }
      c[4] = lerp(0.5, c[4], ease(range(T, 1.3, 2.15)));                                                 // then move it over to its place in the hero
      ui = ease(range(T, 1.45, 2.3));
      if (T > 1.45) document.body.classList.remove('intro');
      if (T > 2.35) endIntro();
      dirty = true;
    }
    if (intro.waiting) { ctx.clearRect(0, 0, W, H); return; }
    if (dirty || Math.abs(p - lastP) > 0.00002) {
      dirty = false; lastP = p;
      const t = turns(p) + dragTurns, f = (((t % 1) + 1) % 1) * N;
      const box = draw(f, c, o);
      if (intro.on && !intro.hit && intro.t >= FALL) { intro.hit = true; impact(box.x + box.w * 0.5, box.y + box.h * 0.8); }""")
R("      ghost.style.opacity = clamp(g).toFixed(3);", "      ghost.style.opacity = (clamp(g) * ui).toFixed(3);")
R("    aura.style.opacity = (0.55 + vel * 0.45).toFixed(3);", "    aura.style.opacity = ((0.55 + vel * 0.45) * (intro.on ? clamp((intro.t - FALL) * 3) : ui)).toFixed(3);\n    effects(dt);")
R("  /* ---------- below the stage ---------- */", "  $('.nav__brand').addEventListener('click', () => { if (scrollY < 40 && !intro.on) startIntro(); });\n\n  /* ---------- below the stage ---------- */")
open(p, 'w', encoding='utf8').write(t)

p = 'E:/React/wordpress/figure/index.html'; t = open(p, encoding='utf8').read()
a = '  <canvas id="spin" aria-label="Statue, turning through 360 degrees"></canvas>\n'
assert a in t; t = t.replace(a, a + '  <canvas id="fx" aria-hidden="true"></canvas>\n')
assert '<body>' in t; t = t.replace('<body>', '<body class="intro">')
open(p, 'w', encoding='utf8').write(t)

p = 'E:/React/wordpress/figure/css/style.css'; t = open(p, encoding='utf8').read()
a = "/* captions */"
assert a in t
t = t.replace(a, "/* entrance: the interface waits until the statue has landed */\n.nav, .caps, .hud, .ring { transition: opacity .8s var(--ease), visibility .8s; }\nbody.intro .nav, body.intro .caps, body.intro .hud, body.intro .ring { opacity: 0; visibility: hidden; }\n#fx { pointer-events: none; }\n\n" + a, 1)
open(p, 'w', encoding='utf8').write(t)
print('patched')
