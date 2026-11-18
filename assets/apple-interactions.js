/* Physical, interruptible drawer. Vanilla Pointer Events + a velocity-aware RAF spring. */
(() => {
  const root = document.getElementById('mobileMenu');
  const panel = root?.querySelector('.mobile-panel');
  if (!panel) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = panel.getBoundingClientRect().width;
  let x = width;                 // Current on-screen translation in CSS pixels.
  let v = 0;                     // CSS pixels per second.
  let frame = 0;
  let lastFrame = 0;
  let open = root.classList.contains('open');
  let drag = null;
  let suppressClick = false;

  const paint = () => { panel.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`; };
  const rubber = (n, limit) => n < 0
    ? -16 * (1 - Math.exp(n / 55))
    : n > limit ? limit + 22 * (1 - Math.exp(-(n - limit) / 65)) : n;
  const stopSpring = () => { if (frame) cancelAnimationFrame(frame); frame = 0; lastFrame = 0; };
  const finish = () => {
    if (!root.classList.contains('open')) root.classList.remove('is-settling');
  };
  const moveImmediate = target => {
    stopSpring(); x = target; v = 0; paint(); finish();
  };

  function springTo(target, initialVelocity = v) {
    stopSpring();
    if (reduce.matches) { moveImmediate(target); return; }
    v = initialVelocity;
    // response ≈0.38s, critical by default. Release with strong momentum can be gently underdamped.
    const omega = 2 * Math.PI / 0.38;
    const dampingRatio = Math.abs(initialVelocity) > 750 ? 0.84 : 1;
    const tick = t => {
      const dt = lastFrame ? Math.min((t - lastFrame) / 1000, 0.032) : 1 / 60;
      lastFrame = t;
      const a = omega * omega * (target - x) - 2 * dampingRatio * omega * v;
      v += a * dt;
      x += v * dt;
      paint();
      if (Math.abs(target - x) <= 0.35 && Math.abs(v) <= 8) {
        x = target; v = 0; paint(); frame = 0; finish();
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  // CSS has no gesture-driven transform transition; RAF reads and writes only live x.
  paint();
  const observer = new MutationObserver(() => {
    const nowOpen = root.classList.contains('open');
    if (nowOpen === open) return;
    open = nowOpen;
    if (open) root.classList.remove('is-settling');
    else root.classList.add('is-settling');
    springTo(open ? 0 : width);
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });

  panel.addEventListener('pointerdown', event => {
    if (!root.classList.contains('open') || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    stopSpring();
    drag = { id:event.pointerId, startX:event.clientX, startY:event.clientY,
      startAt:x, lastX:event.clientX, lastT:performance.now(), velocity:0,
      claimed:false, rejected:false };
  }, {passive:true});

  panel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || drag.rejected) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.claimed) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // 10px hysteresis.
      if (Math.abs(dy) >= Math.abs(dx) * 1.15) { drag.rejected = true; springTo(0); return; }
      drag.claimed = true;
      try { panel.setPointerCapture(event.pointerId); } catch { /* may already be captured */ }
    }
    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      const instantaneous = ((event.clientX - drag.lastX) / dt) * 1000;
      drag.velocity = .65 * drag.velocity + .35 * instantaneous;
    }
    drag.lastX = event.clientX; drag.lastT = now;
    x = rubber(drag.startAt + dx, width);
    v = drag.velocity;
    paint();
    if (event.cancelable) event.preventDefault();
  }, {passive:false});

  function finishGesture(event, cancelled=false) {
    if (!drag || drag.id !== event.pointerId) return;
    const state = drag; drag = null;
    if (!state.claimed) { if (frame === 0 && x !== 0) springTo(0); return; }
    try { if (panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId); } catch {}
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 180);
    const releaseVelocity = cancelled ? 0 : state.velocity;
    // Exponential momentum projection: x(t) = x0 + v0 / friction, friction=7 s^-1.
    const projection = x + releaseVelocity / 7;
    if (!cancelled && projection > width * 0.38) {
      document.getElementById('closeMenu')?.click();
      // Mutation callback starts the spring at the current live presentation value.
      v = releaseVelocity;
    } else springTo(0, releaseVelocity);
  }
  panel.addEventListener('pointerup', e => finishGesture(e));
  panel.addEventListener('pointercancel', e => finishGesture(e,true));
  panel.addEventListener('click', e => {
    if (suppressClick && e.isTrusted) { e.preventDefault(); e.stopImmediatePropagation(); suppressClick=false; }
  }, true);

  window.addEventListener('resize', () => {
    const newWidth = panel.getBoundingClientRect().width;
    if (Math.abs(newWidth - width) < .5) return;
    width = newWidth;
    if (!root.classList.contains('open')) moveImmediate(width);
  }, {passive:true});
  reduce.addEventListener('change', () => moveImmediate(root.classList.contains('open') ? 0 : width));
})();
