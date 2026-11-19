import { images, SPR } from './assets';
import { MUNDOS, ENEMIGOS, OLEADAS, DIALOGOS } from './data';
import { input } from './input';
import { sfx, music } from './audio';

export const W = 1280;
export const H = 720;
const ENEMY_SCALE = 0.5;
const SHIP_SCALE = 0.5;
const SX = 105; // separación de columnas
const SY = 86; // separación de filas
const TOP = 62; // borde superior jugable (debajo del HUD)
const INVASION_X = 285;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SHOT = {
  normal: { speed: 320, r: 6, color: '#ffcf6b', core: '#fff3c4' },
  resina: { speed: 230, r: 8, color: '#f5a623', core: '#ffe08a' },
  fuego: { speed: 450, r: 7, color: '#ff5a1f', core: '#ffd27a' },
  mira: { speed: 390, r: 6, color: '#8dff4a', core: '#eaffd6' },
  cereza: { speed: 260, r: 10, color: '#d7263d', core: '#ff8fa0' },
  morado: { speed: 370, r: 7, color: '#c77dff', core: '#f2dcff' },
  red: { speed: 210, r: 12, color: '#e8f4ff', core: '#ffffff' },
  taladro: { speed: 470, r: 7, color: '#ff9f1c', core: '#fff1c1' },
  anillo: { speed: 210, r: 7, color: '#ff4d6d', core: '#ffd1dc' },
};

const ITEMS = {
  doble: { color: '#ffb703', letra: 'D', nombre: 'DISPARO DOBLE' },
  triple: { color: '#fb5607', letra: 'T', nombre: 'DISPARO TRIPLE' },
  escudo: { color: '#3a86ff', letra: 'E', nombre: 'ESCUDO' },
  vida: { color: '#ef233c', letra: '♥', nombre: '¡VIDA EXTRA!' },
};

export class Game {
  constructor(canvas, ev, startWorld = 0) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ev = ev;
    this.score = 0;
    this.lives = 3;
    this.world = startWorld;
    this.t = 0;
    this.running = true;
    this.paused = false;
    this.frozen = false;
    this.over = false;
    this.shake = 0;
    this.stars = Array.from({ length: 110 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.15, 1) }));
    this.player = this.newPlayer();
    this.bullets = [];
    this.eb = [];
    this.enemies = [];
    this.parts = [];
    this.items = [];
    this.texts = [];
    this.barriers = [];
    this.boss = null;
    this.grano = null;
    this.granoT = rand(14, 22);
    this.form = null;
    this.waveActive = false;
    this.bgScroll = 0;
    this.bgBoss = 0;
    this.bossMode = false;
    this.banner = null;
    this.waiters = [];
    this.flashScreen = 0;
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.run(startWorld);
  }

  newPlayer() {
    return {
      x: 130, y: H / 2,
      w: SPR.nave.w * SHIP_SCALE, h: SPR.nave.h * SHIP_SCALE,
      cd: 0, inv: 2, power: null, ptime: 0, shield: false, slow: 0, dead: 0, tilt: 0,
    };
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setPaused(p) {
    if (this.over || this.frozen) return;
    this.paused = p;
    input.clear();
    this.ev.onPause?.(p);
  }

  // ---------- guion ----------
  until(cond) { return new Promise((res) => this.waiters.push({ cond, res })); }
  wait(s) { const end = this.t + s; return this.until(() => this.t >= end); }

  showBanner(title, sub = '', dur = 2.2) {
    this.banner = { title, sub, t: 0, dur };
    return this.until(() => !this.banner);
  }

  dialog(lines) {
    if (!this.running) return Promise.resolve();
    this.frozen = true;
    return new Promise((res) => this.ev.onDialog(lines, () => {
      this.frozen = false;
      input.clear();
      this.last = performance.now();
      res();
    }));
  }

  async run(start) {
    for (let w = start; w < MUNDOS.length; w++) {
      await this.runWorld(w);
      if (!this.running || this.over) return;
    }
    music.play('victoria');
    this.ev.onVictory?.(this.score);
  }

  async runWorld(w) {
    const M = MUNDOS[w];
    this.world = w;
    this.bossMode = false;
    this.bgBoss = 0;
    this.bgScroll = 0;
    this.makeBarriers();
    this.eb = [];
    music.play(M.musica);
    await this.wait(0.6);
    await this.dialog(DIALOGOS[w].intro);
    for (let k = 0; k < 2; k++) {
      await this.showBanner(`MUNDO ${w + 1}-${k + 1}`, M.nombre, 2.3);
      this.spawnWave(w, k);
      await this.until(() => this.waveActive && this.enemies.filter((e) => !e.minion).length === 0);
      this.waveActive = false;
      if (this.over) return;
      sfx.clear();
      await this.showBanner('¡OLEADA SUPERADA!', '', 1.6);
    }
    // jefe
    this.bossMode = true;
    this.grano = null;
    music.stop();
    sfx.alarm();
    await this.showBanner('¡ALERTA!', M.jefeNombre, 2.6);
    await this.dialog(DIALOGOS[w].jefe);
    music.play('jefe');
    this.spawnBoss(w);
    await this.until(() => this.boss && this.boss.dead && this.boss.deadT > 2.6);
    this.boss = null;
    this.eb = [];
    this.enemies = [];
    if (this.over) return;
    music.play(M.musica);
    await this.showBanner('¡JEFE DERROTADO!', `+${M.puntosJefe} puntos`, 2.4);
    await this.dialog(DIALOGOS[w].fin);
  }

  // ---------- creación ----------
  makeBarriers() {
    this.barriers = [];
    const cs = 8, cols = 10, rows = 14;
    for (const cy of [175, 380, 585]) {
      const cells = new Uint8Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const dx = (i + 0.5 - cols / 2) / (cols / 2);
          const dy = (j + 0.5 - rows / 2) / (rows / 2);
          let on = dx * dx + dy * dy <= 1;
          const crack = cols / 2 + Math.sin(j * 0.7) * 1.1;
          if (j > 1 && j < rows - 2 && Math.abs(i + 0.5 - crack) < 0.55) on = false;
          cells[j * cols + i] = on ? 1 : 0;
        }
      }
      this.barriers.push({ x: 335, y: cy - (rows * cs) / 2, cs, cols, rows, cells });
    }
  }

  spawnWave(w, k) {
    const def = OLEADAS[w][k];
    const cols = def.cols.length;
    const rows = def.rows;
    const startX = W - 64 - (cols - 1) * SX;
    this.form = {
      x: startX, startX, y: (H + TOP) / 2 - ((rows - 1) * SY) / 2,
      dir: 1, base: def.speed, rate: def.rate, total: cols * rows,
      shotT: 2.2, sniperT: rand(3, 5), marchT: 0.5, marchI: 0,
    };
    this.enemies = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const def2 = ENEMIGOS[def.cols[c]];
        this.enemies.push({
          kind: def.cols[c], spr: def2.spr, c, r, hp: def2.hp,
          anim: rand(0, 8), flash: 0, enter: 0.3 + c * 0.13 + r * 0.06, ox: 700,
          x: W + 200, y: 0,
        });
      }
    }
    this.waveActive = true;
    this.granoT = rand(14, 22);
  }

  spawnBoss(w) {
    const M = MUNDOS[w];
    const s = SPR[M.jefe];
    const target = M.jefe === 'Reina_del_Cafetal' ? 330 : 390;
    const sc = target / s.w;
    this.boss = {
      name: M.jefe, nombre: M.jefeNombre, sc, w: s.w * sc, h: s.h * sc,
      x: W + 260, y: H / 2, tx: 1010, hp: M.jefeHp, maxHp: M.jefeHp,
      t: 0, phase: 1, st: 'enter', stT: 0, flash: 0, dead: false, deadT: 0,
      cdA: 2, cdB: 4, cdC: 6, burst: 0, burstT: 0, spin: 0, anim: 0, show: 0,
    };
  }

  // ---------- disparos ----------
  enemyShot(x, y, kind, angle = Math.PI) {
    if (this.eb.length > 70) return;
    const s = SHOT[kind];
    this.eb.push({
      x, y, kind, r: s.r, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed,
      t: 0, ph: rand(0, 6), hp: 1,
    });
  }

  aimAt(x, y) {
    const p = this.player;
    return Math.atan2(p.y - y, p.x - x);
  }

  playerShoot() {
    const p = this.player;
    const max = p.power ? 6 : 2;
    if (this.bullets.length >= max) return;
    const nx = p.x + p.w / 2 - 8;
    const ny = p.y + 6;
    const add = (dy, ang) => this.bullets.push({ x: nx, y: ny + dy, vx: Math.cos(ang) * 950, vy: Math.sin(ang) * 950 });
    if (p.power === 'doble') { add(-11, 0); add(11, 0); } else if (p.power === 'triple') { add(0, 0); add(-4, -0.14); add(4, 0.14); } else add(0, 0);
    p.cd = p.power ? 0.22 : 0.28;
    sfx.shoot();
  }

  // ---------- daño ----------
  hurtPlayer() {
    const p = this.player;
    if (p.inv > 0 || p.dead > 0 || this.over) return;
    if (p.shield) {
      p.shield = false;
      p.inv = 1.2;
      sfx.shield();
      this.burst(p.x, p.y, 18, ['#8ecae6', '#3a86ff', '#ffffff'], 260);
      return;
    }
    sfx.playerHit();
    this.explode(p.x, p.y, 1.4);
    this.shake = 18;
    this.flashScreen = 0.35;
    this.lives -= 1;
    p.dead = 1.6;
    p.power = null;
    p.slow = 0;
    if (this.lives <= 0) {
      this.over = true;
      setTimeout(() => {
        if (this.running) this.ev.onGameOver?.({ score: this.score, world: this.world });
      }, 1800);
    }
  }

  addScore(n, x, y, color = '#ffe066') {
    this.score += n;
    if (x !== undefined) this.texts.push({ x, y, txt: `+${n}`, t: 0, color });
  }

  dropItem(x, y, forced) {
    const r = Math.random();
    let type;
    if (forced) type = r < 0.12 && this.lives < 5 ? 'vida' : r < 0.45 ? 'doble' : r < 0.75 ? 'triple' : 'escudo';
    else if (r < 0.035) type = pick(['doble', 'triple', 'escudo']);
    if (type) this.items.push({ x, y, type, t: 0, by: y });
  }

  // ---------- partículas ----------
  burst(x, y, n, colors, speed = 220, life = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.3, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), t: 0, r: rand(2, 5), color: pick(colors) });
    }
  }

  explode(x, y, size = 1) {
    this.burst(x, y, Math.round(22 * size), ['#fff1a8', '#ffb703', '#fb5607', '#ff006e'], 260 * size, 0.7);
    this.burst(x, y, Math.round(8 * size), ['#6b3d22', '#3b2416', '#9a5b33'], 160 * size, 0.9);
    this.parts.push({ ring: true, x, y, t: 0, life: 0.45, r: 10, max: 70 * size });
  }

  // ---------- loop ----------
  loop(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    input.poll();
    if (!this.frozen && !this.over && input.consume('pause')) this.setPaused(!this.paused);
    if (!this.paused && !this.frozen) this.update(dt);
    else if (this.frozen) this.updateStars(dt * 0.3);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  updateStars(dt) {
    const sp = this.bossMode ? 90 : 160;
    for (const s of this.stars) {
      s.x -= s.z * sp * dt;
      if (s.x < 0) { s.x = W; s.y = rand(0, H); }
    }
  }

  update(dt) {
    this.t += dt;
    this.updateStars(dt);
    if (!this.bossMode) this.bgScroll += 16 * dt;
    else this.bgBoss = Math.min(1, this.bgBoss + dt / 1.6);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flashScreen = Math.max(0, this.flashScreen - dt);

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }

    this.updatePlayer(dt);
    this.updateBullets(dt);
    if (this.form) this.updateFormation(dt);
    this.updateEnemies(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateGrano(dt);
    this.updateEnemyBullets(dt);
    this.updateItems(dt);

    for (const p of this.parts) {
      p.t += dt;
      if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const t of this.texts) { t.t += dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter((t) => t.t < 1);

    const w = this.waiters;
    this.waiters = [];
    for (const x of w) { if (x.cond()) x.res(); else this.waiters.push(x); }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.dead > 0) {
      p.dead -= dt;
      if (p.dead <= 0 && !this.over) {
        Object.assign(p, { x: 130, y: H / 2, inv: 2.5, cd: 0.3 });
      }
      return;
    }
    const spd = 430 * (p.slow > 0 ? 0.45 : 1);
    p.x = clamp(p.x + input.x * spd * dt, p.w / 2 + 8, 255);
    p.y = clamp(p.y + input.y * spd * dt, TOP + p.h / 2, H - 8 - p.h / 2);
    p.tilt += (input.y * 0.12 - p.tilt) * Math.min(1, dt * 10);
    p.cd -= dt;
    p.inv -= dt;
    p.slow -= dt;
    if (p.power) { p.ptime -= dt; if (p.ptime <= 0) p.power = null; }
    if (input.fire && p.cd <= 0) this.playerShoot();
    if (Math.random() < 0.6) {
      this.parts.push({ x: p.x - p.w / 2 + 4, y: p.y + 10 + rand(-4, 4), vx: rand(-260, -160), vy: rand(-20, 20), life: 0.25, t: 0, r: rand(2, 4), color: pick(['#8be9ff', '#4cc9f0', '#ffffff']) });
    }
  }

  hitBarrier(x, y, rad = 1) {
    for (const b of this.barriers) {
      if (x < b.x || y < b.y || x >= b.x + b.cols * b.cs || y >= b.y + b.rows * b.cs) continue;
      const i = Math.floor((x - b.x) / b.cs);
      const j = Math.floor((y - b.y) / b.cs);
      if (!b.cells[j * b.cols + i]) continue;
      for (let dj = -rad; dj <= rad; dj++) {
        for (let di = -rad; di <= rad; di++) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= b.cols || jj >= b.rows) continue;
          if (di * di + dj * dj <= rad * rad + 0.5 && (Math.random() < 0.75 || (di === 0 && dj === 0))) b.cells[jj * b.cols + ii] = 0;
        }
      }
      this.burst(x, y, 4, ['#9a5b33', '#6b3d22', '#d4a373'], 120, 0.4);
      return true;
    }
    return false;
  }

  enemyBox(e) {
    const s = SPR[e.spr];
    return { w: s.w * ENEMY_SCALE * 0.8, h: s.h * ENEMY_SCALE * 0.7 };
  }

  updateBullets(dt) {
    const out = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x > W + 20 || b.y < -20 || b.y > H + 20) continue;
      if (this.hitBarrier(b.x + 8, b.y, 1)) continue;
      let hit = false;
      for (const e of this.enemies) {
        if (e.ox > 40) continue;
        const bx = this.enemyBox(e);
        if (Math.abs(b.x - e.x) < bx.w / 2 + 6 && Math.abs(b.y - e.y) < bx.h / 2 + 4) {
          hit = true;
          e.hp -= 1;
          e.flash = 0.12;
          if (e.hp <= 0) this.killEnemy(e);
          else sfx.hit();
          break;
        }
      }
      if (!hit && this.grano) {
        const g = this.grano;
        if (Math.hypot(b.x - g.x, b.y - g.y) < 34) {
          hit = true;
          const pts = pick([100, 150, 200, 300]);
          this.addScore(pts, g.x - 40, g.y, '#9dff5a');
          this.explode(g.x, g.y, 1);
          this.burst(g.x, g.y, 20, ['#b8ff6a', '#5cff2a', '#eaffd6'], 300);
          sfx.boom();
          this.dropItem(g.x - 20, g.y, true);
          this.grano = null;
        }
      }
      if (!hit && this.boss && !this.boss.dead && this.boss.x < W - 40) {
        const B = this.boss;
        const rx = B.w * 0.4, ry = B.h * 0.38;
        const dx = (b.x - B.x) / rx, dy = (b.y - B.y) / ry;
        if (dx * dx + dy * dy <= 1) {
          hit = true;
          B.hp -= 1;
          B.flash = 0.08;
          this.burst(b.x, b.y, 3, ['#fff1a8', '#ffb703'], 150, 0.3);
          if (B.hp % 4 === 0) sfx.hit();
          if (B.hp <= B.maxHp / 2 && B.phase === 1) {
            B.phase = 2;
            this.shake = 10;
            this.texts.push({ x: B.x - 120, y: B.y - B.h / 2, txt: '¡FURIA!', t: 0, color: '#ff4d6d' });
          }
          if (B.hp <= 0) this.killBoss();
        }
      }
      if (!hit) out.push(b);
    }
    this.bullets = out;
  }

  killEnemy(e) {
    const d = ENEMIGOS[e.kind];
    this.addScore(e.minion ? 25 : d.pts, e.x, e.y - 20);
    this.explode(e.x, e.y, 0.8);
    sfx.boom();
    this.shake = Math.max(this.shake, 4);
    this.enemies = this.enemies.filter((x) => x !== e);
    if (!e.minion) this.dropItem(e.x, e.y, false);
  }

  killBoss() {
    const B = this.boss;
    B.dead = true;
    B.deadT = 0;
    this.eb = [];
    this.enemies = this.enemies.filter((e) => !e.minion);
    this.score += MUNDOS[this.world].puntosJefe;
    music.stop();
    sfx.boom(true);
    this.shake = 22;
  }

  updateFormation(dt) {
    const F = this.form;
    const alive = this.enemies.filter((e) => !e.minion);
    if (!alive.length) { this.form = null; return; }
    const entering = alive.some((e) => e.ox > 1);
    let speed = F.base * (1 + (1 - alive.length / F.total) * 3.2);
    if (alive.length === 1) speed *= 1.7;
    speed = Math.min(speed, 330);
    if (!entering) {
      F.y += F.dir * speed * dt;
      let minY = Infinity, maxY = -Infinity;
      for (const e of alive) {
        const hh = (SPR[e.spr].h * ENEMY_SCALE) / 2;
        const y = F.y + e.r * SY;
        minY = Math.min(minY, y - hh);
        maxY = Math.max(maxY, y + hh);
      }
      if (maxY > H - 10 && F.dir > 0) { F.dir = -1; F.x -= 26; }
      if (minY < TOP && F.dir < 0) { F.dir = 1; F.x -= 26; }
      F.marchT -= dt;
      if (F.marchT <= 0) { sfx.march(F.marchI++); F.marchT = clamp(26 / speed, 0.12, 0.85); }

      // disparos: el más cercano al jugador de cada fila
      F.shotT -= dt;
      if (F.shotT <= 0 && this.player.dead <= 0) {
        F.shotT = rand(0.45, 1.0) * F.rate;
        const front = {};
        for (const e of alive) if (!front[e.r] || e.c < front[e.r].c) front[e.r] = e;
        const e = pick(Object.values(front));
        const kind = ENEMIGOS[e.kind].disparo;
        const ang = kind === 'mira' ? this.aimAt(e.x, e.y) : Math.PI;
        this.enemyShot(e.x - 30, e.y + 4, kind, ang);
        sfx.eshoot();
      }
      F.sniperT -= dt;
      if (F.sniperT <= 0) {
        F.sniperT = rand(2.4, 4) * F.rate;
        const snipers = alive.filter((e) => e.kind === 'G');
        if (snipers.length && this.player.dead <= 0) {
          const e = pick(snipers);
          this.enemyShot(e.x - 30, e.y + 2, 'mira', this.aimAt(e.x, e.y));
          sfx.eshoot();
        }
      }
    }
    for (const e of alive) {
      if (e.enter > 0) e.enter -= dt;
      else e.ox = Math.max(0, e.ox - Math.max(e.ox * 4, 60) * dt);
      e.x = F.x + e.c * SX + e.ox;
      e.y = F.y + e.r * SY + Math.sin(this.t * 3 + e.c * 0.9) * 3;
    }
    // invasión
    const minX = Math.min(...alive.map((e) => e.x - this.enemyBox(e).w / 2));
    if (minX < INVASION_X && !entering) {
      this.texts.push({ x: 360, y: H / 2, txt: '¡INVASIÓN!', t: 0, color: '#ff4d6d' });
      this.player.inv = 0;
      this.player.shield = false;
      this.hurtPlayer();
      F.x = F.startX;
      for (const e of alive) e.ox = 500;
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.anim += dt * 12;
      e.flash -= dt;
      if (e.minion) {
        e.t += dt;
        e.x += e.vx * dt;
        e.y = e.by + Math.sin(e.t * 3 + e.ph) * 90;
      }
      // contra barreras
      if (e.x < 440) {
        const bx = this.enemyBox(e);
        for (const b of this.barriers) {
          for (let j = 0; j < b.rows; j++) {
            for (let i = 0; i < b.cols; i++) {
              const cx = b.x + i * b.cs + 4, cy = b.y + j * b.cs + 4;
              if (Math.abs(cx - e.x) < bx.w / 2 && Math.abs(cy - e.y) < bx.h / 2) b.cells[j * b.cols + i] = 0;
            }
          }
        }
      }
      // contra jugador
      if (p.dead <= 0) {
        const bx = this.enemyBox(e);
        if (Math.abs(p.x - e.x) < bx.w / 2 + p.w * 0.25 && Math.abs(p.y - e.y) < bx.h / 2 + p.h * 0.2) {
          this.hurtPlayer();
          if (e.minion) this.killEnemy(e);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.minion || e.x > -80);
  }

  updateGrano(dt) {
    if (this.waveActive && !this.bossMode && !this.grano) {
      this.granoT -= dt;
      if (this.granoT <= 0) {
        const down = Math.random() < 0.5;
        this.grano = { x: W - 34, y: down ? -40 : H + 40, vy: down ? 150 : -150, t: 0 };
        this.granoT = rand(16, 26);
      }
    }
    const g = this.grano;
    if (g) {
      g.t += dt;
      g.y += g.vy * dt;
      if (Math.floor(g.t * 4) !== Math.floor((g.t - dt) * 4)) sfx.grano();
      if (g.y < -60 || g.y > H + 60) this.grano = null;
    }
  }

  updateEnemyBullets(dt) {
    const p = this.player;
    const out = [];
    for (const b of this.eb) {
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.kind === 'resina') b.y += Math.sin(b.t * 7 + b.ph) * 70 * dt;
      if (b.kind === 'red') b.r = Math.min(30, 12 + b.t * 14);
      if (b.kind === 'fuego' && Math.random() < 0.5) this.parts.push({ x: b.x + 6, y: b.y, vx: rand(20, 60), vy: rand(-20, 20), life: 0.25, t: 0, r: rand(2, 4), color: pick(['#ff5a1f', '#ffb703']) });
      if (b.x < -40 || b.x > W + 60 || b.y < -40 || b.y > H + 40) continue;
      if (b.kind !== 'red' && this.hitBarrier(b.x - b.r, b.y, b.kind === 'fuego' || b.kind === 'cereza' ? 2 : 1)) continue;
      if (p.dead <= 0) {
        const hx = p.w * 0.3 + b.r, hy = p.h * 0.24 + b.r;
        if (Math.abs(b.x - p.x) < hx && Math.abs(b.y - (p.y + 4)) < hy) {
          if (b.kind === 'red') {
            if (p.slow <= 0) { sfx.web(); this.texts.push({ x: p.x, y: p.y - 40, txt: '¡ENREDADO!', t: 0, color: '#e8f4ff' }); }
            p.slow = 2.8;
            continue;
          }
          this.hurtPlayer();
          continue;
        }
      }
      out.push(b);
    }
    this.eb = out;
  }

  updateItems(dt) {
    const p = this.player;
    const out = [];
    for (const it of this.items) {
      it.t += dt;
      it.x -= 150 * dt;
      it.y = it.by + Math.sin(it.t * 4) * 18;
      if (it.x < -30) continue;
      if (p.dead <= 0 && Math.abs(it.x - p.x) < p.w / 2 && Math.abs(it.y - p.y) < p.h / 2 + 10) {
        const d = ITEMS[it.type];
        sfx.power();
        this.texts.push({ x: p.x, y: p.y - 46, txt: d.nombre, t: 0, color: d.color });
        if (it.type === 'vida') this.lives = Math.min(5, this.lives + 1);
        else if (it.type === 'escudo') p.shield = true;
        else { p.power = it.type; p.ptime = 12; }
        continue;
      }
      out.push(it);
    }
    this.items = out;
  }

  // ---------- jefes ----------
  updateBoss(dt) {
    const B = this.boss;
    const p = this.player;
    B.t += dt;
    B.anim += dt * 10;
    B.flash -= dt;
    if (B.dead) {
      B.deadT += dt;
      B.y += 30 * dt;
      if (Math.random() < 0.25) {
        this.explode(B.x + rand(-B.w / 2.5, B.w / 2.5), B.y + rand(-B.h / 3, B.h / 3), rand(0.6, 1.2));
        sfx.boom();
      }
      if (B.deadT > 2.4 && !B.final) {
        B.final = true;
        this.explode(B.x, B.y, 3);
        this.flashScreen = 0.6;
        sfx.boom(true);
        this.shake = 25;
      }
      return;
    }
    const p2 = B.phase === 2;
    if (B.st === 'enter') {
      B.x -= 240 * dt;
      B.y = H / 2 + Math.sin(B.t) * 40;
      if (B.x <= B.tx) { B.x = B.tx; B.st = 'idle'; B.t = 0; }
      return;
    }
    B.cdA -= dt; B.cdB -= dt; B.cdC -= dt;
    const mouthX = B.x - B.w * 0.38;

    if (B.name === 'Reina_del_Cafetal') {
      B.y = H / 2 + 20 + Math.sin(B.t * 0.75) * 210;
      B.x = B.tx + Math.sin(B.t * 1.3) * 30;
      if (B.cdA <= 0) {
        B.cdA = p2 ? 1.05 : 1.6;
        const n = p2 ? 9 : 7;
        const spread = 1.4;
        const base = Math.PI + (Math.random() - 0.5) * 0.2;
        for (let i = 0; i < n; i++) this.enemyShot(mouthX, B.y, 'cereza', base - spread / 2 + (spread * i) / (n - 1));
        sfx.eshoot();
      }
      if (B.cdB <= 0) {
        B.cdB = p2 ? 4.5 : 6;
        for (let i = 0; i < 3; i++) {
          const s = ENEMIGOS.B;
          this.enemies.push({ kind: 'B', spr: s.spr, minion: true, hp: 1, x: B.x - 40, y: B.y, by: clamp(B.y + (i - 1) * 140, 120, H - 120), vx: -170 - i * 20, t: 0, ph: i * 2, anim: 0, flash: 0, ox: 0 });
        }
      }
      if (p2 && B.cdC <= 0) {
        B.cdC = 4.2;
        for (let i = 0; i < 16; i++) this.enemyShot(B.x, B.y, 'anillo', (i / 16) * Math.PI * 2 + B.t);
      }
    } else if (B.name === 'Hilandera_Orbital') {
      if (B.st === 'idle') {
        B.y = H / 2 + 20 + Math.sin(B.t * 0.9) * 220;
        B.x = B.tx + Math.sin(B.t * 1.8) * 60;
        if (B.cdA <= 0) {
          B.cdA = p2 ? 0.9 : 1.3;
          const a = this.aimAt(mouthX, B.y);
          for (const d of [-0.18, 0, 0.18]) this.enemyShot(mouthX, B.y, 'morado', a + d);
          sfx.eshoot();
        }
        if (B.cdB <= 0) {
          B.cdB = p2 ? 2.4 : 3.2;
          this.enemyShot(mouthX, B.y, 'red', this.aimAt(mouthX, B.y));
        }
        if (p2 && B.cdC <= 0) { B.st = 'tele'; B.stT = 0.85; sfx.charge(); }
      } else if (B.st === 'tele') {
        B.stT -= dt;
        if (B.stT <= 0) { B.st = 'dash'; }
      } else if (B.st === 'dash') {
        B.x -= 950 * dt;
        if (B.x < 420) B.st = 'back';
      } else if (B.st === 'back') {
        B.x += 480 * dt;
        if (B.x >= B.tx) { B.x = B.tx; B.st = 'idle'; B.cdC = 5; }
      }
    } else if (B.name === 'General_Taladro') {
      if (B.st === 'idle') {
        B.y += (H / 2 + 20 + Math.sin(B.t * 0.8) * 200 - B.y) * Math.min(1, dt * 3);
        B.x += (B.tx - B.x) * Math.min(1, dt * 3);
        if (B.cdA <= 0) { B.cdA = p2 ? 1.5 : 2.1; B.burst = 5; B.burstT = 0; }
        if (B.burst > 0) {
          B.burstT -= dt;
          if (B.burstT <= 0) {
            B.burst--; B.burstT = 0.09;
            this.enemyShot(mouthX, B.y + 8, 'taladro', this.aimAt(mouthX, B.y));
            sfx.eshoot();
          }
        }
        if (p2 && B.cdB <= 0) { B.cdB = 6; B.spin = 2.6; }
        if (B.spin > 0) {
          B.spin -= dt;
          B.burstT2 = (B.burstT2 || 0) - dt;
          if (B.burstT2 <= 0) {
            B.burstT2 = 0.13;
            const a = B.t * 2.6;
            this.enemyShot(B.x, B.y, 'anillo', a);
            this.enemyShot(B.x, B.y, 'anillo', a + Math.PI);
          }
        }
        if (B.cdC <= 0 && B.spin <= 0) { B.st = 'aim'; B.stT = p2 ? 0.85 : 1.15; sfx.charge(); }
      } else if (B.st === 'aim') {
        B.stT -= dt;
        B.y += (p.y - B.y) * Math.min(1, dt * 5);
        B.x += (B.tx + 40 - B.x) * Math.min(1, dt * 4);
        if (B.stT <= 0) B.st = 'charge';
      } else if (B.st === 'charge') {
        B.x -= 1150 * dt;
        if (Math.random() < 0.7) this.burst(B.x + B.w / 2, B.y + rand(-30, 30), 1, ['#ff9f1c', '#ffd166'], 80, 0.4);
        if (B.x < -B.w / 2) { B.x = W + B.w / 2 + 40; B.y = rand(150, H - 150); B.st = 'back'; }
      } else if (B.st === 'back') {
        B.x -= 380 * dt;
        if (B.x <= B.tx) { B.x = B.tx; B.st = 'idle'; B.cdC = p2 ? 3.8 : 5.5; }
      }
    }
    // contacto
    if (p.dead <= 0) {
      const rx = B.w * 0.4 + p.w * 0.2, ry = B.h * 0.36 + p.h * 0.2;
      const dx = (p.x - B.x) / rx, dy = (p.y - B.y) / ry;
      if (dx * dx + dy * dy <= 1) this.hurtPlayer();
    }
  }

  // ---------- dibujo ----------
  drawSpr(name, frame, x, y, scale, flash = false, alpha = 1, rot = 0) {
    const arr = images.sprites[name];
    const im = arr && arr[Math.floor(frame) % arr.length];
    if (!im || !im.naturalWidth) return;
    const ctx = this.ctx;
    const w = im.width * scale, h = im.height * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    if (flash) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.8;
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  drawBackground() {
    const ctx = this.ctx;
    const panels = images.bg[MUNDOS[this.world].mapa];
    if (panels && panels[0]) {
      const strip = 4 * W;
      const off = this.bgScroll % strip;
      const idx = Math.floor(off / W);
      const dx = off % W;
      const ok = (im) => im && im.complete && im.naturalWidth > 0;
      const a = panels[idx % 4], b = panels[(idx + 1) % 4];
      if (ok(a)) ctx.drawImage(a, -dx, 0, W, H);
      if (ok(b)) ctx.drawImage(b, W - dx, 0, W, H);
      if (this.bgBoss > 0 && ok(panels[4])) {
        ctx.globalAlpha = this.bgBoss;
        ctx.drawImage(panels[4], 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = 'rgba(4,6,20,0.4)';
    ctx.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + s.z * 0.6})`;
      const len = this.bossMode ? 1 : s.z * 8;
      ctx.fillRect(s.x, s.y, Math.max(1.5, len), 1.5 * s.z + 0.5);
    }
  }

  drawBarriers() {
    const ctx = this.ctx;
    for (const b of this.barriers) {
      for (let j = 0; j < b.rows; j++) {
        for (let i = 0; i < b.cols; i++) {
          if (!b.cells[j * b.cols + i]) continue;
          const x = b.x + i * b.cs, y = b.y + j * b.cs;
          const shade = (i + j * 0.5) / (b.cols + b.rows * 0.5);
          ctx.fillStyle = shade < 0.35 ? '#b0703f' : shade < 0.6 ? '#8a5530' : '#653a1f';
          ctx.fillRect(x, y, b.cs, b.cs);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x, y + b.cs - 2, b.cs, 2);
        }
      }
    }
  }

  drawGrano() {
    const g = this.grano;
    if (!g) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.sin(g.t * 3) * 0.4);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    glow.addColorStop(0, 'rgba(160,255,90,0.75)');
    glow.addColorStop(1, 'rgba(160,255,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3417';
    ctx.strokeStyle = '#1b0e05';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a8ff4f';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.bezierCurveTo(-8, -6, 8, 6, 0, 22); ctx.stroke();
    ctx.restore();
  }

  drawItems() {
    const ctx = this.ctx;
    for (const it of this.items) {
      const d = ITEMS[it.type];
      const pulse = 1 + Math.sin(it.t * 8) * 0.08;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#10142a';
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = d.color;
      ctx.font = '26px Bangers, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.letra, 0, 2);
      ctx.restore();
    }
  }

  drawEnemies() {
    for (const e of this.enemies) {
      this.drawSpr(e.spr, e.anim, e.x, e.y, ENEMY_SCALE, e.flash > 0);
    }
  }

  drawBoss() {
    const B = this.boss;
    if (!B) return;
    const ctx = this.ctx;
    if (B.dead && B.final) return;
    // advertencia de embestida
    if (B.st === 'aim') {
      const top = B.y - B.h * 0.3, hh = B.h * 0.6;
      ctx.fillStyle = `rgba(255,30,60,${0.22 + 0.14 * Math.sin(this.t * 30)})`;
      ctx.fillRect(0, top, B.x, hh);
      ctx.fillStyle = '#ff2a4d';
      ctx.fillRect(0, top, B.x, 3);
      ctx.fillRect(0, top + hh - 3, B.x, 3);
      this.text('¡PELIGRO!', B.x / 2, B.y, 40, '#ffffff', 'center');
    }
    let x = B.x, y = B.y;
    if (B.st === 'tele' || B.st === 'aim') { x += rand(-4, 4); y += rand(-4, 4); }
    const alpha = B.dead ? Math.max(0, 1 - B.deadT / 2.6) * (Math.sin(B.deadT * 40) > 0 ? 1 : 0.6) : 1;
    this.drawSpr(B.name, B.anim, x, y, B.sc, B.flash > 0 || B.st === 'tele', alpha);
  }

  drawPlayer() {
    const p = this.player;
    if (p.dead > 0) return;
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;
    const ctx = this.ctx;
    this.drawSpr('nave', this.t * 14, p.x, p.y, SHIP_SCALE, false, 1, p.tilt);
    if (p.shield) {
      ctx.strokeStyle = `rgba(90,170,255,${0.6 + Math.sin(this.t * 8) * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 2, p.w * 0.6, p.h * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (p.slow > 0) {
      ctx.strokeStyle = 'rgba(232,244,255,0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.t;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 40); ctx.stroke();
      }
    }
  }

  drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) {
      ctx.fillStyle = 'rgba(255,170,40,0.35)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 22, 8, Math.atan2(b.vy, b.vx), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 14, 3.5, Math.atan2(b.vy, b.vx), 0, Math.PI * 2); ctx.fill();
    }
    for (const b of this.eb) {
      const s = SHOT[b.kind];
      if (b.kind === 'red') continue;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.core;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // telarañas y cerezas (no aditivas)
    for (const b of this.eb) {
      if (b.kind === 'red') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.t * 1.5);
        ctx.strokeStyle = 'rgba(240,248,255,0.9)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * b.r, Math.sin(a) * b.r); ctx.stroke();
        }
        for (const k of [0.4, 0.7, 1]) {
          ctx.beginPath();
          for (let i = 0; i <= 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const fx = Math.cos(a) * b.r * k, fy = Math.sin(a) * b.r * k;
            if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (b.kind === 'cereza') {
        ctx.fillStyle = '#b5172b';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8fa0';
        ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2d6a1f';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 0.8); ctx.lineTo(b.x + 5, b.y - b.r * 1.4); ctx.stroke();
      }
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      if (p.ring) {
        ctx.strokeStyle = `rgba(255,220,150,${k})`;
        ctx.lineWidth = 4 * k;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (p.max - p.r) * (1 - k), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  text(txt, x, y, size, color = '#fff', align = 'left', font = 'Bangers') {
    const ctx = this.ctx;
    ctx.font = font === 'Bangers' ? `${size}px Bangers, Impact, sans-serif` : `800 ${size}px Rubik, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = '#1a0b02';
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = color;
    ctx.fillText(txt, x, y);
  }

  drawHUD() {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, 56);
    g.addColorStop(0, 'rgba(5,6,18,0.85)');
    g.addColorStop(1, 'rgba(5,6,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 56);
    this.text('PUNTOS', 24, 20, 18, '#ffc94a');
    this.text(String(this.score).padStart(6, '0'), 24, 42, 26, '#fff');
    const best = Math.max(this.ev.best?.() || 0, this.score);
    this.text('RÉCORD', W / 2, 20, 18, '#ffc94a', 'center');
    this.text(String(best).padStart(6, '0'), W / 2, 42, 26, '#fff', 'center');
    this.text(`MUNDO ${this.world + 1}`, 240, 20, 18, '#9fd3ff');
    this.text(MUNDOS[this.world].nombre.toUpperCase(), 240, 42, 20, '#d9ecff');
    const ship = images.sprites.nave?.[0];
    for (let i = 0; i < this.lives; i++) {
      if (ship && ship.naturalWidth) ctx.drawImage(ship, W - 70 - i * 58, 14, 52, 25);
    }
    const p = this.player;
    if (p.power) {
      const d = ITEMS[p.power];
      this.text(`${d.nombre}  ${Math.ceil(p.ptime)}`, W - 330, 30, 20, d.color, 'right');
    } else if (p.shield) this.text('ESCUDO', W - 330, 30, 20, ITEMS.escudo.color, 'right');

    const B = this.boss;
    if (B && !B.dead && B.st !== 'enter') {
      const bw = 640, bx = (W - bw) / 2, by = H - 34;
      ctx.fillStyle = 'rgba(5,6,18,0.75)';
      ctx.fillRect(bx - 6, by - 6, bw + 12, 24);
      ctx.fillStyle = '#3a0d14';
      ctx.fillRect(bx, by, bw, 12);
      const k = B.hp / B.maxHp;
      const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      gr.addColorStop(0, '#ff006e');
      gr.addColorStop(1, '#ffb703');
      ctx.fillStyle = gr;
      ctx.fillRect(bx, by, bw * k, 12);
      this.text(B.nombre.toUpperCase(), W / 2, by - 18, 26, B.phase === 2 ? '#ff4d6d' : '#ffe8a3', 'center');
    }
  }

  drawBanner() {
    const b = this.banner;
    if (!b) return;
    const ctx = this.ctx;
    const tin = Math.min(1, b.t / 0.3);
    const tout = Math.min(1, (b.dur - b.t) / 0.3);
    const k = Math.min(tin, tout);
    const alarm = b.title === '¡ALERTA!';
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = alarm ? `rgba(120,0,20,${0.55 + 0.2 * Math.sin(b.t * 14)})` : 'rgba(5,6,18,0.6)';
    ctx.fillRect(0, H / 2 - 80 * k, W, 160 * k);
    ctx.fillStyle = alarm ? '#ff3355' : '#ffc94a';
    ctx.fillRect(0, H / 2 - 80 * k, W, 4);
    ctx.fillRect(0, H / 2 + 80 * k - 4, W, 4);
    const off = (1 - tin) * -200 + (1 - tout) * 200;
    this.text(b.title, W / 2 + off, H / 2 - (b.sub ? 18 : 0), 76, alarm ? '#ffffff' : '#ffd166', 'center');
    if (b.sub) this.text(b.sub, W / 2 - off, H / 2 + 44, 34, alarm ? '#ffd1d9' : '#ffffff', 'center');
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    this.drawBackground();
    this.drawBarriers();
    this.drawItems();
    this.drawGrano();
    this.drawEnemies();
    this.drawBoss();
    this.drawBullets();
    this.drawPlayer();
    this.drawParticles();
    for (const t of this.texts) {
      ctx.globalAlpha = 1 - t.t;
      this.text(t.txt, t.x, t.y, 26, t.color, 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (this.flashScreen > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashScreen})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.drawHUD();
    this.drawBanner();
  }
}
