import { renderCreature } from './creatureRenderer.js';

export class DiveGame {
  constructor(canvas, state, sound, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.sound = sound;
    this.callbacks = callbacks;

    this.worldWidth = 4200;
    this.worldHeight = 6800;
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
    this.actionPointerId = null;
    this.joystickOriginX = 0;
    this.joystickOriginY = 0;
    this.joystickKnobX = 0;
    this.joystickKnobY = 0;
    this.isTouchJoystickActive = false;
    this.isTouchActionPressed = false;
    this.joystickRadius = 78;
    this.lastShopTapTime = 0;
    this.autoSurfaceActive = false;

    // Fixed-timestep physics accumulator (anti-spiral capped)
    this.accumulator = 0;
    this.simTime = 0;

    this.currentWeapon = 'HARPOON'; // 'HARPOON' | 'BUBBLE_GUN'
    this.mountedCreature = null;
    this.mountGraceTimer = 0;

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
    this.wasAtSurface = false;
    this.surfaceFullNotified = false;
    this.invincibleTimer = 0;
    this.screenShakeTimer = 0;
    this.hurtFlashTimer = 0;
    this.avatarCelebrateTimer = 0;
    this.mountedCreature = null;
    this.mountGraceTimer = 0;
    this.autoSurfaceActive = false;
    this.splashCooldown = 0;
    this.wasAboveSurface = false;
    this.whaleSpoutTimer = 0;
    this.harpoonRopeAmp = 0;
    this.accumulator = 0;
    this.simTime = 0;

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

    // Sunken Shipwreck & Coral Shelves (synced with Android; removed old floating kelpForest)
    this.shipwreck = { x: 1460, y: 3320, w: 420, h: 150 };
    const coralPalette = ['#FF6F00', '#E91E63', '#9C27B0', '#00BCD4', '#FFB300'];
    this.coralShelves = [];
    for (const depth of [650, 1350, 2150, 2950, 3850, 4900]) {
      for (let k = 0; k < 3; k++) {
        this.coralShelves.push({
          x: 260 + k * 1250 + Math.random() * 280,
          y: depth + Math.random() * 140,
          width: 170 + Math.random() * 110,
          color: coralPalette[(Math.floor(depth) + k) % coralPalette.length],
        });
      }
    }

    // Marine snow & bubbles
    this.planktonList = Array.from({ length: 85 }, () => ({
      x: Math.random() * this.worldWidth,
      y: 150 + Math.random() * (this.worldHeight - 210),
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
    this.spawnSpecies('ANGLERFISH', '深海發光安康魚', 360, 28, 7, 3450, 6550, '#3E2723', '#00E5FF', 125, 84, 0.9);
    this.spawnSpecies('NEON_JELLYFISH', '七彩霓虹水母', 140, 3.2, 10, 3400, 6500, '#E040FB', '#00E5FF', 64, 64, 0.7);
    this.spawnSpecies('JELLYFISH', '深海水母', 65, 2.5, 8, 1500, 4600, '#CE93D8', '#7B1FA2', 58, 58, 0.65);

    // Prehistoric Marine Reptiles (v1.9 1-Second Silhouette Palette) + Dunkleosteus
    const dinos = [
      ['LIOPLEURODON', '滑齒龍', 520, 620, 2200, 6400, '#455A64', '#FF8A65', 240, 92, 1.35],
      ['MOSASAURUS', '滄龍', 600, 850, 2800, 6600, '#006064', '#26C6DA', 275, 92, 1.4],
      ['PLESIOSAURUS', '蛇頸龍', 420, 340, 1400, 4800, '#00897B', '#FFF176', 215, 78, 1.1],
      ['ELASMOSAURUS', '薄片龍', 460, 380, 1800, 5600, '#1E88E5', '#80D8FF', 235, 74, 1.05],
      ['NOTHOSAURUS', '幻龍', 360, 210, 1000, 3600, '#689F38', '#FFEE58', 190, 66, 1.25],
      ['ICHTHYOSAURUS', '魚龍', 340, 190, 1100, 4200, '#3949AB', '#80DEEA', 180, 70, 1.65],
    ];
    for (const d of dinos) {
      if (Math.random() < 0.85) {
        this.spawnSpecies(d[0], d[1], d[2], d[3], 1 + (Math.random() < 0.4 ? 1 : 0), d[4], d[5], d[6], d[7], d[8], d[9], d[10]);
      }
    }
    // Guaranteed 1-2 Devonian Dunkleosteus (原始鄧氏魚) in deep trench & abyssal zone
    this.spawnSpecies('DUNKLEOSTEUS', '鄧氏魚', 550, 540, 1 + (Math.random() < 0.5 ? 1 : 0), 2400, 5800, '#5E463A', '#C4A484', 255, 108, 1.15);

    // Underwater Cliff Ledges, Anchored Swaying Kelp & Glowing Minerals
    this.cliffLedges = [];
    for (let cy = 420; cy < this.worldHeight - 300; cy += 480) {
      const leftSide = (Math.floor(cy / 480) % 2 === 0);
      this.cliffLedges.push({
        x: leftSide ? 0 : this.worldWidth - 360,
        y: cy,
        w: 280 + Math.random() * 140,
        h: 90 + Math.random() * 50,
        left: leftSide,
      });
    }
    this.kelpList = [];
    // Anchor kelp on cliff ledges (zero floating kelp)
    for (const cl of this.cliffLedges) {
      for (let k = 0; k < 2; k++) {
        const kx = cl.left ? (60 + Math.random() * (cl.w * 0.65)) : (this.worldWidth - 60 - Math.random() * (cl.w * 0.65));
        this.kelpList.push({
          x: kx, baseY: cl.y + 12,
          height: 120 + Math.random() * 120,
          leafCount: 5 + Math.floor(Math.random() * 4),
          phase: Math.random() * Math.PI * 2,
          color: k % 2 === 0 ? '#2E7D32' : '#00695C',
        });
      }
    }
    // Anchor seafloor kelp along the seabed
    for (let i = 0; i < 18; i++) {
      const kx = 180 + (i / 18) * (this.worldWidth - 360) + (Math.random() - 0.5) * 60;
      this.kelpList.push({
        x: kx, baseY: this.worldHeight - 85 + Math.sin(kx * 0.005) * 24,
        height: 170 + Math.random() * 150,
        leafCount: 6 + Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? '#2E7D32' : '#00695C',
      });
    }
    this.mineralNodes = this.cliffLedges.map((cl, i) => ({
      x: cl.left ? (cl.w * 0.55) : (this.worldWidth - cl.w * 0.55),
      y: cl.y + 8,
      color: i % 3 === 0 ? '#00E5FF' : (i % 3 === 1 ? '#E040FB' : '#FFD54F'),
      size: 20 + Math.random() * 14,
    }));

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
        telegraphTimer: 0,
        chargeTimer: 0,
        cooldownTimer: 0,
        chompTimer: 0,
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
      const rawDt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = now;
      const FIXED_DT = 1 / 60;
      this.accumulator = Math.min(this.accumulator + rawDt, FIXED_DT * 3);
      while (this.accumulator >= FIXED_DT) {
        this.simTime += FIXED_DT;
        this.update(FIXED_DT, this.simTime * 1000);
        this.accumulator -= FIXED_DT;
      }
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

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.joystickPointerId = null;
      this.actionPointerId = null;
      this.isTouchJoystickActive = false;
      this.isTouchActionPressed = false;
      this.inputX = 0;
      this.inputY = 0;
    });

    window.addEventListener('keydown', (e) => {
      if (!this.running) return;
      this.sound.unlock();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S'].includes(e.key)) {
        this.keys.add(e.key);
        this.autoSurfaceActive = false;
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

      // Bottom-right controls geometry
      const s = this.hudScale || 1;
      const actR = 54 * Math.max(0.78, s);
      const actCx = w - 26 - actR;
      const actCy = h - 28 - actR;
      const swR = 36 * Math.max(0.78, s);
      const swCx = actCx - actR - 22 - swR;
      const swCy = h - 28 - swR;

      // One-tap Auto-Surface / Bobo Rescue bubble above Action Button (when O2 < 30% or depth > 120m)
      const oxPct = this.oxygen / this.maxOxygen;
      const depthM = Math.max(0, (this.diverY - 140) / 10);
      if ((oxPct < 0.30 || depthM > 120) && !this.bobo.isRescuing) {
        const upR = 34 * Math.max(0.78, s);
        const upCx = actCx;
        const upCy = actCy - actR - 18 - upR;
        if (Math.hypot(tx - upCx, ty - upCy) <= upR + 14) {
          if (oxPct < 0.25) {
            this.triggerDolphinRescue();
          } else {
            this.autoSurfaceActive = !this.autoSurfaceActive;
            this.sound.playBubble();
            this.addFX(this.diverX, this.diverY - 55, this.autoSurfaceActive ? '⬆️⛵ 自動上浮中！' : '✋ 已取消自動上浮', '#80DEEA', 24);
          }
          return;
        }
      }

      if (Math.hypot(tx - swCx, ty - swCy) <= swR + 14) {
        this.toggleWeapon();
        return;
      }

      // Anti-mistap Action Button: generous 1.45x hit radius & 16px right-edge palm guard (no whole-right-half misfire!)
      if (tx <= w - 16 && Math.hypot(tx - actCx, ty - actCy) <= actR * 1.45) {
        this.actionPointerId = e.pointerId;
        this.isTouchActionPressed = true;
        this.onActionPressed();
        return;
      }

      // Left Dynamic Follow-Origin Virtual Joystick (clamped inside safe bounds)
      if (this.joystickPointerId === null && tx < w * 0.62) {
        this.joystickPointerId = e.pointerId;
        this.isTouchJoystickActive = true;
        this.autoSurfaceActive = false;
        const R = this.joystickRadius;
        this.joystickOriginX = Math.max(R + 16, Math.min(w * 0.48, tx));
        this.joystickOriginY = Math.max(h * 0.25, Math.min(h - R - 16, ty));
        this.joystickKnobX = this.joystickOriginX;
        this.joystickKnobY = this.joystickOriginY;
        this.canvas.setPointerCapture?.(e.pointerId);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joystickPointerId) return;
      const { x: mx, y: my } = getPos(e);
      let dx = mx - this.joystickOriginX;
      let dy = my - this.joystickOriginY;
      let dist = Math.hypot(dx, dy);
      const R = this.joystickRadius;
      // Dynamic follow-origin when thumb drags past 1.15 * R
      if (dist > R * 1.15) {
        const pull = (dist - R * 1.15) * 0.65;
        this.joystickOriginX = Math.max(R + 16, Math.min(this.viewW * 0.50, this.joystickOriginX + (dx / dist) * pull));
        this.joystickOriginY = Math.max(this.viewH * 0.22, Math.min(this.viewH - R - 16, this.joystickOriginY + (dy / dist) * pull));
        dx = mx - this.joystickOriginX;
        dy = my - this.joystickOriginY;
        dist = Math.hypot(dx, dy);
      }
      if (dist > R) {
        dx = (dx / dist) * R;
        dy = (dy / dist) * R;
      }
      this.joystickKnobX = this.joystickOriginX + dx;
      this.joystickKnobY = this.joystickOriginY + dy;
      const norm = dist / R;
      if (norm < 0.14) {
        this.inputX = 0;
        this.inputY = 0;
      } else {
        this.inputX = dx / R;
        this.inputY = dy / R;
        if (Math.abs(this.inputX) > 0.14) {
          this.targetFacingScale = this.inputX > 0 ? 1 : -1;
        }
      }
    });

    const endPointer = (e) => {
      if (e.pointerId === this.actionPointerId) {
        this.actionPointerId = null;
        this.isTouchActionPressed = false;
      }
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
      if (this.mountGraceTimer > 0) return; // 0.65s anti-mistap grace period
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
        this.mountGraceTimer = 0.65;
        this.autoSurfaceActive = false;
        this.sound.playUpgrade();
        this.addFX(this.diverX, this.diverY - 55, '🐢 騎乘海龜奔奔！', '#00E676', 32);
        return;
      }
      if (f.species === 'BLUE_WHALE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 180) {
        this.mountedCreature = f;
        this.mountGraceTimer = 0.65;
        this.autoSurfaceActive = false;
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
      if (d > 1) {
        dx = tx / d; dy = ty / d;
        if (Math.abs(tx) > 10) this.targetFacingScale = tx > 0 ? 1 : -1;
      }
    }
    this.harpoonVx = dx * 1680;
    this.harpoonVy = dy * 1680;
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
    this.activeBubbles.push({ x: sx, y: sy, vx: dx * 960, vy: dy * 960, radius: 18, lifeTime: 2.0, age: 0 });
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
    this.mountGraceTimer = Math.max(0, this.mountGraceTimer - dt);
    this.splashCooldown = Math.max(0, this.splashCooldown - dt);
    this.harpoonRopeAmp = Math.max(0, this.harpoonRopeAmp - dt * 28);

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
    if (this.autoSurfaceActive && !this.mountedCreature && !this.bobo.isRescuing) {
      if (kx !== 0 || ky !== 0 || this.diverY <= 165) {
        this.autoSurfaceActive = false;
      } else {
        ky = -1;
      }
    }
    const kLen = Math.hypot(kx, ky);
    if (kLen > 1) { kx /= kLen; ky /= kLen; }

    this.facingScale += (this.targetFacingScale - this.facingScale) * (1 - Math.exp(-12 * dt));

    if (this.mountedCreature) {
      this.diverX = this.mountedCreature.x;
      this.diverY = this.mountedCreature.y - (this.mountedCreature.species === 'BLUE_WHALE' ? 50 : 24);
      this.diverAngle = 0;
      this.facingScale = this.mountedCreature.facing;
      if (this.mountedCreature.species === 'BLUE_WHALE') {
        this.whaleSpoutTimer += dt;
        if (this.whaleSpoutTimer >= 2.0) {
          this.whaleSpoutTimer = 0;
          this.spawnBurst(this.mountedCreature.x + this.mountedCreature.facing * 48, this.mountedCreature.y - 68, '#80DEEA', 10);
        }
      }
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
        if (Math.random() < 0.35 && this.burstParticles.length < 64) {
          this.spawnBurst(this.bobo.x, this.bobo.y + 26, '#FF80AB', 2);
        }
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

      // v2.0 Underwater Fluid Dynamics: Anisotropic drag (forward vs lateral) + depth buoyancy + surface breaching
      if (this.diverY < 140) {
        // Breached above water surface: air gravity pulls back into ocean
        this.diverVy += 520 * dt;
        this.diverVx *= Math.exp(-0.8 * dt);
        this.wasAboveSurface = true;
      } else {
        const fx = Math.cos(this.diverAngle) * (this.facingScale >= 0 ? 1 : -1);
        const fy = Math.sin(this.diverAngle);
        const nx = -fy;
        const ny = fx;
        const vPar = (this.diverVx * fx + this.diverVy * fy) * Math.exp(-2.4 * dt);
        const vPerp = (this.diverVx * nx + this.diverVy * ny) * Math.exp(-5.8 * dt);
        this.diverVx = vPar * fx + vPerp * nx + kx * maxSpd * 2.8 * dt;
        this.diverVy = vPar * fy + vPerp * ny + ky * maxSpd * 2.8 * dt;

        // Depth buoyancy gradient
        if (this.diverY < 600) this.diverVy -= 14 * dt;
        else if (this.diverY > 2800) this.diverVy += 10 * dt;
        else if (!moving) this.diverVy += Math.sin(now * 0.0022) * 10 * dt;

        // Hydrothermal Vent Bubble Elevator updrafts (width 110px, height 420px)
        if (this.diverY > this.worldHeight - 520) {
          for (let vx = 480; vx < this.worldWidth - 400; vx += 840) {
            const dxv = Math.abs(this.diverX - vx);
            if (dxv < 55) {
              const falloff = 1 - dxv / 55;
              this.diverVy = Math.max(-340, this.diverVy - 420 * falloff * dt);
            }
          }
        }

        // Clamp top speed smoothly
        const spd = Math.hypot(this.diverVx, this.diverVy);
        if (spd > maxSpd * 1.35) {
          const s = (maxSpd * 1.35) / spd;
          this.diverVx *= s;
          this.diverVy *= s;
        }

        // Splash-down damping when re-entering water from a breach
        if (this.wasAboveSurface && this.diverVy > 110 && this.splashCooldown <= 0) {
          this.diverVy *= 0.45;
          this.splashCooldown = 0.4;
          this.sound.playBubble();
          this.spawnBurst(this.diverX, 144, '#E0F7FA', 10);
        }
        this.wasAboveSurface = false;
      }

      this.diverX += this.diverVx * dt;
      this.diverY += this.diverVy * dt;

      const curSpeedRatio = Math.min(1.2, Math.hypot(this.diverVx, this.diverVy) / Math.max(1, maxSpd));
      this.swimCycle += dt * (1.8 + curSpeedRatio * 8.2);
      const maxPitch = (52 * Math.PI) / 180;
      if (moving) {
        const rawAng = Math.atan2(this.diverVy, Math.max(40, Math.abs(this.diverVx)));
        const targetAng = Math.max(-maxPitch, Math.min(maxPitch, rawAng));
        this.diverAngle += (targetAng - this.diverAngle) * (1 - Math.exp(-10 * dt));
      } else {
        this.diverAngle *= Math.exp(-8 * dt);
      }
      if (this.diverY <= 155) this.diverAngle *= Math.exp(-10 * dt);
    }

    this.diverX = Math.max(80, Math.min(this.worldWidth - 80, this.diverX));
    this.diverY = Math.max(105, Math.min(this.worldHeight - 110, this.diverY));

    // Rhythmic world-space regulator exhaust bubbles (capped <= 96 total)
    if (this.diverY > 165 && !this.bobo.isRescuing) {
      const oxPctNow = this.oxygen / this.maxOxygen;
      const interval = oxPctNow < 0.25 ? 0.85 : 1.4;
      this.breathTimer += dt;
      if (this.breathTimer >= interval) {
        this.breathTimer = 0;
        for (let k = 0; k < 3; k++) {
          if (this.bubbles.length >= 96) break;
          this.bubbles.push({
            x: this.diverX + (this.facingScale >= 0 ? 34 : -34) + (Math.random() - 0.5) * 10,
            y: this.diverY - 6 - k * 4,
            r: 5.5 - k * 1.1,
            speed: 1.9 + Math.random() * 0.8,
            isOxygenPickup: false,
            isDaveBreath: true,
          });
        }
      }
    }

    // Smooth cliff-ledge solid collision (exempt during dolphin rescue so rescue never snags)
    if (!this.bobo.isRescuing && !this.mountedCreature) {
      const diverR = 40;
      for (const cl of this.cliffLedges) {
        const minX = cl.left ? 0 : this.worldWidth - cl.w * 0.88;
        const maxX = cl.left ? cl.w * 0.88 : this.worldWidth;
        const minY = cl.y + 4;
        const maxY = cl.y + cl.h + 12;
        const closestX = Math.max(minX, Math.min(maxX, this.diverX));
        const closestY = Math.max(minY, Math.min(maxY, this.diverY));
        const cdx = this.diverX - closestX;
        const cdy = this.diverY - closestY;
        const distSq = cdx * cdx + cdy * cdy;
        if (distSq < diverR * diverR) {
          if (distSq > 0.001) {
            const dist = Math.sqrt(distSq);
            const nx = cdx / dist;
            const ny = cdy / dist;
            const push = diverR - dist;
            this.diverX += nx * push;
            this.diverY += ny * push;
            const vn = this.diverVx * nx + this.diverVy * ny;
            if (vn < 0) { this.diverVx -= vn * nx; this.diverVy -= vn * ny; }
          } else {
            this.diverX = cl.left ? maxX + diverR : minX - diverR;
          }
        }
      }
    }

    // Surface O2 refill & depth-adjusted underwater O2 consumption
    if (!this.bobo.isRescuing) {
      if (this.diverY <= 175) {
        if (this.oxygen < this.maxOxygen) {
          if (!this.wasAtSurface) {
            this.sound.playBubble();
            this.addFX(this.diverX, this.diverY - 55, '🌬️ 到達水面！補充新鮮空氣！', '#80DEEA', 26);
          }
          this.oxygen = Math.min(this.maxOxygen, this.oxygen + dt * 35);
          if (this.oxygen >= this.maxOxygen && !this.surfaceFullNotified) {
            this.surfaceFullNotified = true;
            this.spawnBurst(this.diverX, this.diverY - 15, '#80DEEA', 8);
            this.addFX(this.diverX, this.diverY - 75, '✨ 氧氣滿囉！出發探險！', '#69F0AE', 26);
          }
        }
        this.wasAtSurface = true;
      } else {
        if (this.diverY > 195) {
          this.wasAtSurface = false;
          this.surfaceFullNotified = false;
        }
        if (!this.mountedCreature) {
          const depthRatio = Math.max(0, Math.min(1, (this.diverY - 140) / (this.worldHeight - 250)));
          this.oxygen -= dt * (0.45 + depthRatio * 0.30);
          if (this.oxygen <= 0) {
            this.oxygen = 0;
            this.triggerDolphinRescue();
          }
        }
      }
    }

    // Camera follow
    const targetCamX = Math.max(0, Math.min(this.worldWidth - this.viewW, this.diverX - this.viewW / 2));
    const targetCamY = Math.max(0, Math.min(this.worldHeight - this.viewH, this.diverY - this.viewH / 2));
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 5.5);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 5.5);

    // Bobo standby & gentle swim-off when O2 recovers
    if (!this.bobo.isRescuing) {
      if (this.oxygen / this.maxOxygen < 0.25) {
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
      } else if (this.bobo.active) {
        this.bobo.swimPhase += dt * 6;
        this.bobo.x += this.bobo.facing * 260 * dt;
        this.bobo.y -= 140 * dt;
        if (this.bobo.y < 110 || Math.abs(this.bobo.x - this.diverX) > 760) {
          this.bobo.active = false;
        }
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

    // Plankton & bubbles (keep plankton strictly underwater)
    for (const ms of this.planktonList) {
      ms.x = (ms.x + ms.vx * 60 * dt + this.worldWidth) % this.worldWidth;
      ms.y += ms.vy * 60 * dt;
      if (ms.y < 150) ms.y = this.worldHeight - 60;
      else if (ms.y > this.worldHeight - 60) ms.y = 150;
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed * 60 * dt;
      if (b.isDaveBreath) {
        b.x += Math.sin(now * 0.006 + i) * 14 * dt;
        if (b.y < 142) { this.bubbles.splice(i, 1); continue; }
      } else if (b.y < 140) {
        b.y = this.worldHeight - 50;
        b.x = Math.random() * this.worldWidth;
      }
      if (b.isOxygenPickup) {
        const dx = this.diverX - b.x;
        const dy = this.diverY - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < 160) {
          const pull = 420 * (1 - d / 160) + 120;
          b.x += (dx / d) * pull * dt;
          b.y += (dy / d) * pull * dt;
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

    // Active bubble bullets (dt-scaled, mild water drag, sinusoidal sway, buoyancy rise, pop at surface)
    const bubbleDrag = Math.pow(0.985, dt * 60);
    this.activeBubbles = this.activeBubbles.filter((bb) => {
      bb.lifeTime -= dt;
      bb.age = (bb.age || 0) + dt;
      bb.vx *= bubbleDrag;
      bb.vy = bb.vy * bubbleDrag - 55 * dt;
      bb.radius = Math.min(30, bb.radius + 3.5 * dt);
      bb.x += (bb.vx + Math.sin(bb.age * 12) * 35) * dt;
      bb.y += bb.vy * dt;
      if (bb.y <= 145) return false;
      for (const f of this.fishes) {
        if (!f.isSleeping && Math.hypot(bb.x - f.x, bb.y - f.y) < f.bodyHeight * 0.7 + bb.radius) {
          f.isSleeping = true;
          f.sleepTimer = 8;
          f.isAttacking = false;
          f.telegraphTimer = 0;
          f.chargeTimer = 0;
          this.sound.playBubble();
          this.addFX(f.x, f.y - 45, '💤 💖', '#00E5FF', 28);
          return false;
        }
      }
      return bb.lifeTime > 0;
    });

    // Fish AI & Wide-Cone Sticky Auto-Aim (18% hysteresis)
    const prevTarget = this.targetFish;
    this.targetFish = null;
    const maxRange = this.state.getHarpoonRange();
    let bestScore = maxRange;
    const whaleRiding = this.mountedCreature && this.mountedCreature.species === 'BLUE_WHALE';
    for (const f of this.fishes) {
      if (f.isSleeping) {
        f.sleepTimer -= dt;
        f.y = Math.max(175, f.y - 8 * dt);
        if (f.sleepTimer <= 0) f.isSleeping = false;
        continue;
      }
      const isShark = f.species === 'REEF_SHARK' || f.species === 'GREAT_SHARK';
      const isDunk = f.species === 'DUNKLEOSTEUS';
      const sdx = this.diverX - f.x;
      const sdy = this.diverY - f.y;
      const sDist = Math.hypot(sdx, sdy);
      if (f.cooldownTimer > 0) f.cooldownTimer = Math.max(0, f.cooldownTimer - dt);
      if (f.chompTimer > 0) f.chompTimer = Math.max(0, f.chompTimer - dt);

      // Predators yield gently when player rides Blue Whale (within 260px)
      if ((isShark || isDunk) && whaleRiding && sDist < 260 && sDist > 1) {
        f.isAttacking = false;
        f.telegraphTimer = 0;
        f.chargeTimer = 0;
        f.x -= (sdx / sDist) * 140 * dt;
        f.y -= (sdy / sDist) * 90 * dt;
        f.facing = sdx > 0 ? -1 : 1;
        f.swimPhase += dt * f.swimSpeedMultiplier * 1.4;
      } else if ((isDunk || isShark) && !this.bobo.isRescuing && !this.mountedCreature && f.cooldownTimer <= 0) {
        const detectDist = isDunk ? 300 : 340;
        const telegraphDur = isDunk ? 0.55 : 0.45;
        const chargeDur = isDunk ? 1.6 : 2.2;
        const chargeSpd = isDunk ? 135 : (f.species === 'GREAT_SHARK' ? 145 : 112);
        const cooldownDur = isDunk ? 2.2 : 1.8;
        if (f.telegraphTimer > 0) {
          f.telegraphTimer -= dt;
          f.facing = sdx > 0 ? 1 : -1;
          f.isAttacking = false;
          f.swimPhase += dt * f.swimSpeedMultiplier * 1.4;
          if (f.telegraphTimer <= 0) f.chargeTimer = chargeDur;
        } else if (f.chargeTimer > 0) {
          f.chargeTimer -= dt;
          f.isAttacking = true;
          f.facing = sdx > 0 ? 1 : -1;
          if (sDist > 1) {
            f.x += (sdx / sDist) * chargeSpd * dt;
            f.y += (sdy / sDist) * chargeSpd * dt;
          }
          f.swimPhase += dt * f.swimSpeedMultiplier * 1.7;
          if (sDist < f.bodyHeight * 0.62 + 34 && this.invincibleTimer <= 0) {
            const loss = isDunk ? 18 : (f.species === 'GREAT_SHARK' ? 22 : 14);
            this.oxygen = Math.max(0, this.oxygen - loss);
            this.invincibleTimer = 1.6;
            this.screenShakeTimer = 0.32;
            this.hurtFlashTimer = 0.32;
            if (sDist > 1) {
              this.diverVx += (sdx / sDist) * 210;
              this.diverVy += (sdy / sDist) * 210;
              f.x -= (sdx / sDist) * 42;
              f.y -= (sdy / sDist) * 42;
            }
            f.chargeTimer = 0;
            f.isAttacking = false;
            f.cooldownTimer = cooldownDur;
            this.sound.playHurt();
            this.addFX(this.diverX, this.diverY - 50, isDunk ? '🫧 被鄧氏魚頂了一下！' : '🫧 被鯊魚頂了一下！', '#FFD54F', 28);
            if (this.oxygen <= 0) this.triggerDolphinRescue();
          } else if (f.chargeTimer <= 0) {
            f.isAttacking = false;
            f.cooldownTimer = cooldownDur;
          }
        } else if (sDist < detectDist) {
          f.telegraphTimer = telegraphDur;
          f.facing = sdx > 0 ? 1 : -1;
        } else {
          f.isAttacking = false;
          f.swimPhase += dt * f.swimSpeedMultiplier;
          f.x += f.vx * 60 * dt;
          f.y += Math.sin(f.swimPhase) * 84 * dt;
          if (f.x < 90) { f.x = 90; f.vx = Math.abs(f.vx); f.facing = 1; }
          else if (f.x > this.worldWidth - 90) { f.x = this.worldWidth - 90; f.vx = -Math.abs(f.vx); f.facing = -1; }
        }
      } else {
        f.isAttacking = false;
        f.swimPhase += dt * f.swimSpeedMultiplier;
        f.x += f.vx * 60 * dt;
        f.y += Math.sin(f.swimPhase) * 84 * dt;
        if (f.x < 70) { f.x = 70; f.vx = Math.abs(f.vx); f.facing = 1; }
        else if (f.x > this.worldWidth - 70) { f.x = this.worldWidth - 70; f.vx = -Math.abs(f.vx); f.facing = -1; }
      }
      // Keep all marine creatures strictly below water surface and above seabed
      f.y = Math.max(175, Math.min(this.worldHeight - 125, f.y));
      // Turn away from solid cliff ledges
      for (const cl of this.cliffLedges) {
        if (f.y > cl.y - f.bodyHeight * 0.4 && f.y < cl.y + cl.h + f.bodyHeight * 0.4) {
          if (cl.left && f.x < cl.w * 0.88 + f.length * 0.35) {
            f.x = cl.w * 0.88 + f.length * 0.35;
            f.vx = Math.abs(f.vx);
            f.facing = 1;
          } else if (!cl.left && f.x > this.worldWidth - cl.w * 0.88 - f.length * 0.35) {
            f.x = this.worldWidth - cl.w * 0.88 - f.length * 0.35;
            f.vx = -Math.abs(f.vx);
            f.facing = -1;
          }
        }
      }

      // Wide-Cone Sticky Auto-Aim (±105° front preferred, rear < 180px allowed, 0.82 hysteresis)
      if (f.value > 0 && sDist < maxRange) {
        const toFx = f.x - this.diverX;
        const toFy = f.y - this.diverY;
        const faceDir = this.targetFacingScale >= 0 ? 1 : -1;
        const cosA = (toFx * faceDir) / Math.max(1, sDist);
        let penalty = -1;
        if (cosA >= -0.2588) penalty = 1.0; // within ±105°
        else if (sDist < 180) penalty = 1.35; // close behind
        if (penalty > 0) {
          const score = sDist * penalty * (f === prevTarget ? 0.82 : 1.0);
          if (score < bestScore) {
            bestScore = score;
            this.targetFish = f;
          }
        }
      }
    }

    // Harpoon (dt-scaled, rebounds at water surface or cliff ledges)
    if (this.harpoonState === 'FIRING') {
      this.harpoonX += this.harpoonVx * dt;
      this.harpoonY += this.harpoonVy * dt;
      this.harpoonDist = Math.hypot(this.harpoonX - this.harpoonStartX, this.harpoonY - this.harpoonStartY);
      if (this.harpoonY <= 140) {
        this.harpoonY = 140;
        this.harpoonState = 'REELING';
      }
      if (this.harpoonState === 'FIRING') {
        for (const cl of this.cliffLedges) {
          const minX = cl.left ? 0 : this.worldWidth - cl.w * 0.88;
          const maxX = cl.left ? cl.w * 0.88 : this.worldWidth;
          if (this.harpoonX >= minX && this.harpoonX <= maxX && this.harpoonY >= cl.y && this.harpoonY <= cl.y + cl.h + 12) {
            this.spawnBurst(this.harpoonX, this.harpoonY, '#B0BEC5', 5);
            this.harpoonState = 'REELING';
            break;
          }
        }
      }
      if (this.harpoonState === 'FIRING') {
        for (const f of this.fishes) {
          if (Math.hypot(this.harpoonX - f.x, this.harpoonY - f.y) < f.bodyHeight * 0.65) {
            // Dunkleosteus Bone-Plate Dual-Solution: Harpoon Lv.<4 deflects gently with icon hint
            if (f.species === 'DUNKLEOSTEUS' && this.state.harpoonLevel < 4) {
              this.sound.playBubble();
              this.spawnBurst(this.harpoonX, this.harpoonY, '#C4A484', 8);
              this.addFX(f.x, f.y - 62, '🦴 → 🫧 / ⬆️🎯', '#FFD54F', 28);
              this.harpoonState = 'REELING';
              break;
            }
            this.hookedFish = f;
            this.harpoonRopeAmp = 18;
            this.harpoonState = 'REELING';
            break;
          }
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
        const weightKg = this.hookedFish ? (this.hookedFish.weightKg || 1) : 1;
        const reelSpd = this.hookedFish
          ? Math.max(720, Math.min(1520, 1520 / (1 + Math.log10(1 + weightKg) * 0.30)))
          : 1560;
        const reelStep = Math.min(d, reelSpd * dt);
        this.harpoonX += (dx / d) * reelStep;
        this.harpoonY += (dy / d) * reelStep;
        if (this.hookedFish) {
          this.hookedFish.x = this.harpoonX;
          this.hookedFish.y = this.harpoonY;
        }
      }
    }

    // Particles & ripples (underwater drag + mild upward buoyancy)
    this.effects = this.effects.filter((fx) => {
      fx.age += dt;
      fx.y += fx.vy * dt;
      fx.alpha = Math.max(0, 1 - fx.age / 1.4);
      return fx.age < 1.4;
    });
    const pDrag = Math.pow(0.93, dt * 60);
    this.burstParticles = this.burstParticles.filter((p) => {
      p.life -= dt;
      p.vx *= pDrag;
      p.vy = p.vy * pDrag - 25 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(145, p.y + p.vy * dt);
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

    // Water gradient (cached when cameraY changes < 1.5px)
    if (!this._cachedBgGrad || Math.abs(this.cameraY - this._cachedBgCamY) > 1.5) {
      this._cachedBgCamY = this.cameraY;
      const bgGrad = ctx.createLinearGradient(0, -this.cameraY, 0, this.worldHeight - this.cameraY);
      bgGrad.addColorStop(0.0, '#4DC9E6');
      bgGrad.addColorStop(0.18, '#0077BE');
      bgGrad.addColorStop(0.45, '#003865');
      bgGrad.addColorStop(0.70, '#001529');
      bgGrad.addColorStop(0.88, '#000814');
      bgGrad.addColorStop(1.0, '#000308');
      this._cachedBgGrad = bgGrad;
    }
    ctx.fillStyle = this._cachedBgGrad;
    ctx.fillRect(0, 0, w, h);

    // Tropical sky above y=140
    if (this.cameraY < 160) {
      if (!this._cachedSkyGrad || Math.abs(this.cameraY - this._cachedSkyCamY) > 1.5) {
        this._cachedSkyCamY = this.cameraY;
        const skyGrad = ctx.createLinearGradient(0, -this.cameraY, 0, 145 - this.cameraY);
        skyGrad.addColorStop(0, '#64B5F6');
        skyGrad.addColorStop(0.6, '#B3E5FC');
        skyGrad.addColorStop(1, '#E0F7FA');
        this._cachedSkyGrad = skyGrad;
      }
      ctx.fillStyle = this._cachedSkyGrad;
      ctx.fillRect(0, 0, w, Math.max(0, 145 - this.cameraY));
    }

    // 3-Layer Parallax Far Silhouettes (0.30x far ridge + mini schools, 0.60x mid wreck/arch)
    ctx.save();
    ctx.translate(-this.cameraX * 0.30, -this.cameraY * 0.30);
    ctx.fillStyle = 'rgba(0, 26, 51, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, 140); ctx.lineTo(440, 760); ctx.lineTo(290, 1850); ctx.lineTo(520, 3150); ctx.lineTo(360, this.worldHeight); ctx.lineTo(0, this.worldHeight);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.worldWidth, 140); ctx.lineTo(this.worldWidth - 420, 820); ctx.lineTo(this.worldWidth - 260, 1950); ctx.lineTo(this.worldWidth - 500, 3100); ctx.lineTo(this.worldWidth - 340, this.worldHeight); ctx.lineTo(this.worldWidth, this.worldHeight);
    ctx.closePath(); ctx.fill();
    // Distant mini fish schools
    ctx.fillStyle = 'rgba(0, 40, 80, 0.22)';
    for (let s = 0; s < 3; s++) {
      const sx = ((now * 0.018 * (s % 2 === 0 ? 1 : -1) + s * 680) % 2400 + 2400) % 2400;
      const sy = 340 + s * 520;
      for (let m = 0; m < 5; m++) {
        ctx.beginPath(); ctx.ellipse(sx + m * 18, sy + (m % 2) * 10, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // Mid-depth 0.60x Coral Arch & Distant Wreck Mast Silhouette
    ctx.save();
    ctx.translate(-this.cameraX * 0.60, -this.cameraY * 0.60);
    ctx.fillStyle = 'rgba(0, 20, 44, 0.20)';
    ctx.beginPath();
    ctx.arc(980, 1480, 220, Math.PI, 0);
    ctx.lineTo(1200, 1780); ctx.lineTo(1120, 1780);
    ctx.arc(980, 1480, 140, 0, Math.PI, true);
    ctx.lineTo(760, 1780); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.save();
    const shakeX = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * 14 : 0;
    const shakeY = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * 14 : 0;
    ctx.translate(-this.cameraX + shakeX, -this.cameraY + shakeY);

    // Dual-Phase Shallow Water Caustic Light Ribbons (y: 140~850)
    if (this.cameraY < 850) {
      const causticFade = Math.max(0, 1 - this.cameraY / 850);
      ctx.strokeStyle = `rgba(178, 235, 242, ${(0.13 * causticFade).toFixed(3)})`;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      for (let band = 0; band < 2; band++) {
        const baseY = 230 + band * 165;
        ctx.beginPath();
        for (let rx = Math.max(0, this.cameraX - 80); rx <= Math.min(this.worldWidth, this.cameraX + w + 80); rx += 70) {
          const ry = baseY + Math.sin(rx * 0.012 + now * 0.0014 + band * 2.1) * 26 + Math.cos(rx * 0.022 - now * 0.0018) * 14;
          if (rx <= Math.max(0, this.cameraX - 80)) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      }
    }

    // Volumetric sunbeams (cached gradient)
    const sway = Math.sin(now / 1100) * 55;
    if (!this._cachedRayGrad) {
      const rayGrad = ctx.createLinearGradient(0, 140, 0, 980);
      rayGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
      rayGrad.addColorStop(0.55, 'rgba(255,255,255,0.06)');
      rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
      this._cachedRayGrad = rayGrad;
    }
    ctx.fillStyle = this._cachedRayGrad;
    for (let rx = 180; rx < this.worldWidth; rx += 460) {
      ctx.beginPath();
      ctx.moveTo(rx + sway * 0.4, 140);
      ctx.lineTo(rx + 200 + sway, 980);
      ctx.lineTo(rx + 85 + sway, 980);
      ctx.lineTo(rx - 75 + sway * 0.4, 140);
      ctx.closePath();
      ctx.fill();
    }

    // Subsurface dual-sine refraction ribbon
    if (this.cameraY < 260) {
      ctx.strokeStyle = 'rgba(224,247,250,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let rx = 0; rx <= this.worldWidth; rx += 60) {
        const ry = 152 + Math.sin(rx * 0.015 + now / 500) * 5 + Math.cos(rx * 0.028 - now / 380) * 3;
        if (rx === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }

    // Depth-tinted plankton particles
    for (const p of this.planktonList) {
      if (p.y < this.cameraY - 40 || p.y > this.cameraY + h + 40) continue;
      const depthAlpha = p.y > 2000 ? 0.45 + 0.35 * Math.sin(now / 600 + p.x) : 0.25;
      ctx.fillStyle = p.y > 2000 ? `rgba(128, 222, 234, ${depthAlpha.toFixed(2)})` : `rgba(255, 255, 255, ${depthAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Multi-layered Underwater Cliff Ledges, Swaying Kelp & Faceted Glowing Minerals
    for (const cl of this.cliffLedges) {
      if (cl.y < this.cameraY - 200 || cl.y > this.cameraY + h + 200) continue;
      ctx.fillStyle = '#0D2137';
      ctx.beginPath();
      if (cl.left) {
        ctx.moveTo(0, cl.y);
        ctx.quadraticCurveTo(cl.w, cl.y + 10, cl.w * 0.85, cl.y + cl.h);
        ctx.lineTo(0, cl.y + cl.h + 20);
      } else {
        ctx.moveTo(this.worldWidth, cl.y);
        ctx.quadraticCurveTo(this.worldWidth - cl.w, cl.y + 10, this.worldWidth - cl.w * 0.85, cl.y + cl.h);
        ctx.lineTo(this.worldWidth, cl.y + cl.h + 20);
      }
      ctx.closePath(); ctx.fill();
      // Lit top-rim rock bevel
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (cl.left) {
        ctx.moveTo(0, cl.y + 2); ctx.quadraticCurveTo(cl.w * 0.92, cl.y + 10, cl.w * 0.82, cl.y + 24);
      } else {
        ctx.moveTo(this.worldWidth, cl.y + 2); ctx.quadraticCurveTo(this.worldWidth - cl.w * 0.92, cl.y + 10, this.worldWidth - cl.w * 0.82, cl.y + 24);
      }
      ctx.stroke();
    }

    for (const kp of this.kelpList) {
      if (kp.baseY < this.cameraY - 50 || kp.baseY - kp.height > this.cameraY + h + 50) continue;
      const wave = Math.sin(now / 850 + kp.phase) * 28;
      ctx.strokeStyle = kp.color; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(kp.x, kp.baseY);
      ctx.quadraticCurveTo(kp.x + wave * 0.4, kp.baseY - kp.height * 0.5, kp.x + wave, kp.baseY - kp.height);
      ctx.stroke();
      ctx.fillStyle = kp.color;
      for (let l = 1; l <= kp.leafCount; l++) {
        const fy = kp.baseY - (l / (kp.leafCount + 1)) * kp.height;
        const fx = kp.x + wave * (l / kp.leafCount);
        const side = l % 2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.ellipse(fx + side * 16, fy, 16, 6, side * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const mn of this.mineralNodes) {
      if (mn.y < this.cameraY - 80 || mn.y > this.cameraY + h + 80) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = mn.color;
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(mn.x, mn.y - mn.size * 0.3, mn.size * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Faceted 2-tone crystal
      ctx.fillStyle = mn.color;
      ctx.beginPath();
      ctx.moveTo(mn.x, mn.y - mn.size * 1.15);
      ctx.lineTo(mn.x + mn.size * 0.65, mn.y);
      ctx.lineTo(mn.x, mn.y + mn.size * 0.35);
      ctx.lineTo(mn.x - mn.size * 0.65, mn.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.beginPath();
      ctx.moveTo(mn.x, mn.y - mn.size * 1.15);
      ctx.lineTo(mn.x + mn.size * 0.25, mn.y);
      ctx.lineTo(mn.x, mn.y + mn.size * 0.35);
      ctx.lineTo(mn.x - mn.size * 0.65, mn.y);
      ctx.closePath(); ctx.fill();
    }

    // Abyssal Seabed & Rising Hydrothermal Vent Plumes
    if (this.cameraY + h > this.worldHeight - 220) {
      ctx.fillStyle = '#040D1A';
      ctx.beginPath();
      ctx.moveTo(0, this.worldHeight - 85);
      for (let sx = 0; sx <= this.worldWidth; sx += 240) {
        ctx.lineTo(sx, this.worldHeight - 85 + Math.sin(sx * 0.005) * 26);
      }
      ctx.lineTo(this.worldWidth, this.worldHeight);
      ctx.lineTo(0, this.worldHeight);
      ctx.closePath();
      ctx.fill();
      for (let vx = 480; vx < this.worldWidth - 400; vx += 840) {
        const pulse = 0.65 + 0.35 * Math.sin(now / 420 + vx);
        ctx.fillStyle = `rgba(0, 229, 255, ${(0.22 * pulse).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(vx, this.worldHeight - 95, 34 * pulse, 0, Math.PI * 2); ctx.fill();
        for (let b = 0; b < 3; b++) {
          const rise = ((now / 18 + b * 45 + vx) % 140);
          ctx.fillStyle = 'rgba(178, 235, 242, 0.35)';
          ctx.beginPath(); ctx.arc(vx + Math.sin(rise * 0.08) * 10, this.worldHeight - 100 - rise, 5 - rise * 0.02, 0, Math.PI * 2); ctx.fill();
        }
      }
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

    // Sunken Shipwreck & Coral Reef Shelves (replaces old floating kelpForest)
    if (this.shipwreck && this.shipwreck.y > this.cameraY - 260 && this.shipwreck.y < this.cameraY + h + 260) {
      const sw = this.shipwreck;
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.rotate(-0.08);
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.moveTo(-180, -30); ctx.lineTo(180, -24); ctx.lineTo(135, 58); ctx.lineTo(-145, 58); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4E342E';
      ctx.fillRect(-10, -145, 16, 120);
      ctx.fillRect(-72, -105, 140, 12);
      ctx.fillStyle = 'rgba(255, 213, 79, 0.35)';
      for (let p = -2; p <= 2; p++) {
        ctx.beginPath(); ctx.arc(p * 48, 12, 9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    for (const cs of this.coralShelves || []) {
      if (cs.y < this.cameraY - 120 || cs.y > this.cameraY + h + 120) continue;
      ctx.fillStyle = '#102A43';
      ctx.beginPath(); ctx.ellipse(cs.x, cs.y + 12, cs.width * 0.52, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cs.color + 'AA';
      for (let b = -2; b <= 2; b++) {
        ctx.beginPath(); ctx.arc(cs.x + b * (cs.width * 0.16), cs.y - 4 - (b % 2 === 0 ? 10 : 4), 16, 0, Math.PI * 2); ctx.fill();
      }
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

    // Fishes (with frustum culling & shared CreatureRenderer)
    for (const f of this.fishes) {
      const margin = f.length * 1.4;
      if (f.x + margin < this.cameraX || f.x - margin > this.cameraX + w ||
          f.y + margin < this.cameraY || f.y - margin > this.cameraY + h) {
        continue;
      }
      this.renderFish(ctx, f, now);
    }

    // Bubble bullets
    for (const bb of this.activeBubbles) {
      ctx.fillStyle = 'rgba(0,229,255,0.5)';
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Bobo dolphin (streamlined pink-belly dolphin synced with Android)
    if (this.bobo.active || this.bobo.isRescuing) {
      ctx.save();
      ctx.translate(this.bobo.x, this.bobo.y);
      ctx.scale(this.bobo.x > this.diverX ? -1 : 1, 1);
      const boboWave = Math.sin(now / 200) * 6;
      ctx.fillStyle = '#29B6F6';
      ctx.beginPath();
      ctx.moveTo(46, 2);
      ctx.quadraticCurveTo(18, -24, -26, -10);
      ctx.lineTo(-48, -16 + boboWave);
      ctx.lineTo(-38, 0);
      ctx.lineTo(-48, 16 + boboWave);
      ctx.lineTo(-26, 12);
      ctx.quadraticCurveTo(14, 22, 46, 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFCDD2';
      ctx.beginPath(); ctx.ellipse(4, 8, 24, 9, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#0288D1';
      ctx.beginPath(); ctx.moveTo(-2, -16); ctx.quadraticCurveTo(-12, -34, -20, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1A237E';
      ctx.beginPath(); ctx.arc(20, -4, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1A237E'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(24, 2, 7, 0.1, 1.35); ctx.stroke();
      ctx.restore();
    }

    // Rotating 4-Arc Aim Reticle + Soft Guide Line
    if (this.targetFish && this.harpoonState === 'IDLE') {
      const col = this.currentWeapon === 'HARPOON' ? 'rgba(255,215,0,0.88)' : 'rgba(0,229,255,0.88)';
      ctx.save();
      ctx.strokeStyle = this.currentWeapon === 'HARPOON' ? 'rgba(255,215,0,0.32)' : 'rgba(0,229,255,0.32)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(this.diverX + this.facingScale * 44, this.diverY + 8); ctx.lineTo(this.targetFish.x, this.targetFish.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.5;
      const r = this.targetFish.bodyHeight * 0.72;
      const rot = now * 0.0025;
      for (let a = 0; a < 4; a++) {
        const start = rot + a * (Math.PI / 2);
        ctx.beginPath(); ctx.arc(this.targetFish.x, this.targetFish.y, r, start, start + 0.9); ctx.stroke();
      }
      ctx.restore();
    }

    // Elastic Oscillating Bezier Harpoon Rope & Tip
    if (this.harpoonState !== 'IDLE') {
      const mx = (this.harpoonStartX + this.harpoonX) * 0.5;
      const my = (this.harpoonStartY + this.harpoonY) * 0.5;
      const rdx = this.harpoonX - this.harpoonStartX;
      const rdy = this.harpoonY - this.harpoonStartY;
      const rlen = Math.max(1, Math.hypot(rdx, rdy));
      const perpX = -rdy / rlen;
      const perpY = rdx / rlen;
      const vib = this.harpoonRopeAmp * Math.sin(now * 0.035);
      ctx.strokeStyle = '#FFDF00'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.harpoonStartX, this.harpoonStartY);
      ctx.quadraticCurveTo(mx + perpX * vib, my + perpY * vib, this.harpoonX, this.harpoonY);
      ctx.stroke();
      ctx.fillStyle = this.state.harpoonLevel >= 6 ? '#FFD700' : '#E0E0E0';
      ctx.beginPath(); ctx.arc(this.harpoonX, this.harpoonY, 8.5, 0, Math.PI * 2); ctx.fill();
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

    // 160m+ Deep Abyssal Headlamp Vignette (cached gradient)
    const depthMeters = Math.max(0, (this.diverY - 140) / 10);
    if (depthMeters > 160) {
      const darkFactor = Math.min(1, (depthMeters - 160) / 180);
      const fx = (this.diverX - this.cameraX) + this.facingScale * 95;
      const fy = this.diverY - this.cameraY;
      const beamR = this.state.getLightRadius() * 1.45;
      if (!this._cachedVigGrad || this._cachedVigR !== beamR || Math.abs(darkFactor - this._cachedVigDark) > 0.02) {
        this._cachedVigR = beamR;
        this._cachedVigDark = darkFactor;
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, beamR);
        grad.addColorStop(0, 'rgba(0,4,14,0)');
        grad.addColorStop(0.55, `rgba(0,6,18,${(0.37 * darkFactor).toFixed(2)})`);
        grad.addColorStop(1, `rgba(0,4,14,${(0.72 * darkFactor).toFixed(2)})`);
        this._cachedVigGrad = grad;
      }
      ctx.save();
      ctx.translate(fx, fy);
      ctx.fillStyle = this._cachedVigGrad;
      ctx.fillRect(-fx, -fy, w, h);
      ctx.restore();
    }

    this.renderHUD(ctx, w, h, now, depthMeters);
    ctx.restore();
  }

  renderFish(ctx, f, now = performance.now()) {
    const deepGlow = f.y > 1800 ? Math.min(1, (f.y - 1800) / 1400) : 0;
    renderCreature(ctx, f, { now, deepGlow, drawStatus: true });
  }

  renderKidDiver(ctx, now) {
    ctx.save();
    ctx.translate(this.diverX, this.diverY);
    ctx.scale(this.facingScale, 1);
    ctx.rotate(this.diverAngle);

    // Dual-layer Headlamp Cone (±28° flood + ±14° bright core, color temp scales with lightLevel)
    const lr = this.state.getLightRadius();
    const lLvl = this.state.lightLevel || 1;
    if (!this._cachedConeGrad || this._cachedConeLr !== lr || this._cachedConeLvl !== lLvl) {
      this._cachedConeLr = lr;
      this._cachedConeLvl = lLvl;
      const coneGrad = ctx.createRadialGradient(45, 0, 5, 45, 0, lr);
      coneGrad.addColorStop(0, lLvl >= 6 ? 'rgba(224,247,250,0.48)' : 'rgba(255,253,231,0.45)');
      coneGrad.addColorStop(0.55, lLvl >= 6 ? 'rgba(128,222,234,0.16)' : 'rgba(255,224,130,0.14)');
      coneGrad.addColorStop(1, 'rgba(0,0,0,0)');
      this._cachedConeGrad = coneGrad;
    }
    ctx.fillStyle = this._cachedConeGrad;
    ctx.beginPath();
    ctx.moveTo(42, -8); ctx.lineTo(lr, -lr * 0.42); ctx.lineTo(lr, lr * 0.42); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(42, -5); ctx.lineTo(lr * 0.85, -lr * 0.18); ctx.lineTo(lr * 0.85, lr * 0.18); ctx.closePath();
    ctx.fill();

    // Articulated 2-joint kicking legs + Lv.1~8 Evolving Flippers
    const k1 = Math.sin(this.swimCycle) * 14;
    const k2 = Math.sin(this.swimCycle + Math.PI) * 14;
    const spdLvl = this.state.speedLevel || 1;
    const finC1 = spdLvl >= 6 ? '#00E5FF' : (spdLvl >= 3 ? '#29B6F6' : '#FF6D00');
    const finC2 = spdLvl >= 6 ? '#FFD700' : (spdLvl >= 3 ? '#FFD54F' : '#FF8500');
    ctx.strokeStyle = '#01579B'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -10); ctx.lineTo(-42, -12 + k1 * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 10); ctx.lineTo(-42, 12 + k2 * 0.45); ctx.stroke();
    ctx.fillStyle = finC1;
    ctx.beginPath(); ctx.moveTo(-40, -12 + k1 * 0.45); ctx.lineTo(-76, -24 + k1); ctx.lineTo(-68, -4 + k1 * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = finC2;
    ctx.beginPath(); ctx.moveTo(-40, 12 + k2 * 0.45); ctx.lineTo(-76, 24 + k2); ctx.lineTo(-68, 4 + k2 * 0.7); ctx.closePath(); ctx.fill();

    // Lv.1~8 Evolving Oxygen Tank + Wetsuit
    const oxLvl = this.state.oxygenLevel || 1;
    ctx.fillStyle = '#455A64';
    ctx.fillRect(-32, -26, 10, 6);
    if (oxLvl >= 6) {
      ctx.fillStyle = '#ECEFF1';
      this.roundRect(ctx, -40, -24, 22, 48, 9); ctx.fill();
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect(-35, -14, 6, 28);
    } else if (oxLvl >= 3) {
      ctx.fillStyle = '#1565C0';
      this.roundRect(ctx, -38, -23, 20, 46, 8); ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(-38, -5, 20, 10);
    } else {
      ctx.fillStyle = '#FFD166';
      this.roundRect(ctx, -36, -22, 18, 44, 7); ctx.fill();
    }
    ctx.fillStyle = '#0077BE';
    this.roundRect(ctx, -24, -24, 50, 48, 16); ctx.fill();

    // Big Q-version Kid Portrait inside Scuba Helmet
    const oxPct = this.oxygen / this.maxOxygen;
    ctx.fillStyle = 'rgba(0,229,255,0.22)';
    ctx.beginPath(); ctx.arc(32, -20, 58, 0, Math.PI * 2); ctx.fill();
    if (this.kidHeadLoaded) {
      ctx.drawImage(this.kidHeadImg, -22, -74, 108, 108);
    }
    const helmetStroke = this.mountedCreature ? '#FFD700' : (oxPct < 0.25 ? '#FFB74D' : 'rgba(128,222,234,0.88)');
    ctx.strokeStyle = helmetStroke;
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(32, -20, 58, 0, Math.PI * 2); ctx.stroke();

    // Celebrate Golden Star Halo
    if (this.avatarCelebrateTimer > 0) {
      ctx.strokeStyle = 'rgba(255,215,0,0.75)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(32, -20, 66, 0, Math.PI * 2); ctx.stroke();
    }

    // Low-O2 cute sweat drop inside visor corner
    if (oxPct < 0.25) {
      ctx.fillStyle = '#80DEEA';
      ctx.beginPath();
      ctx.moveTo(64, -36); ctx.quadraticCurveTo(72, -24, 64, -20); ctx.quadraticCurveTo(56, -24, 64, -36);
      ctx.fill();
    }

    // Evolving Top Headlamp Housing
    ctx.fillStyle = lLvl >= 5 ? '#FFD700' : '#455A64';
    this.roundRect(ctx, 22, -84, 22, 11, 4); ctx.fill();
    ctx.fillStyle = lLvl >= 6 ? '#80DEEA' : '#FFF59D';
    ctx.beginPath(); ctx.arc(44, -78, lLvl >= 5 ? 7 : 5, 0, Math.PI * 2); ctx.fill();

    // 3D Glass Highlight Arc
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(32, -20, 48, Math.PI * 1.14, Math.PI * 1.46); ctx.stroke();

    // Gloved arm + Lv.1~8 Evolving Weapon
    const hLvl = this.state.harpoonLevel || 1;
    ctx.strokeStyle = '#0288D1'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(22, 12); ctx.stroke();
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath(); ctx.arc(22, 12, 5.5, 0, Math.PI * 2); ctx.fill();
    if (this.currentWeapon === 'HARPOON') {
      ctx.fillStyle = hLvl >= 6 ? '#FFB300' : (hLvl >= 3 ? '#1565C0' : '#455A64');
      this.roundRect(ctx, 18, 5, 36, 11, 4); ctx.fill();
      ctx.fillStyle = hLvl >= 6 ? '#FFF59D' : '#CFD8DC';
      ctx.beginPath(); ctx.moveTo(54, 4); ctx.lineTo(67, 10.5); ctx.lineTo(54, 17); ctx.closePath(); ctx.fill();
      if (hLvl >= 6) {
        // Golden Trident prongs
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(54, 4); ctx.lineTo(63, 0); ctx.moveTo(54, 17); ctx.lineTo(63, 21); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#00E5FF';
      this.roundRect(ctx, 18, 4, 34, 13, 5); ctx.fill();
      ctx.fillStyle = '#FF4081';
      ctx.beginPath(); ctx.arc(48, 10.5, 6, 0, Math.PI * 2); ctx.fill();
    }

    if (this.mountedCreature) {
      if (this.mountedCreature.species === 'TURTLE') {
        ctx.strokeStyle = 'rgba(105, 240, 174, 0.72)';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#FF80AB';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('♥', -8, -54);
    }

    ctx.restore();

    if (this.invincibleTimer > 0) {
      const pulse = 1 + 0.08 * Math.sin(now / 70);
      ctx.fillStyle = 'rgba(0,229,255,0.22)';
      ctx.strokeStyle = 'rgba(128,222,234,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.diverX, this.diverY - 8, 80 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Cute orbiting dizzy stars at top of helmet
      ctx.fillStyle = '#FFD700';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      for (let st = 0; st < 3; st++) {
        const ang = now * 0.006 + st * ((Math.PI * 2) / 3);
        ctx.fillText('⭐', this.diverX + Math.cos(ang) * 38, this.diverY - 82 + Math.sin(ang) * 10);
      }
      ctx.textAlign = 'left';
    }
  }

  getActionContext() {
    if (this.mountedCreature) return { icon: '⬇️', bg: 'rgba(67,160,71,0.92)' };
    if (this.bobo.active && !this.bobo.isRescuing && this.oxygen / this.maxOxygen < 0.25) {
      return { icon: '🐬', bg: 'rgba(255,64,129,0.94)' };
    }
    for (const c of this.treasureChests) {
      if (!c.opened && Math.hypot(this.diverX - c.x, this.diverY - c.y) < 140) return { icon: '🎁', bg: 'rgba(255,152,0,0.94)' };
    }
    for (const pc of this.pearlClams) {
      if (pc.hasPearl && Math.sin(pc.openCycle) > 0.35 && Math.hypot(this.diverX - pc.x, this.diverY - pc.y) < 120) return { icon: '🦪', bg: 'rgba(171,71,188,0.94)' };
    }
    for (const f of this.fishes) {
      if (f.isSleeping && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 120) return { icon: '💖', bg: 'rgba(236,64,122,0.94)' };
      if (f.species === 'TURTLE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 130) return { icon: '🐢', bg: 'rgba(67,160,71,0.94)' };
      if (f.species === 'BLUE_WHALE' && Math.hypot(this.diverX - f.x, this.diverY - f.y) < 180) return { icon: '🐋', bg: 'rgba(3,155,229,0.94)' };
    }
    return this.currentWeapon === 'HARPOON'
      ? { icon: '🎯', bg: 'rgba(255,179,0,0.90)' }
      : { icon: '🫧', bg: 'rgba(0,184,212,0.90)' };
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
        for (const pc of this.pearlClams) {
          if (pc.hasPearl && Math.sin(pc.openCycle) > 0.35 && Math.hypot(this.diverX - pc.x, this.diverY - pc.y) < 120) {
            prompt = '🦪 點一下拿珍珠!'; px = pc.x; py = pc.y - 68; bg = '#AB47BC'; break;
          }
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
    // Version badge (bottom-right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('v2.1', w - 14, h - 12);
    ctx.textAlign = 'left';

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

    // Bottom-right Context-Aware Action, Switch & One-Tap Surface Ascent Buttons
    const actR = 54 * Math.max(0.78, s);
    const actCx = w - 26 - actR;
    const actCy = h - 28 - actR;
    const actCtx = this.getActionContext();
    ctx.fillStyle = actCtx.bg;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(actCx, actCy, this.isTouchActionPressed ? actR * 0.9 : actR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = `${Math.round(actR * 0.72)}px sans-serif`;
    ctx.fillText(actCtx.icon, actCx, actCy + actR * 0.25);

    const swR = 36 * Math.max(0.78, s);
    const swCx = actCx - actR - 22 - swR;
    const swCy = h - 28 - swR;
    ctx.fillStyle = 'rgba(0,34,68,0.85)';
    ctx.strokeStyle = '#48CAE4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(swCx, swCy, swR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = `${Math.round(swR * 0.72)}px sans-serif`;
    ctx.fillText('🔄', swCx, swCy + swR * 0.26);

    // Floating One-Tap Surface Ascent / Bobo Rescue Bubble (O2 < 30% or depth > 120m)
    if ((oxPercent < 0.30 || depthMeters > 120) && !this.bobo.isRescuing) {
      const upR = 34 * Math.max(0.78, s);
      const upCx = actCx;
      const upCy = actCy - actR - 18 - upR;
      const breath = 1 + 0.06 * Math.sin(now * 0.0025);
      ctx.fillStyle = oxPercent < 0.25 ? 'rgba(255,64,129,0.92)' : (this.autoSurfaceActive ? 'rgba(0,229,255,0.92)' : 'rgba(2,136,209,0.88)');
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(upCx, upCy, upR * breath, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = `${Math.round(upR * 0.76)}px sans-serif`;
      ctx.fillText(oxPercent < 0.25 ? '🐬' : '⬆️', upCx, upCy + upR * 0.28);
    }

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
