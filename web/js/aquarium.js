import { renderCreature } from './creatureRenderer.js';

export class AquariumGame {
  constructor(canvas, state, sound, onCoinsUpdated) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.sound = sound;
    this.onCoinsUpdated = onCoinsUpdated;

    this.running = false;
    this.rafId = null;
    this.lastTime = performance.now();
    this.lastFeedTime = 0;
    this.dropperX = 400;
    this.tankL = 60;
    this.tankT = 80;
    this.tankR = 740;
    this.tankB = 500;

    this.pellets = [];
    this.hearts = [];
    this.airBubbles = Array.from({ length: 30 }, () => ({
      x: 100 + Math.random() * 600,
      y: 100 + Math.random() * 400,
      r: 3 + Math.random() * 6,
      vy: -1 - Math.random() * 1.8,
    }));

    const fishDefs = [
      ['CLOWNFISH', '小丑魚 尼莫', '#FF6D00', '#FFFFFF', 64, 38],
      ['BLUE_TANG', '藍倒吊 多莉', '#1565C0', '#FFD600', 70, 44],
      ['YELLOW_TANG', '黃金蝶魚', '#FFEA00', '#FFFFFF', 66, 46],
      ['BABY_SHARK', 'Baby Shark', '#FFD166', '#FFFFFF', 105, 48],
      ['TURTLE', '綠海龜 奔奔', '#2E7D32', '#FFD54F', 98, 60],
      ['ANGLERFISH', '深海安康魚', '#37474F', '#00E5FF', 94, 62],
      ['PLESIOSAURUS', '蛇頸龍 小寶', '#00897B', '#FFF176', 112, 48],
      ['DUNKLEOSTEUS', '鐵甲鄧氏魚', '#5D4037', '#FFB300', 124, 56],
    ];
    this.fishes = fishDefs.map(([species, name, primaryColor, secondaryColor, length, bodyHeight]) => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      return {
        species, name, primaryColor, secondaryColor, length, bodyHeight, size: length,
        x: 180 + Math.random() * 440,
        y: 140 + Math.random() * 280,
        vx: dir * (55 + Math.random() * 55),
        facing: dir,
        swimPhase: Math.random() * 6.28,
        spin: 0,
        isSpinning: false,
        chompTimer: 0,
      };
    });

    this.bindEvents();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.tankL = Math.max(24, w * 0.06);
    this.tankR = w - this.tankL;
    this.tankT = Math.max(70, h * 0.14);
    this.tankB = h - Math.max(66, h * 0.11);
    this.dropperX = Math.max(this.tankL + 40, Math.min(this.tankR - 40, this.dropperX || w / 2));
    for (const f of this.fishes) {
      f.x = Math.max(this.tankL + 50, Math.min(this.tankR - 50, f.x));
      f.y = Math.max(this.tankT + 50, Math.min(this.tankB - 60, f.y));
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => { if (this.running) this.resize(); });

    window.addEventListener('keydown', (e) => {
      if (!this.running) return;
      const step = Math.max(28, (this.tankR - this.tankL) * 0.04);
      if (e.key === 'ArrowLeft') this.dropperX = Math.max(this.tankL + 40, this.dropperX - step);
      else if (e.key === 'ArrowRight') this.dropperX = Math.min(this.tankR - 40, this.dropperX + step);
      else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) this.dropFood();
    });

    const moveAndFeed = (e, feed) => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      this.dropperX = Math.max(this.tankL + 40, Math.min(this.tankR - 40, x));
      if (feed) this.dropFood();
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.running) return;
      this.sound.unlock();
      moveAndFeed(e, true);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.running || e.buttons === 0) return;
      moveAndFeed(e, false);
    });
  }

  dropFood() {
    const now = performance.now();
    if (now - this.lastFeedTime < 650) return;
    this.lastFeedTime = now;
    for (let i = 0; i < 3; i++) {
      this.pellets.push({
        x: this.dropperX + (Math.random() - 0.5) * 26,
        y: this.tankT + 18,
        vy: 85 + Math.random() * 45,
        r: 6 + Math.random() * 3,
        eaten: false,
      });
    }
    this.sound.playBubble();
  }

  start() {
    this.running = true;
    this.resize();
    this.dropperX = this.w / 2;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(dt, now);
      this.render(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  update(dt, now) {
    for (const b of this.airBubbles) {
      b.y += b.vy * 60 * dt;
      if (b.y < this.tankT + 12) {
        b.y = this.tankB - 40;
        b.x = this.tankL + 24 + Math.random() * Math.max(80, this.tankR - this.tankL - 48);
      }
    }

    this.pellets = this.pellets.filter((p) => {
      p.y += p.vy * dt;
      return !p.eaten && p.y < this.tankB - 36;
    });

    this.hearts = this.hearts.filter((hb) => {
      hb.y += hb.vy * dt;
      hb.alpha = Math.max(0, 1 - (now - hb.spawn) / 1400);
      return hb.alpha > 0;
    });

    for (const f of this.fishes) {
      f.swimPhase += dt * 4;
      if (f.chompTimer > 0) f.chompTimer = Math.max(0, f.chompTimer - dt);
      if (f.isSpinning) {
        f.spin += 720 * dt;
        if (f.spin >= 360) { f.isSpinning = false; f.spin = 0; }
      }

      let nearest = null;
      let minDist = 9999;
      for (const p of this.pellets) {
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < minDist) { minDist = d; nearest = p; }
      }

      if (nearest) {
        const dx = nearest.x - f.x;
        const dy = nearest.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d > 18) {
          f.x += (dx / d) * 145 * dt;
          f.y += (dy / d) * 145 * dt;
          f.facing = dx > 0 ? 1 : -1;
        } else {
          nearest.eaten = true;
          f.isSpinning = true;
          f.spin = 0;
          f.chompTimer = 0.55;
          this.hearts.push({ x: f.x, y: f.y - 24, vy: -65, symbol: '❤️', size: 28, alpha: 1, spawn: now });
          this.hearts.push({ x: f.x + 22, y: f.y - 40, vy: -80, symbol: '+5 🪙', size: 22, alpha: 1, spawn: now });
          this.state.coins += 5;
          this.state.save();
          this.onCoinsUpdated(this.state.coins);
          this.sound.playCatch();
        }
      } else {
        const marginX = (f.species === 'ELASMOSAURUS' || f.species === 'PLESIOSAURUS' || f.species === 'DUNKLEOSTEUS')
          ? Math.max(92, f.length * 0.85) : 58;
        f.x += f.vx * dt;
        f.y += Math.sin(f.swimPhase) * 0.7;
        if (f.x < this.tankL + marginX) { f.x = this.tankL + marginX; f.vx = Math.abs(f.vx); f.facing = 1; }
        else if (f.x > this.tankR - marginX) { f.x = this.tankR - marginX; f.vx = -Math.abs(f.vx); f.facing = -1; }
        f.y = Math.max(this.tankT + 56, Math.min(this.tankB - 62, f.y));
      }
    }
  }

  render(now) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.fillStyle = '#1C2541';
    ctx.fillRect(this.tankL - 14, this.tankT - 14, this.tankR - this.tankL + 28, this.tankB - this.tankT + 28);

    const grad = ctx.createLinearGradient(0, this.tankT, 0, this.tankB);
    grad.addColorStop(0, 'rgba(0,180,216,0.92)');
    grad.addColorStop(0.45, 'rgba(0,119,182,0.92)');
    grad.addColorStop(1, 'rgba(2,62,138,0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.tankL, this.tankT, this.tankR - this.tankL, this.tankB - this.tankT);

    // Sand
    ctx.fillStyle = '#E0A96D';
    ctx.fillRect(this.tankL, this.tankB - 38, this.tankR - this.tankL, 38);

    // Bubbles
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    for (const b of this.airBubbles) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    // Pellets
    ctx.fillStyle = '#FFB74D';
    for (const p of this.pellets) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // Fishes (shared 1-second silhouette CreatureRenderer)
    for (const f of this.fishes) {
      renderCreature(ctx, f, { now, deepGlow: 0, drawStatus: false });
    }

    // Hearts
    ctx.textAlign = 'center';
    for (const hb of this.hearts) {
      ctx.globalAlpha = hb.alpha;
      ctx.fillStyle = hb.symbol.includes('🪙') ? '#FFD700' : '#FF4081';
      ctx.font = `bold ${hb.size}px sans-serif`;
      ctx.fillText(hb.symbol, hb.x, hb.y);
    }
    ctx.globalAlpha = 1;

    // Food dropper with tilt
    const elapsed = now - this.lastFeedTime;
    let tilt = 0, dipY = 0;
    if (elapsed >= 0 && elapsed < 420) {
      const t = elapsed / 420;
      tilt = Math.sin(t * Math.PI) * 0.65;
      dipY = Math.sin(t * Math.PI) * 10;
    }
    ctx.save();
    ctx.translate(this.dropperX, this.tankT - 18 + dipY);
    ctx.rotate(tilt);
    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(-20, -24, 40, 38);
    ctx.fillStyle = '#FF8F00';
    ctx.fillRect(-13, 14, 26, 10);
    ctx.fillStyle = '#E65100';
    ctx.beginPath(); ctx.arc(-7, -8, 4, 0, Math.PI * 2); ctx.arc(7, -11, 4, 0, Math.PI * 2); ctx.arc(1, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFD166';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🐠 快樂水族箱', this.w / 2, this.tankT * 0.56);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('👆 點擊或滑動魚缸投餵小蝦米餅乾 🍪', this.w / 2, this.h - 24);
    ctx.textAlign = 'left';

    ctx.restore();
  }
}
