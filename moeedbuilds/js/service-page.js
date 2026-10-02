/* Service pages: reveals, sticky story, process line and the per-page demos.
   Every piece looks for its own data attribute and quietly does nothing when that
   element is not on the page, so all three service pages share this one file. */
(function () {
    'use strict';

    var root = document.documentElement;
    root.classList.add('sv-js');

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasIO = 'IntersectionObserver' in window;

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    function track(name, params) {
        if (typeof window.gtag === 'function') {
            try { window.gtag('event', name, params || {}); } catch (e) { /* analytics is never load bearing */ }
        }
    }

    /* ---------- nav state + mobile menu (these pages have no other script for it) ---------- */
    var nav = document.getElementById('nav');
    function navState() {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
    }
    window.addEventListener('scroll', navState, { passive: true });
    navState();

    window.toggleMobileMenu = function () {
        var menu = document.getElementById('mobileMenu');
        var back = document.getElementById('mobileBackdrop');
        if (!menu) return;
        menu.classList.toggle('open');
        if (back) back.classList.toggle('open');
        document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    };

    /* ---------- scroll reveal ---------- */
    var reveals = $$('.sv-reveal, .sv-reveal-stagger');
    if (!hasIO || reduce) {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        var rio = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    rio.unobserve(e.target);
                }
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
        reveals.forEach(function (el) { rio.observe(el); });
    }

    /* ---------- sticky story: the step in the middle of the screen drives the stage ---------- */
    var steps = $$('.sv-step');
    var scenes = $$('.sv-scene');
    if (steps.length && scenes.length) {
        var setStep = function (i) {
            steps.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });
            scenes.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });
        };
        setStep(0);
        if (hasIO) {
            var sio = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) setStep(steps.indexOf(e.target));
                });
            }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
            steps.forEach(function (s) { sio.observe(s); });
        }
    }

    /* ---------- process: fill the line with scroll progress, light the nodes it passes ---------- */
    var proc = $('.sv-process');
    if (proc) {
        var nodes = $$('.sv-node', proc);
        var ticking = false;
        var paint = function () {
            ticking = false;
            var r = proc.getBoundingClientRect();
            var vh = window.innerHeight;
            var p = (vh * 0.75 - r.top) / (r.height + vh * 0.25);
            p = Math.max(0, Math.min(1, p));
            proc.style.setProperty('--p', p.toFixed(3));
            nodes.forEach(function (n, i) {
                n.classList.toggle('is-on', p >= (i / Math.max(1, nodes.length - 1)) * 0.96);
            });
        };
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(paint); }
        }, { passive: true });
        window.addEventListener('resize', paint);
        paint();
    }

    /* ==================================================================
       Hero demo 1: theme editor (custom sections)
       ================================================================== */
    var editor = $('[data-demo="editor"]');
    if (editor) {
        var btns = $$('.sv-block-btn', editor);
        var touched = false;

        var toggle = function (btn, force) {
            var on = typeof force === 'boolean' ? force : !btn.classList.contains('is-on');
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            var eye = btn.querySelector('.sv-eye');
            if (eye) eye.className = 'sv-eye fas ' + (on ? 'fa-eye' : 'fa-eye-slash');
            var pv = editor.querySelector('[data-pv="' + btn.dataset.block + '"]');
            if (pv) pv.classList.toggle('is-off', !on);
        };

        btns.forEach(function (b) {
            b.addEventListener('click', function () {
                touched = true;
                toggle(b);
                track('service_demo_interact', { demo: 'editor' });
            });
        });

        /* Plays itself until the visitor takes over, so the card never sits dead. */
        if (!reduce) {
            var order = [1, 2, 3, 1, 3, 2];
            var k = 0;
            var auto = setInterval(function () {
                if (touched) { clearInterval(auto); return; }
                var b = btns[order[k % order.length]];
                if (b) toggle(b);
                k++;
            }, 1700);
        }
    }

    /* ==================================================================
       Hero demo 2: Liquid typed out, then its rendered output (liquid page)
       ================================================================== */
    var code = $('[data-demo="liquid"]');
    if (code) {
        var tabs = $$('.sv-code-tab', code);
        var pre = $('pre', code);
        var stage = $('.sv-output-stage', code);
        var outputs = $$('template[data-out]', code);
        var sources = $$('template[data-src]', code);
        var run = 0;
        var cycle = null;

        var paintCode = function (i, instant) {
            run++;
            var mine = run;
            tabs.forEach(function (t, n) {
                t.classList.toggle('is-on', n === i);
                t.setAttribute('aria-selected', n === i ? 'true' : 'false');
            });
            var html = sources[i].innerHTML.trim();
            stage.classList.add('is-hidden');

            var showOutput = function () {
                if (mine !== run) return;
                stage.innerHTML = outputs[i].innerHTML;
                stage.classList.remove('is-hidden');
            };

            if (instant || reduce) {
                pre.innerHTML = html;
                showOutput();
                return;
            }

            /* Type the visible characters while keeping the syntax spans intact. */
            var holder = document.createElement('div');
            holder.innerHTML = html;
            var total = holder.textContent.length;
            var shown = 0;
            var step = function () {
                if (mine !== run) return;
                shown = Math.min(total, shown + 3);
                pre.innerHTML = clip(html, shown) + '<span class="sv-caret"></span>';
                if (shown < total) {
                    setTimeout(step, 18);
                } else {
                    pre.innerHTML = html + '<span class="sv-caret"></span>';
                    setTimeout(showOutput, 260);
                }
            };
            step();
        };

        /* Return the markup truncated to n visible characters, closing open spans. */
        var clip = function (html, n) {
            var out = '';
            var count = 0;
            var open = 0;
            var i = 0;
            while (i < html.length && count < n) {
                if (html[i] === '<') {
                    var end = html.indexOf('>', i);
                    var tag = html.slice(i, end + 1);
                    if (tag[1] === '/') open--; else open++;
                    out += tag;
                    i = end + 1;
                } else if (html[i] === '&') {
                    var semi = html.indexOf(';', i);
                    out += html.slice(i, semi + 1);
                    i = semi + 1;
                    count++;
                } else {
                    out += html[i];
                    i++;
                    count++;
                }
            }
            while (open-- > 0) out += '</span>';
            return out;
        };

        var current = 0;
        var startCycle = function () {
            if (reduce) return;
            clearInterval(cycle);
            cycle = setInterval(function () {
                current = (current + 1) % tabs.length;
                paintCode(current);
            }, 7000);
        };

        tabs.forEach(function (t, n) {
            t.addEventListener('click', function () {
                clearInterval(cycle);
                current = n;
                paintCode(n);
                track('service_demo_interact', { demo: 'liquid', tab: n });
            });
        });

        /* Start typing only once the card is actually seen. */
        if (hasIO && !reduce) {
            var cio = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    cio.disconnect();
                    paintCode(0);
                    startCycle();
                }
            }, { threshold: 0.3 });
            cio.observe(code);
        } else {
            paintCode(0, true);
        }
    }

    /* ==================================================================
       Hero demo 3: tracking health scan (checkout)
       ================================================================== */
    var scan = $('[data-demo="scan"]');
    if (scan) {
        var rows = $$('.sv-scan-row', scan);
        var go = $('.sv-scan-btn', scan);
        var foot = $('.sv-scan-foot', scan);
        var busy = false;

        var runScan = function (phase) {
            if (busy) return;
            busy = true;
            go.disabled = true;
            go.textContent = phase === 'fix' ? 'Rebuilding...' : 'Scanning...';
            rows.forEach(function (row, i) {
                setTimeout(function () {
                    row.classList.remove('is-scanning');
                    void row.offsetWidth;
                    row.classList.add('is-scanning');
                    var st = row.querySelector('.sv-status');
                    if (phase === 'fix') {
                        st.className = 'sv-status is-ok';
                        st.textContent = row.dataset.fixed;
                    } else {
                        st.className = 'sv-status ' + (row.dataset.state === 'dead' ? 'is-dead' : 'is-ok');
                        st.textContent = row.dataset.label;
                    }
                    if (i === rows.length - 1) {
                        setTimeout(function () {
                            busy = false;
                            go.disabled = false;
                            if (phase === 'fix') {
                                go.textContent = 'Scan again';
                                go.dataset.phase = 'scan';
                                foot.innerHTML = '<b>All events firing again.</b> Rebuilt as web pixels and checkout blocks, so the next Shopify update does not take them out.';
                            } else {
                                var dead = rows.filter(function (r) { return r.dataset.state === 'dead'; }).length;
                                go.textContent = 'Show the fix';
                                go.dataset.phase = 'fix';
                                foot.innerHTML = '<b>' + dead + ' of ' + rows.length + ' have been silent since August 26.</b> Orders still come in. Your ad platforms just stopped hearing about them.';
                            }
                        }, 380);
                    }
                }, i * 420);
            });
        };

        go.addEventListener('click', function () {
            runScan(go.dataset.phase === 'fix' ? 'fix' : 'scan');
            track('service_demo_interact', { demo: 'scan', phase: go.dataset.phase || 'scan' });
        });

        if (hasIO && !reduce) {
            var kio = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    kio.disconnect();
                    setTimeout(function () { runScan('scan'); }, 700);
                }
            }, { threshold: 0.4 });
            kio.observe(scan);
        }
    }

    /* ==================================================================
       Tool 1: section builder with a live schema (custom sections)
       ================================================================== */
    var builder = $('[data-tool="builder"]');
    if (builder) {
        var canvas = $('.sv-canvas', builder);
        var heading = $('.sv-canvas-h', builder);
        var grid = $('.sv-canvas-grid', builder);
        var schema = $('.sv-schema', builder);
        var input = $('.sv-input', builder);

        var types = {
            features: { name: 'Feature grid', icon: ['fa-truck-fast', 'fa-rotate-left', 'fa-shield-halved', 'fa-leaf'], labels: ['Free shipping', 'Easy returns', 'Secure checkout', 'Eco packaging'] },
            stats: { name: 'Stats row', icon: ['fa-star', 'fa-users', 'fa-box', 'fa-globe'], labels: ['4.9 rating', '12k customers', '30k orders', '40 countries'] },
            logos: { name: 'Logo wall', icon: ['fa-gem', 'fa-crown', 'fa-feather', 'fa-bolt'], labels: ['Vogue', 'Elle', 'GQ', 'Forbes'] }
        };

        var state = { type: 'features', cols: 3, align: 'left', theme: 'light', heading: input.value };

        var themes = {
            light: { bg: '#f6f3ef', fg: '#141416', accent: '#EC006E' },
            dark: { bg: '#141416', fg: '#ffffff', accent: '#ff5fa8' },
            blush: { bg: '#fde8f1', fg: '#3a0a22', accent: '#c90060' }
        };

        var esc = function (s) {
            return String(s).replace(/[&<>"]/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
            });
        };

        var render = function () {
            var t = types[state.type];
            var th = themes[state.theme];
            canvas.style.background = th.bg;
            canvas.style.color = th.fg;
            canvas.style.setProperty('--accent', th.accent);
            canvas.dataset.align = state.align;
            heading.textContent = state.heading || 'Your heading here';
            grid.style.setProperty('--cols', state.cols);
            var cells = '';
            for (var i = 0; i < state.cols; i++) {
                cells += '<div><i class="fas ' + t.icon[i] + '"></i>' + t.labels[i] + '</div>';
            }
            grid.innerHTML = cells;
            schema.innerHTML =
                '<span class="t">{% schema %}</span>\n' +
                '{\n' +
                '  "name": <span class="s">"' + t.name + '"</span>,\n' +
                '  "settings": [\n' +
                '    { "type": "text", "id": "heading", "default": <span class="s">"' + esc(state.heading || 'Your heading here') + '"</span> },\n' +
                '    { "type": "select", "id": "align", "default": <span class="s">"' + state.align + '"</span> },\n' +
                '    { "type": "range", "id": "columns", "default": ' + state.cols + ' }\n' +
                '  ],\n' +
                '  "blocks": [{ "type": <span class="s">"item"</span>, "limit": 8 }]\n' +
                '}\n' +
                '<span class="t">{% endschema %}</span>';
        };

        $$('[data-set]', builder).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.dataset.set;
                var val = btn.dataset.val;
                state[key] = key === 'cols' ? parseInt(val, 10) : val;
                $$('[data-set="' + key + '"]', builder).forEach(function (b) {
                    b.classList.toggle('is-on', b === btn);
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
                render();
                track('service_tool_interact', { tool: 'builder', setting: key });
            });
        });

        input.addEventListener('input', function () {
            state.heading = input.value.slice(0, 60);
            render();
        });

        render();
    }

    /* ==================================================================
       Tool 2: before and after slider (liquid)
       ================================================================== */
    var cmp = $('[data-tool="compare"]');
    if (cmp) {
        var range = $('input[type="range"]', cmp);
        var setPos = function (v) { cmp.style.setProperty('--pos', v + '%'); };
        range.addEventListener('input', function () { setPos(range.value); });
        range.addEventListener('change', function () { track('service_tool_interact', { tool: 'compare' }); });
        setPos(range.value);

        /* A gentle nudge the first time it scrolls into view shows that it moves. */
        if (hasIO && !reduce) {
            var nio = new IntersectionObserver(function (entries) {
                if (!entries[0].isIntersecting) return;
                nio.disconnect();
                var frames = [50, 38, 30, 38, 50, 62, 70, 62, 50];
                var f = 0;
                var nudge = setInterval(function () {
                    if (f >= frames.length) { clearInterval(nudge); return; }
                    range.value = frames[f];
                    setPos(frames[f]);
                    f++;
                }, 70);
            }, { threshold: 0.5 });
            nio.observe(cmp);
        }
    }

    /* ==================================================================
       Tool 3: am I affected check (checkout)
       ================================================================== */
    var quiz = $('[data-tool="quiz"]');
    if (quiz) {
        var boxes = $$('input[type="checkbox"]', quiz);
        var meter = $('.sv-meter i', quiz);
        var level = $('.sv-verdict-level', quiz);
        var text = $('.sv-verdict-text', quiz);

        var verdicts = [
            ['Probably fine', 'Nothing here points to broken tracking. If you want certainty, send me your store URL and I will confirm it in a day.'],
            ['Worth a check', 'One thing on this list is enough to have lost conversion data. A quick audit will tell you whether anything stopped firing.'],
            ['Likely affected', 'At least one of these almost always sat in Additional Scripts. If it was never rebuilt, your ad platforms have been under-reporting since August 26.'],
            ['Almost certainly affected', 'This is the exact setup that broke on August 26. Your checkout still works, but your conversion data and post-purchase extras probably do not.']
        ];

        var score = function () {
            var n = boxes.filter(function (b) { return b.checked; }).length;
            var idx = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3;
            meter.style.width = Math.round((n / boxes.length) * 100) + '%';
            level.textContent = verdicts[idx][0];
            text.textContent = verdicts[idx][1];
        };

        boxes.forEach(function (b) {
            b.addEventListener('change', function () {
                score();
                track('service_tool_interact', { tool: 'quiz' });
            });
        });
        score();
    }
})();
