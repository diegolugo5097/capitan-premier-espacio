import { useEffect, useRef, useState } from 'react';
import { url, PROLOGO } from '../game/assets';
import { music, sfx } from '../game/audio';
import { useMenuInput } from '../game/useMenuInput';

export default function Prologo({ onDone }) {
  const [i, setI] = useState(0);
  const done = useRef(false);

  useEffect(() => { music.play('prologo'); }, []);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  const next = () => {
    sfx.select();
    if (i >= PROLOGO.length - 1) finish();
    else setI(i + 1);
  };

  useEffect(() => {
    const t = setTimeout(next, 9000);
    return () => clearTimeout(t);
  });

  useMenuInput({ confirm: next, pause: finish, back: finish });

  return (
    <div className="prologo" onClick={next}>
      {PROLOGO.map((p, k) => (
        <img
          key={p}
          src={url(`prologo/${p}.jpg`)}
          className={`vineta ${k === i ? 'on' : ''} ${k < i ? 'pasada' : ''}`}
          alt=""
        />
      ))}
      <div className="prologo-ui">
        <span className="puntos">
          {PROLOGO.map((p, k) => <i key={p} className={k === i ? 'on' : ''} />)}
        </span>
        <button className="saltar" onClick={(e) => { e.stopPropagation(); finish(); }}>SALTAR ▶▶</button>
      </div>
    </div>
  );
}
