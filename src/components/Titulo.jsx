import { useEffect, useState } from 'react';
import { url } from '../game/assets';
import { music, sfx } from '../game/audio';
import { useMenuInput } from '../game/useMenuInput';

const OPCIONES = ['JUGAR', 'CONTROLES'];

export default function Titulo({ best, onPlay }) {
  const [sel, setSel] = useState(0);
  const [ctrl, setCtrl] = useState(false);

  useEffect(() => { music.play('titulo'); }, []);

  const act = (i = sel) => {
    sfx.confirm();
    if (ctrl) { setCtrl(false); return; }
    if (i === 0) onPlay(); else setCtrl(true);
  };
  useMenuInput({
    up: () => { if (!ctrl) { sfx.select(); setSel((s) => (s + OPCIONES.length - 1) % OPCIONES.length); } },
    down: () => { if (!ctrl) { sfx.select(); setSel((s) => (s + 1) % OPCIONES.length); } },
    confirm: () => act(),
    pause: () => act(),
    back: () => setCtrl(false),
  });

  return (
    <div className="titulo">
      <img className="portada" src={url('portada.jpg')} alt="Capitán Premier en el Espacio" />
      <div className="titulo-sombra" />
      <div className="record">RÉCORD {String(best).padStart(6, '0')}</div>
      {!ctrl ? (
        <div className="menu">
          {OPCIONES.map((o, i) => (
            <button
              key={o}
              className={`opcion ${sel === i ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => act(i)}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="panel controles" onClick={() => act()}>
          <h2>CONTROLES</h2>
          <div className="tabla">
            <span>Mover</span><b>Flechas / WASD · Stick o cruceta</b>
            <span>Disparar</span><b>Espacio / J / Z · Botón A o X</b>
            <span>Pausa</span><b>Esc / P · Start</b>
            <span>Sonido</span><b>M</b>
            <span>Celular</span><b>Arrastra a la izquierda para mover, mantén el botón para disparar</b>
          </div>
          <h3>Consejos</h3>
          <p>Escóndete tras los granos de café, pero se desgastan. Dispárale al grano radiactivo verde que cruza al fondo: suelta mejoras (D doble, T triple, E escudo, ♥ vida). Si la formación llega a tu zona, ¡pierdes una vida!</p>
          <p className="volver">Toca o presiona Enter para volver</p>
        </div>
      )}
      <div className="pie">↑↓ elegir · Enter / A confirmar</div>
    </div>
  );
}
