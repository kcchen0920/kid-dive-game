export class DiveGame {
  constructor(canvas, state, sound, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.sound = sound;
    this.callbacks = callbacks;

    this.worldWidth = 2600;
    this.worldHeight = 4600;
    this.cameraX = 0;
    this.cameraY = 0;

    this.kidHeadImg = new Image();
    this.kidHeadLoaded = false;
    this.kidHeadImg.onload = () => { this.kidHeadLoaded = true; };
    this.kidHeadImg.src = './assets/kid_diver_head.png';

    this.running = false;
    this.rafId = null;
    this.lastFrameTime = performance.now();

    // Input state
    this.keys = new Set();
    this.inputX = 0;
    this.inputY = 0;
    this.joystickPointerId = null;
    this.joystickOriginX = 0;
    this.joystickOriginY = 0;
    this.joystickKnobX = 0;
    this.joystickKnobY = 0;
    this.isTouchJoystickActive = false;
    this.isTouchActionPressed = false;
    this.joystickRadius = 78;
    this.lastShopTapTime = 0;

    this.currentWeapon = 'HARPOON'; // 'HARPOON' | 'BUBBLE_GUN'
    this.mountedCreature = null;

    this.bindEvents();
    this.initGame();
  }

  initGame() {
    this.diverX = 900;
    this.diverY = 240;
    this.diverVx = 0;
    this.diverVy = 0;
    this.diverAngle = 0;
    this.facingScale = 1;
    this.targetFacingScale = 1;
    this.swimCycle = 0;
    this.breathTimer = 0;
    this.maxOxygen = this.state.getMaxOxygen();
    this.oxygen = this.maxOxygen;
    this.invincibleTimer = 0;
    this.screenShakeTimer = 0;
    this.hurtFlashTimer = 0;
    this.avatarCelebrateTimer = 0;
    this.mountedCreature = null;

    this.harpoonState = 'IDLE'; // IDLE | FIRING | REELING
    this.harpoonStartX = 0;
    this.harpoonStartY = 0;
    this.harpoonX = 0;
    this.harpoonY = 0;
    this.harpoonVx = 0;
    this.harpoonVy = 0;
    this.harpoonDist = 0;
    this.hookedFish = null;
    this.targetFish = null;

    this.activeBubbles = [];
    this.effects = [];
    this.burstParticles = [];
    this.touchRipples = [];

    // Friendly Dolphin Bobo
    this.bobo = { x: 200, y: 300, facing: 1, active: false, isRescuing: false, swimPhase: 0, callTimer: 0 };

    // Cave crystals
    this.caveCrystals = [];
    const crystalColors = ['#00E5FF', '#E040FB', '#00E676', '#FF4081'];
    for (let i = 0; i < 24; i++) {
      this.caveCrystals.push({
        x: (i % 2 === 0) ? (80 + Math.random() * 240) : (this.worldWidth - 320 + Math.random() * 240),
        y: 3450 + Math.random() * 1050,
        size: 32 + Math.random() * 38,
        color: crystalColors[i % crystalColors.length],
        pulseOffset: Math.random() * 6.28,
      });
    }

    // Treasure chests
    this.treasureChests = [
      { x: 1180, y: 1250, rewardCoins: 80, name: '珊瑚寶箱', opened: false, openProgress: 0 },
      { x: 750, y: 2150, rewardCoins: 150, name: '巨藻黃金箱', opened: false, openProgress: 0 },
      { x: 1450, y: 3320, rewardCoins: 240, name: '船長神秘寶箱', opened: false, openProgress: 0 },
      { x: 1850, y: 4280, rewardCoins: 320, name: '深淵皇冠寶藏', opened: false, openProgress: 0 },
    ];

    // Pearl clams
    this.pearlClams = [
      { x: 520, y: 820, rewardCoins: 90, openCycle: 0, hasPearl: true, respawnTimer: 0 },
      { x: 1620, y: 1780, rewardCoins: 90, openCycle: 2.1, hasPearl: true, respawnTimer: 0 },
      { x: 1050, y: 2900, rewardCoins: 90, openCycle: 4.2, hasPearl: true, respawnTimer: 0 },
      { x: 640, y: 3920, rewardCoins: 90, openCycle: 1.1, hasPearl: true, respawnTimer: 0 },
    ];

    // Kelp
    this.kelpForest = [];
    for (let i = 0; i < 22; i++) {
      this.kelpForest.push({
        baseX: 120 + Math.random() * (this.worldWidth - 240),
        baseY: 1600 + Math.random() * 900,
        height: 220 + Math.random() * 300,
        segments: 7,
        phaseOffset: Math.random() * 6.28,
        isBackground: i % 2 === 0,
      });
    }

    // Marine snow & bubbles
    this.planktonList = Array.from({ length: 85 }, () => ({
      x: Math.random() * this.worldWidth,
      y: Math.random() * this.worldHeight,
      r: 1.5 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
    }));

    this.bubbles = Array.from({ length: 48 }, (_, i) => ({
      x: Math.random() * this.worldWidth,
      y: 250 + Math.random() * (this.worldHeight - 350),
      r: i % 5 === 0 ? 15 + Math.random() * 5 : 4 + Math.random() * 7,
      speed: 1.2 + Math.random() * 1.8,
      isOxygenPickup: i % 5 === 0,
      isDaveBreath: false,
    }));

    // Fishes
    this.fishes = [];
    this.spawnSpecies('CLOWNFISH', '小丑魚 尼莫', 25, 0.8, 12, 240, 1050, '#FF6D00', '#FFFFFF', 54, 30, 1.3);
    this.spawnSpecies('BLUE_TANG', '藍倒吊 多莉', 35, 1.2, 10, 280, 1150, '#1565C0', '#FFD600', 62, 36, 1.4);
    this.spawnSpecies('YELLOW_TANG', '黃金蝶魚', 45, 1.5, 8, 350, 1250, '#FFEA00', '#FFFFFF', 58, 42, 1.2);
    this.spawnSpecies('TURTLE', '綠海龜 奔奔', 0, 45, 2, 380, 1500, '#2E7D32', '#FFD54F', 120, 74, 0.85);
    this.spawnSpecies('BABY_SHARK', 'Baby Shark 小鯊魚', 110, 18.5, 5, 950, 2200, '#FFD166', '#FFFFFF', 118, 52, 1.4);
    this.spawnSpecies('REEF_SHARK', '黑鰭礁鯊', 180, 48, 4, 1300, 2600, '#455A64', '#ECEFF1', 165, 62, 1.5);
    this.spawnSpecies('GIANT_TUNA', '藍鰭巨鮪', 260, 115, 4, 2100, 3300, '#0D47A1', '#81D4FA', 175, 74, 1.9);
    this.spawnSpecies('BLUE_WHALE', '深海巨型藍鯨', 0, 2500, 1, 2200, 3400, '#0277BD', '#B3E5FC', 320, 125, 0.65);
    this.spawnSpecies('GREAT_SHARK', '深海大白鯊', 480, 380, 2, 2300, 3500, '#37474F', '#FFFFFF', 235, 92, 1.45);
    this.spawnSpecies('ANGLERFISH', '深海發光安康魚', 360, 28, 5, 3450, 4450, '#3E2723', '#00E5FF', 125, 84, 0.9);
    this.spawnSpecies('NEON_JELLYFISH', '七彩霓虹水母', 140, 3.2, 8, 3400, 4400, '#E040FB', '#00E5FF', 64, 64, 0.7);
    this.spawnSpecies('JELLYFISH', '深海水母', 65, 2.5, 6, 1500, 3200, '#CE93D8', '#7B1FA2', 58, 58, 0.65);

    this.resize();
    this.cameraX = Math.max(0, this.diverX - this.viewW / 2);
    this.cameraY = 0;
  }

  spawnSpecies(species, name, value, weightKg, count, minY, maxY, c1, c2, len, h, spd) {
    for (let i = 0; i < count; i++) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.fishes.push({
        species, name, value, weightKg,
        x: 150 + Math.random() * (this.worldWidth - 300),
        y: minY + Math.random() * (maxY - minY),
        vx: dir * (1.1 + Math.random() * 1.4) * spd,
        facing: dir,
        length: len,
        bodyHeight: h,
        primaryColor: c1,
        secondaryColor: c2,
        swimPhase: Math.random() * 6.28,
        swimSpeedMultiplier: 4 + Math.random() * 3,
        isAttacking: false,
        isSleeping: false,
        sleepTimer: 0,
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));
    if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
    }
    this.dpr = dpr;
    // Virtual logical scale so portrait phones & wide tablets both see comfortable field of view
    const minDim = Math.min(w, h);
    this.hudScale = minDim < 520 ? (minDim / 640) : Math.min(1.0, w / 1280);
    this.viewW = w;
    this.viewH = h;
  }

  start() {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.resize();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = now;
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

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (!this.running) return;
      this.sound.unlock();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S'].includes(e.key)) {
        this.keys.add(e.key);
        e.preventDefault();
      } else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        this.onActionPressed();
        e.preventDefault();
      } else if ((e.key === 'm' || e.key === 'M' || e.key === 'Shift') && !e.repeat) {
        this.toggleWeapon();
      } else if (e.key === 'Escape') {
        this.callbacks.onOpenShop();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    const getPos = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.running) return;
      this.sound.unlock();
      const { x: tx, y: ty } = getPos(e);
      const w = this.viewW;
      const h = this.viewH;
      this.touchRipples.push({ x: tx, y: ty, life: 0.42, maxLife: 0.42 });

      // Top-center weapon pill
      const pillW = Math.min(360, w * 0.42);
      if (tx >= w / 2 - pillW / 2 && tx <= w / 2 + pillW / 2 && ty >= 10 && ty <= 86) {
        this.toggleWeapon();
        return;
      }

      // Top-right shop button (double tap)
      if (tx >= w - 155 && tx <= w - 16 && ty >= 86 && ty <= 136) {
        const now = performance.now();
        if (now - this.lastShopTapTime <= 1200) {
          this.callbacks.onOpenShop();
        } else {
          this.lastShopTapTime = now;
          this.sound.playBubble();
          this.addFX(this.diverX, this.diverY - 65, '🏠 再點一次回商店！', '#80D8FF', 26);
        }
        return;
      }

      // Bottom-right switch button
      const s = this.hudScale || 1;
      const actR = 54 * Math.max(0.78, s);
      const actCx = w - 26 - actR;
      const actCy = h - 28 - actR;
      const swR = 36 * Math.max(0.78, s);
      const swCx = actCx - actR - 24 - swR;
      const swCy = h - 28 - swR;

      if (Math.hypot(tx - swCx, ty - swCy) <= swR + 14) {
        this.toggleWeapon();
        return;
      }

      if (Math.hypot(tx - actCx, ty - actCy) <= actR + 18 || tx >= w * 0.55) {
        this.isTouchActionPressed = true;
        this.onActionPressed();
        return;
      }

      // Left virtual joystick
      if (this.joystickPointerId === null) {
        this.joystickPointerId = e.pointerId;
        this.isTouchJoystickActive = true;
        this.joystickOriginX = tx;
        this.joystickOriginY = ty;
        this.joystickKnobX = tx;
        this.joystickKnobY = ty;
        this.canvas.setPointerCapture?.(e.pointerId);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joystickPointerId) return;
      const { x: mx, y: my } = getPos(e);
      let dx = mx - this.joystickOriginX;
      let dy = my - this.joystickOriginY;
      const dist = Math.hypot(dx, dy);
      if (dist > this.joystickRadius) {
        dx = (dx / dist) * this.joystickRadius;
        dy = (dy / dist) * this.joystickRadius;
      }
      this.joystickKnobX = this.joystickOriginX + dx;
      this.joystickKnobY = this.joystickOriginY + dy;
      this.inputX = dx / this.joystickRadius;
      this.inputY = dy / this.joystickRadius;
      if (Math.abs(this.inputX) > 0.12) {
        this.targetFacingScale = this.inputX > 0 ? 1 : -1;
      }
    });

    const endPointer = (e) => {
      this.isTouchActionPressed = false;
      if (e.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.isTouchJoystickActive = false;
        this.inputX = 0;
        this.inputY = 0;
      }
    };
    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
  }

  toggleWeapon() {
    if (this.currentWeapon === 'HARPOON') {
      this.currentWeapon = 'BUBBLE_GUN';
      this.sound.playBubbleGun();
      this.addFX(this.diverX, this.diverY - 60, '🫧 氣泡催眠槍！', '#00E5FF', 30);
    } else {
      this.currentWeapon = 'HARPOON';
      this.sound.playHarpoon();
      this.addFX(this.diverX, this.diverY - 60, '🎯 強力捕魚叉！', '#FFD700', 30);
    }
  }

  onActionPressed() {
    if (this.mountedCreature) {
      this.mountedCreature = null;
      this.sound.playBubble();
      this.addFX(this.diverX, this.diverY - 50, '🌟 平安下騎！', '#00E676', 30);
      return;
    }

    if (this.bobo.active && !this.bobo.isRescuing && this.oxygen / this.maxOxygen < 0.25) {
      this.triggerDolphinRescue();
      return;
    }

    for (const f of this.fishes) {
      if (f.species === 'TURTLE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 130) {
        this.mountedCreature = f;
        this.sound.playUpgrade();
        this.addFX(this.diverX, this.diverY - 55, '🐢 騎乘海龜奔奔！', '#00E676', 32);
        return;
      }
      if (f.species === 'BLUE_WHALE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 180) {
        this.mountedCreature = f;
        this.sound.playDolphin();
        this.addFX(this.diverX, this.diverY - 55, '🐋 騎乘深海藍鯨！', '#4FC3F7', 34);
        return;
      }
    }

    for (const c of this.treasureChests) {
      if (!c.opened && Math.hypot(this.diverX - c.x, this.diverY - c.y) < 140) {
        c.opened = true;
        this.state.coins += c.rewardCoins;
        this.state.save();
        this.sound.playChest();
        this.spawnBurst(c.x, c.y - 20, '#FFD700', 18);
        this.avatarCelebrateTimer = 0.55;
        this.addFX(c.x, c.y - 45, `🎁 +${c.rewardCoins} 貝殼金幣！`, '#FFD700', 34);
        this.callbacks.onCoinsUpdated(this.state.coins);
        return;
      }
    }

    for (const pc of this.pearlClams) {
      if (pc.hasPearl && Math.sin(pc.openCycle) > 0.35 && Math.hypot(this.diverX - pc.x, this.diverY - pc.y) < 120) {
        pc.hasPearl = false;
        pc.respawnTimer = 22;
        this.state.coins += pc.rewardCoins;
        this.state.pearlCount++;
        this.state.save();
        this.sound.playPearl();
        this.spawnBurst(pc.x, pc.y - 15, '#E040FB', 16);
        this.avatarCelebrateTimer = 0.55;
        this.addFX(pc.x, pc.y - 50, `🦪 +${pc.rewardCoins} 大珍珠！`, '#E040FB', 32);
        this.callbacks.onCoinsUpdated(this.state.coins);
        return;
      }
    }

    for (const f of this.fishes) {
      if (f.isSleeping && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 120) {
        this.state.addCaughtFish(f.name, f.value + 35);
        this.sound.playUpgrade();
        this.spawnBurst(f.x, f.y, '#FF80AB', 16);
        this.avatarCelebrateTimer = 0.55;
        this.addFX(this.diverX, this.diverY - 55, `💖 愛心活捉 +${f.value + 35}！`, '#00E676', 30);
        this.callbacks.onCoinsUpdated(this.state.coins);
        f.isSleeping = false;
        f.sleepTimer = 0;
        f.x = Math.random() < 0.5 ? 80 : this.worldWidth - 80;
        f.y = 350 + Math.random() * (this.worldHeight - 700);
        return;
      }
    }

    if (this.currentWeapon === 'HARPOON') {
      if (this.harpoonState === 'IDLE') this.fireHarpoon();
    } else {
      this.fireBubbleGun();
    }
  }

  fireHarpoon() {
    this.harpoonState = 'FIRING';
    this.harpoonStartX = this.diverX + (this.targetFacingScale > 0 ? 45 : -45);
    this.harpoonStartY = this.diverY + 8;
    this.harpoonX = this.harpoonStartX;
    this.harpoonY = this.harpoonStartY;
    this.harpoonDist = 0;
    this.hookedFish = null;

    let dx = this.targetFacingScale;
    let dy = 0;
    if (this.targetFish) {
      const tx = this.targetFish.x - this.harpoonStartX;
      const ty = this.targetFish.y - this.harpoonStartY;
      const d = Math.hypot(tx, ty);
      if (d > 1) { dx = tx / d; dy = ty / d; }
    }
    this.harpoonVx = dx * 28;
    this.harpoonVy = dy * 28;
    this.sound.playHarpoon();
  }

  fireBubbleGun() {
    const sx = this.diverX + (this.targetFacingScale > 0 ? 45 : -45);
    const sy = this.diverY + 8;
    let dx = this.targetFacingScale;
    let dy = 0;
    if (this.targetFish) {
      const tx = this.targetFish.x - sx;
      const ty = this.targetFish.y - sy;
      const d = Math.hypot(tx, ty);
      if (d > 1) { dx = tx / d; dy = ty / d; }
    }
    this.activeBubbles.push({ x: sx, y: sy, vx: dx * 16, vy: dy * 16, radius: 20, lifeTime: 2.0 });
    this.sound.playBubbleGun();
  }

  triggerDolphinRescue() {
    if (this.bobo.isRescuing) return;
    this.bobo.active = true;
    this.bobo.isRescuing = true;
    this.bobo.x = this.diverX - 300;
    this.bobo.y = this.diverY + 120;
    this.sound.playDolphin();
    this.addFX(this.diverX, this.diverY - 60, '🐬 海豚波波來救援囉！', '#FF80AB', 32);
  }

  spawnBurst(x, y, baseColor, count) {
    const palette = [baseColor, '#FFD700', '#00E5FF', '#FF80AB', '#69F0AE'];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = 90 + Math.random() * 190;
      const maxLife = 0.55 + Math.random() * 0.45;
      this.burstParticles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 50,
        size: 6 + Math.random() * 7,
        life: maxLife,
        maxLife,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
  }

  addFX(x, y, text, color, size) {
    this.effects.push({ x, y, vy: -45, text, color, size, alpha: 1, age: 0 });
  }

  update(dt, now) {
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
    this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);
    this.avatarCelebrateTimer = Math.max(0, this.avatarCelebrateTimer - dt);

    // Keyboard directional override when joystick inactive
    let kx = this.inputX;
    let ky = this.inputY;
    if (!this.isTouchJoystickActive) {
      kx = (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D') ? 1 : 0)
         - (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A') ? 1 : 0);
      ky = (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S') ? 1 : 0)
         - (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W') ? 1 : 0);
      if (kx !== 0) this.targetFacingScale = kx > 0 ? 1 : -1;
    }

    this.facingScale += (this.targetFacingScale - this.facingScale) * Math.min(1, dt * 12);

    if (this.mountedCreature) {
      this.diverX = this.mountedCreature.x;
      this.diverY = this.mountedCreature.y - (this.mountedCreature.species === 'BLUE_WHALE' ? 50 : 24);
      this.diverAngle = 0;
      this.facingScale = this.mountedCreature.facing;
    } else if (this.bobo.isRescuing) {
      const dx = this.diverX - this.bobo.x;
      const dy = this.diverY - this.bobo.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 35) {
        this.bobo.x += (dx / dist) * 550 * dt;
        this.bobo.y += (dy / dist) * 550 * dt;
      } else {
        this.bobo.y -= 700 * dt;
        this.diverX = this.bobo.x;
        this.diverY = this.bobo.y - 30;
        this.diverAngle = -0.3;
        if (this.diverY <= 150) {
          this.bobo.isRescuing = false;
          this.bobo.active = false;
          this.state.coins += 50;
          this.state.save();
          this.sound.playUpgrade();
          this.callbacks.onCoinsUpdated(this.state.coins);
          this.callbacks.onOpenShop();
          return;
        }
      }
    } else {
      const maxSpd = this.state.getSwimSpeed();
      const moving = kx !== 0 || ky !== 0;
      const accel = moving ? 8 : 5;
      this.diverVx += (kx * maxSpd - this.diverVx) * Math.min(1, dt * accel);
      this.diverVy += (ky * maxSpd - this.diverVy) * Math.min(1, dt * accel);
      this.diverX += this.diverVx * dt;
      this.diverY += this.diverVy * dt;
      if (moving) {
        this.swimCycle += dt * 8.5;
        const targetAng = Math.atan2(this.diverVy, Math.abs(this.diverVx));
        this.diverAngle += (targetAng - this.diverAngle) * 0.18;
      } else {
        this.diverAngle *= 0.85;
        this.swimCycle += dt * 1.5;
      }

      this.oxygen -= dt * 0.5;
      if (this.oxygen <= 0) {
        this.oxygen = 0;
        this.triggerDolphinRescue();
      }
    }

    this.diverX = Math.max(80, Math.min(this.worldWidth - 80, this.diverX));
    this.diverY = Math.max(140, Math.min(this.worldHeight - 110, this.diverY));

    // Camera follow
    const targetCamX = Math.max(0, Math.min(this.worldWidth - this.viewW, this.diverX - this.viewW / 2));
    const targetCamY = Math.max(0, Math.min(this.worldHeight - this.viewH, this.diverY - this.viewH / 2));
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 5.5);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 5.5);

    // Bobo standby
    if (this.oxygen / this.maxOxygen < 0.25 && !this.bobo.isRescuing) {
      this.bobo.active = true;
      this.bobo.swimPhase += dt * 6;
      const bdx = this.diverX + 100 - this.bobo.x;
      const bdy = this.diverY + 50 - this.bobo.y;
      const bd = Math.hypot(bdx, bdy);
      if (bd > 60) {
        this.bobo.x += (bdx / bd) * 220 * dt;
        this.bobo.y += (bdy / bd) * 220 * dt;
        this.bobo.facing = bdx > 0 ? 1 : -1;
      }
    }

    // Pearls & chests
    for (const pc of this.pearlClams) {
      pc.openCycle += dt * 1.5;
      if (!pc.hasPearl) {
        pc.respawnTimer -= dt;
        if (pc.respawnTimer <= 0) pc.hasPearl = true;
      }
    }
    for (const tc of this.treasureChests) {
      if (tc.opened && tc.openProgress < 1) tc.openProgress = Math.min(1, tc.openProgress + dt * 2.5);
    }

    // Plankton & bubbles
    for (const ms of this.planktonList) {
      ms.x = (ms.x + ms.vx + this.worldWidth) % this.worldWidth;
      ms.y = (ms.y + ms.vy + this.worldHeight) % this.worldHeight;
    }
    for (const b of this.bubbles) {
      b.y -= b.speed * 60 * dt;
      if (b.y < 140) {
        b.y = this.worldHeight - 50;
        b.x = Math.random() * this.worldWidth;
      }
      if (b.isOxygenPickup) {
        const dx = this.diverX - b.x;
        const dy = this.diverY - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < 140) {
          b.x += (dx / d) * 190 * dt;
          b.y += (dy / d) * 190 * dt;
        }
        if (d < b.r + 52) {
          this.oxygen = Math.min(this.maxOxygen, this.oxygen + 25);
          this.sound.playBubble();
          this.spawnBurst(b.x, b.y, '#00E5FF', 10);
          this.addFX(b.x, b.y, '🫧 +25 氧氣！', '#00FFFF', 26);
          b.y = this.worldHeight - 50;
        }
      }
    }

    // Active bubble bullets
    this.activeBubbles = this.activeBubbles.filter((bb) => {
      bb.lifeTime -= dt;
      bb.x += bb.vx;
      bb.y += bb.vy;
      for (const f of this.fishes) {
        if (!f.isSleeping && Math.hypot(bb.x - f.x, bb.y - f.y) < f.bodyHeight * 0.7 + bb.radius) {
          f.isSleeping = true;
          f.sleepTimer = 8;
          f.isAttacking = false;
          this.sound.playBubble();
          this.addFX(f.x, f.y - 45, '💤 催眠成功！按互動抱抱抓！', '#00E5FF', 28);
          return false;
        }
      }
      return bb.lifeTime > 0;
    });

    // Fish AI & Auto-aim
    this.targetFish = null;
    let nearestDist = this.state.getHarpoonRange();
    for (const f of this.fishes) {
      if (f.isSleeping) {
        f.sleepTimer -= dt;
        f.y -= 8 * dt;
        if (f.sleepTimer <= 0) f.isSleeping = false;
        continue;
      }
      const isShark = f.species === 'REEF_SHARK' || f.species === 'GREAT_SHARK';
      const sdx = this.diverX - f.x;
      const sdy = this.diverY - f.y;
      const sDist = Math.hypot(sdx, sdy);
      if (isShark && sDist < 350 && !this.bobo.isRescuing && !this.mountedCreature) {
        f.isAttacking = true;
        f.facing = sdx > 0 ? 1 : -1;
        const spd = f.species === 'GREAT_SHARK' ? 145 : 110;
        f.x += (sdx / sDist) * spd * dt;
        f.y += (sdy / sDist) * spd * dt;
        f.swimPhase += dt * f.swimSpeedMultiplier * 1.8;
        if (sDist < f.bodyHeight * 0.65 + 32 && this.invincibleTimer <= 0) {
          const loss = f.species === 'GREAT_SHARK' ? 22 : 14;
          this.oxygen = Math.max(0, this.oxygen - loss);
          this.invincibleTimer = 1.6;
          this.screenShakeTimer = 0.35;
          this.hurtFlashTimer = 0.35;
          this.diverVx += (sdx / sDist) * 220;
          this.diverVy += (sdy / sDist) * 220;
          this.sound.playHurt();
          this.addFX(this.diverX, this.diverY - 50, '🫧 哎呀！被鯊魚頂了一下！', '#FFB74D', 30);
          if (this.oxygen <= 0) this.triggerDolphinRescue();
        }
      } else {
        f.isAttacking = false;
        f.swimPhase += dt * f.swimSpeedMultiplier;
        f.x += f.vx * 60 * dt;
        f.y += Math.sin(f.swimPhase) * 1.4;
        if (f.x < 70) { f.x = 70; f.vx = Math.abs(f.vx); f.facing = 1; }
        else if (f.x > this.worldWidth - 70) { f.x = this.worldWidth - 70; f.vx = -Math.abs(f.vx); f.facing = -1; }
      }

      if (f.value > 0 && sDist < nearestDist) {
        nearestDist = sDist;
        this.targetFish = f;
      }
    }

    // Harpoon
    if (this.harpoonState === 'FIRING') {
      this.harpoonX += this.harpoonVx;
      this.harpoonY += this.harpoonVy;
      this.harpoonDist = Math.hypot(this.harpoonX - this.harpoonStartX, this.harpoonY - this.harpoonStartY);
      for (const f of this.fishes) {
        if (Math.hypot(this.harpoonX - f.x, this.harpoonY - f.y) < f.bodyHeight * 0.65) {
          this.hookedFish = f;
          this.harpoonState = 'REELING';
          break;
        }
      }
      if (this.harpoonState === 'FIRING' && this.harpoonDist >= this.state.getHarpoonRange()) {
        this.harpoonState = 'REELING';
      }
    } else if (this.harpoonState === 'REELING') {
      const hx = this.diverX + (this.targetFacingScale > 0 ? 45 : -45);
      const hy = this.diverY + 8;
      const dx = hx - this.harpoonX;
      const dy = hy - this.harpoonY;
      const d = Math.hypot(dx, dy);
      if (d < 40) {
        if (this.hookedFish) {
          this.state.addCaughtFish(this.hookedFish.name, this.hookedFish.value);
          this.sound.playCatch();
          this.spawnBurst(this.diverX, this.diverY, '#FFD700', 14);
          this.avatarCelebrateTimer = 0.55;
          this.addFX(this.diverX, this.diverY - 65, `⭐ 捕獲 ${this.hookedFish.name}！+${this.hookedFish.value} 🪙`, '#FFD700', 30);
          this.callbacks.onCoinsUpdated(this.state.coins);
          this.hookedFish.x = Math.random() < 0.5 ? 80 : this.worldWidth - 80;
          this.hookedFish.y = 350 + Math.random() * (this.worldHeight - 700);
          this.hookedFish = null;
        }
        this.harpoonState = 'IDLE';
      } else {
        this.harpoonX += (dx / d) * 26;
        this.harpoonY += (dy / d) * 26;
        if (this.hookedFish) {
          this.hookedFish.x = this.harpoonX;
          this.hookedFish.y = this.harpoonY;
        }
      }
    }

    // Particles & ripples
    this.effects = this.effects.filter((fx) => {
      fx.age += dt;
      fx.y += fx.vy * dt;
      fx.alpha = Math.max(0, 1 - fx.age / 1.4);
      return fx.age < 1.4;
    });
    this.burstParticles = this.burstParticles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.vx *= 0.96;
      return p.life > 0;
    });
    this.touchRipples = this.touchRipples.filter((tr) => {
      tr.life -= dt;
      return tr.life > 0;
    });
  }

  render(now) {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Water gradient
    const bgGrad = ctx.createLinearGradient(0, -this.cameraY, 0, this.worldHeight - this.cameraY);
    bgGrad.addColorStop(0.0, '#4DC9E6');
    bgGrad.addColorStop(0.18, '#0077BE');
    bgGrad.addColorStop(0.45, '#003865');
    bgGrad.addColorStop(0.70, '#001529');
    bgGrad.addColorStop(0.88, '#000814');
    bgGrad.addColorStop(1.0, '#000308');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Tropical sky above y=140
    if (this.cameraY < 160) {
      const skyGrad = ctx.createLinearGradient(0, -this.cameraY, 0, 145 - this.cameraY);
      skyGrad.addColorStop(0, '#64B5F6');
      skyGrad.addColorStop(0.6, '#B3E5FC');
      skyGrad.addColorStop(1, '#E0F7FA');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, Math.max(0, 145 - this.cameraY));
    }

    ctx.save();
    const shakeX = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * 14 : 0;
    const shakeY = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * 14 : 0;
    ctx.translate(-this.cameraX + shakeX, -this.cameraY + shakeY);

    // Canyon walls
    ctx.fillStyle = 'rgba(0, 26, 51, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 140); ctx.lineTo(440, 760); ctx.lineTo(290, 1850); ctx.lineTo(520, 3150); ctx.lineTo(360, this.worldHeight); ctx.lineTo(0, this.worldHeight);
    ctx.closePath(); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.worldWidth, 140); ctx.lineTo(this.worldWidth - 420, 820); ctx.lineTo(this.worldWidth - 260, 1950); ctx.lineTo(this.worldWidth - 500, 3100); ctx.lineTo(this.worldWidth - 340, this.worldHeight); ctx.lineTo(this.worldWidth, this.worldHeight);
    ctx.closePath(); ctx.fill();

    // Volumetric sunbeams
    const sway = Math.sin(now / 1100) * 55;
    const rayGrad = ctx.createLinearGradient(0, 140, 0, 980);
    rayGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
    rayGrad.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rayGrad;
    for (let rx = 180; rx < this.worldWidth; rx += 460) {
      ctx.beginPath();
      ctx.moveTo(rx + sway * 0.4, 140);
      ctx.lineTo(rx + 200 + sway, 980);
      ctx.lineTo(rx + 85 + sway, 980);
      ctx.lineTo(rx - 75 + sway * 0.4, 140);
      ctx.closePath();
      ctx.fill();
    }

    // Surface waves + Cobra Boat
    if (this.cameraY < 260) {
      ctx.strokeStyle = 'rgba(224,247,250,0.85)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let wx = 0; wx <= this.worldWidth; wx += 40) {
        const wy = 140 + Math.sin(wx * 0.025 + now / 320) * 7;
        if (wx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      const bob = Math.sin(now / 360) * 5;
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, 740, 34 + bob, 280, 54, 14); ctx.fill();
      ctx.fillStyle = '#29B6F6';
      this.roundRect(ctx, 765, 46 + bob, 95, 30, 8); ctx.fill();
      this.roundRect(ctx, 880, 46 + bob, 115, 30, 8); ctx.fill();
      ctx.fillStyle = '#FF8C00';
      this.roundRect(ctx, 600, 76 + bob, 600, 66, 22); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('⛵ 柯布拉救援基地', 760, 116 + bob);
    }

    // Cave crystals
    for (const gc of this.caveCrystals) {
      const p = 0.75 + 0.25 * Math.sin(now / 300 + gc.pulseOffset);
      ctx.fillStyle = gc.color + '44';
      ctx.beginPath(); ctx.arc(gc.x, gc.y, gc.size * p * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = gc.color;
      ctx.beginPath(); ctx.arc(gc.x, gc.y, gc.size * 0.45 * p, 0, Math.PI * 2); ctx.fill();
    }

    // Kelp forest
    for (const kp of this.kelpForest) {
      const wave = Math.sin(now / 850 + kp.phaseOffset) * 32;
      ctx.strokeStyle = kp.isBackground ? 'rgba(0,77,64,0.55)' : 'rgba(0,121,107,0.82)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(kp.baseX, kp.baseY);
      ctx.quadraticCurveTo(kp.baseX + wave * 0.5, kp.baseY - kp.height * 0.5, kp.baseX + wave, kp.baseY - kp.height);
      ctx.stroke();
    }

    // Treasure chests
    for (const tc of this.treasureChests) {
      ctx.fillStyle = tc.opened ? '#8D6E63' : '#6D4C41';
      this.roundRect(ctx, tc.x - 42, tc.y - 26, 84, 52, 10); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4;
      this.roundRect(ctx, tc.x - 42, tc.y - 26, 84, 52, 10); ctx.stroke();
      ctx.font = '30px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tc.opened ? '✨' : '🎁', tc.x, tc.y + 10);
      ctx.textAlign = 'left';
    }

    // Pearl clams
    for (const pc of this.pearlClams) {
      const open = Math.sin(pc.openCycle) > 0.35;
      ctx.fillStyle = '#8E24AA';
      ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 44, open ? 26 : 18, 0, 0, Math.PI * 2); ctx.fill();
      if (pc.hasPearl && open) {
        ctx.fillStyle = '#FFF8E1';
        ctx.beginPath(); ctx.arc(pc.x, pc.y - 4, 14, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Ambient bubbles
    for (const b of this.bubbles) {
      if (b.isOxygenPickup) {
        ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(0,229,255,0.35)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Fishes
    for (const f of this.fishes) {
      this.renderFish(ctx, f);
    }

    // Bubble bullets
    for (const bb of this.activeBubbles) {
      ctx.fillStyle = 'rgba(0,229,255,0.5)';
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Bobo dolphin
    if (this.bobo.active || this.bobo.isRescuing) {
      ctx.font = '64px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🐬', this.bobo.x, this.bobo.y + 20);
      ctx.textAlign = 'left';
    }

    // Aim reticle
    if (this.targetFish && this.harpoonState === 'IDLE') {
      ctx.strokeStyle = this.currentWeapon === 'HARPOON' ? 'rgba(255,215,0,0.85)' : 'rgba(0,229,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.targetFish.x, this.targetFish.y, this.targetFish.bodyHeight * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Harpoon line
    if (this.harpoonState !== 'IDLE') {
      ctx.strokeStyle = '#FFDF00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(this.harpoonStartX, this.harpoonStartY); ctx.lineTo(this.harpoonX, this.harpoonY); ctx.stroke();
      ctx.fillStyle = '#E0E0E0';
      ctx.beginPath(); ctx.arc(this.harpoonX, this.harpoonY, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Kid Diver
    this.renderKidDiver(ctx, now);

    // Nearby [OK] prompt
    this.renderNearbyPrompt(ctx, now);

    // Burst particles & floating FX
    for (const p of this.burstParticles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * ctx.globalAlpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const fx of this.effects) {
      ctx.globalAlpha = fx.alpha;
      ctx.fillStyle = fx.color;
      ctx.font = `bold ${fx.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fx.text, fx.x, fx.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ctx.restore();

    // 160m+ Deep Abyssal Headlamp Vignette
    const depthMeters = Math.max(0, (this.diverY - 140) / 10);
    if (depthMeters > 160) {
      const darkFactor = Math.min(1, (depthMeters - 160) / 180);
      const fx = (this.diverX - this.cameraX) + this.facingScale * 95;
      const fy = this.diverY - this.cameraY;
      const beamR = this.state.getLightRadius() * 1.45;
      const grad = ctx.createRadialGradient(fx, fy, 10, fx, fy, beamR);
      grad.addColorStop(0, 'rgba(0,4,14,0)');
      grad.addColorStop(0.55, `rgba(0,6,18,${(0.37 * darkFactor).toFixed(2)})`);
      grad.addColorStop(1, `rgba(0,4,14,${(0.72 * darkFactor).toFixed(2)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    this.renderHUD(ctx, w, h, now, depthMeters);
    ctx.restore();
  }

  renderFish(ctx, f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing, 1);

    const hl = f.length / 2;
    const hh = f.bodyHeight * 0.46;
    const tail = Math.sin(f.swimPhase) * 8;

    ctx.fillStyle = f.primaryColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, hl * 0.85, hh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = f.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.65, 0);
    ctx.lineTo(-hl * 1.15 + tail, -hh * 0.75);
    ctx.lineTo(-hl * 1.15 + tail, hh * 0.75);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(hl * 0.52, -hh * 0.2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(hl * 0.54, -hh * 0.2, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    if (f.isSleeping) {
      ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(0,229,255,0.22)';
      ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(f.length, f.bodyHeight) * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('💤', f.x, f.y - f.bodyHeight * 0.7);
      ctx.textAlign = 'left';
    }
  }

  renderKidDiver(ctx, now) {
    ctx.save();
    ctx.translate(this.diverX, this.diverY);
    ctx.scale(this.facingScale, 1);
    ctx.rotate(this.diverAngle);

    // Headlamp cone
    const lr = this.state.getLightRadius();
    const coneGrad = ctx.createRadialGradient(45, 0, 5, 45, 0, lr);
    coneGrad.addColorStop(0, 'rgba(255,253,231,0.45)');
    coneGrad.addColorStop(0.55, 'rgba(255,224,130,0.14)');
    coneGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(42, -8); ctx.lineTo(lr, -lr * 0.35); ctx.lineTo(lr, lr * 0.35); ctx.closePath();
    ctx.fill();

    // Fins
    const k1 = Math.sin(this.swimCycle) * 14;
    const k2 = Math.sin(this.swimCycle + Math.PI) * 14;
    ctx.fillStyle = '#FF6D00';
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-68, -18 + k1); ctx.lineTo(-52, -3 + k1 * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8500';
    ctx.beginPath(); ctx.moveTo(-30, 8); ctx.lineTo(-68, 18 + k2); ctx.lineTo(-52, 3 + k2 * 0.5); ctx.closePath(); ctx.fill();

    // Tanks & wetsuit
    ctx.fillStyle = '#FFD166';
    this.roundRect(ctx, -36, -22, 18, 44, 7); ctx.fill();
    ctx.fillStyle = '#0077BE';
    this.roundRect(ctx, -24, -24, 50, 48, 16); ctx.fill();

    // Big Q-version Kid Portrait inside Scuba Helmet
    ctx.fillStyle = 'rgba(0,229,255,0.22)';
    ctx.beginPath(); ctx.arc(32, -20, 58, 0, Math.PI * 2); ctx.fill();
    if (this.kidHeadLoaded) {
      ctx.drawImage(this.kidHeadImg, -22, -74, 108, 108);
    }
    ctx.strokeStyle = this.mountedCreature ? '#FFD700' : 'rgba(128,222,234,0.88)';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(32, -20, 58, 0, Math.PI * 2); ctx.stroke();

    // 3D Glass Highlight Arc
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(32, -20, 48, Math.PI * 1.14, Math.PI * 1.46); ctx.stroke();

    // Weapon
    ctx.fillStyle = this.currentWeapon === 'HARPOON' ? '#455A64' : '#00E5FF';
    this.roundRect(ctx, 18, 5, 36, 11, 4); ctx.fill();

    ctx.restore();

    if (this.invincibleTimer > 0) {
      const pulse = 1 + 0.08 * Math.sin(now / 70);
      ctx.fillStyle = 'rgba(0,229,255,0.22)';
      ctx.strokeStyle = 'rgba(128,222,234,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.diverX, this.diverY - 8, 80 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  renderNearbyPrompt(ctx, now) {
    if (this.mountedCreature || this.bobo.isRescuing) return;
    let prompt = null, px = 0, py = 0, bg = '#00BFA5';

    if (this.bobo.active && this.oxygen / this.maxOxygen < 0.25) {
      prompt = '🐬 點一下救救我!'; px = this.bobo.x; py = this.bobo.y - 65; bg = '#FF4081';
    } else {
      for (const c of this.treasureChests) {
        if (!c.opened && Math.hypot(this.diverX - c.x, this.diverY - c.y) < 140) {
          prompt = '🎁 點一下開寶箱!'; px = c.x; py = c.y - 75; bg = '#FF9800'; break;
        }
      }
      if (!prompt) {
        for (const f of this.fishes) {
          if (f.isSleeping && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 120) {
            prompt = '💖 點一下抱抱抓!'; px = f.x; py = f.y - 65; bg = '#EC407A'; break;
          }
          if (f.species === 'TURTLE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 130) {
            prompt = '🐢 點一下騎海龜!'; px = f.x; py = f.y - 65; bg = '#43A047'; break;
          }
          if (f.species === 'BLUE_WHALE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 180) {
            prompt = '🐋 點一下騎藍鯨!'; px = f.x; py = f.y - 95; bg = '#039BE5'; break;
          }
        }
      }
    }

    if (prompt) {
      const bounce = Math.sin(now / 140) * 7;
      ctx.fillStyle = bg;
      this.roundRect(ctx, px - 105, py + bounce - 26, 210, 44, 22); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      this.roundRect(ctx, px - 105, py + bounce - 26, 210, 44, 22); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, px, py + bounce + 3);
      ctx.textAlign = 'left';
    }
  }

  renderHUD(ctx, w, h, now, depthMeters) {
    if (this.hurtFlashTimer > 0) {
      ctx.fillStyle = 'rgba(255,171,64,0.18)';
      ctx.fillRect(0, 0, w, h);
    }

    const oxPercent = Math.max(0, this.oxygen / this.maxOxygen);
    const oxColor = oxPercent > 0.5 ? '#00E676' : (oxPercent > 0.25 ? '#FFD166' : '#FF5252');
    const s = this.hudScale || 1;

    // Top-Left O2 Avatar + Bar
    ctx.save();
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,20,40,0.86)';
    this.roundRect(ctx, 18, 16, 360, 92, 22); ctx.fill();

    const avCx = 64, avCy = 62, avR = 36;
    const avScale = this.avatarCelebrateTimer > 0 ? 1 + 0.22 * Math.sin((this.avatarCelebrateTimer / 0.55) * Math.PI) : 1;
    const avWiggle = oxPercent < 0.25 ? Math.sin(now / 90) * 4 : 0;

    ctx.save();
    ctx.translate(avCx + avWiggle, avCy);
    ctx.scale(avScale, avScale);
    ctx.translate(-avCx, -avCy);

    ctx.fillStyle = '#00284D';
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.fill();
    if (this.kidHeadLoaded) {
      ctx.save();
      ctx.beginPath(); ctx.arc(avCx, avCy, avR - 3, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(this.kidHeadImg, avCx - 34, avCy - 34, 68, 68);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = oxColor;
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * oxPercent); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this.roundRect(ctx, 114, 58, 245, 26, 10); ctx.fill();
    ctx.fillStyle = oxColor;
    this.roundRect(ctx, 114, 58, 245 * oxPercent, 26, 10); ctx.fill();

    ctx.fillStyle = oxPercent < 0.25 ? '#FF5252' : '#FFFFFF';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(this.mountedCreature ? '🏇 騎乘保護中 💖' : `🤿 O₂ ${Math.round(oxPercent * 100)}%`, 114, 48);
    ctx.restore();

    // Top-Center Dual Weapon Pill
    const pillW = Math.min(340, w * 0.40);
    ctx.fillStyle = 'rgba(0,29,61,0.88)';
    this.roundRect(ctx, w / 2 - pillW / 2, 14, pillW, 64, 20); ctx.fill();
    const isHarpoon = this.currentWeapon === 'HARPOON';
    ctx.fillStyle = isHarpoon ? '#FFB300' : 'rgba(255,255,255,0.16)';
    this.roundRect(ctx, w / 2 - pillW / 2 + 8, 21, pillW / 2 - 12, 50, 14); ctx.fill();
    ctx.fillStyle = !isHarpoon ? '#00B8D4' : 'rgba(255,255,255,0.16)';
    this.roundRect(ctx, w / 2 + 4, 21, pillW / 2 - 12, 50, 14); ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.max(15, Math.round(19 * Math.max(0.85, s)))}px sans-serif`;
    ctx.fillStyle = isHarpoon ? '#001428' : '#FFFFFF';
    ctx.fillText('🎯 魚叉', w / 2 - pillW / 4, 53);
    ctx.fillStyle = !isHarpoon ? '#FFFFFF' : '#B0BEC5';
    ctx.fillText('🫧 泡泡', w / 2 + pillW / 4, 53);

    // Top-Right Depth + Coins + Shop Button
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,20,40,0.82)';
    this.roundRect(ctx, w - 210, 14, 194, 64, 16); ctx.fill();
    ctx.fillStyle = '#48CAE4'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(`🌊 ${Math.round(depthMeters)}m`, w - 28, 40);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`🐚 ${this.state.coins}`, w - 28, 66);

    ctx.fillStyle = 'rgba(0,56,101,0.88)';
    this.roundRect(ctx, w - 150, 88, 134, 44, 18); ctx.fill();
    ctx.strokeStyle = '#48CAE4'; ctx.lineWidth = 2;
    this.roundRect(ctx, w - 150, 88, 134, 44, 18); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🏠 商店', w - 83, 117);

    // Bottom-left Virtual Joystick
    const jx = this.isTouchJoystickActive ? this.joystickOriginX : 96;
    const jy = this.isTouchJoystickActive ? this.joystickOriginY : h - 102;
    const kx = this.isTouchJoystickActive ? this.joystickKnobX : 96;
    const ky = this.isTouchJoystickActive ? this.joystickKnobY : h - 102;
    const pulse = this.isTouchJoystickActive ? 1 : (1 + 0.05 * Math.sin(now / 260));

    ctx.fillStyle = this.isTouchJoystickActive ? 'rgba(0,229,255,0.28)' : 'rgba(255,255,255,0.14)';
    ctx.strokeStyle = this.isTouchJoystickActive ? 'rgba(0,229,255,0.85)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(jx, jy, this.joystickRadius * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = this.isTouchJoystickActive ? '#00E5FF' : 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(kx, ky, 30 * pulse, 0, Math.PI * 2); ctx.fill();

    // Bottom-right Action & Switch Buttons
    const actR = 54 * Math.max(0.78, s);
    const actCx = w - 26 - actR;
    const actCy = h - 28 - actR;
    ctx.fillStyle = isHarpoon ? 'rgba(255,179,0,0.88)' : 'rgba(0,184,212,0.88)';
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(actCx, actCy, this.isTouchActionPressed ? actR * 0.9 : actR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = `${Math.round(actR * 0.72)}px sans-serif`;
    ctx.fillText(isHarpoon ? '🎯' : '🫧', actCx, actCy + actR * 0.25);

    const swR = 36 * Math.max(0.78, s);
    const swCx = actCx - actR - 24 - swR;
    const swCy = h - 28 - swR;
    ctx.fillStyle = 'rgba(0,34,68,0.85)';
    ctx.strokeStyle = '#48CAE4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(swCx, swCy, swR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = `${Math.round(swR * 0.72)}px sans-serif`;
    ctx.fillText('🔄', swCx, swCy + swR * 0.26);

    // Touch ripples
    for (const tr of this.touchRipples) {
      const p = 1 - tr.life / tr.maxLife;
      ctx.strokeStyle = `rgba(128,222,234,${(1 - p) * 0.8})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(tr.x, tr.y, 16 + p * 60, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.textAlign = 'left';
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
