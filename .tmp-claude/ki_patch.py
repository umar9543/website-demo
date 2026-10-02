p = 'E:/React/wordpress/figure/js/app.js'
t = open(p, encoding='utf8').read()
def R(a, b):
    global t
    assert t.count(a) >= 1, a[:70]
    t = t.replace(a, b, 1)

# the two entrance layers: the base on its own, and the figure cut out of the front frame
R("  function frame(i) {", """  const layer = src => { const im = new Image(); im.decoding = 'async'; im.onload = () => (dirty = true); im.src = src; return im; };
  const baseImg = layer('media/base.webp'), heroImg = layer('media/hero.webp');
  const FEET = 0.724;   // where the figure's feet sit in the frame, as a fraction of its height
  function frame(i) {""")

# draw(): during the entrance the base stays on the ground and the figure falls onto it
a = t.index("  function draw(f, c, o) {"); b = t.index("  /* ---------- entrance")
t = t[:a] + r"""  function draw(f, c, o) {
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

""" + t[b:]

R("  const FALL = 0.5, intro =", "  const FALL = 0.62, LAND = 0.75, intro =")
R("    Object.assign(intro, { on: true, waiting: false, t: 0, hit: false, age: 9 }); shards = []; dust = []; cracks = [];",
  "    Object.assign(intro, { on: true, waiting: false, t: 0, hit: false, age: 9 }); shards = []; dust = []; cracks = []; dragTurns = 0; dragVel = 0; kiPower = 0;")

# energy aura: soft flame tongues rising around the figure, drawn from one pre-made sprite
R("  function effects(dt) {\n    fctx.clearRect(0, 0, W, H);\n    if (intro.age > 3) { flash.style.opacity = '0'; return; }",
  r"""  const flame = (() => {
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
      fctx.drawImage(flame, q.x - r, q.y - r * 2.4, r * 2, r * 4.8);
    }
    fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
  }
  function effects(dt) {
    fctx.clearRect(0, 0, W, H);
    if (kiPower > 0.01 || ki.length) energy(dt, kiPower);
    if (intro.age > 3) { flash.style.opacity = '0'; return; }""")

# landing burst: a column of energy shoots up from the feet
R("    for (let i = 0; i < 16; i++) dust.push(", """    for (let i = 0; i < (small ? 40 : 90); i++) { const s = (Math.random() - 0.5) * 0.5;
      ki.push({ x: ix + s * box.w, y: iy - Math.random() * 0.05 * box.h, vx: s * box.w * 1.6, vy: -(0.9 + Math.random() * 1.5) * box.h, r: (0.05 + Math.random() * 0.09) * box.w, life: 0, max: 0.35 + Math.random() * 0.45, w: Math.random() * 6.28 }); }
    for (let i = 0; i < 16; i++) dust.push(""")

# tick: split layers while falling and settling, energy level afterwards
R("    const c = cam(p), o = { oy: 0, sq: 1, streak: 0 };", "    const c = cam(p), o = { oy: 0, sq: 1, streak: 0, split: false, ground: 1, dip: 0 };")
R("""      if (u < 0) { const k = T / FALL; o.oy = -(1 - k * k) * 1.3; o.streak = k; }                      // falling, accelerating
      else {
        o.sq = 1 - 0.075 * Math.exp(-u * 9) * Math.cos(u * 21);                                          // land, compress, recover""",
  """      o.split = T < FALL + LAND; o.ground = ease(clamp(T / 0.2));
      if (u < 0) { const k = T / FALL; o.oy = -(1 - k * k * k) * 1.25; o.streak = k * k; }              // falling, accelerating
      else {
        o.sq = 1 - 0.1 * Math.exp(-u * 8) * Math.cos(u * 19);                                            // land, compress, recover
        o.dip = 0.012 * Math.exp(-u * 10);                                                               // the ground takes the hit""")
R("      c[4] = lerp(0.5, c[4], ease(range(T, 1.3, 2.15)));", "      c[4] = lerp(0.5, c[4], ease(range(T, 1.75, 2.6)));")
R("      ui = ease(range(T, 1.45, 2.3));\n      if (T > 1.45) document.body.classList.remove('intro');\n      if (T > 2.35) endIntro();",
  "      ui = ease(range(T, 1.9, 2.75));\n      if (T > 1.9) document.body.classList.remove('intro');\n      if (T > 2.8) endIntro();\n      kiPower = u < 0 ? 0 : lerp(1.5, 0.6, clamp(u / 1.6));                                              // flares on landing, then burns steadily")
R("    if (dirty || Math.abs(p - lastP) > 0.00002) {\n      dirty = false; lastP = p;\n      const t = turns(p) + dragTurns, f = (((t % 1) + 1) % 1) * N;\n      const box = draw(f, c, o);",
  "    if (!intro.on && !intro.waiting) { const want = 0.6 * (1 - range(p, 0.03, 0.12)) + 0.45 * range(p, 0.9, 0.97); kiPower += (want - kiPower) * (1 - Math.exp(-dt * 4)); }   // the aura belongs to the hero and the finale\n    if (dirty || Math.abs(p - lastP) > 0.00002) {\n      dirty = false; lastP = p;\n      const t = turns(p) + dragTurns, f = (((t % 1) + 1) % 1) * N;\n      box = draw(f, c, o);")
R("impact(box.x + box.w * 0.5, box.y + box.h * 0.8);", "impact(box.x + box.w * 0.5, box.y + box.h * (FEET + 0.03));")
open(p, 'w', encoding='utf8').write(t)
print('patched')
