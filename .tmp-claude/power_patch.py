p = 'E:/React/wordpress/figure/js/app.js'
t = open(p, encoding='utf8').read()
def R(a, b):
    global t
    assert t.count(a) >= 1, a[:70]
    t = t.replace(a, b, 1)

# sprites: gold flame + round blue glow; hand track; lightning
R("  let ki = [], kiPower = 0, kiCarry = 0, box = { x: 0, y: 0, w: 1, h: 1 };", r"""  const sprite = (w, h, stops) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.translate(w / 2, h / 2); g.scale(1, h / w);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(-w / 2, -w / 2, w, w); return c;
  };
  const flameGold = sprite(64, 128, [[0, 'rgba(255,255,235,1)'], [0.3, 'rgba(255,228,120,.8)'], [0.62, 'rgba(255,170,30,.32)'], [1, 'rgba(255,120,0,0)']]);
  const orbGlow = sprite(128, 128, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(190,230,255,.95)'], [0.45, 'rgba(70,150,255,.5)'], [1, 'rgba(30,90,255,0)']]);
  // where the open hand is in the frame for each turntable frame it faces us (fractions of the frame)
  const HAND = [[-12, .70, .25], [-8, .69, .25], [-4, .66, .25], [0, .64, .25], [4, .58, .245], [8, .52, .24], [12, .46, .245], [16, .41, .245], [20, .37, .24], [24, .34, .24], [28, .31, .24], [32, .30, .24], [36, .28, .255], [40, .285, .26], [44, .295, .265], [48, .32, .27]];
  function handAt(f) {
    if (f > 60) f -= N;
    if (f < HAND[0][0] || f > HAND[HAND.length - 1][0]) return null;
    let i = 0; while (i < HAND.length - 2 && f > HAND[i + 1][0]) i++;
    const a = HAND[i], b = HAND[i + 1], k = clamp((f - a[0]) / (b[0] - a[0]));
    return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  }
  let orbP = [], charge = 0, curFrame = 0, gold = 0, bolts = [], pulse = 9, clock = 0;
  function orb(dt) {                                             // energy gathering in the open palm
    const hp = handAt(curFrame); if (!hp || charge < 0.01) { orbP.length = 0; return; }
    const x = box.x + hp[0] * box.w, y = box.y + hp[1] * box.h, R = box.w * 0.03 * (0.4 + charge) * (1 + 0.1 * Math.sin(clock * 17));
    fctx.globalCompositeOperation = 'lighter';
    fctx.globalAlpha = 0.5 * charge; fctx.drawImage(orbGlow, x - R * 6, y - R * 6, R * 12, R * 12);                     // wide halo
    fctx.globalAlpha = charge; fctx.drawImage(orbGlow, x - R * 2.2, y - R * 2.2, R * 4.4, R * 4.4);                    // core
    fctx.strokeStyle = `rgba(170,215,255,${(0.5 * charge).toFixed(3)})`; fctx.lineWidth = dpr;
    for (let k = 0; k < 7; k++) { const a = clock * 1.6 + k * 0.9, l = R * (3 + 2 * Math.sin(clock * 5 + k * 2)); fctx.beginPath(); fctx.moveTo(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8); fctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); fctx.stroke(); }
    if (orbP.length < 46 && Math.random() < charge) { const a = Math.random() * 6.283; orbP.push({ a, d: R * (5 + Math.random() * 5), s: 0.6 + Math.random() * 0.8 }); }
    orbP = orbP.filter(q => (q.d -= q.s * R * 9 * dt) > R * 0.4);                                                      // motes pulled inward
    for (const q of orbP) { q.a += dt * 2.4; const r = R * 0.35; fctx.globalAlpha = 0.8 * charge; fctx.drawImage(orbGlow, x + Math.cos(q.a) * q.d - r, y + Math.sin(q.a) * q.d - r, r * 2, r * 2); }
    fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
  }
  function lightning(dt) {                                       // short arcs snapping around the figure at full power
    const cx = box.x + box.w * 0.5, top = box.y + box.h * 0.06, bot = box.y + box.h * (FEET + 0.04);
    if (gold > 0.5 && Math.random() < dt * 26) {
      let x = cx + (Math.random() - 0.5) * box.w * 0.5, y = lerp(top, bot, Math.random()); const pts = [[x, y]], n = 4 + Math.floor(Math.random() * 4), a = Math.random() * 6.283;
      for (let k = 0; k < n; k++) { x += Math.cos(a + (Math.random() - 0.5) * 1.6) * box.w * 0.035; y += Math.sin(a + (Math.random() - 0.5) * 1.6) * box.w * 0.035; pts.push([x, y]); }
      bolts.push({ pts, life: 0.09 + Math.random() * 0.08 });
    }
    bolts = bolts.filter(b => (b.life -= dt) > 0);
    if (!bolts.length) return;
    fctx.globalCompositeOperation = 'lighter'; fctx.lineJoin = 'round';
    for (const b of bolts) { fctx.beginPath(); b.pts.forEach(([x, y], k) => k ? fctx.lineTo(x, y) : fctx.moveTo(x, y));
      fctx.strokeStyle = 'rgba(255,214,90,.55)'; fctx.lineWidth = 4 * dpr; fctx.stroke(); fctx.strokeStyle = 'rgba(255,255,235,.95)'; fctx.lineWidth = 1.3 * dpr; fctx.stroke(); }
    fctx.globalCompositeOperation = 'source-over';
  }
  function powerUp() {                                           // the moment the aura turns: flash, ring, a column of fire
    pulse = 0;
    const cx = box.x + box.w * 0.5, feet = box.y + box.h * FEET;
    for (let i = 0; i < (small ? 50 : 110); i++) { const s = (Math.random() - 0.5) * 0.6;
      ki.push({ x: cx + s * box.w, y: feet - Math.random() * 0.1 * box.h, vx: s * box.w * 1.8, vy: -(1 + Math.random() * 1.7) * box.h, r: (0.05 + Math.random() * 0.1) * box.w, life: 0, max: 0.4 + Math.random() * 0.5, w: Math.random() * 6.28, gold: true }); }
  }
  let ki = [], kiPower = 0, kiCarry = 0, box = { x: 0, y: 0, w: 1, h: 1 };""")

# flames: gold when powered up, and rise faster
R("ki.push({ x: cx + side * bw, y: feet - Math.random() * 0.16 * bh, vx: side * bw * 0.25, vy: -(0.45 + Math.random() * 0.75) * bh,",
  "ki.push({ gold: gold > 0.5, x: cx + side * bw * (1 + gold * 0.35), y: feet - Math.random() * 0.16 * bh, vx: side * bw * 0.25, vy: -(0.45 + Math.random() * 0.75) * bh * (1 + gold * 0.6),")
R("      fctx.drawImage(flame, q.x - r * 0.7, q.y - r * 3.2, r * 1.4, r * 6.4);", "      fctx.drawImage(q.gold ? flameGold : flame, q.x - r * 0.7, q.y - r * 3.2, r * 1.4, r * 6.4);")

R("    if (kiPower > 0.01 || ki.length) energy(dt, kiPower);", r"""    clock += dt;
    if (kiPower > 0.01 || ki.length) energy(dt, kiPower);
    orb(dt); lightning(dt);
    if (pulse < 1.2) {                                           // power-up shockwave
      pulse += dt; const cx = box.x + box.w * 0.5, cy = box.y + box.h * (FEET + 0.03), k = clamp(pulse / 0.7);
      if (k < 1) { fctx.beginPath(); fctx.ellipse(cx, cy, k * W * 0.55, k * W * 0.15, 0, 0, 6.283); fctx.strokeStyle = `rgba(255,220,110,${(0.85 * (1 - k)).toFixed(3)})`; fctx.lineWidth = (12 * (1 - k) + 1) * dpr; fctx.stroke(); }
      const sh = Math.exp(-pulse * 6) * 12;
      if (!intro.on) stage.style.transform = sh > 0.3 ? `translate3d(${((Math.random() - 0.5) * sh).toFixed(1)}px,${((Math.random() - 0.5) * sh).toFixed(1)}px,0)` : '';
      if (pulse < 0.3) { flash.style.opacity = (0.75 * (1 - pulse / 0.3)).toFixed(3); flash.style.transform = `translate3d(${(cx / dpr).toFixed(1)}px,${((box.y + box.h * 0.4) / dpr).toFixed(1)}px,0)`; return; }
    }""")

# golden light on the statue itself (lighting only; the model's own colours are untouched)
R("    const fx = w * 0.14, fy = h * 0.12;\n    edge(x, 0, x + fx, 0, x - 1, y - 1, fx + 1, h + 2);",
  "    if (gold > 0.01) { const gl = ctx.createRadialGradient(x + w * 0.5, y + h * 0.42, 0, x + w * 0.5, y + h * 0.42, h * 0.55); gl.addColorStop(0, `rgba(255,205,70,${(0.34 * gold).toFixed(3)})`); gl.addColorStop(1, 'rgba(255,170,30,0)');\n      ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = gl; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; }\n    const fx = w * 0.14, fy = h * 0.12;\n    edge(x, 0, x + fx, 0, x - 1, y - 1, fx + 1, h + 2);")

# tick: charge in the paint section, gold from the last chapter on
R("const want = 0.6 * (1 - range(p, 0.03, 0.12)) + 0.45 * range(p, 0.9, 0.97); kiPower += (want - kiPower) * (1 - Math.exp(-dt * 4)); }",
  "const want = 0.6 * (1 - range(p, 0.03, 0.12)) + 1.35 * gold; kiPower += (want - kiPower) * (1 - Math.exp(-dt * 4)); }")
R("    const c = cam(p), o = {", """    charge = ease(range(p, 0.37, 0.45)) * (1 - range(p, 0.545, 0.585));
    const g2 = ease(range(p, 0.775, 0.8));
    if (g2 > 0.5 && gold <= 0.5) powerUp();
    if (g2 !== gold) { gold = g2; dirty = true; aura.classList.toggle('is-gold', gold > 0.5); }
    const c = cam(p), o = {""")
R("      box = draw(f, c, o);", "      curFrame = f; box = draw(f, c, o);")
R("const CHAP = [[0, '00 · Intro'], [0.14, '01 · Sculpt'], [0.36, '02 · Paint'], [0.58, '03 · Base'], [0.8, '04 · 360°']];",
  "const CHAP = [[0, '00 · Intro'], [0.14, '01 · Sculpt'], [0.36, '02 · Paint'], [0.58, '03 · Base'], [0.78, '04 · Full power']];")
# the orb needs redraws while the page is still
R("    aura.style.opacity = ((0.55 + vel * 0.45)", "    if (charge > 0.01) dirty = true;\n    aura.style.opacity = ((0.55 + vel * 0.45)")
open(p, 'w', encoding='utf8').write(t)

p = 'E:/React/wordpress/figure/index.html'; t = open(p, encoding='utf8').read()
a = '  <section class="cap cap--hero cap--end" data-from="0.9" data-to="1.5">'
assert a in t
t = t.replace(a, '''  <section class="cap cap--left" data-from="0.8" data-to="0.885">
    <p class="tag mono"><b>04</b> Full power</p>
    <h2>Past the limit.</h2>
    <p>The aura turns gold and the air starts to crack. Keep scrolling: it holds from every side.</p>
  </section>
''' + a, 1)
t = t.replace('<h2>Eleven layers, by hand.</h2>\n    <p>Silver hair shaded from pearl to steel, skin tones airbrushed then glazed, and matt varnish everywhere except the eyes.</p>',
              '<h2>Eleven layers, by hand.</h2>\n    <p>Silver hair shaded from pearl to steel, skin tones airbrushed then glazed. Watch the open palm: that is where the power gathers.</p>')
open(p, 'w', encoding='utf8').write(t)

p = 'E:/React/wordpress/figure/css/style.css'; t = open(p, encoding='utf8').read()
a = ".ring { position: absolute;"
assert a in t
t = t.replace(a, ".aura.is-gold { background: radial-gradient(circle, rgba(255, 214, 80, .5) 0%, rgba(255, 170, 30, .24) 34%, rgba(255, 120, 0, .08) 56%, transparent 72%); }\n" + a, 1)
open(p, 'w', encoding='utf8').write(t)
print('patched')
