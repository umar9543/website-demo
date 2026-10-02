p = r'E:/React/wordpress/zoom-3d/app.js'
t = open(p, encoding='utf8').read()
def R(a, b):
    global t
    assert a in t, a[:70]
    t = t.replace(a, b)

# ---------- renderer: crisper ----------
R("renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5));",
  "renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));")
R("scene.fog = new T.Fog(0xa9a49c, 160, 900);", "scene.fog = new T.Fog(0xa9a49c, 140, 1500);")
R("const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());", "const aniso = renderer.capabilities.getMaxAnisotropy();")

# ---------- facade shader (shared by the hero tower's curtain wall and the city) ----------
R("  /* ---------- building ---------- */", r'''  /* ---------- facade shader: curtain wall or masonry with real-looking windows, lit at night ---------- */
  const FAC = { uNight: { value: 0 }, uCam: { value: new T.Vector3() } };
  function facadeMat(map, key, opts = {}) {
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, map: map || null, transparent: !!opts.transparent });
    const alpha = { value: 1 }; m.userData.alpha = alpha;
    m.onBeforeCompile = sh => {
      sh.uniforms.uNight = FAC.uNight; sh.uniforms.uCam = FAC.uCam; sh.uniforms.uAlpha = alpha;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aParams; varying vec3 vWP; varying vec3 vWN; varying vec4 vPar;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          mat4 fM = modelMatrix;
          #ifdef USE_INSTANCING
            fM = modelMatrix * instanceMatrix;
          #endif
          vWP = (fM * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(fM) * objectNormal); vPar = aParams;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNight; uniform vec3 uCam; uniform float uAlpha;
          varying vec3 vWP; varying vec3 vWN; varying vec4 vPar;
          float fh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          vec3 fAlb; float fRgh; float fMet; vec3 fEm;`)
        .replace('#include <map_fragment>', `{
          vec3 n = normalize(vWN);
          float seed = vPar.x, style = vPar.w;
          vec3 tint = diffuseColor.rgb;
          fEm = vec3(0.0);
          #ifdef USE_MAP
            vec3 tx = texture2D(map, (abs(n.y) > 0.5 ? vWP.xz : vec2(dot(vWP.xz, vec2(-n.z, n.x)), vWP.y)) / 3.2).rgb;
          #else
            vec3 tx = vec3(0.55);
          #endif
          if (abs(n.y) > 0.5) {
            fAlb = vec3(0.24, 0.24, 0.23) * (0.7 + 0.6 * tx); fRgh = 0.92; fMet = 0.0;
          } else {
            vec2 fc = vec2(dot(vWP.xz, vec2(-n.z, n.x)), vWP.y - 0.15);
            vec2 q = vec2(fc.x / vPar.z, fc.y / vPar.y);
            vec2 cell = floor(q); vec2 f = fract(q);
            float rnd = fh2(cell + seed * 17.0 + n.xz * 3.1);
            float lit = step(0.62, fh2(cell * 1.31 + seed * 5.0 + n.xz * 1.7));
            vec3 warm = mix(vec3(1.0, 0.72, 0.42), vec3(0.8, 0.88, 1.0), step(0.82, fh2(cell + 2.7)));
            if (style < 0.5) {
              float mull = step(f.x, 0.025) + step(0.975, f.x);
              float spand = step(f.y, 0.22) + step(0.985, f.y);
              float glass = 1.0 - clamp(mull + spand, 0.0, 1.0);
              vec3 gcol = tint * (0.8 + rnd * 0.4) * (1.0 - uNight * 0.75);
              fAlb = mix(mix(tint * 0.22, vec3(0.16, 0.17, 0.18), mull), gcol, glass);
              fRgh = mix(mix(0.45, 0.3, mull), 0.03 + rnd * 0.05, glass);
              fMet = mix(mix(0.4, 0.85, mull), 1.0, glass);
              fEm = warm * glass * lit * uNight * (0.35 + rnd * 0.8) * (0.55 + 0.45 * f.y);
            } else {
              float win = step(0.27, f.x) * step(f.x, 0.73) * step(0.3, f.y) * step(f.y, 0.86);
              float frm = step(0.25, f.x) * step(f.x, 0.75) * step(0.28, f.y) * step(f.y, 0.88) - win;
              float sill = step(0.23, f.x) * step(f.x, 0.77) * step(0.24, f.y) * step(f.y, 0.28);
              vec3 wall = tint * (0.5 + 0.8 * tx);
              vec3 inside = vec3(0.06, 0.06, 0.055) + vec3(0.05, 0.045, 0.035) * rnd;
              fAlb = mix(mix(mix(wall, vec3(0.12), frm), vec3(0.62, 0.6, 0.56), sill), inside, win);
              fRgh = mix(0.9, 0.04, win); fMet = mix(0.0, 0.35, win);
              fEm = warm * win * lit * uNight * (0.35 + rnd * 0.7);
            }
            float gf = 1.0 - step(4.5, vWP.y);
            fEm += vec3(1.0, 0.8, 0.55) * gf * step(0.6, f.y) * uNight * 0.6 * step(0.3, rnd);
          }
          diffuseColor.rgb = fAlb; diffuseColor.a *= uAlpha;
        }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = fRgh;')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = fMet;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fEm;');
    };
    m.customProgramCacheKey = () => 'fac-' + key;
    return m;
  }

  /* ---------- building ---------- */''')

# ---------- hero tower: real curtain wall instead of a metallic box ----------
R("  const floors = [], glassMats = [];", "  const floors = [];\n  const heroGlass = clip(facadeMat(null, 'hero', { transparent: true }));\n  heroGlass.color.set(0x9fb4c4);\n  const heroShell = new T.InstancedMesh(new T.BoxGeometry(W - 0.2, FH - 0.75, D - 0.2), heroGlass, FLOORS);\n  heroShell.castShadow = heroShell.receiveShadow = true; heroShell.renderOrder = 2; tower.add(heroShell);\n  { const prm = new Float32Array(FLOORS * 4); for (let i = 0; i < FLOORS; i++) prm.set([0.31 + i * 0.173, FH, 1.5, 0], i * 4); heroShell.geometry.setAttribute('aParams', new T.InstancedBufferAttribute(prm, 4)); }\n  const heroM = new T.Matrix4(), hideM = new T.Matrix4().makeScale(0, 0, 0);")
R("""      const gm = clip(new T.MeshStandardMaterial({ color: 0x8796a3, metalness: 1, roughness: 0.06, emissive: 0xffb466, emissiveIntensity: 0 }));
      gm.userData.lit = Math.random(); glassMats.push(gm);
      box(W - 0.2, FH - 0.75, D - 0.2, gm, 0, FH / 2, 0, g);""", """      heroShell.setMatrixAt(i, heroM.makeTranslation(0, yF(i) + FH / 2, 0));""")
R("    } else {\n      // Level 08:", "    } else {\n      heroShell.setMatrixAt(i, hideM);\n      // Level 08:")

# ---------- city ----------
old_start = t.index("  const plaza = new T.Mesh(new T.PlaneGeometry(120, 120)")
old_end = t.index("  /* ---------- lights + skies ---------- */")
city = r'''  const PITCH = 110, ROAD = 16, BLOCK = PITCH - ROAD, WALK = 5, CURB = 0.15, RG = 3;
  const PARKS = new Set(['0,1', '1,1', '1,0']);     // blocks the camera flies through stay low
  const setI = (im, i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => { const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry); im.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, y, z), q, new T.Vector3(sx, sy, sz))); };

  const plaza = new T.Mesh(new T.PlaneGeometry(BLOCK, BLOCK).rotateX(-Math.PI / 2), pavers); plaza.position.y = CURB; plaza.receiveShadow = true; scene.add(plaza);
  const plazaKerb = new T.Mesh(new T.BoxGeometry(BLOCK, CURB, BLOCK), new T.MeshStandardMaterial({ color: 0xb9b5ae, roughness: 0.85 })); plazaKerb.position.y = CURB / 2; scene.add(plazaKerb);
  const road = new T.Mesh(new T.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), asphalt); road.receiveShadow = true; scene.add(road);
  const raft = box(W + 2, 1.9, D + 2, concrete, 0, -1.0, 0, scene);
  const piles = new T.InstancedMesh(new T.CylinderGeometry(0.45, 0.45, 16.5, 16), concrete, 48);
  { const M = new T.Matrix4(); let k = 0;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) piles.setMatrixAt(k++, M.makeTranslation(-10.5 + i * 3, -1.95 - 8.25, -8.5 + j * 3.4)); }
  piles.castShadow = true; scene.add(piles);
  [[-200, 200, -24, -0.06, -200, -12], [-200, -13.5, -24, -0.06, -12, 6], [13.5, 200, -24, -0.06, -12, 6], [-13.5, 13.5, -24, -19, -12, 6], [-13.5, 13.5, -1.9, -0.06, -12, -11.4]]
    .forEach(([x0, x1, y0, y1, z0, z1]) => box(x1 - x0, y1 - y0, z1 - z0, dirt, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, scene));

  // blocks: pavement + kerb
  const blocks = [];
  for (let bx = -RG; bx <= RG; bx++) for (let bz = -RG; bz <= RG; bz++) if (bx || bz) blocks.push([bx, bz]);
  { const walkMat = pbr('square_concrete_pavers', BLOCK / 2.4, BLOCK / 2.4, { color: 0xd8d4cc });
    const walk = new T.InstancedMesh(new T.PlaneGeometry(BLOCK, BLOCK).rotateX(-Math.PI / 2), walkMat, blocks.length);
    const kerb = new T.InstancedMesh(new T.BoxGeometry(BLOCK, CURB, BLOCK), plazaKerb.material, blocks.length);
    blocks.forEach(([bx, bz], i) => { setI(walk, i, bx * PITCH, CURB + 0.001, bz * PITCH); setI(kerb, i, bx * PITCH, CURB / 2, bz * PITCH); });
    walk.receiveShadow = kerb.receiveShadow = true; scene.add(walk, kerb); }

  // road markings
  { const marks = [], roadsAt = []; for (let i = -RG - 1; i <= RG; i++) roadsAt.push((i + 0.5) * PITCH);
    const L = RG * PITCH + PITCH / 2, inJ = v => roadsAt.some(c => Math.abs(v - c) < ROAD / 2 + 3);
    roadsAt.forEach(c => {
      for (let v = -L; v < L; v += 10) { if (inJ(v) || inJ(v + 3)) continue; marks.push([c, v + 1.5, 0.16, 3, 0], [v + 1.5, c, 0.16, 3, 1]); }
      roadsAt.forEach((c2, k) => { if (k === roadsAt.length - 1) return;
        const a = c2 + ROAD / 2 + 3, b = roadsAt[k + 1] - ROAD / 2 - 3, mid = (a + b) / 2, len = b - a;
        [-7.3, 7.3].forEach(o => marks.push([c + o, mid, 0.16, len, 0], [mid, c + o, 0.16, len, 1]));
        for (let s = -6.3; s <= 6.3; s += 1.4) marks.push([c + s, a - 1.8, 0.7, 3.2, 0], [c + s, b + 1.8, 0.7, 3.2, 0], [a - 1.8, c + s, 0.7, 3.2, 1], [b + 1.8, c + s, 0.7, 3.2, 1]); }); });
    const mm = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), marks.length);
    marks.forEach((m, i) => setI(mm, i, m[0], 0.02, m[1], m[4] ? m[3] : m[2], 1, m[4] ? m[2] : m[3]));
    mm.receiveShadow = true; scene.add(mm); }

  // buildings (curtain wall / brick / plaster), lower near the hero, taller with distance
  { let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const lots = { glass: [], brick: [], plaster: [] }, roofBits = [];
    const inner = BLOCK - WALK * 2 - 1;
    for (const [bx, bz] of blocks) {
      if (PARKS.has(bx + ',' + bz)) continue;
      const cx = bx * PITCH, cz = bz * PITCH;
      const sx = r() < 0.55 ? 2 : 1, sz = r() < 0.5 ? 2 : 1;
      for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) {
        if (r() < 0.1) continue;
        const lw = inner / sx, ld = inner / sz, x = cx - inner / 2 + lw * (i + 0.5), z = cz - inner / 2 + ld * (j + 0.5);
        const dist = Math.hypot(x, z), w = lw - 2 - r() * 6, dd = ld - 2 - r() * 6;
        const tall = r() < 0.35;
        let h = tall ? 40 + Math.pow(r(), 1.4) * 110 : 10 + r() * 20;
        h = Math.min(h, dist < 170 ? 32 : 32 + (dist - 170) * 0.7);
        const fh = tall ? 3.8 : 3.2 + r() * 0.4; h = Math.max(fh * 3, Math.round(h / fh) * fh) + 0.15;
        const type = tall ? 'glass' : (r() < 0.5 ? 'brick' : 'plaster');
        const tl = type === 'brick' ? 0.75 + r() * 0.35 : 0.72 + r() * 0.3;
        lots[type].push({ x, z, w, d: dd, h, fh, bay: type === 'glass' ? 1.5 + r() * 0.4 : 2.4 + r() * 0.8, seed: r(), tint: [tl, tl * (0.96 + r() * 0.06), tl * (0.9 + r() * 0.1)] });
        for (let k = 0, nb = 1 + Math.floor(r() * 3); k < nb; k++) roofBits.push([x + (r() - .5) * w * .5, h, z + (r() - .5) * dd * .5, 2 + r() * 5, 1.2 + r() * 2.5, 2 + r() * 5]);
      } }
    const brickTex = tex('brick_wall_10', 'diff'), plasterTex = tex('painted_plaster_wall', 'diff');
    const mats = { glass: facadeMat(null, 'glass'), brick: facadeMat(brickTex, 'brick'), plaster: facadeMat(plasterTex, 'plaster') };
    mats.glass.color.set(0x7f93a3);
    for (const k in lots) { const L2 = lots[k]; if (!L2.length) continue;
      const g = new T.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
      const prm = new Float32Array(L2.length * 4), im = new T.InstancedMesh(g, mats[k], L2.length), col = new T.Color();
      L2.forEach((l, i) => { setI(im, i, l.x, CURB, l.z, l.w, l.h, l.d); im.setColorAt(i, col.setRGB(...l.tint)); prm.set([l.seed, l.fh, l.bay, k === 'glass' ? 0 : 1], i * 4); });
      g.setAttribute('aParams', new T.InstancedBufferAttribute(prm, 4));
      im.castShadow = im.receiveShadow = true; scene.add(im); }
    const rb = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new T.MeshStandardMaterial({ color: 0x8d8f91, roughness: 0.6, metalness: 0.4 }), roofBits.length);
    roofBits.forEach((b, i) => setI(rb, i, b[0], b[1] + CURB, b[2], b[3], b[4], b[5])); rb.castShadow = true; scene.add(rb); }

  // trees (street + parks), lamps, traffic
  const treeGeo = (() => { let s = 8; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const paint = (g, c) => { if (g.index) g = g.toNonIndexed(); const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set(c, i); g.setAttribute('color', new T.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
    const parts = [paint(new T.CylinderGeometry(0.16, 0.26, 3.4, 7).translate(0, 1.7, 0), [0.24, 0.17, 0.11])];
    for (let k = 0; k < 5; k++) { const b = new T.IcosahedronGeometry(1.5 + r() * 0.9, 2), pp = b.attributes.position, v = new T.Vector3();
      for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const n = 1 + Math.sin(v.x * 3.1) * Math.sin(v.y * 2.7) * Math.sin(v.z * 3.3) * 0.2; pp.setXYZ(i, v.x * n, v.y * n * 0.85, v.z * n); }
      b.computeVertexNormals(); b.translate((r() - .5) * 2, 4.4 + r() * 1.6, (r() - .5) * 2); parts.push(paint(b, [0.2 + r() * 0.08, 0.3 + r() * 0.1, 0.12])); }
    return mergeGeometries(parts); })();
  { let s = 55; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const spots = [], roadsAt = []; for (let i = -RG - 1; i <= RG; i++) roadsAt.push((i + 0.5) * PITCH);
    roadsAt.forEach(c => { for (let v = -RG * PITCH; v <= RG * PITCH; v += 14) { if (roadsAt.some(c2 => Math.abs(v - c2) < 14) || r() < 0.3) continue;
      [-1, 1].forEach(sd => { spots.push([c + sd * (ROAD / 2 + 2.6), v + 7]); spots.push([v + 7, c + sd * (ROAD / 2 + 2.6)]); }); } });
    for (const key of PARKS) { const [bx, bz] = key.split(',').map(Number); for (let k = 0; k < 22; k++) spots.push([bx * PITCH + (r() - .5) * (BLOCK - 14), bz * PITCH + (r() - .5) * (BLOCK - 14)]); }
    for (let i = spots.length - 1; i >= 0; i--) { const [x, z] = spots[i]; if (Math.abs(x) < BLOCK / 2 + 1 && Math.abs(z) < BLOCK / 2 + 1) spots.splice(i, 1); }
    const trees = new T.InstancedMesh(treeGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), spots.length), col = new T.Color();
    spots.forEach((sp, i) => { const sc = 0.85 + r() * 0.45; setI(trees, i, sp[0], CURB, sp[1], sc, sc, sc, r() * 6.28); trees.setColorAt(i, col.setHSL(0.22 + r() * 0.07, 0.4, 0.5 + r() * 0.2)); });
    trees.castShadow = trees.receiveShadow = true; scene.add(trees); }
  // plaza trees around the hero
  { const pts = [[-40, -36], [-40, -12], [-40, 12], [-40, 36], [40, 36], [40, -36], [-18, 40], [18, 40], [-18, -40], [18, -40]];
    const pt = new T.InstancedMesh(treeGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), pts.length);
    pts.forEach((sp, i) => setI(pt, i, sp[0], CURB, sp[1], 1.1, 1.1, 1.1, i * 1.3)); pt.castShadow = true; scene.add(pt); }

  const lampHead = new T.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd7a0, emissiveIntensity: 0 });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.35, 'rgba(255,170,90,.35)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return tx; })();
  const poolMat = new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  { const spots = [], roadsAt = []; for (let i = -RG - 1; i <= RG; i++) roadsAt.push((i + 0.5) * PITCH);
    roadsAt.forEach(c => { for (let v = -RG * PITCH; v <= RG * PITCH; v += 34) { if (roadsAt.some(c2 => Math.abs(v - c2) < 12)) continue;
      [-1, 1].forEach(sd => { spots.push([c + sd * (ROAD / 2 + 0.8), v, sd > 0 ? Math.PI : 0]); spots.push([v, c + sd * (ROAD / 2 + 0.8), sd > 0 ? -Math.PI / 2 : Math.PI / 2]); }); } });
    const poleG = mergeGeometries([new T.CylinderGeometry(0.08, 0.12, 8.5, 8).translate(0, 4.25, 0), new T.BoxGeometry(2.2, 0.1, 0.1).translate(1.0, 8.4, 0)]);
    const poles = new T.InstancedMesh(poleG, darkAlu, spots.length), heads = new T.InstancedMesh(new T.BoxGeometry(0.7, 0.14, 0.32), lampHead, spots.length), pools = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, spots.length);
    spots.forEach((sp, i) => { const ry = sp[2], dx = Math.cos(ry) * 2, dz = -Math.sin(ry) * 2;
      setI(poles, i, sp[0], CURB, sp[1], 1, 1, 1, ry); setI(heads, i, sp[0] + dx, 8.35 + CURB, sp[1] + dz, 1, 1, 1, ry); setI(pools, i, sp[0] + dx * 1.6, 0.05, sp[1] + dz * 1.6, 15, 1, 15); });
    poles.castShadow = true; scene.add(poles, heads, pools); }

  const CARS = small ? 60 : 140;
  const carGeo = (() => { const paint = (g, c) => { g = g.toNonIndexed(); const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set(c, i); g.setAttribute('color', new T.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
    const lower = new T.BoxGeometry(4.5, 0.72, 1.86).translate(0, 0.62, 0), cabin = new T.BoxGeometry(2.5, 0.62, 1.62).translate(-0.25, 1.28, 0), cp = cabin.attributes.position;
    for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 1.3) cp.setX(i, cp.getX(i) * 0.82 - 0.1);
    const wheels = [[1.45, 0.92], [1.45, -0.92], [-1.45, 0.92], [-1.45, -0.92]].map(([x, z]) => new T.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateX(Math.PI / 2).translate(x, 0.36, z));
    return mergeGeometries([paint(lower, [1, 1, 1]), paint(cabin, [0.12, 0.13, 0.15]), ...wheels.map(w => paint(w, [0.05, 0.05, 0.05]))]); })();
  const cars = new T.InstancedMesh(carGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.55 }), CARS);
  const headL = new T.InstancedMesh(new T.BoxGeometry(0.06, 0.12, 1.5), new T.MeshBasicMaterial({ color: new T.Color(4, 3.8, 3.3), toneMapped: false }), CARS);
  const tailL = new T.InstancedMesh(new T.BoxGeometry(0.06, 0.12, 1.5), new T.MeshBasicMaterial({ color: new T.Color(3, 0.15, 0.1), toneMapped: false }), CARS);
  cars.castShadow = true; scene.add(cars, headL, tailL);
  const traffic = [];
  { let s = 21; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const roadsAt = []; for (let i = -RG; i < RG; i++) roadsAt.push((i + 0.5) * PITCH);
    const palette = [[0.9, 0.9, 0.9], [0.05, 0.05, 0.06], [0.35, 0.37, 0.4], [0.6, 0.62, 0.64], [0.45, 0.05, 0.04], [0.06, 0.12, 0.3], [0.85, 0.85, 0.82]], col = new T.Color();
    for (let i = 0; i < CARS; i++) { const axis = r() < 0.5 ? 0 : 1, c = roadsAt[Math.floor(r() * roadsAt.length)], dir = r() < 0.5 ? 1 : -1;
      traffic.push({ axis, c, dir, lane: dir * (r() < 0.5 ? 2 : 5.8), t: (r() - 0.5) * 2 * RG * PITCH, v: 9 + r() * 6 });
      cars.setColorAt(i, col.setRGB(...palette[Math.floor(r() * palette.length)])); } }
  function updateTraffic(dt) {
    const L = RG * PITCH;
    traffic.forEach((c, i) => { c.t += c.v * c.dir * dt; if (c.t > L) c.t -= 2 * L; if (c.t < -L) c.t += 2 * L;
      const x = c.axis ? c.c - c.lane : c.t, z = c.axis ? c.t : c.c + c.lane, ry = c.axis ? (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
      setI(cars, i, x, 0, z, 1, 1, 1, ry); const fx = Math.cos(ry), fz = -Math.sin(ry);
      setI(headL, i, x + fx * 2.26, 0.72, z + fz * 2.26, 1, 1, 1, ry); setI(tailL, i, x - fx * 2.26, 0.78, z - fz * 2.26, 1, 1, 1, ry); });
    cars.instanceMatrix.needsUpdate = headL.instanceMatrix.needsUpdate = tailL.instanceMatrix.needsUpdate = true;
  }

'''
t = t[:old_start] + city + t[old_end:]

# mergeGeometries import
R("import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')\n  ]);",
  "import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'), import('three/addons/utils/BufferGeometryUtils.js')\n  ]);")
R("const [THREE, { RGBELoader }, { GLTFLoader }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([",
  "const [THREE, { RGBELoader }, { GLTFLoader }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { mergeGeometries }] = await Promise.all([")

# shadows cover the plaza and nearest streets
R("Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 45, bottom: -40, near: 1, far: 400 });",
  "Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 75, bottom: -70, near: 1, far: 500 });")

# ---------- apply(): hero glass fade, city night, exploded shell follows floors ----------
R("    glassMats.forEach(m => { m.transparent = xr > 0.001; m.opacity = 1 - xr * 0.93; m.depthWrite = xr < 0.5; });",
  "    heroGlass.userData.alpha.value = 1 - xr * 0.94; heroGlass.depthWrite = xr < 0.5;\n    for (let i = 0; i < FLOORS; i++) if (i !== L8) heroShell.setMatrixAt(i, heroM.makeTranslation(0, floors[i].position.y + FH / 2, 0));\n    heroShell.instanceMatrix.needsUpdate = true;")
R("    glassMats.forEach(m => (m.emissiveIntensity = night * (m.userData.lit > 0.45 ? 0.12 + (m.userData.lit - 0.45) * 0.7 : 0.01)));",
  "    FAC.uNight.value = night; lampHead.emissiveIntensity = lerp(0, 9, night); poolMat.opacity = night * 0.5;")
R("    composer.render(dt);", "    updateTraffic(dt); FAC.uCam.value.copy(camera.position);\n    composer.render(dt);")

# ---------- smoother scroll ----------
R("lenis = new Lenis({ duration: 1.25, smoothWheel: true });", "lenis = new Lenis({ duration: 1.6, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });")
R("    p += (target - p) * (1 - Math.exp(-dt * 5));", "    p += (target - p) * (1 - Math.exp(-dt * 4));")
open(p, 'w', encoding='utf8').write(t)
print('patched')
