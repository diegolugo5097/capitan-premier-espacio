// Datos del juego: mundos, enemigos, oleadas y diálogos

export const MUNDOS = [
  { mapa: 'Raices_de_la_luna', nombre: 'Raíces de la Luna', jefe: 'Reina_del_Cafetal', jefeNombre: 'Reina del Cafetal', musica: 'mundo1', jefeHp: 120, puntosJefe: 2000 },
  { mapa: 'Cometa_de_cristal', nombre: 'Cometa de Cristal', jefe: 'Hilandera_Orbital', jefeNombre: 'Hilandera Orbital', musica: 'mundo2', jefeHp: 160, puntosJefe: 3000 },
  { mapa: 'Ojo_de_la_tormenta', nombre: 'Ojo de la Tormenta', jefe: 'General_Taladro', jefeNombre: 'General Taladro', musica: 'mundo3', jefeHp: 220, puntosJefe: 5000 },
];

export const ENEMIGOS = {
  B: { spr: 'Broka_Matriarca', nombre: 'Broka Matriarca', hp: 1, pts: 10, disparo: 'normal' },
  A: { spr: 'Avispa_de_Resina', nombre: 'Avispa de Resina', hp: 1, pts: 20, disparo: 'resina' },
  E: { spr: 'Escarabajo_Tostador', nombre: 'Escarabajo Tostador', hp: 2, pts: 30, disparo: 'fuego' },
  G: { spr: 'Gorgojo_Francotirador', nombre: 'Gorgojo Francotirador', hp: 1, pts: 40, disparo: 'mira' },
};

// cols: de la columna más cercana al jugador (izquierda) a la más lejana
export const OLEADAS = [
  [
    { cols: ['B', 'B', 'A', 'A', 'E'], rows: 5, speed: 28, rate: 1.25 },
    { cols: ['B', 'A', 'A', 'E', 'E'], rows: 6, speed: 32, rate: 1.1 },
  ],
  [
    { cols: ['B', 'A', 'E', 'E', 'G'], rows: 6, speed: 34, rate: 1.0 },
    { cols: ['A', 'A', 'E', 'G', 'G'], rows: 6, speed: 38, rate: 0.9 },
  ],
  [
    { cols: ['A', 'E', 'E', 'G', 'G'], rows: 6, speed: 40, rate: 0.8 },
    { cols: ['E', 'E', 'G', 'G', 'G'], rows: 6, speed: 44, rate: 0.7 },
  ],
];

const AL = 'Alfonso', CA = 'Carlos', CP = 'Capitán Premier';
const l = (who, text) => ({ who, text });

export const DIALOGOS = [
  {
    intro: [
      l(AL, 'Capitán, las brocas mutantes se escaparon por el hangar. ¡Echaron raíces en la luna y se están comiendo el cafetal lunar!'),
      l(CA, 'Y la Broka Matriarca trajo a toda la familia… hasta los primos, Capitán.'),
      l(CP, 'Pues que vayan pidiendo la cuenta. ¡Despegando!'),
    ],
    jefe: [
      l(AL, '¡Cuidado! Esa es la Reina del Cafetal. El grano radiactivo la convirtió en la reina de todas las plagas.'),
      l(CA, 'Dicen que tira cerezas de café… y no precisamente de regalo.'),
    ],
    fin: [
      l(CP, 'La reina cayó, pero el rastro radiactivo sigue hacia aquel cometa.'),
      l(AL, 'Es el Cometa de Cristal. Allá el frío vuelve a los bichos más duros. Y ojo con los gorgojos: apuntan directo a la nave.'),
    ],
  },
  {
    intro: [
      l(CA, 'Brrr… Capitán, póngase la ruana que esto está más helado que el tinto de ayer.'),
      l(CP, 'Mientras el motor caliente, aquí no se congela nadie.'),
    ],
    jefe: [
      l(CA, '¡Una araña espacial! No se me vaya a enredar, Capitán, que yo de hilos no sé nada.'),
      l(AL, 'Su telaraña frena la nave. Esquívela, y cuando tiemble… ¡se le viene encima!'),
    ],
    fin: [
      l(AL, 'Las lecturas apuntan al Ojo de la Tormenta. Allí está el que dirige toda la invasión.'),
      l(CA, 'El General Taladro… el que perfora todo. Hasta la paciencia.'),
    ],
  },
  {
    intro: [
      l(AL, 'Esta es la última barrera, Capitán. Si cruzan la tormenta, llegan a la Tierra.'),
      l(CP, 'Entonces aquí se acaba el paseo.'),
    ],
    jefe: [
      l(AL, '¡Ahí está el General Taladro! Cuando se alinee con usted, va a embestir. ¡Muévase de esa franja!'),
      l(CA, 'Yo desde aquí le hago barra, Capitán. Moralmente.'),
    ],
    fin: [
      l(AL, '¡Lo logró, Capitán! La invasión se acabó y el cafetal está a salvo.'),
      l(CA, 'Ahora sí… ¿quién invita el tinto?'),
      l(CP, 'Los espero en el Café Premier. Segundo piso.'),
    ],
  },
];
