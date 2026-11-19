// Sonido 100% sintetizado con WebAudio (sin archivos): efectos + música chiptune
let ctx = null, master, musicGain, sfxGain, noiseBuf;
let muted = false;
let pending = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (pending) { const p = pending; pending = null; music.play(p); }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

function tone(freq, dur, o = {}) {
  if (!ctx) return;
  const { type = 'square', vol = 0.2, slide = 0, when = 0, dest = sfxGain, attack = 0.004 } = o;
  const t = (o.at ?? ctx.currentTime) + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function noise(dur, o = {}) {
  if (!ctx) return;
  const { vol = 0.3, filter = 1200, when = 0, dest = sfxGain, type = 'lowpass', sweep = 0 } = o;
  const t = (o.at ?? ctx.currentTime) + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(filter, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, filter * sweep), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

let lastShot = 0;
export const sfx = {
  shoot() { tone(980, 0.07, { vol: 0.08, slide: 0.45 }); },
  eshoot() {
    if (!ctx || ctx.currentTime - lastShot < 0.06) return;
    lastShot = ctx.currentTime;
    tone(320, 0.12, { type: 'sawtooth', vol: 0.05, slide: 0.55 });
  },
  hit() { tone(420, 0.05, { type: 'triangle', vol: 0.12, slide: 1.6 }); },
  boom(big = false) {
    noise(big ? 1.1 : 0.32, { vol: big ? 0.55 : 0.22, filter: big ? 900 : 2200, sweep: 0.25 });
    tone(big ? 110 : 180, big ? 0.7 : 0.22, { type: 'sine', vol: big ? 0.4 : 0.18, slide: 0.3 });
  },
  playerHit() {
    noise(0.7, { vol: 0.45, filter: 1600, sweep: 0.2 });
    tone(260, 0.6, { type: 'sawtooth', vol: 0.18, slide: 0.2 });
  },
  shield() { tone(1200, 0.25, { type: 'triangle', vol: 0.14, slide: 0.4 }); },
  power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { when: i * 0.06, vol: 0.14, type: 'triangle' })); },
  march(i) { tone([98, 87, 78, 73][i % 4], 0.1, { vol: 0.1 }); },
  grano() { tone(520, 0.22, { type: 'sine', vol: 0.06, slide: 1.8 }); },
  web() { tone(200, 0.35, { type: 'triangle', vol: 0.15, slide: 0.5 }); noise(0.3, { vol: 0.1, filter: 600 }); },
  alarm() {
    for (let i = 0; i < 4; i++) {
      tone(880, 0.17, { when: i * 0.38, vol: 0.12 });
      tone(620, 0.17, { when: i * 0.38 + 0.19, vol: 0.12 });
    }
  },
  clear() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, { when: i * 0.09, vol: 0.12, type: 'square' })); },
  select() { tone(700, 0.05, { vol: 0.08, type: 'triangle' }); },
  confirm() { tone(660, 0.07, { vol: 0.1 }); tone(990, 0.1, { vol: 0.1, when: 0.06 }); },
  charge() { tone(140, 0.9, { type: 'sawtooth', vol: 0.12, slide: 3 }); },
};

// ---------- Música ----------
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CH = { M: [0, 4, 7], m: [0, 3, 7] };
const R1 = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0];
const R2 = [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0];
const R3 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const SLOW = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];

const TRACKS = {
  titulo: { bpm: 118, prog: [[60, 'M'], [67, 'M'], [69, 'm'], [65, 'M']], rh: [R1, R2], drums: 'rock' },
  prologo: { bpm: 92, prog: [[57, 'm'], [55, 'M'], [53, 'M'], [52, 'M']], rh: [SLOW, R3], drums: 'soft' },
  mundo1: { bpm: 132, prog: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], rh: [R1, R2], drums: 'rock' },
  mundo2: { bpm: 126, prog: [[62, 'm'], [58, 'M'], [60, 'M'], [57, 'm']], rh: [R2, R3], drums: 'rock' },
  mundo3: { bpm: 142, prog: [[52, 'm'], [48, 'M'], [50, 'M'], [47, 'M']], rh: [R3, R1], drums: 'rock' },
  jefe: { bpm: 156, prog: [[50, 'm'], [50, 'm'], [46, 'M'], [49, 'M']], rh: [R3, R2], drums: 'boss' },
  victoria: { bpm: 112, prog: [[60, 'M'], [65, 'M'], [67, 'M'], [60, 'M']], rh: [R2, SLOW], drums: 'soft' },
};

let current = null, timer = null, step = 0, nextTime = 0;

function scheduleStep(tr, s, t) {
  const bar = Math.floor(s / 16) % tr.prog.length;
  const st = s % 16;
  const [root, q] = tr.prog[bar];
  const notes = CH[q];
  const sp = 60 / tr.bpm / 4;
  const dest = musicGain;
  // bajo
  if (st % 2 === 0) tone(midi(root - 24 + (st % 4 === 2 ? 12 : 0)), sp * 1.8, { type: 'triangle', vol: 0.5, at: t, dest });
  // arpegio
  const arp = notes[[0, 1, 2, 1][st % 4]];
  tone(midi(root + arp), sp * 0.9, { type: 'square', vol: 0.045, at: t, dest });
  // melodía
  const rh = tr.rh[Math.floor(s / 16) % 2];
  if (rh[st]) {
    const idx = (st + bar * 3) % 5;
    const n = root + 12 + [notes[0], notes[1], notes[2], notes[0] + 12, notes[1] + 12][idx];
    tone(midi(n), sp * 2.6, { type: 'square', vol: 0.07, at: t, dest });
  }
  // batería
  const d = tr.drums;
  const kick = d === 'boss' ? st % 4 === 0 : st === 0 || st === 8 || (d === 'rock' && st === 10);
  if (kick && d !== 'soft') tone(150, 0.16, { type: 'sine', vol: 0.55, slide: 0.3, at: t, dest });
  if (d === 'soft' && st === 0) tone(110, 0.25, { type: 'sine', vol: 0.4, slide: 0.4, at: t, dest });
  if ((st === 4 || st === 12) && d !== 'soft') noise(0.12, { vol: 0.22, filter: 1800, type: 'bandpass', at: t, dest });
  if (st % 2 === 1) noise(0.03, { vol: 0.07, filter: 7000, type: 'highpass', at: t, dest });
}

export const music = {
  play(name) {
    if (!ctx) { pending = name; return; }
    if (current === name) return;
    this.stop();
    const tr = TRACKS[name];
    if (!tr) return;
    current = name;
    step = 0;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(() => {
      const sp = 60 / tr.bpm / 4;
      while (nextTime < ctx.currentTime + 0.12) {
        scheduleStep(tr, step, nextTime);
        nextTime += sp;
        step++;
      }
    }, 25);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
    current = null;
    pending = null;
  },
};
