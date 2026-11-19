// Entrada unificada: teclado + control (gamepad) + táctil
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ACCIONES = {
  Enter: 'confirm', Space: 'confirm', KeyJ: 'confirm', KeyZ: 'confirm',
  Escape: 'pause', KeyP: 'pause',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Backspace: 'back', KeyM: 'mute',
};
const BLOQUEAR = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

const keys = new Set();
const edges = new Set();
const touch = { x: 0, y: 0, fire: false };
let gp = { x: 0, y: 0, fire: false };
let prevBtn = [];

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (BLOQUEAR.includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      const a = ACCIONES[e.code];
      if (a) edges.add(a);
    }
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); touch.x = touch.y = 0; touch.fire = false; });
}

export const input = {
  touch,
  gameOwnsPoll: false,

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let x = 0, y = 0, fire = false;
    const btn = [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.25) x = ax;
      if (Math.abs(ay) > 0.25) y = ay;
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      if (b(14)) x = -1;
      if (b(15)) x = 1;
      if (b(12)) y = -1;
      if (b(13)) y = 1;
      if (b(0) || b(2) || b(5) || b(7)) fire = true;
      btn[0] = btn[0] || b(0);
      btn[1] = btn[1] || b(1);
      btn[9] = btn[9] || b(9);
      btn[12] = btn[12] || b(12) || ay < -0.6;
      btn[13] = btn[13] || b(13) || ay > 0.6;
    }
    const edge = (i, a) => { if (btn[i] && !prevBtn[i]) edges.add(a); };
    edge(0, 'confirm'); edge(1, 'back'); edge(9, 'pause'); edge(12, 'up'); edge(13, 'down');
    prevBtn = btn;
    gp = { x, y, fire };
  },

  get x() {
    let v = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) v -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) v += 1;
    return clamp(v + gp.x + touch.x, -1, 1);
  },
  get y() {
    let v = 0;
    if (keys.has('ArrowUp') || keys.has('KeyW')) v -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) v += 1;
    return clamp(v + gp.y + touch.y, -1, 1);
  },
  get fire() {
    return keys.has('Space') || keys.has('KeyJ') || keys.has('KeyZ') || gp.fire || touch.fire;
  },

  consume(a) {
    if (edges.has(a)) { edges.delete(a); return true; }
    return false;
  },
  clear() { edges.clear(); },
};
