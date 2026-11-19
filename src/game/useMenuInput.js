import { useEffect, useRef } from 'react';
import { input } from './input';

// Escucha acciones de menú (teclado o control) mientras el componente está activo.
export function useMenuInput(handlers, active = true) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!active) return undefined;
    input.clear();
    let raf;
    const tick = () => {
      if (!input.gameOwnsPoll) input.poll();
      for (const k of Object.keys(ref.current)) {
        if (input.consume(k)) { ref.current[k](); break; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
