# Capitán Premier en el Espacio

Juego tipo *Space Invaders* (horizontal) hecho con React + Vite y Canvas 2D.

## Correr en local
```bash
npm install
npm run dev
```

## Desplegar en Vercel
El proyecto ya trae `vercel.json` (Vite, build `npm run build`, salida `dist`, caché para imágenes).

**Opción A — GitHub + Vercel (recomendada)**
```bash
git init -b main
git add -A
git commit -m "Capitán Premier en el Espacio"
git remote add origin https://github.com/TU_USUARIO/capitan-premier-espacio.git
git push -u origin main
```
Luego en vercel.com → *Add New → Project* → importa el repo → *Deploy* (no hay que cambiar nada).
Cada `git push` vuelve a desplegar solo.

**Opción B — Vercel CLI**
```bash
npm i -g vercel
vercel          # primera vez: vincula el proyecto (vista previa)
vercel --prod   # producción
```

## Estructura
- `public/media/` — sprites (webp, 8 cuadros c/u), fondos (5 paneles por mundo; el 5 es la arena del jefe), viñetas del prólogo y retratos.
- `src/game/engine.js` — motor: formación, barreras de café, grano radiactivo, jefes, colisiones, HUD.
- `src/game/data.js` — mundos, enemigos, oleadas y **diálogos** (edítalos aquí).
- `src/game/audio.js` — efectos y música sintetizados con WebAudio (sin archivos).
- `src/game/input.js` — teclado, control (gamepad) y táctil.
- `src/components/` — título, prólogo, diálogos, pausa / fin del juego / victoria y controles táctiles.

## Controles
Mover: flechas / WASD / stick · Disparar: Espacio, J, Z / botón A o X · Pausa: Esc, P / Start · Sonido: M
