import { useRef, useState } from 'react';
import { input } from '../game/input';

// Joystick flotante (mitad izquierda) + botón de disparo (derecha)
export default function ControlesTactiles({ onPause }) {
  const [stick, setStick] = useState(null);
  const origin = useRef(null);

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY, rad: r.width * 0.16, left: r.left, top: r.top };
    setStick({ ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 });
  };
  const move = (e) => {
    const o = origin.current;
    if (!o) return;
    let dx = e.clientX - o.x, dy = e.clientY - o.y;
    const d = Math.hypot(dx, dy);
    if (d > o.rad) { dx = (dx / d) * o.rad; dy = (dy / d) * o.rad; }
    input.touch.x = dx / o.rad;
    input.touch.y = dy / o.rad;
    setStick((s) => s && { ...s, dx, dy });
  };
  const up = () => {
    origin.current = null;
    input.touch.x = 0;
    input.touch.y = 0;
    setStick(null);
  };
  const fire = (v) => (e) => { e.preventDefault(); input.touch.fire = v; };

  return (
    <div className="tactil">
      <div className="zona-stick" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {stick ? (
          <div className="stick" style={{ left: stick.ox, top: stick.oy }}>
            <div className="perilla" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        ) : (
          <div className="stick-ayuda">ARRASTRA PARA MOVER</div>
        )}
      </div>
      <button
        className="boton-fuego"
        onPointerDown={fire(true)}
        onPointerUp={fire(false)}
        onPointerCancel={fire(false)}
        onPointerLeave={fire(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        FUEGO
      </button>
      <button className="boton-pausa" onPointerDown={(e) => { e.stopPropagation(); onPause(); }}>❚❚</button>
    </div>
  );
}
