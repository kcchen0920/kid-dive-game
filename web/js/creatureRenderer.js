// Shared 1-Second Silhouette Creature Renderer for Dive & Aquarium (v1.9)
// ES Module — also attaches window.CreatureRenderer for convenience

export function renderCreature(ctx, f, options = {}) {
  const {
    now = performance.now(),
    deepGlow = 0, // 0..1 rim glow intensity in deep water
    drawStatus = true, // sleep bubble, telegraph amber arc
  } = options;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing || 1, 1);
  if (f.isSpinning && f.spin) {
    ctx.rotate((f.spin * Math.PI) / 180);
  }

  const len = f.length || f.size || 80;
  const bh = f.bodyHeight || len * 0.52;
  const hl = len * 0.5;
  const hh = bh * 0.46;
  const phase = f.swimPhase !== undefined ? f.swimPhase : (f.phase || 0);
  const tail = Math.sin(phase) * Math.min(14, hl * 0.12);
  const sp = f.species || 'CLOWNFISH';

  // Subtle deep-sea rim glow helper (no shadowBlur / BlurMaskFilter for high FPS)
  const rimStroke = deepGlow > 0.05
    ? `rgba(128, 222, 234, ${(0.22 + 0.30 * deepGlow).toFixed(2)})`
    : 'rgba(0, 0, 0, 0.45)';
  const rimWidth = deepGlow > 0.05 ? 3.2 : 2.4;

  if (sp === 'DUNKLEOSTEUS') {
    drawDunkleosteus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'MOSASAURUS') {
    drawMosasaurus(ctx, f, hl, hh, phase, rimStroke, rimWidth);
  } else if (sp === 'LIOPLEURODON') {
    drawLiopleurodon(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'PLESIOSAURUS') {
    drawPlesiosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'ELASMOSAURUS') {
    drawElasmosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'NOTHOSAURUS') {
    drawNothosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'ICHTHYOSAURUS') {
    drawIchthyosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth);
  } else if (sp === 'JELLYFISH' || sp === 'NEON_JELLYFISH') {
    drawJellyfish(ctx, f, hl, hh, phase);
  } else if (sp === 'TURTLE') {
    drawTurtle(ctx, f, hl, hh, phase, rimStroke);
  } else {
    drawStandardFish(ctx, f, sp, hl, hh, phase, tail, rimStroke, rimWidth);
  }

  // Calm amber telegraph arc (never harsh red)
  if (drawStatus && !f.isSleeping && (f.telegraphTimer > 0 || f.isAttacking)) {
    const pulse = 0.55 + 0.25 * Math.sin(now * 0.008);
    ctx.strokeStyle = `rgba(255, 193, 7, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hl * 0.55, 0, hh * 1.15, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
  }

  ctx.restore();

  // Sleep bubble overlay in world space
  if (drawStatus && f.isSleeping) {
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, Math.max(len, bh) * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💤', f.x, f.y - bh * 0.72);
    ctx.textAlign = 'left';
  }
}

function drawDunkleosteus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  // 1. Heterocercal Paleozoic Tail (tall upper lobe, short rounded lower lobe)
  ctx.fillStyle = '#1A237E';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.78, -hh * 0.18);
  ctx.quadraticCurveTo(-hl * 1.08, -hh * 0.52 + tail * 0.5, -hl * 1.38 + tail, -hh * 1.08);
  ctx.quadraticCurveTo(-hl * 1.12 + tail * 0.5, -hh * 0.12, -hl * 1.12 + tail * 0.8, hh * 0.56);
  ctx.quadraticCurveTo(-hl * 0.94, hh * 0.35, -hl * 0.78, hh * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Rear-set Dorsal Fin
  ctx.fillStyle = '#3949AB';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.25, -hh * 0.62);
  ctx.quadraticCurveTo(-hl * 0.46, -hh * 1.18, -hl * 0.62, -hh * 0.48);
  ctx.closePath();
  ctx.fill();

  // 3. Muscular Steel-Blue Rear Torso
  ctx.fillStyle = '#283593';
  ctx.beginPath();
  ctx.moveTo(hl * 0.22, -hh * 0.88);
  ctx.bezierCurveTo(-hl * 0.25, -hh * 0.92, -hl * 0.65, -hh * 0.48, -hl * 0.90, 0);
  ctx.bezierCurveTo(-hl * 0.65, hh * 0.46, -hl * 0.25, hh * 0.82, hl * 0.22, hh * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Belly highlight + two bright amber lateral stripes
  ctx.fillStyle = '#CFD8DC';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.24, hh * 0.42, hl * 0.42, hh * 0.24, -0.08, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hl * 0.04, -hh * 0.16);
  ctx.quadraticCurveTo(-hl * 0.35, -hh * 0.12, -hl * 0.72, -hh * 0.04);
  ctx.moveTo(hl * 0.02, hh * 0.06);
  ctx.quadraticCurveTo(-hl * 0.35, hh * 0.10, -hl * 0.66, hh * 0.08);
  ctx.stroke();

  // Thick Amber-Edged Pectoral Fin
  const finWave = Math.sin(phase * 0.9) * 0.22;
  ctx.save();
  ctx.translate(hl * 0.04, hh * 0.62);
  ctx.rotate(0.32 + finWave);
  ctx.fillStyle = '#4E342E';
  ctx.strokeStyle = '#FFB300';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, hh * 0.22, hl * 0.20, hh * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Scissor Bone-Plate Lower Jaw (animated snap on telegraph or feeding)
  let jawAng = 0.08 + 0.14 * Math.abs(Math.sin(phase * 0.65));
  if (f.telegraphTimer > 0) {
    jawAng = 0.10 + 0.30 * Math.abs(Math.sin(f.telegraphTimer * 22));
  } else if (f.chompTimer > 0) {
    jawAng = 0.06 + 0.32 * Math.abs(Math.sin(f.chompTimer * 26));
  }
  ctx.save();
  ctx.translate(hl * 0.28, hh * 0.26);
  ctx.rotate(jawAng);
  // Armored lower chin
  ctx.fillStyle = '#4E342E';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hl * 0.66, hh * 0.04);
  ctx.quadraticCurveTo(hl * 0.56, hh * 0.44, hl * 0.02, hh * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFB300';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Rounded Ivory Lower Shearing Bone Blade
  ctx.fillStyle = '#FFF8E1';
  ctx.beginPath();
  ctx.moveTo(hl * 0.14, 0);
  ctx.quadraticCurveTo(hl * 0.32, -hh * 0.18, hl * 0.44, -hh * 0.04);
  ctx.quadraticCurveTo(hl * 0.55, -hh * 0.20, hl * 0.65, 0);
  ctx.lineTo(hl * 0.62, hh * 0.10);
  ctx.lineTo(hl * 0.14, hh * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFB300';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // 5. Heavy Armored Head Shield (42% of length, stepped collar)
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(hl * 0.06, -hh * 0.96);
  ctx.bezierCurveTo(hl * 0.46, -hh * 1.06, hl * 0.88, -hh * 0.66, hl * 0.98, -hh * 0.06);
  ctx.lineTo(hl * 0.94, hh * 0.16);
  ctx.lineTo(hl * 0.44, hh * 0.18);
  ctx.lineTo(hl * 0.22, hh * 0.34);
  ctx.lineTo(hl * 0.06, hh * 0.84);
  ctx.quadraticCurveTo(hl * 0.18, 0, hl * 0.06, -hh * 0.96);
  ctx.closePath();
  ctx.fill();

  // Lighter highlight top armor plate
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(hl * 0.14, -hh * 0.86);
  ctx.quadraticCurveTo(hl * 0.54, -hh * 0.94, hl * 0.86, -hh * 0.46);
  ctx.quadraticCurveTo(hl * 0.48, -hh * 0.44, hl * 0.16, -hh * 0.36);
  ctx.closePath();
  ctx.fill();

  // Upper Ivory Shearing Bone Blade
  ctx.fillStyle = '#FFF8E1';
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, hh * 0.12);
  ctx.lineTo(hl * 0.95, hh * 0.10);
  ctx.quadraticCurveTo(hl * 0.86, hh * 0.32, hl * 0.72, hh * 0.18);
  ctx.quadraticCurveTo(hl * 0.58, hh * 0.32, hl * 0.46, hh * 0.18);
  ctx.closePath();
  ctx.fill();

  // Bold 3px Amber-Gold Armor Collar & Plate Seams
  ctx.strokeStyle = '#FFB300';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hl * 0.06, -hh * 0.96);
  ctx.bezierCurveTo(hl * 0.46, -hh * 1.06, hl * 0.88, -hh * 0.66, hl * 0.98, -hh * 0.06);
  ctx.stroke();
  // Stepped collar arc
  ctx.beginPath();
  ctx.moveTo(hl * 0.06, -hh * 0.96);
  ctx.quadraticCurveTo(hl * 0.22, 0, hl * 0.06, hh * 0.84);
  ctx.stroke();
  // Geometric plate seams
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hl * 0.38, -hh * 0.94);
  ctx.lineTo(hl * 0.30, -hh * 0.22);
  ctx.lineTo(hl * 0.72, -hh * 0.16);
  ctx.moveTo(hl * 0.30, -hh * 0.22);
  ctx.lineTo(hl * 0.14, hh * 0.25);
  ctx.stroke();

  // 3 Cartoon Gold Armor Rivets
  ctx.fillStyle = '#FFD54F';
  for (const [rx, ry] of [[hl * 0.22, -hh * 0.62], [hl * 0.22, -hh * 0.30], [hl * 0.20, hh * 0.04]]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Prominent Glowing Eye with Amber Sclerotic Ring
  const ex = hl * 0.56;
  const ey = -hh * 0.30;
  ctx.fillStyle = '#FFB300';
  ctx.beginPath(); ctx.arc(ex, ey, 10.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#80DEEA';
  ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath(); ctx.arc(ex + 1.5, ey, 4.0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex + 3.0, ey - 2.2, 2.0, 0, Math.PI * 2); ctx.fill();
}

function drawMosasaurus(ctx, f, hl, hh, phase, rimStroke, rimWidth) {
  const s1 = Math.sin(phase) * hh * 0.24;
  const s2 = Math.sin(phase - 1.3) * hh * 0.38;
  const pad = Math.sin(phase * 0.9) * 0.26;
  const jawOpen = 0.06 + 0.10 * Math.abs(Math.sin(phase * 0.55));

  // 1. Two-segment Sea-Snake Long Tail with Upturned Tail Fluke
  ctx.fillStyle = '#006064';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.45, -hh * 0.42);
  ctx.quadraticCurveTo(-hl * 0.92, -hh * 0.28 + s1, -hl * 1.48, s2 - hh * 0.12);
  ctx.lineTo(-hl * 1.62, s2 - hh * 0.65);
  ctx.quadraticCurveTo(-hl * 1.44, s2 + hh * 0.18, -hl * 1.56, s2 + hh * 0.42);
  ctx.quadraticCurveTo(-hl * 0.95, hh * 0.32 + s1, -hl * 0.45, hh * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Elongated Streamlined Body
  ctx.fillStyle = '#006064';
  ctx.beginPath();
  ctx.moveTo(hl * 0.55, -hh * 0.46);
  ctx.bezierCurveTo(hl * 0.15, -hh * 0.88, -hl * 0.25, -hh * 0.78, -hl * 0.52, -hh * 0.36);
  ctx.lineTo(-hl * 0.52, hh * 0.38);
  ctx.bezierCurveTo(-hl * 0.25, hh * 0.74, hl * 0.15, hh * 0.78, hl * 0.55, hh * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Creamy White Belly
  ctx.fillStyle = '#E0F7FA';
  ctx.beginPath();
  ctx.ellipse(hl * 0.02, hh * 0.34, hl * 0.48, hh * 0.30, 0, 0, Math.PI);
  ctx.fill();

  // Neon Cyan Serrated Dorsal Ridge Scales
  ctx.fillStyle = '#26C6DA';
  ctx.beginPath();
  ctx.moveTo(hl * 0.42, -hh * 0.52);
  for (let i = 0; i < 8; i++) {
    const sx = hl * 0.36 - i * hl * 0.18;
    const sy = -hh * (0.72 - i * 0.05) + (i > 4 ? s1 * 0.4 : 0);
    ctx.lineTo(sx, sy - hh * 0.28);
    ctx.lineTo(sx - hl * 0.09, sy + hh * 0.04);
  }
  ctx.closePath();
  ctx.fill();

  // Four Swept Paddles
  ctx.fillStyle = '#00838F';
  ctx.strokeStyle = '#26C6DA';
  ctx.lineWidth = 2;
  ctx.save(); ctx.translate(hl * 0.22, hh * 0.56); ctx.rotate(0.45 + pad);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.22, hl * 0.17, hh * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.24, hh * 0.50); ctx.rotate(-0.35 - pad);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.18, hl * 0.14, hh * 0.30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();

  // 3. Long Crocodile-Style Giant Jaw (28% of total length)
  // Upper snout
  ctx.fillStyle = '#006064';
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, -hh * 0.54);
  ctx.quadraticCurveTo(hl * 0.85, -hh * 0.58, hl * 1.12, -hh * 0.14);
  ctx.lineTo(hl * 1.08, hh * 0.06);
  ctx.lineTo(hl * 0.46, hh * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#26C6DA';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Friendly Rounded White Teeth on upper jaw
  ctx.fillStyle = '#FFFFFF';
  for (let t = 0; t < 5; t++) {
    ctx.beginPath();
    ctx.arc(hl * 0.58 + t * hl * 0.10, hh * 0.09, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lower hinged jaw
  ctx.save();
  ctx.translate(hl * 0.48, hh * 0.14);
  ctx.rotate(jawOpen);
  ctx.fillStyle = '#E0F7FA';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hl * 0.56, hh * 0.02);
  ctx.quadraticCurveTo(hl * 0.46, hh * 0.34, 0, hh * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#006064';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Bright Eye
  ctx.fillStyle = '#FFF176';
  ctx.beginPath(); ctx.arc(hl * 0.64, -hh * 0.26, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(hl * 0.66, -hh * 0.26, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(hl * 0.68, -hh * 0.30, 1.6, 0, Math.PI * 2); ctx.fill();
}

function drawLiopleurodon(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const fPad = Math.sin(phase) * 0.34;
  const rPad = Math.sin(phase + Math.PI) * 0.34;

  // 1. Short Thick Tail
  ctx.fillStyle = '#455A64';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.55, -hh * 0.34);
  ctx.quadraticCurveTo(-hl * 0.88, tail * 0.4, -hl * 1.10, tail * 0.7);
  ctx.quadraticCurveTo(-hl * 0.86, hh * 0.36, -hl * 0.55, hh * 0.34);
  ctx.closePath();
  ctx.fill();

  // 2. Massive Diamond Flippers (Back Pair)
  ctx.fillStyle = '#37474F';
  ctx.strokeStyle = '#FF8A65';
  ctx.lineWidth = 2;
  ctx.save(); ctx.translate(hl * 0.10, -hh * 0.65); ctx.rotate(-0.45 - fPad * 0.6);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-hl * 0.16, -hh * 0.85); ctx.lineTo(-hl * 0.34, -hh * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.36, -hh * 0.56); ctx.rotate(-0.35 - rPad * 0.6);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-hl * 0.15, -hh * 0.75); ctx.lineTo(-hl * 0.30, -hh * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();

  // 3. Chunky Stocky Torso + Huge Triangular Head (35% length!)
  ctx.fillStyle = '#455A64';
  ctx.beginPath();
  ctx.moveTo(hl * 1.12, 0);
  ctx.lineTo(hl * 0.42, -hh * 0.76);
  ctx.bezierCurveTo(hl * 0.05, -hh * 1.02, -hl * 0.38, -hh * 0.88, -hl * 0.64, -hh * 0.32);
  ctx.lineTo(-hl * 0.64, hh * 0.34);
  ctx.bezierCurveTo(-hl * 0.38, hh * 0.88, hl * 0.05, hh * 0.96, hl * 0.44, hh * 0.66);
  ctx.lineTo(hl * 1.12, hh * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Light Gold Belly
  ctx.fillStyle = '#FFF3E0';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.05, hh * 0.44, hl * 0.48, hh * 0.34, 0, 0, Math.PI);
  ctx.fill();

  // Bright Coral-Orange Patches (high contrast!)
  ctx.fillStyle = '#FF8A65';
  for (const [sx, sy, rx, ry] of [
    [hl * 0.24, -hh * 0.42, hl * 0.14, hh * 0.20],
    [-hl * 0.10, -hh * 0.46, hl * 0.16, hh * 0.22],
    [-hl * 0.42, -hh * 0.26, hl * 0.12, hh * 0.18],
  ]) {
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  // Massive Diamond Flippers (Front Pair, 1.2x body height!)
  ctx.fillStyle = '#546E7A';
  ctx.strokeStyle = '#FF8A65';
  ctx.lineWidth = 2.4;
  ctx.save(); ctx.translate(hl * 0.14, hh * 0.56); ctx.rotate(0.28 + fPad);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hl * 0.12, hh * 0.62); ctx.lineTo(-hl * 0.16, hh * 1.05); ctx.lineTo(-hl * 0.24, hh * 0.34); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.32, hh * 0.52); ctx.rotate(-0.18 + rPad);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hl * 0.08, hh * 0.56); ctx.lineTo(-hl * 0.16, hh * 0.94); ctx.lineTo(-hl * 0.22, hh * 0.30); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();

  // Jaw line + rounded teeth
  ctx.strokeStyle = '#FFF3E0';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hl * 0.45, hh * 0.22);
  ctx.lineTo(hl * 1.06, hh * 0.10);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  for (let t = 0; t < 5; t++) {
    ctx.beginPath(); ctx.arc(hl * 0.54 + t * hl * 0.11, hh * 0.20 - t * hh * 0.02, 3.0, 0, Math.PI * 2); ctx.fill();
  }

  // Eye on giant head
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(hl * 0.58, -hh * 0.26, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(hl * 0.60, -hh * 0.26, 3.8, 0, Math.PI * 2); ctx.fill();
}

function drawPlesiosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const flap = Math.sin(phase * 1.1) * 0.40;
  const neckNod = Math.sin(phase * 0.8) * hh * 0.18;

  // Short pointed tail
  ctx.fillStyle = '#00897B';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.46, -hh * 0.22);
  ctx.quadraticCurveTo(-hl * 0.85, tail * 0.4, -hl * 1.05, tail * 0.6);
  ctx.quadraticCurveTo(-hl * 0.82, hh * 0.28, -hl * 0.46, hh * 0.24);
  ctx.closePath();
  ctx.fill();

  // Back wing paddles
  ctx.fillStyle = '#00695C';
  ctx.save(); ctx.translate(hl * 0.14, -hh * 0.62); ctx.rotate(-0.55 - flap * 0.6);
  ctx.beginPath(); ctx.ellipse(0, -hh * 0.34, hl * 0.15, hh * 0.46, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.26, -hh * 0.56); ctx.rotate(-0.45 - flap * 0.6);
  ctx.beginPath(); ctx.ellipse(0, -hh * 0.30, hl * 0.13, hh * 0.40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  // Plump Turtle-Like Rounded Torso
  ctx.fillStyle = '#00897B';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.06, 0, hl * 0.56, hh * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Light Green Belly + Lemon-Yellow Polka Dots
  ctx.fillStyle = '#B2DFDB';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.06, hh * 0.42, hl * 0.42, hh * 0.36, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#FFF176';
  for (const [dx, dy, r] of [[-hl * 0.26, -hh * 0.32, 7.5], [-hl * 0.04, -hh * 0.48, 8.5], [hl * 0.16, -hh * 0.24, 7], [-hl * 0.14, -hh * 0.06, 6]]) {
    ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
  }

  // Graceful S-Curved Mid-Long Neck (0.7x body length)
  const headX = hl * 1.12;
  const headY = -hh * 0.85 + neckNod;
  ctx.strokeStyle = '#00897B';
  ctx.lineWidth = hh * 0.48;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hl * 0.36, -hh * 0.14);
  ctx.bezierCurveTo(hl * 0.72, -hh * 0.12, hl * 0.76, -hh * 0.96, headX - 6, headY);
  ctx.stroke();
  // Belly highlight along neck
  ctx.strokeStyle = '#B2DFDB';
  ctx.lineWidth = hh * 0.16;
  ctx.beginPath();
  ctx.moveTo(hl * 0.38, hh * 0.04);
  ctx.bezierCurveTo(hl * 0.74, hh * 0.02, hl * 0.80, -hh * 0.80, headX - 8, headY + 6);
  ctx.stroke();

  // Cute Dinosaur Head + Little Crest
  ctx.fillStyle = '#FFF176';
  ctx.beginPath();
  ctx.moveTo(headX - 8, headY - 10);
  ctx.lineTo(headX - 18, headY - 22);
  ctx.lineTo(headX + 2, headY - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#00897B';
  ctx.beginPath();
  ctx.ellipse(headX + 4, headY, 22, 13, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Eye & happy smile
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(headX + 10, headY - 4, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(headX + 11.5, headY - 4, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E0F2F1'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(headX + 12, headY + 2, 7, 0.15, 1.35); ctx.stroke();

  // Large Wing-Like Front Paddles (Synchronized Underwater Flight)
  ctx.fillStyle = '#26A69A';
  ctx.strokeStyle = '#FFF176';
  ctx.lineWidth = 2.2;
  ctx.save(); ctx.translate(hl * 0.16, hh * 0.58); ctx.rotate(0.28 + flap);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.42, hl * 0.17, hh * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.28, hh * 0.54); ctx.rotate(-0.22 + flap);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.36, hl * 0.15, hh * 0.54, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawElasmosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const flap = Math.sin(phase * 1.0) * 0.34;
  const w1 = Math.sin(phase * 0.9) * hh * 0.32;
  const w2 = Math.sin(phase * 0.9 - 1.5) * hh * 0.38;

  // Tail
  ctx.fillStyle = '#1E88E5';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.50, -hh * 0.22);
  ctx.quadraticCurveTo(-hl * 0.90, tail * 0.5, -hl * 1.12, tail);
  ctx.quadraticCurveTo(-hl * 0.86, hh * 0.26, -hl * 0.50, hh * 0.24);
  ctx.closePath();
  ctx.fill();

  // Compact Gem-Blue Body (shifted slightly back to emphasize ultra-long neck)
  ctx.fillStyle = '#1E88E5';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.16, 0, hl * 0.48, hh * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Silver-White Belly
  ctx.fillStyle = '#E3F2FD';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.16, hh * 0.36, hl * 0.36, hh * 0.32, 0, 0, Math.PI);
  ctx.fill();

  // Ultra-Long Swan Neck (1.4x body length, Double-S Traveling Wave!)
  const nx0 = hl * 0.22, ny0 = -hh * 0.12;
  const nx1 = hl * 0.72, ny1 = -hh * 0.88 + w1;
  const nx2 = hl * 1.12, ny2 = hh * 0.22 + w2;
  const headX = hl * 1.56;
  const headY = -hh * 0.72 + w2 * 0.8;

  ctx.strokeStyle = '#1E88E5';
  ctx.lineWidth = hh * 0.34;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nx0, ny0);
  ctx.bezierCurveTo(nx1, ny1, nx2, ny2, headX - 4, headY);
  ctx.stroke();

  // Neon Sky-Blue Neck Rings (instant visual distinction from Plesiosaurus!)
  ctx.strokeStyle = '#80D8FF';
  ctx.lineWidth = 4;
  for (const t of [0.22, 0.44, 0.66, 0.84]) {
    const it = 1 - t;
    const rx = it * it * it * nx0 + 3 * it * it * t * nx1 + 3 * it * t * t * nx2 + t * t * t * (headX - 4);
    const ry = it * it * it * ny0 + 3 * it * it * t * ny1 + 3 * it * t * t * ny2 + t * t * t * headY;
    ctx.beginPath();
    ctx.arc(rx, ry, hh * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Playful Tiny Head
  ctx.fillStyle = '#1E88E5';
  ctx.beginPath();
  ctx.ellipse(headX + 6, headY, 17, 10, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#80D8FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(headX + 11, headY - 3, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(headX + 12.2, headY - 3, 2.2, 0, Math.PI * 2); ctx.fill();

  // Graceful Paddles
  ctx.fillStyle = '#42A5F5';
  ctx.strokeStyle = '#80D8FF';
  ctx.lineWidth = 2;
  ctx.save(); ctx.translate(hl * 0.04, hh * 0.56); ctx.rotate(0.28 + flap);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.36, hl * 0.14, hh * 0.52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.34, hh * 0.52); ctx.rotate(-0.22 - flap);
  ctx.beginPath(); ctx.ellipse(0, hh * 0.32, hl * 0.12, hh * 0.46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawNothosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const step = Math.sin(phase * 1.2) * 0.35;

  // Long Whip-Like Tail
  ctx.fillStyle = '#689F38';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.45, -hh * 0.24);
  ctx.quadraticCurveTo(-hl * 1.05, tail * 0.5, -hl * 1.52, tail * 1.1);
  ctx.quadraticCurveTo(-hl * 1.00, hh * 0.28, -hl * 0.45, hh * 0.24);
  ctx.closePath();
  ctx.fill();

  // Flat Sleek Sea-Lizard / Otter Torso
  ctx.fillStyle = '#689F38';
  ctx.beginPath();
  ctx.ellipse(0, 0, hl * 0.62, hh * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Cream Belly
  ctx.fillStyle = '#F1F8E9';
  ctx.beginPath();
  ctx.ellipse(0, hh * 0.26, hl * 0.48, hh * 0.24, 0, 0, Math.PI);
  ctx.fill();

  // Bright Yellow Tiger Stripes along Back
  ctx.strokeStyle = '#FFEE58';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const sx = i * hl * 0.20;
    ctx.beginPath();
    ctx.moveTo(sx, -hh * 0.54);
    ctx.lineTo(sx - hl * 0.05, -hh * 0.06);
    ctx.stroke();
  }

  // Short Neck + Lizard Head
  const headX = hl * 0.92;
  const headY = -hh * 0.22 + Math.sin(phase * 0.9) * 5;
  ctx.strokeStyle = '#689F38';
  ctx.lineWidth = hh * 0.46;
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, -hh * 0.04);
  ctx.lineTo(headX - 8, headY);
  ctx.stroke();
  ctx.fillStyle = '#689F38';
  ctx.beginPath();
  ctx.ellipse(headX + 6, headY, 24, 12, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(headX + 12, headY - 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(headX + 13.5, headY - 4, 2.5, 0, Math.PI * 2); ctx.fill();

  // Webbed Short Clawed Feet (distinct from wing paddles!)
  const drawWebbedFoot = (fx, fy, rot) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.strokeStyle = '#558B2F';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hh * 0.50); ctx.stroke();
    // Webbed 3-toe fan
    ctx.fillStyle = '#FFEE58';
    ctx.beginPath();
    ctx.moveTo(0, hh * 0.44);
    ctx.lineTo(-10, hh * 0.72);
    ctx.lineTo(0, hh * 0.78);
    ctx.lineTo(10, hh * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawWebbedFoot(hl * 0.26, hh * 0.42, 0.30 + step);
  drawWebbedFoot(-hl * 0.28, hh * 0.42, -0.25 - step);
}

function drawIchthyosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  // Tall Sickle Dorsal Fin
  ctx.fillStyle = '#3949AB';
  ctx.beginPath();
  ctx.moveTo(hl * 0.08, -hh * 0.76);
  ctx.quadraticCurveTo(-hl * 0.16, -hh * 1.72, -hl * 0.36, -hh * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#80DEEA';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Symmetrical High-Speed Crescent Tail
  ctx.fillStyle = '#3949AB';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.62, 0);
  ctx.quadraticCurveTo(-hl * 0.94, -hh * 0.52, -hl * 1.24 + tail, -hh * 1.02);
  ctx.quadraticCurveTo(-hl * 0.94 + tail * 0.4, 0, -hl * 1.24 + tail, hh * 1.02);
  ctx.quadraticCurveTo(-hl * 0.94, hh * 0.52, -hl * 0.62, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#80DEEA';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dolphin-Like Body + Exaggerated Needle Snout (30% of length!)
  ctx.fillStyle = '#3949AB';
  ctx.beginPath();
  ctx.moveTo(hl * 1.24, hh * 0.04);
  ctx.lineTo(hl * 0.66, -hh * 0.18);
  ctx.bezierCurveTo(hl * 0.38, -hh * 1.05, -hl * 0.36, -hh * 0.92, -hl * 0.72, 0);
  ctx.bezierCurveTo(-hl * 0.36, hh * 0.88, hl * 0.38, hh * 0.92, hl * 0.66, hh * 0.22);
  ctx.lineTo(hl * 1.24, hh * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Pure White Belly
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(hl * 0.02, hh * 0.38, hl * 0.52, hh * 0.32, 0, 0, Math.PI);
  ctx.fill();

  // Bright Silver-Cyan Side Lightning Stripe
  ctx.strokeStyle = '#80DEEA';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.56, 0);
  ctx.lineTo(-hl * 0.12, -hh * 0.16);
  ctx.lineTo(hl * 0.08, hh * 0.04);
  ctx.lineTo(hl * 0.54, -hh * 0.14);
  ctx.stroke();

  // Pectoral Fin
  ctx.fillStyle = '#5C6BC0';
  ctx.beginPath();
  ctx.ellipse(hl * 0.10, hh * 0.64, hl * 0.18, hh * 0.28, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Huge Sparkling Round Eye with Sclerotic Ring (signature Ichthyosaur trait!)
  const ex = hl * 0.46;
  const ey = -hh * 0.22;
  ctx.fillStyle = '#80DEEA';
  ctx.beginPath(); ctx.arc(ex, ey, 11.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex, ey, 8.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1A237E';
  ctx.beginPath(); ctx.arc(ex + 1.5, ey, 5.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex + 3.2, ey - 2.6, 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawJellyfish(ctx, f, hl, hh, phase) {
  const pulse = Math.sin(phase * 1.4) * 0.12;
  ctx.fillStyle = f.primaryColor || '#E040FB';
  ctx.beginPath();
  ctx.arc(0, -hh * 0.15, hl * (0.72 + pulse), Math.PI, 0);
  ctx.quadraticCurveTo(hl * (0.72 + pulse), hh * 0.25, -hl * (0.72 + pulse), hh * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, -hh * 0.3, hl * 0.42, hh * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = f.secondaryColor || '#00E5FF';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let t = -2; t <= 2; t++) {
    const tx = t * (hl * 0.24);
    const tw = Math.sin(phase + t) * 7;
    ctx.beginPath();
    ctx.moveTo(tx, hh * 0.2);
    ctx.quadraticCurveTo(tx + tw, hh * 0.65, tx - tw * 0.5, hh * 1.15);
    ctx.stroke();
  }
}

function drawTurtle(ctx, f, hl, hh, phase, rimStroke) {
  const flap = Math.sin(phase) * 0.25;
  ctx.fillStyle = f.secondaryColor || '#FFD54F';
  ctx.save(); ctx.translate(hl * 0.32, hh * 0.55); ctx.rotate(0.4 + flap);
  ctx.beginPath(); ctx.ellipse(0, 0, hl * 0.28, hh * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(-hl * 0.34, hh * 0.50); ctx.rotate(-0.3 - flap);
  ctx.beginPath(); ctx.ellipse(0, 0, hl * 0.22, hh * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Head
  ctx.fillStyle = '#43A047';
  ctx.beginPath(); ctx.ellipse(hl * 0.85, -hh * 0.08, hl * 0.22, hh * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  // Shell
  ctx.fillStyle = f.primaryColor || '#2E7D32';
  ctx.beginPath(); ctx.ellipse(0, 0, hl * 0.78, hh * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -hh * 0.08, hl * 0.45, hh * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
  // Eye & blush
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(hl * 0.92, -hh * 0.16, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(hl * 0.94, -hh * 0.16, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF8A80'; ctx.beginPath(); ctx.arc(hl * 0.88, hh * 0.04, 3.5, 0, Math.PI * 2); ctx.fill();
}

function drawStandardFish(ctx, f, sp, hl, hh, phase, tail, rimStroke, rimWidth) {
  ctx.fillStyle = f.secondaryColor || '#FFFFFF';
  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-hl * 0.15, -hh * 0.82);
  ctx.quadraticCurveTo(-hl * 0.35, -hh * 1.45, -hl * 0.52, -hh * 0.72);
  ctx.closePath();
  ctx.fill();
  // Crescent tail
  ctx.beginPath();
  ctx.moveTo(-hl * 0.68, 0);
  ctx.quadraticCurveTo(-hl * 0.95, -hh * 0.5, -hl * 1.18 + tail, -hh * 0.85);
  ctx.quadraticCurveTo(-hl * 0.92 + tail * 0.4, 0, -hl * 1.18 + tail, hh * 0.85);
  ctx.quadraticCurveTo(-hl * 0.95, hh * 0.5, -hl * 0.68, 0);
  ctx.fill();

  // Streamlined body
  ctx.fillStyle = f.primaryColor || '#FF6D00';
  ctx.beginPath();
  ctx.moveTo(hl * 0.88, 0);
  ctx.bezierCurveTo(hl * 0.55, -hh * 1.05, -hl * 0.45, -hh * 0.95, -hl * 0.78, 0);
  ctx.bezierCurveTo(-hl * 0.45, hh * 0.95, hl * 0.55, hh * 1.05, hl * 0.88, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Belly highlight
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(hl * 0.08, hh * 0.34, hl * 0.54, hh * 0.36, 0, 0, Math.PI);
  ctx.fill();

  if (sp === 'CLOWNFISH') {
    for (const bx of [hl * 0.32, -hl * 0.05, -hl * 0.42]) {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(bx - 2, -hh * 0.72, hl * 0.16 + 4, hh * 1.44);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx, -hh * 0.70, hl * 0.16, hh * 1.40);
    }
  } else if (sp === 'BLUE_TANG') {
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.ellipse(-hl * 0.08, -hh * 0.15, hl * 0.36, hh * 0.38, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp === 'GIANT_TUNA') {
    ctx.strokeStyle = '#E1F5FE'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-hl * 0.6, 0); ctx.lineTo(hl * 0.55, -hh * 0.08); ctx.stroke();
    ctx.fillStyle = '#FFD600';
    for (let ft = 0; ft < 4; ft++) {
      ctx.beginPath(); ctx.arc(-hl * 0.45 - ft * 10, -hh * 0.55 + ft * 4, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (sp === 'ANGLERFISH') {
    ctx.strokeStyle = '#80DEEA'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(hl * 0.55, -hh * 0.7); ctx.quadraticCurveTo(hl * 0.85, -hh * 1.15, hl * 0.98, -hh * 0.65); ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(0,229,255,0.6)';
    ctx.beginPath(); ctx.arc(hl * 0.98, -hh * 0.65, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (sp === 'BLUE_WHALE') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    for (let p = -1; p <= 2; p++) {
      ctx.beginPath(); ctx.moveTo(-hl * 0.2, hh * 0.35 + p * 8); ctx.lineTo(hl * 0.45, hh * 0.35 + p * 8); ctx.stroke();
    }
  }

  if (sp === 'REEF_SHARK' || sp === 'GREAT_SHARK' || sp === 'GIANT_TUNA') {
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
    for (let g = 0; g < 3; g++) {
      ctx.beginPath(); ctx.arc(hl * 0.22 - g * 9, 0, hh * 0.35, -0.5, 0.5); ctx.stroke();
    }
  }

  // Eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(hl * 0.52, -hh * 0.20, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.isAttacking ? '#FFB300' : '#000000';
  ctx.beginPath(); ctx.arc(hl * 0.54, -hh * 0.20, 3, 0, Math.PI * 2); ctx.fill();
}

if (typeof window !== 'undefined') {
  window.CreatureRenderer = { renderCreature };
}
