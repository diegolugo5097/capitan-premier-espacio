import { useEffect, useState } from 'react';
import { url } from '../game/assets';
import { sfx } from '../game/audio';
import { useMenuInput } from '../game/useMenuInput';

const PERSONAJES = {
  Alfonso: { img: 'retrato_alfonso.jpg', color: '#ff8a65' },
  Carlos: { img: 'retrato_carlos.jpg', color: '#6fd3ff' },
  'Capitán Premier': { img: 'retrato_capitan.jpg', color: '#ffc94a' },
};

export default function Dialogo({ lines, onEnd }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const line = lines[i];
  const who = PERSONAJES[line.who];
  const derecha = line.who === 'Capitán Premier';

  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= line.text.length) { clearInterval(id); return v; }
        return v + 1;
      });
    }, 20);
    return () => clearInterval(id);
  }, [i, line.text.length]);

  const adv = () => {
    if (n < line.text.length) { setN(line.text.length); return; }
    sfx.select();
    if (i < lines.length - 1) setI(i + 1);
    else onEnd();
  };

  useMenuInput({ confirm: adv, back: onEnd });

  return (
    <div className="dialogo-capa" onClick={adv}>
      <div className={`dialogo ${derecha ? 'der' : ''}`} style={{ '--c': who.color }}>
        <img className="retrato" src={url(who.img)} alt={line.who} />
        <div className="dialogo-texto">
          <div className="nombre">{line.who.toUpperCase()}</div>
          <p>{line.text.slice(0, n)}</p>
          {n >= line.text.length && <span className="sigue">▼</span>}
        </div>
      </div>
      <div className="dialogo-ayuda">Enter / A / toque para seguir · Retroceso / B para saltar</div>
    </div>
  );
}
