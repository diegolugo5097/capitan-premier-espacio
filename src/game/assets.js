// Carga de imágenes. Todo vive en /public/assets
export const BASE = `${import.meta.env.BASE_URL}media/`;
export const url = (p) => BASE + p;

export const SPR = {
  nave: { w: 240, h: 114 },
  Avispa_de_Resina: { w: 180, h: 115 },
  Gorgojo_Francotirador: { w: 180, h: 101 },
  Escarabajo_Tostador: { w: 180, h: 134 },
  Broka_Matriarca: { w: 180, h: 126 },
  Hilandera_Orbital: { w: 460, h: 216 },
  Reina_del_Cafetal: { w: 460, h: 298 },
  General_Taladro: { w: 460, h: 211 },
};

export const MAPAS = ['Raices_de_la_luna', 'Cometa_de_cristal', 'Ojo_de_la_tormenta'];
export const PROLOGO = [
  '01_El_experimento', '02_La_caida', '03_El_contacto',
  '04_La_mutacion', '05_La_llamada', '06_Llega_el_capitan',
];

export const images = { sprites: {}, bg: {}, otros: {} };

function load(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(im);
    im.src = src;
  });
}

export async function loadAll(onProgress = () => {}) {
  const jobs = [];
  for (const name of Object.keys(SPR)) {
    images.sprites[name] = [];
    for (let i = 1; i <= 8; i++) {
      jobs.push(() => load(url(`sprites/${name}_${i}.webp`)).then((im) => { images.sprites[name][i - 1] = im; }));
    }
  }
  for (const m of MAPAS) {
    images.bg[m] = [];
    for (let i = 1; i <= 5; i++) {
      jobs.push(() => load(url(`bg/${m}_0${i}.jpg`)).then((im) => { images.bg[m][i - 1] = im; }));
    }
  }
  for (const p of PROLOGO) jobs.push(() => load(url(`prologo/${p}.jpg`)));
  for (const r of ['portada.jpg', 'retrato_alfonso.jpg', 'retrato_carlos.jpg', 'retrato_capitan.jpg']) {
    jobs.push(() => load(url(r)).then((im) => { images.otros[r] = im; }));
  }
  let done = 0;
  const total = jobs.length + 1;
  const tick = () => onProgress(++done / total);
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) { await queue.shift()(); tick(); }
  };
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  try {
    await Promise.race([
      Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('700 20px Rubik')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* sin fuentes, seguimos */ }
  tick();
}
