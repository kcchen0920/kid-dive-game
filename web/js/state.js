const SAVE_KEY = 'kid_dive_game_save_v1';

export const MAX_TIER = 8;

const DEFAULT_DATA = {
  coins: 250,
  oxygenLevel: 1,
  speedLevel: 1,
  harpoonLevel: 1,
  lightLevel: 1,
  babySharkCount: 0,
  reefSharkCount: 0,
  tunaCount: 0,
  greatSharkCount: 0,
  anglerfishCount: 0,
  dunkleosteusCount: 0,
  pearlCount: 0,
};

export class GameState {
  constructor() {
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      Object.assign(this, DEFAULT_DATA, parsed);
    } catch {
      Object.assign(this, DEFAULT_DATA);
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: this.coins,
        oxygenLevel: this.oxygenLevel,
        speedLevel: this.speedLevel,
        harpoonLevel: this.harpoonLevel,
        lightLevel: this.lightLevel,
        babySharkCount: this.babySharkCount,
        reefSharkCount: this.reefSharkCount,
        tunaCount: this.tunaCount,
        greatSharkCount: this.greatSharkCount,
        anglerfishCount: this.anglerfishCount,
        dunkleosteusCount: this.dunkleosteusCount,
        pearlCount: this.pearlCount,
      }));
    } catch {}
  }

  resetGame() {
    Object.assign(this, { ...DEFAULT_DATA, coins: 200 });
    this.save();
  }

  getMaxOxygen() {
    return 120 + (this.oxygenLevel - 1) * 45;
  }

  getSwimSpeed() {
    return 230 + (this.speedLevel - 1) * 35;
  }

  getHarpoonRange() {
    return 420 + (this.harpoonLevel - 1) * 110;
  }

  getLightRadius() {
    return 380 + (this.lightLevel - 1) * 95;
  }

  addCaughtFish(name, value) {
    this.coins += value;
    if (name.includes('Baby Shark')) this.babySharkCount++;
    else if (name.includes('礁鯊')) this.reefSharkCount++;
    else if (name.includes('鮪')) this.tunaCount++;
    else if (name.includes('大白鯊')) this.greatSharkCount++;
    else if (name.includes('安康')) this.anglerfishCount++;
    else if (name.includes('鄧氏魚') || name.includes('Dunkleosteus')) this.dunkleosteusCount++;
    this.save();
  }

  static getTierCost(level) {
    const table = { 1: 150, 2: 350, 3: 750, 4: 1200, 5: 2000, 6: 3200, 7: 5000 };
    return table[level] || 9999;
  }

  isChallengeMet(level) {
    if (level === 3) return this.babySharkCount >= 1;
    if (level === 5) return this.reefSharkCount >= 1;
    if (level === 6) return this.tunaCount >= 1;
    if (level === 7) return this.greatSharkCount >= 1;
    return true;
  }

  static getChallengeIconBadge(level) {
    if (level === 3) return '🔒 🦈 0/1';
    if (level === 5) return '🔒 🐋 0/1';
    if (level === 6) return '🔒 🐟 0/1';
    if (level === 7) return '🔒 👑 0/1';
    return '';
  }
}
