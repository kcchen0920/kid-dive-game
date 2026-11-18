import { GameState, MAX_TIER } from './state.js';
import { SoundManager } from './audio.js';
import { DiveGame } from './dive.js';
import { AquariumGame } from './aquarium.js';

const state = new GameState();
const sound = new SoundManager();

// Unlock background music reliably on browser-accepted user gestures (click / touchend / pointerup / keydown)
const tryUnlockAudio = () => sound.unlock();
window.addEventListener('pointerup', tryUnlockAudio, { passive: true });
window.addEventListener('touchend', tryUnlockAudio, { passive: true });
window.addEventListener('click', tryUnlockAudio, { passive: true });
window.addEventListener('keydown', tryUnlockAudio, { passive: true });

const topNavBar = document.getElementById('top-nav-bar');
const navCoins = document.getElementById('nav-coins');
const navButtons = document.querySelectorAll('.nav-btn[data-mode]');
const btnMute = document.getElementById('btn-mute');
const btnReset = document.getElementById('btn-reset');

const diveCanvas = document.getElementById('dive-canvas');
const diveAudioBtn = document.getElementById('dive-audio-btn');
const shopView = document.getElementById('shop-view');
const theaterView = document.getElementById('theater-view');
const aquariumCanvas = document.getElementById('aquarium-canvas');

function updateAudioButtons() {
  btnMute.textContent = sound.muted ? '🔇 靜音' : '🔊 音效';
  if (sound.muted) {
    diveAudioBtn.textContent = '🔇 靜音';
    diveAudioBtn.classList.remove('waiting');
  } else if (sound.isBgmPlaying()) {
    diveAudioBtn.textContent = '🔊';
    diveAudioBtn.classList.remove('waiting');
  } else {
    diveAudioBtn.textContent = '🔊 點此開音樂';
    diveAudioBtn.classList.add('waiting');
  }
}

sound.onStateChange = updateAudioButtons;
diveAudioBtn.onclick = () => {
  if (sound.muted) {
    sound.toggleMute();
  } else if (!sound.isBgmPlaying()) {
    sound.unlock(true);
  } else {
    sound.toggleMute();
  }
  updateAudioButtons();
};

const resetModal = document.getElementById('reset-modal');
const resetTitle = document.getElementById('reset-title');
const resetOptions = document.getElementById('reset-options');
const resetCancel = document.getElementById('reset-cancel');

let currentMode = 'GAME';

function updateCoinsUI() {
  navCoins.textContent = `🐚 ${state.coins}`;
}

const diveGame = new DiveGame(diveCanvas, state, sound, {
  onCoinsUpdated: () => updateCoinsUI(),
  onOpenShop: () => switchMode('SHOP'),
});

const aquariumGame = new AquariumGame(aquariumCanvas, state, sound, () => updateCoinsUI());

// Shop Builder
const GEARS = [
  { key: 'oxygenLevel', icon: '🤿', title: '氧氣瓶' },
  { key: 'speedLevel', icon: '🐬', title: '潛水腳蹼' },
  { key: 'harpoonLevel', icon: '🎯', title: '魚叉槍' },
  { key: 'lightLevel', icon: '🔦', title: '探照燈' },
];

function renderShop() {
  shopView.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'shop-header';
  header.innerHTML = `
    <div class="shop-coins">🐚 ${state.coins}</div>
    <div class="trophy-bar">🏆 🦈×${state.babySharkCount} &nbsp; 🐋×${state.reefSharkCount} &nbsp; 🐟×${state.tunaCount} &nbsp; 👑×${state.greatSharkCount}</div>
  `;
  shopView.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  GEARS.forEach((g) => {
    const level = state[g.key];
    const cost = GameState.getTierCost(level);
    const challengeMet = state.isChallengeMet(level);
    const isMax = level >= MAX_TIER;

    const card = document.createElement('button');
    card.className = 'gear-card';
    const stars = Array.from({ length: MAX_TIER }, (_, i) => (i < level ? '★' : '☆')).join(' ');

    let challengeHtml = '<div class="gear-challenge" style="color:#00e676">✅</div>';
    let badgeClass = 'price-badge';
    let badgeText = `🐚 ${cost} ⬆️`;

    if (isMax) {
      challengeHtml = '<div class="gear-challenge"></div>';
      badgeClass += ' max';
      badgeText = '👑 MAX';
    } else if (!challengeMet) {
      challengeHtml = `<div class="gear-challenge" style="color:#ff5252">${GameState.getChallengeIconBadge(level)}</div>`;
      badgeClass += ' locked';
      badgeText = `🔒 🐚 ${cost}`;
    } else if (state.coins >= cost) {
      badgeClass += ' pulse';
    } else {
      badgeClass += ' locked';
      badgeText = `🐚 ${cost} 🔒`;
    }

    card.innerHTML = `
      <div class="gear-icon">${g.icon}</div>
      <div class="gear-title">${g.title}</div>
      <div class="gear-stars">${stars}</div>
      ${challengeHtml}
      <div class="${badgeClass}">${badgeText}</div>
    `;

    card.onclick = () => {
      sound.unlock();
      if (isMax || !challengeMet || state.coins < cost) {
        sound.playBubble();
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      state.coins -= cost;
      state[g.key]++;
      state.save();
      sound.playUpgrade();
      updateCoinsUI();
      renderShop();
    };
    grid.appendChild(card);
  });

  shopView.appendChild(grid);

  const goBtn = document.createElement('button');
  goBtn.className = 'dive-go-btn';
  goBtn.textContent = '🌊 潛水 GO! 🤿';
  goBtn.onclick = () => {
    sound.unlock();
    sound.playBubble();
    switchMode('GAME');
  };
  shopView.appendChild(goBtn);
}

// Theater Builder + Visualizer
const SONGS = [
  { title: 'Baby Shark', icon: '🦈', bg: '#0277BD', url: './assets/audio/song_baby_shark.wav' },
  { title: '鯊魚一家', icon: '👨‍👩‍👧‍👦', bg: '#00838F', url: './assets/audio/song_family_shark.wav' },
  { title: '海底派對', icon: '🌊🐠', bg: '#1565C0', url: './assets/audio/song_ocean_party.wav' },
  { title: '泡泡舞曲', icon: '🦀🫧', bg: '#6A1B9A', url: './assets/audio/song_bubble_dance.wav' },
];
let currentSongIdx = -1;
let stageRaf = null;

function renderTheater() {
  if (stageRaf) cancelAnimationFrame(stageRaf);
  theaterView.innerHTML = '<h2 class="theater-title">🎵 海洋音樂廳</h2>';

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'now-playing';
  nowPlaying.textContent = currentSongIdx >= 0 ? `${SONGS[currentSongIdx].icon} 🎶 🔊` : '🎧 👉 🎵';

  SONGS.forEach((s, idx) => {
    const playing = currentSongIdx === idx && sound.isChildSongPlaying(s.url);
    const card = document.createElement('button');
    card.className = 'song-card';
    card.innerHTML = `
      <div class="song-emoji" style="background:${s.bg}">${s.icon}</div>
      <div class="song-name">${s.title}</div>
      <div class="song-badge ${playing ? 'playing' : ''}">${playing ? '⏸️ 🎶' : '▶️'}</div>
    `;
    card.onclick = () => {
      sound.unlock();
      if (currentSongIdx === idx && sound.isChildSongPlaying(s.url)) {
        sound.stopChildSong();
        currentSongIdx = -1;
      } else {
        currentSongIdx = idx;
        sound.playChildSong(s.url);
      }
      renderTheater();
    };
    grid.appendChild(card);
  });

  theaterView.appendChild(grid);

  const stageBox = document.createElement('div');
  stageBox.className = 'theater-stage';
  stageBox.appendChild(nowPlaying);
  const stageCanvas = document.createElement('canvas');
  stageCanvas.id = 'stage-canvas';
  stageBox.appendChild(stageCanvas);
  theaterView.appendChild(stageBox);

  const colors = ['#FFD166', '#00E676', '#48CAE4', '#FF4081', '#B388FF'];
  const cast = ['🐠', '🦈', '🐬', '🦀'];
  const ctx = stageCanvas.getContext('2d');

  const drawStage = (now) => {
    if (currentMode !== 'THEATER') return;
    const rect = stageCanvas.getBoundingClientRect();
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(120, Math.floor(rect.height));
    if (stageCanvas.width !== w || stageCanvas.height !== h) {
      stageCanvas.width = w;
      stageCanvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    const playing = currentSongIdx >= 0 && sound.isChildSongPlaying(SONGS[currentSongIdx].url);
    const bars = 11;
    const areaW = w * 0.72;
    const startX = (w - areaW) / 2;
    const step = areaW / bars;
    for (let i = 0; i < bars; i++) {
      const f = playing ? 0.25 + 0.75 * Math.abs(Math.sin(now * 0.008 + i * 0.7)) : 0.14 + 0.08 * Math.abs(Math.sin(now * 0.002 + i));
      const bh = h * 0.36 * f;
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = playing ? 0.85 : 0.4;
      ctx.fillRect(startX + i * step, h - bh - 4, step * 0.58, bh);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    const spacing = Math.min(110, w * 0.18);
    const baseX = w / 2 - spacing * 1.5;
    for (let i = 0; i < cast.length; i++) {
      const bounce = playing ? -Math.abs(Math.sin(now * 0.007 + i)) * 18 : Math.sin(now * 0.002 + i) * 4;
      const icon = (playing && i === 1) ? SONGS[currentSongIdx].icon : cast[i];
      ctx.font = `${playing && i === 1 ? 52 : 42}px sans-serif`;
      ctx.fillText(icon, baseX + i * spacing, h * 0.58 + bounce);
    }
    stageRaf = requestAnimationFrame(drawStage);
  };
  stageRaf = requestAnimationFrame(drawStage);
}

// Mode Switching
function switchMode(mode) {
  currentMode = mode;
  diveGame.stop();
  aquariumGame.stop();
  if (stageRaf) cancelAnimationFrame(stageRaf);
  if (mode !== 'THEATER') {
    sound.stopChildSong();
    currentSongIdx = -1;
  }

  diveCanvas.classList.add('hidden');
  shopView.classList.add('hidden');
  theaterView.classList.add('hidden');
  aquariumCanvas.classList.add('hidden');

  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));

  if (mode === 'GAME') {
    topNavBar.classList.add('hidden');
    diveCanvas.classList.remove('hidden');
    diveAudioBtn.classList.remove('hidden');
    diveGame.initGame();
    diveGame.start();
  } else {
    topNavBar.classList.remove('hidden');
    diveAudioBtn.classList.add('hidden');
    if (mode === 'SHOP') {
      shopView.classList.remove('hidden');
      renderShop();
    } else if (mode === 'THEATER') {
      theaterView.classList.remove('hidden');
      renderTheater();
    } else if (mode === 'AQUARIUM') {
      aquariumCanvas.classList.remove('hidden');
      aquariumGame.start();
    }
  }
}

navButtons.forEach((btn) => {
  btn.onclick = () => {
    sound.unlock();
    switchMode(btn.dataset.mode);
  };
});

btnMute.onclick = () => {
  sound.toggleMute();
  updateAudioButtons();
};

// Parental Math Gate
btnReset.onclick = () => {
  const a = 2 + Math.floor(Math.random() * 7);
  const b = 2 + Math.floor(Math.random() * 7);
  const ans = a + b;
  const opts = [ans, ans + 1, Math.max(1, ans - 1)].sort(() => Math.random() - 0.5);

  resetTitle.textContent = `🔒 家長確認：${a} + ${b} = ?`;
  resetOptions.innerHTML = '';
  opts.forEach((val) => {
    const btn = document.createElement('button');
    btn.className = 'math-btn';
    btn.textContent = val;
    btn.onclick = () => {
      resetModal.classList.add('hidden');
      if (val === ans) {
        state.resetGame();
        updateCoinsUI();
        sound.playUpgrade();
        switchMode('GAME');
      } else {
        sound.playBubble();
      }
    };
    resetOptions.appendChild(btn);
  });
  resetModal.classList.remove('hidden');
};

resetCancel.onclick = () => resetModal.classList.add('hidden');

updateCoinsUI();
updateAudioButtons();
switchMode('GAME');
