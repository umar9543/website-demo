/* Directional cursor.
   A small arrowhead replaces the system pointer. It trails the real pointer with
   easing and rotates so the tip faces the direction of travel.
   Fine pointers only. Anyone on prefers-reduced-motion keeps the system cursor. */
(function () {
    var FOLLOW = 0.11;     // how hard the arrow chases the pointer, lower is more glide
    var TURN = 0.12;       // how hard it swings toward the direction of travel
    var VEL_SMOOTH = 0.16; // smoothing on the measured pointer velocity
    var MIN_SPEED = 1.6;   // px per frame below which the arrow keeps its current angle

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var INTERACTIVE = 'a, button, input, textarea, select, summary, label, [role="button"], [onclick]';
    var TEXT_FIELD = 'input, textarea, select, [contenteditable="true"]';

    var el = document.createElement('div');
    el.className = 'mb-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
        '<svg viewBox="0 0 24 24" width="34" height="34">' +
        '<path d="M12 1.5 L21.5 21.5 L12 16.4 L2.5 21.5 Z"' +
        ' fill="#ffffff" stroke="#0a0a0b" stroke-width="1.6" stroke-linejoin="round"/>' +
        '</svg>';
    document.documentElement.classList.add('mb-cursor-on');
    document.body.appendChild(el);

    var targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
    var x = targetX, y = targetY;
    var lastX = targetX, lastY = targetY;
    var vx = 0, vy = 0;                 // smoothed pointer velocity
    var angle = 0, targetAngle = 0;
    var started = false;

    document.addEventListener('mousemove', function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!started) {
            started = true;
            x = lastX = targetX;
            y = lastY = targetY;
            el.classList.add('is-ready');
        }
    }, { passive: true });

    document.addEventListener('mousedown', function () { el.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { el.classList.remove('is-down'); });

    document.addEventListener('mouseover', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        el.classList.toggle('is-hot', !!t.closest(INTERACTIVE));
        /* Text fields get the system caret back, since an arrow over an input is useless. */
        document.documentElement.classList.toggle('mb-cursor-off', !!t.closest(TEXT_FIELD));
    }, { passive: true });

    document.addEventListener('mouseleave', function () { el.classList.remove('is-ready'); });
    document.addEventListener('mouseenter', function () { if (started) el.classList.add('is-ready'); });

    function shortestTurn(from, to) {
        var d = (to - from) % 360;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
    }

    function frame() {
        /* Direction comes from the pointer's own smoothed velocity, not from the gap
           between arrow and pointer. That gap shrinks to noise once the arrow catches
           up, which is what made small movements flip the arrow end over end. */
        var mx = targetX - lastX;
        var my = targetY - lastY;
        lastX = targetX;
        lastY = targetY;

        vx += (mx - vx) * VEL_SMOOTH;
        vy += (my - vy) * VEL_SMOOTH;

        if (Math.sqrt(vx * vx + vy * vy) > MIN_SPEED) {
            targetAngle = Math.atan2(vy, vx) * 180 / Math.PI + 90;
        }
        angle += shortestTurn(angle, targetAngle) * TURN;

        x += (targetX - x) * FOLLOW;
        y += (targetY - y) * FOLLOW;

        el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + angle + 'deg)';
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
