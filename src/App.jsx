import { useCallback, useEffect, useState } from 'react';
import { loadAll } from './game/assets';
import { unlockAudio, setMuted, isMuted, music } from './game/audio';
import { input } from './game/input';
import { useMenuInput } from './game/useMenuInput';
import Titulo from './components/Titulo.jsx';
import Prologo from './components/Prologo.jsx';
import Juego from './components/Juego.jsx';

const KEY = 'capitan_premier_espacio_record';
const readBest = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };

export default function App() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('carga');
  const [best, setBestState] = useState(readBest);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => { loadAll(setProgress).then(() => setReady(true)); }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  const toggleMute = useCallback(() => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'KeyM') toggleMute(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleMute]);

  const saveBest = useCallback((score) => {
    setBestState((b) => {
      const nb = Math.max(b, score);
      try { localStorage.setItem(KEY, String(nb)); } catch { /* sin almacenamiento */ }
      return nb;
    });
  }, []);

  const start = () => {
    if (!ready) return;
    unlockAudio();
    setScreen('titulo');
  };
  useMenuInput({ confirm: start, pause: start }, screen === 'carga' && ready);

  return (
    <div className="stage">
      {screen === 'carga' && (
        <div className="carga" onClick={start}>
          <h1 className="logo">CAPITÁN PREMIER<span>EN EL ESPACIO</span></h1>
          {!ready ? (
            <div className="barra"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          ) : (
            <p className="parpadeo">TOCA O PRESIONA UNA TECLA PARA EMPEZAR</p>
          )}
        </div>
      )}
      {screen === 'titulo' && (
        <Titulo best={best} onPlay={() => setScreen('prologo')} />
      )}
      {screen === 'prologo' && (
        <Prologo onDone={() => { input.clear(); setScreen('juego'); }} />
      )}
      {screen === 'juego' && (
        <Juego best={best} saveBest={saveBest} onExit={() => { music.stop(); setScreen('titulo'); }} />
      )}
      {screen !== 'carga' && (
        <button className="mute" onClick={toggleMute} title="Silenciar (M)">{muted ? '🔇' : '🔊'}</button>
      )}
    </div>
  );
}
