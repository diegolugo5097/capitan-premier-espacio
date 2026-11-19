import { useEffect, useRef, useState } from 'react';
import { Game, W, H } from '../game/engine';
import { input } from '../game/input';
import { music, sfx } from '../game/audio';
import { url } from '../game/assets';
import { MUNDOS } from '../game/data';
import { useMenuInput } from '../game/useMenuInput';
import Dialogo from './Dialogo.jsx';
import ControlesTactiles from './ControlesTactiles.jsx';

const esTactil = () => typeof window !== 'undefined'
  && (('ontouchstart' in window) || window.matchMedia?.('(pointer: coarse)').matches);

function Menu({ title, sub, options, onPick, children, className = '' }) {
  const [sel, setSel] = useState(0);
  useMenuInput({
    up: () => { sfx.select(); setSel((s) => (s + options.length - 1) % options.length); },
    down: () => { sfx.select(); setSel((s) => (s + 1) % options.length); },
    confirm: () => { sfx.confirm(); onPick(sel); },
    pause: () => { sfx.confirm(); onPick(0); },
  });
  return (
    <div className={`capa ${className}`}>
      <div className="panel">
        <h2>{title}</h2>
        {sub && <p className="sub">{sub}</p>}
        {children}
        <div className="menu vertical">
          {options.map((o, i) => (
            <button key={o} className={`opcion ${sel === i ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => { sfx.confirm(); onPick(i); }}>
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Juego({ best, saveBest, onExit }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const bestRef = useRef(best);
  bestRef.current = best;
  const [run, setRun] = useState({ world: 0, key: 0 });
  const [dialog, setDialog] = useState(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(null);
  const [win, setWin] = useState(null);
  const [tactil, setTactil] = useState(esTactil);

  useEffect(() => {
    const onTouch = () => setTactil(true);
    window.addEventListener('touchstart', onTouch, { once: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, []);

  useEffect(() => {
    input.gameOwnsPoll = true;
    input.clear();
    const g = new Game(canvasRef.current, {
      best: () => bestRef.current,
      onDialog: (lines, done) => setDialog({ lines, done }),
      onPause: setPaused,
      onGameOver: (d) => { saveBest(d.score); music.stop(); setOver(d); },
      onVictory: (score) => { saveBest(score); setWin({ score }); },
    }, run.world);
    gameRef.current = g;
    return () => {
      g.destroy();
      input.gameOwnsPoll = false;
      input.touch.x = input.touch.y = 0;
      input.touch.fire = false;
    };
  }, [run, saveBest]);

  const retry = (fromWorld) => {
    setOver(null);
    setWin(null);
    setPaused(false);
    setDialog(null);
    setRun({ world: fromWorld, key: Date.now() });
  };

  return (
    <div className="juego">
      <canvas ref={canvasRef} width={W} height={H} />
      {tactil && !dialog && !paused && !over && !win && (
        <ControlesTactiles onPause={() => gameRef.current?.setPaused(true)} />
      )}
      {!tactil && !dialog && !over && !win && !paused && (
        <button className="boton-pausa escritorio" onClick={() => gameRef.current?.setPaused(true)}>❚❚</button>
      )}
      {dialog && (
        <Dialogo
          key={dialog.lines[0].text}
          lines={dialog.lines}
          onEnd={() => { const d = dialog.done; setDialog(null); d(); }}
        />
      )}
      {paused && !over && (
        <Menu
          title="PAUSA"
          options={['CONTINUAR', 'SALIR AL MENÚ']}
          onPick={(i) => { if (i === 0) gameRef.current?.setPaused(false); else onExit(); }}
        />
      )}
      {over && (
        <Menu
          className="rojo"
          title="FIN DEL JUEGO"
          sub={`Puntos: ${over.score}`}
          options={[`CONTINUAR EN EL MUNDO ${over.world + 1}`, 'REINICIAR DESDE EL MUNDO 1', 'SALIR AL MENÚ']}
          onPick={(i) => { if (i === 0) retry(over.world); else if (i === 1) retry(0); else onExit(); }}
        >
          <p className="nota">{MUNDOS[over.world].nombre} · Al continuar, el puntaje vuelve a cero.</p>
        </Menu>
      )}
      {win && (
        <div className="victoria-fondo">
          <img src={url('portada.jpg')} alt="" />
          <Menu
            className="dorado"
            title="¡LA TIERRA ESTÁ A SALVO!"
            sub={`Puntaje final: ${win.score}`}
            options={['JUGAR DE NUEVO', 'SALIR AL MENÚ']}
            onPick={(i) => { if (i === 0) retry(0); else onExit(); }}
          >
            <p className="nota">El Capitán Premier derrotó a la Reina del Cafetal, a la Hilandera Orbital y al General Taladro. El tinto corre por cuenta de la casa.</p>
          </Menu>
        </div>
      )}
    </div>
  );
}
