export class SoundManager {
  constructor() {
    this.muted = false;
    this.bgm = new Audio('./assets/audio/bgm_ocean.wav');
    this.bgm.loop = true;
    this.bgm.volume = 0.38;

    this.songPlayer = null;
    this.currentSongUrl = null;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (!this.muted && !this.songPlayer) {
      this.bgm.play().catch(() => {});
    }
  }

  startBgm() {
    if (this.muted || this.songPlayer) return;
    this.bgm.play().catch(() => {});
  }

  pauseBgm() {
    this.bgm.pause();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.bgm.pause();
      if (this.songPlayer) this.songPlayer.pause();
    } else {
      if (this.songPlayer) this.songPlayer.play().catch(() => {});
      else this.startBgm();
    }
    return this.muted;
  }

  playSfx(file) {
    if (this.muted) return;
    try {
      const a = new Audio(`./assets/audio/${file}`);
      a.volume = 0.85;
      a.play().catch(() => {});
    } catch {}
  }

  playCatch() { this.playSfx('sfx_catch.wav'); }
  playBubble() { this.playSfx('sfx_bubble.wav'); }
  playHarpoon() { this.playSfx('sfx_harpoon.wav'); }
  playUpgrade() { this.playSfx('sfx_upgrade.wav'); }
  playHurt() { this.playSfx('sfx_hurt.wav'); }
  playChest() { this.playSfx('sfx_chest.wav'); }
  playPearl() { this.playSfx('sfx_pearl.wav'); }
  playBubbleGun() { this.playSfx('sfx_bubble_gun.wav'); }
  playDolphin() { this.playSfx('sfx_dolphin.wav'); }

  playChildSong(url) {
    this.stopChildSong(false);
    this.pauseBgm();
    this.currentSongUrl = url;
    this.songPlayer = new Audio(url);
    this.songPlayer.loop = true;
    this.songPlayer.volume = 0.95;
    if (!this.muted) {
      this.songPlayer.play().catch(() => {});
    }
  }

  stopChildSong(resumeBgm = true) {
    if (this.songPlayer) {
      this.songPlayer.pause();
      this.songPlayer = null;
    }
    this.currentSongUrl = null;
    if (resumeBgm && !this.muted) {
      this.startBgm();
    }
  }

  isChildSongPlaying(url) {
    return Boolean(this.songPlayer && this.currentSongUrl === url && !this.songPlayer.paused);
  }
}
