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
    const bubbleR = sp === 'ELASMOSAURUS'
      ? hl * 1.32
      : (sp === 'PLESIOSAURUS' || sp === 'NOTHOSAURUS')
        ? hl * 1.12
        : Math.max(len, bh) * 0.62;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💤', f.x, f.y - bubbleR * 0.72);
    ctx.textAlign = 'left';
  }
}

function drawDunkleosteus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  // Authentic Devonian Placoderm (原始鄧氏魚): interlocking dermal bone plates,
  // smooth unarmored rear fish body, blunted ivory gnathal bone blades, asymmetric heterocercal tail.
  const boneDark = '#46332A';
  const boneMid = '#5E463A';
  const boneLight = '#7B6051';
  const sutureWarm = '#C4A484';
  const finWave = Math.sin(phase * 0.9) * 0.20;

  // 1. Asymmetric Heterocercal Tail (tall upper lobe, shorter rounded lower lobe)
  ctx.fillStyle = '#3E4649';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.76, -hh * 0.18);
  ctx.quadraticCurveTo(-hl * 1.08, -hh * 0.56 + tail * 0.5, -hl * 1.40 + tail, -hh * 1.06);
  ctx.quadraticCurveTo(-hl * 1.12 + tail * 0.5, -hh * 0.14, -hl * 1.12 + tail * 0.8, hh * 0.52);
  ctx.quadraticCurveTo(-hl * 0.94, hh * 0.34, -hl * 0.76, hh * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Small Rear-set Dorsal Fin & Far Pectoral Fin
  ctx.fillStyle = '#4B5559';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.26, -hh * 0.62);
  ctx.quadraticCurveTo(-hl * 0.46, -hh * 1.12, -hl * 0.62, -hh * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.save();
  ctx.translate(hl * 0.08, hh * 0.56);
  ctx.rotate(0.55 - finWave * 0.8);
  ctx.fillStyle = 'rgba(54, 42, 36, 0.75)';
  ctx.beginPath();
  ctx.ellipse(0, hh * 0.20, hl * 0.17, hh * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Smooth Unarmored Rear Trunk (natural Devonian slate-brown skin)
  ctx.fillStyle = '#545F63';
  ctx.beginPath();
  ctx.moveTo(hl * 0.20, -hh * 0.84);
  ctx.bezierCurveTo(-hl * 0.25, -hh * 0.88, -hl * 0.65, -hh * 0.46, -hl * 0.88, 0);
  ctx.bezierCurveTo(-hl * 0.65, hh * 0.46, -hl * 0.25, hh * 0.78, hl * 0.20, hh * 0.76);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Countershaded pale belly & subtle natural lateral line / muscle bands
  ctx.fillStyle = 'rgba(222, 214, 200, 0.48)';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.24, hh * 0.42, hl * 0.44, hh * 0.25, -0.06, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hl * 0.02, -hh * 0.08);
  ctx.quadraticCurveTo(-hl * 0.36, -hh * 0.04, -hl * 0.74, 0);
  ctx.stroke();

  // Small pelvic fin
  ctx.fillStyle = '#4B5559';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.34, hh * 0.62, hl * 0.10, hh * 0.16, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 4. Articulated Lower Jaw with Blunted Ivory Gnathal Bone Plate
  let jawAng = 0.06 + 0.12 * Math.abs(Math.sin(phase * 0.65));
  if (f.telegraphTimer > 0) {
    jawAng = 0.08 + 0.26 * Math.abs(Math.sin(f.telegraphTimer * 22));
  } else if (f.chompTimer > 0) {
    jawAng = 0.06 + 0.28 * Math.abs(Math.sin(f.chompTimer * 26));
  }
  ctx.save();
  ctx.translate(hl * 0.28, hh * 0.26);
  ctx.rotate(jawAng);
  ctx.fillStyle = boneDark;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hl * 0.65, hh * 0.04);
  ctx.quadraticCurveTo(hl * 0.55, hh * 0.42, hl * 0.02, hh * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // Rounded ivory-cream lower shearing bone plate (paleontologically accurate, no sharp teeth)
  ctx.fillStyle = '#F3ECD8';
  ctx.beginPath();
  ctx.moveTo(hl * 0.14, 0);
  ctx.quadraticCurveTo(hl * 0.32, -hh * 0.15, hl * 0.44, -hh * 0.03);
  ctx.quadraticCurveTo(hl * 0.55, -hh * 0.16, hl * 0.64, 0);
  ctx.lineTo(hl * 0.60, hh * 0.09);
  ctx.lineTo(hl * 0.14, hh * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 51, 42, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // 5. Heavy Interlocking Dermal Head & Thoracic Bone Shield (organic Devonian bone)
  ctx.fillStyle = boneMid;
  ctx.beginPath();
  ctx.moveTo(hl * 0.04, -hh * 0.92);
  ctx.bezierCurveTo(hl * 0.45, -hh * 1.02, hl * 0.86, -hh * 0.64, hl * 0.96, -hh * 0.06);
  ctx.lineTo(hl * 0.92, hh * 0.16);
  ctx.lineTo(hl * 0.44, hh * 0.18);
  ctx.lineTo(hl * 0.22, hh * 0.34);
  ctx.lineTo(hl * 0.05, hh * 0.80);
  ctx.quadraticCurveTo(hl * 0.16, 0, hl * 0.04, -hh * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Thoracic collar darker bone plate & cranial top bone highlight
  ctx.fillStyle = boneDark;
  ctx.beginPath();
  ctx.moveTo(hl * 0.05, -hh * 0.90);
  ctx.lineTo(hl * 0.34, -hh * 0.90);
  ctx.quadraticCurveTo(hl * 0.25, -hh * 0.08, hl * 0.30, hh * 0.64);
  ctx.lineTo(hl * 0.06, hh * 0.78);
  ctx.quadraticCurveTo(hl * 0.16, 0, hl * 0.05, -hh * 0.90);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = boneLight;
  ctx.beginPath();
  ctx.moveTo(hl * 0.36, -hh * 0.84);
  ctx.quadraticCurveTo(hl * 0.66, -hh * 0.82, hl * 0.88, -hh * 0.42);
  ctx.quadraticCurveTo(hl * 0.56, -hh * 0.40, hl * 0.34, -hh * 0.36);
  ctx.closePath();
  ctx.fill();

  // Upper ivory-cream gnathal bone plate
  ctx.fillStyle = '#F3ECD8';
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, hh * 0.12);
  ctx.lineTo(hl * 0.93, hh * 0.10);
  ctx.quadraticCurveTo(hl * 0.84, hh * 0.28, hl * 0.72, hh * 0.17);
  ctx.quadraticCurveTo(hl * 0.58, hh * 0.28, hl * 0.46, hh * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 51, 42, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Warm bronze-ochre organic bone plate sutures (natural fossils, zero sci-fi rivets)
  ctx.strokeStyle = sutureWarm;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  // Cranial-thoracic neck hinge suture
  ctx.moveTo(hl * 0.34, -hh * 0.90);
  ctx.quadraticCurveTo(hl * 0.25, -hh * 0.08, hl * 0.30, hh * 0.64);
  // Posterior dermal collar edge
  ctx.moveTo(hl * 0.05, -hh * 0.90);
  ctx.quadraticCurveTo(hl * 0.16, 0, hl * 0.06, hh * 0.78);
  // Natural cheek & dorsal skull sutures
  ctx.moveTo(hl * 0.30, -hh * 0.34);
  ctx.quadraticCurveTo(hl * 0.56, -hh * 0.42, hl * 0.84, -hh * 0.18);
  ctx.moveTo(hl * 0.28, hh * 0.12);
  ctx.lineTo(hl * 0.52, hh * 0.05);
  ctx.stroke();

  // Near-side Pectoral Fin (layered cleanly over lower thoracic plate)
  ctx.save();
  ctx.translate(hl * 0.04, hh * 0.62);
  ctx.rotate(0.32 + finWave);
  ctx.fillStyle = boneLight;
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(0, -hh * 0.14);
  ctx.quadraticCurveTo(hl * 0.14, hh * 0.08, hl * 0.04, hh * 0.56);
  ctx.quadraticCurveTo(-hl * 0.14, hh * 0.38, -hl * 0.10, -hh * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Nostril & Natural Bright Friendly Eye with Subtle Bone Ring
  ctx.fillStyle = 'rgba(30, 18, 12, 0.58)';
  ctx.beginPath(); ctx.ellipse(hl * 0.84, -hh * 0.14, 3.0, 1.8, -0.2, 0, Math.PI * 2); ctx.fill();
  const ex = hl * 0.56;
  const ey = -hh * 0.28;
  ctx.fillStyle = sutureWarm;
  ctx.beginPath(); ctx.arc(ex, ey, 9.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFDE7';
  ctx.beginPath(); ctx.arc(ex, ey, 6.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.arc(ex + 1.4, ey, 3.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex + 2.8, ey - 2.0, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawRealisticFlipper(ctx, x, y, len, wid, ang, fill, stroke, isFar) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, -wid * 0.34);
  ctx.quadraticCurveTo(len * 0.46, -wid * 0.82, len, 0);
  ctx.quadraticCurveTo(len * 0.36, wid * 0.88, -len * 0.12, wid * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isFar ? 'rgba(0,0,0,0.34)' : stroke;
  ctx.lineWidth = isFar ? 1.6 : 2.1;
  ctx.stroke();
  if (!isFar) {
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(len * 0.12, 0);
    ctx.lineTo(len * 0.72, wid * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNaturalEye(ctx, ex, ey, r, ringColor) {
  if (ringColor) {
    ctx.fillStyle = ringColor;
    ctx.beginPath(); ctx.arc(ex, ey, r * 1.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.fillStyle = '#FFFDE7';
  ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.arc(ex + r * 0.18, ey, r * 0.54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex + r * 0.36, ey - r * 0.32, r * 0.24, 0, Math.PI * 2); ctx.fill();
}

function drawMosasaurus(ctx, f, hl, hh, phase, rimStroke, rimWidth) {
  const s1 = Math.sin(phase) * hh * 0.24;
  const s2 = Math.sin(phase - 1.3) * hh * 0.38;
  const pad = Math.sin(phase * 0.9) * 0.24;
  const jawOpen = 0.05 + 0.09 * Math.abs(Math.sin(phase * 0.55));

  // Far-side flippers (3D depth layer)
  drawRealisticFlipper(ctx, hl * 0.22, hh * 0.44, hl * 0.36, hh * 0.30, 0.98 - pad, 'rgba(14, 46, 54, 0.76)', rimStroke, true);
  drawRealisticFlipper(ctx, -hl * 0.26, hh * 0.40, hl * 0.28, hh * 0.24, 1.08 + pad, 'rgba(14, 46, 54, 0.76)', rimStroke, true);

  // 1. Two-segment Sea-Lizard Long Tail with Authentic Crescent Tail Fluke
  ctx.fillStyle = '#1C4B57';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.45, -hh * 0.40);
  ctx.quadraticCurveTo(-hl * 0.92, -hh * 0.26 + s1, -hl * 1.46, s2 - hh * 0.10);
  ctx.quadraticCurveTo(-hl * 1.56, s2 - hh * 0.55, -hl * 1.66, s2 - hh * 0.74);
  ctx.quadraticCurveTo(-hl * 1.44, s2 + hh * 0.06, -hl * 1.58, s2 + hh * 0.68);
  ctx.quadraticCurveTo(-hl * 1.38, s2 + hh * 0.32, -hl * 1.24, s2 + hh * 0.16);
  ctx.quadraticCurveTo(-hl * 0.94, hh * 0.32 + s1, -hl * 0.45, hh * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Elongated Muscular Mosasaur Torso
  ctx.fillStyle = '#1C4B57';
  ctx.beginPath();
  ctx.moveTo(hl * 0.55, -hh * 0.46);
  ctx.bezierCurveTo(hl * 0.15, -hh * 0.86, -hl * 0.25, -hh * 0.76, -hl * 0.52, -hh * 0.36);
  ctx.lineTo(-hl * 0.52, hh * 0.36);
  ctx.bezierCurveTo(-hl * 0.25, hh * 0.72, hl * 0.15, hh * 0.76, hl * 0.55, hh * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Countershaded pale belly & natural deep-sea tiger bands
  ctx.fillStyle = 'rgba(218, 236, 240, 0.52)';
  ctx.beginPath();
  ctx.ellipse(hl * 0.02, hh * 0.34, hl * 0.48, hh * 0.30, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(10, 26, 34, 0.36)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const bx = i * hl * 0.19;
    ctx.beginPath();
    ctx.moveTo(bx, -hh * 0.62);
    ctx.quadraticCurveTo(bx - 6, -hh * 0.18, bx + 4, hh * 0.14);
    ctx.stroke();
  }

  // Natural Subtle Dorsal Ridge Crest (organic scales, not neon)
  ctx.fillStyle = '#336B78';
  ctx.beginPath();
  ctx.moveTo(hl * 0.42, -hh * 0.50);
  for (let i = 0; i < 8; i++) {
    const sx = hl * 0.36 - i * hl * 0.18;
    const sy = -hh * (0.68 - i * 0.05) + (i > 4 ? s1 * 0.4 : 0);
    ctx.lineTo(sx, sy - hh * 0.22);
    ctx.lineTo(sx - hl * 0.09, sy + hh * 0.04);
  }
  ctx.closePath();
  ctx.fill();

  // 3. Long Crocodile-Style Giant Skull (upper snout + hinged lower jaw)
  ctx.fillStyle = '#1C4B57';
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, -hh * 0.54);
  ctx.quadraticCurveTo(hl * 0.85, -hh * 0.56, hl * 1.12, -hh * 0.14);
  ctx.lineTo(hl * 1.08, hh * 0.06);
  ctx.lineTo(hl * 0.46, hh * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Friendly Blunted Rounded Teeth on upper jaw
  ctx.fillStyle = '#F5F5F5';
  for (let t = 0; t < 5; t++) {
    ctx.beginPath();
    ctx.arc(hl * 0.58 + t * hl * 0.10, hh * 0.09, 2.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lower hinged jaw
  ctx.save();
  ctx.translate(hl * 0.48, hh * 0.14);
  ctx.rotate(jawOpen);
  ctx.fillStyle = '#CFE4E8';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hl * 0.56, hh * 0.02);
  ctx.quadraticCurveTo(hl * 0.46, hh * 0.34, 0, hh * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Nostril, subtle brow ridge & natural friendly eye
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath(); ctx.ellipse(hl * 0.96, -hh * 0.12, 3.0, 1.8, -0.15, 0, Math.PI * 2); ctx.fill();
  drawNaturalEye(ctx, hl * 0.64, -hh * 0.24, 6.2, null);

  // Near-side flippers (larger forelimb, smaller hindlimb)
  drawRealisticFlipper(ctx, hl * 0.18, hh * 0.46, hl * 0.42, hh * 0.34, 0.76 + pad, '#2E6A78', rimStroke, false);
  drawRealisticFlipper(ctx, -hl * 0.30, hh * 0.42, hl * 0.32, hh * 0.26, 0.90 - pad, '#2E6A78', rimStroke, false);
}

function drawLiopleurodon(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const fPad = Math.sin(phase) * 0.30;
  const rPad = Math.sin(phase + Math.PI) * 0.30;

  // 1. Short Thick Tail
  ctx.fillStyle = '#37474F';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.55, -hh * 0.34);
  ctx.quadraticCurveTo(-hl * 0.88, tail * 0.4, -hl * 1.12, tail * 0.7);
  ctx.quadraticCurveTo(-hl * 0.86, hh * 0.36, -hl * 0.55, hh * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Far-side Wing-Like Flippers (anti-phase underwater flight)
  drawRealisticFlipper(ctx, hl * 0.12, hh * 0.46, hl * 0.54, hh * 0.36, 1.10 - fPad, 'rgba(34, 46, 54, 0.78)', rimStroke, true);
  drawRealisticFlipper(ctx, -hl * 0.34, hh * 0.42, hl * 0.50, hh * 0.34, 1.16 - rPad, 'rgba(34, 46, 54, 0.78)', rimStroke, true);

  // 3. Barrel Torso + Thick Short Neck + Huge Triangular Head (28-35% length)
  ctx.fillStyle = '#37474F';
  ctx.beginPath();
  ctx.moveTo(hl * 1.12, hh * 0.02);
  ctx.quadraticCurveTo(hl * 0.80, -hh * 0.44, hl * 0.44, -hh * 0.62);
  ctx.bezierCurveTo(hl * 0.05, -hh * 0.98, -hl * 0.38, -hh * 0.86, -hl * 0.64, -hh * 0.32);
  ctx.lineTo(-hl * 0.64, hh * 0.34);
  ctx.bezierCurveTo(-hl * 0.38, hh * 0.86, hl * 0.05, hh * 0.92, hl * 0.44, hh * 0.62);
  ctx.quadraticCurveTo(hl * 0.82, hh * 0.40, hl * 1.12, hh * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Orca-like bright countershaded belly & subtle natural flank mottling
  ctx.fillStyle = 'rgba(232, 240, 242, 0.56)';
  ctx.beginPath();
  ctx.moveTo(hl * 1.02, hh * 0.16);
  ctx.bezierCurveTo(hl * 0.38, hh * 0.84, -hl * 0.30, hh * 0.78, -hl * 0.62, hh * 0.30);
  ctx.quadraticCurveTo(hl * 0.10, hh * 0.24, hl * 1.02, hh * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(144, 164, 174, 0.34)';
  ctx.beginPath(); ctx.ellipse(-hl * 0.08, -hh * 0.28, hl * 0.24, hh * 0.20, -0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hl * 0.22, -hh * 0.32, hl * 0.14, hh * 0.15, -0.15, 0, Math.PI * 2); ctx.fill();

  // Massive jaw line + blunted rounded teeth + nostril + eye
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hl * 0.46, hh * 0.20);
  ctx.lineTo(hl * 1.08, hh * 0.10);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  for (let t = 0; t < 5; t++) {
    ctx.beginPath(); ctx.arc(hl * 0.54 + t * hl * 0.11, hh * 0.19 - t * hh * 0.02, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath(); ctx.ellipse(hl * 0.94, -hh * 0.08, 3.2, 1.8, -0.15, 0, Math.PI * 2); ctx.fill();
  drawNaturalEye(ctx, hl * 0.58, -hh * 0.24, 6.2, null);

  // Near-side Massive Equal-Length Wing Flippers (underwater flight)
  drawRealisticFlipper(ctx, hl * 0.10, hh * 0.52, hl * 0.60, hh * 0.38, 0.82 + fPad, '#546E7A', rimStroke, false);
  drawRealisticFlipper(ctx, -hl * 0.36, hh * 0.46, hl * 0.56, hh * 0.36, 0.88 + rPad, '#546E7A', rimStroke, false);
}

function drawPlesiosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const flap = Math.sin(phase * 1.1) * 0.30;
  const flap2 = Math.sin(phase * 1.1 + Math.PI * 0.7) * 0.30;
  const neckNod = Math.sin(phase * 0.8) * hh * 0.18;

  // Short pointed reptilian tail
  ctx.fillStyle = '#1B6B5F';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.46, -hh * 0.22);
  ctx.quadraticCurveTo(-hl * 0.85, tail * 0.4, -hl * 1.06, tail * 0.6);
  ctx.quadraticCurveTo(-hl * 0.82, hh * 0.28, -hl * 0.46, hh * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();

  // Far-side wing paddles (3D depth layer)
  drawRealisticFlipper(ctx, hl * 0.12, hh * 0.44, hl * 0.46, hh * 0.36, 1.08 - flap, 'rgba(14, 72, 62, 0.76)', rimStroke, true);
  drawRealisticFlipper(ctx, -hl * 0.30, hh * 0.40, hl * 0.42, hh * 0.34, 1.16 - flap2, 'rgba(14, 72, 62, 0.76)', rimStroke, true);

  // Broad Teardrop Torso
  ctx.fillStyle = '#1B6B5F';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.06, 0, hl * 0.56, hh * 0.84, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Countershaded belly + natural emerald dorsal mottling
  ctx.fillStyle = 'rgba(206, 238, 230, 0.46)';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.06, hh * 0.40, hl * 0.42, hh * 0.34, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = 'rgba(128, 203, 196, 0.32)';
  for (const [dx, dy, rx, ry] of [[-hl * 0.26, -hh * 0.30, 9, 5.5], [-hl * 0.04, -hh * 0.44, 11, 6], [hl * 0.16, -hh * 0.24, 8, 5]]) {
    ctx.beginPath(); ctx.ellipse(dx, dy, rx, ry, -0.15, 0, Math.PI * 2); ctx.fill();
  }

  // Closed Double-Edged Tapering S-Curved Neck (anatomical contour, not a thick line)
  const headX = hl * 1.10;
  const headY = -hh * 0.72 + neckNod;
  const c1x = hl * 0.68, c1y = -hh * 0.08 - neckNod * 0.3;
  const c2x = hl * 0.78, c2y = -hh * 0.90 + neckNod * 0.4;
  const rootW = hh * 0.40;
  const tipW = hh * 0.19;

  ctx.fillStyle = '#1B6B5F';
  ctx.beginPath();
  ctx.moveTo(hl * 0.34, -rootW);
  ctx.bezierCurveTo(c1x, c1y - rootW * 0.65, c2x, c2y - tipW * 1.1, headX - 8, headY - tipW);
  ctx.lineTo(headX - 8, headY + tipW);
  ctx.bezierCurveTo(c2x + 5, c2y + tipW * 1.3, c1x + 6, c1y + rootW * 0.85, hl * 0.34, rootW);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Pale throat countershading along neck underside
  ctx.strokeStyle = 'rgba(206, 238, 230, 0.42)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(hl * 0.38, rootW * 0.70);
  ctx.bezierCurveTo(c1x + 4, c1y + rootW * 0.6, c2x + 3, c2y + tipW * 0.95, headX - 10, headY + tipW * 0.72);
  ctx.stroke();

  // Sculpted Rounded Plesiosaur Head + Nostril + Friendly Smile & Eye
  ctx.fillStyle = '#1B6B5F';
  ctx.beginPath();
  ctx.moveTo(headX + 26, headY + 1);
  ctx.quadraticCurveTo(headX + 10, headY - 14, headX - 16, headY - 9);
  ctx.quadraticCurveTo(headX - 18, headY + 8, headX + 10, headY + 11);
  ctx.quadraticCurveTo(headX + 21, headY + 8, headX + 26, headY + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(224, 242, 241, 0.72)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(headX - 2, headY + 4); ctx.quadraticCurveTo(headX + 10, headY + 6, headX + 22, headY + 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(headX + 17, headY - 2, 1.6, 0, Math.PI * 2); ctx.fill();
  drawNaturalEye(ctx, headX + 4, headY - 3, 4.8, null);

  // Near-side broad wing paddles
  drawRealisticFlipper(ctx, hl * 0.10, hh * 0.50, hl * 0.52, hh * 0.38, 0.78 + flap, '#2C8C7E', rimStroke, false);
  drawRealisticFlipper(ctx, -hl * 0.32, hh * 0.44, hl * 0.46, hh * 0.35, 0.88 + flap2, '#2C8C7E', rimStroke, false);
}

function drawElasmosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const flap = Math.sin(phase * 1.0) * 0.28;
  const flap2 = Math.sin(phase * 1.0 + Math.PI * 0.75) * 0.28;
  const w1 = Math.sin(phase * 0.9) * hh * 0.28;
  const w2 = Math.sin(phase * 0.9 - 1.5) * hh * 0.34;

  // Tapered tail
  ctx.fillStyle = '#1B5E9E';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.50, -hh * 0.22);
  ctx.quadraticCurveTo(-hl * 0.90, tail * 0.5, -hl * 1.12, tail);
  ctx.quadraticCurveTo(-hl * 0.86, hh * 0.26, -hl * 0.50, hh * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();

  // Far-side slender sickle flippers
  drawRealisticFlipper(ctx, hl * 0.02, hh * 0.42, hl * 0.50, hh * 0.32, 1.08 - flap, 'rgba(18, 62, 112, 0.76)', rimStroke, true);
  drawRealisticFlipper(ctx, -hl * 0.36, hh * 0.38, hl * 0.44, hh * 0.28, 1.16 - flap2, 'rgba(18, 62, 112, 0.76)', rimStroke, true);

  // Compact Streamlined Deep-Blue Body
  ctx.fillStyle = '#1B5E9E';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.16, 0, hl * 0.48, hh * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Countershaded silver-white belly & subtle deep-ocean dorsal speckles
  ctx.fillStyle = 'rgba(227, 242, 253, 0.48)';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.16, hh * 0.36, hl * 0.36, hh * 0.30, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = 'rgba(144, 202, 249, 0.36)';
  for (let sp = -2; sp <= 2; sp++) {
    ctx.beginPath(); ctx.arc(-hl * 0.16 + sp * hl * 0.13, -hh * 0.26 + (sp % 2) * 5, 3.8, 0, Math.PI * 2); ctx.fill();
  }

  // Closed Double-Edged Ultra-Long Swan Neck (1.4x body length, Double-S Traveling Wave)
  const nx0 = hl * 0.20, ny0 = -hh * 0.08;
  const nx1 = hl * 0.72, ny1 = -hh * 0.84 + w1;
  const nx2 = hl * 1.12, ny2 = hh * 0.18 + w2;
  const headX = hl * 1.54;
  const headY = -hh * 0.68 + w2 * 0.8;
  const rootW = hh * 0.32;
  const tipW = hh * 0.13;

  ctx.fillStyle = '#1B5E9E';
  ctx.beginPath();
  ctx.moveTo(nx0, ny0 - rootW);
  ctx.bezierCurveTo(nx1, ny1 - rootW * 0.6, nx2, ny2 - tipW * 1.25, headX - 6, headY - tipW);
  ctx.lineTo(headX - 6, headY + tipW);
  ctx.bezierCurveTo(nx2 + 4, ny2 + tipW * 1.4, nx1 + 5, ny1 + rootW * 0.75, nx0, ny0 + rootW);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.1;
  ctx.stroke();

  // Pale underside throat highlight
  ctx.strokeStyle = 'rgba(227, 242, 253, 0.38)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(nx0 + 2, ny0 + rootW * 0.72);
  ctx.bezierCurveTo(nx1 + 3, ny1 + rootW * 0.55, nx2 + 3, ny2 + tipW * 1.05, headX - 8, headY + tipW * 0.75);
  ctx.stroke();

  // Delicate Tiny Streamlined Head + Nostril + Friendly Eye
  ctx.fillStyle = '#1B5E9E';
  ctx.beginPath();
  ctx.moveTo(headX + 20, headY + 1);
  ctx.quadraticCurveTo(headX + 8, headY - 11, headX - 12, headY - 7);
  ctx.quadraticCurveTo(headX - 13, headY + 7, headX + 8, headY + 9);
  ctx.quadraticCurveTo(headX + 16, headY + 6, headX + 20, headY + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 1.9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(227, 242, 253, 0.68)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(headX, headY + 3); ctx.lineTo(headX + 17, headY + 2); ctx.stroke();
  drawNaturalEye(ctx, headX + 4, headY - 2.2, 4.0, null);

  // Near-side Graceful Sickle Flippers
  drawRealisticFlipper(ctx, hl * 0.0, hh * 0.48, hl * 0.56, hh * 0.34, 0.78 + flap, '#2F7EC2', rimStroke, false);
  drawRealisticFlipper(ctx, -hl * 0.38, hh * 0.44, hl * 0.48, hh * 0.30, 0.88 + flap2, '#2F7EC2', rimStroke, false);
}

function drawNothosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  const step = Math.sin(phase * 1.2) * 0.30;

  const drawBluntedWebbedFoot = (fx, fy, len, wid, rot, fill, isFar) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -wid * 0.32);
    ctx.lineTo(len * 0.66, -wid * 0.46);
    ctx.quadraticCurveTo(len * 1.02, -wid * 0.40, len * 0.90, -wid * 0.12);
    ctx.quadraticCurveTo(len * 1.06, 0, len * 0.92, wid * 0.18);
    ctx.quadraticCurveTo(len * 0.96, wid * 0.46, len * 0.64, wid * 0.46);
    ctx.lineTo(0, wid * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isFar ? 'rgba(0,0,0,0.34)' : rimStroke;
    ctx.lineWidth = isFar ? 1.5 : 2;
    ctx.stroke();
    ctx.restore();
  };

  // Far-side webbed feet (3D depth)
  drawBluntedWebbedFoot(hl * 0.24, hh * 0.40, hl * 0.32, hh * 0.30, 0.95 - step, 'rgba(54, 84, 28, 0.76)', true);
  drawBluntedWebbedFoot(-hl * 0.28, hh * 0.38, hl * 0.30, hh * 0.28, 1.08 + step, 'rgba(54, 84, 28, 0.76)', true);

  // Very Long Laterally-Flattened Swimming Tail
  ctx.fillStyle = '#587A32';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.45, -hh * 0.26);
  ctx.bezierCurveTo(-hl * 0.95, -hh * 0.32 + tail * 0.45, -hl * 1.32, -hh * 0.18 + tail * 0.9, -hl * 1.64, tail * 1.15);
  ctx.bezierCurveTo(-hl * 1.30, hh * 0.26 + tail * 0.9, -hl * 0.90, hh * 0.32 + tail * 0.45, -hl * 0.45, hh * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();

  // Sleek Semi-Aquatic Triassic Lizard Torso
  ctx.fillStyle = '#587A32';
  ctx.beginPath();
  ctx.ellipse(0, 0, hl * 0.60, hh * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Pale cream belly & olive natural camouflage bands
  ctx.fillStyle = 'rgba(232, 240, 214, 0.46)';
  ctx.beginPath();
  ctx.ellipse(0, hh * 0.24, hl * 0.46, hh * 0.24, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 54, 16, 0.42)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const sx = i * hl * 0.19;
    ctx.beginPath();
    ctx.moveTo(sx, -hh * 0.48);
    ctx.lineTo(sx - hl * 0.05, hh * 0.06);
    ctx.stroke();
  }

  // Closed Double-Edged Flexible Tapering Neck
  const neckWave = Math.sin(phase * 0.9) * 5.5;
  const headX = hl * 0.90;
  const headY = -hh * 0.22 + neckWave;
  ctx.fillStyle = '#587A32';
  ctx.beginPath();
  ctx.moveTo(hl * 0.42, -hh * 0.34);
  ctx.quadraticCurveTo(hl * 0.66, -hh * 0.40 + neckWave * 0.4, headX - 10, headY - hh * 0.22);
  ctx.lineTo(headX - 10, headY + hh * 0.22);
  ctx.quadraticCurveTo(hl * 0.68, hh * 0.14 + neckWave * 0.4, hl * 0.42, hh * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();

  // Flat Elongated Lizard Skull + Nostril + Friendly Eye
  ctx.fillStyle = '#587A32';
  ctx.beginPath();
  ctx.moveTo(headX + 30, headY + 2);
  ctx.quadraticCurveTo(headX + 12, headY - 12, headX - 14, headY - 9);
  ctx.quadraticCurveTo(headX - 16, headY + 8, headX + 12, headY + 10);
  ctx.quadraticCurveTo(headX + 24, headY + 8, headX + 30, headY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(241, 248, 233, 0.72)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(headX - 2, headY + 4); ctx.lineTo(headX + 26, headY + 3); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(headX + 20, headY - 2, 1.8, 0, Math.PI * 2); ctx.fill();
  drawNaturalEye(ctx, headX + 4, headY - 3, 4.6, null);

  // Near-side Blunted Webbed Feet (distinct from wing paddles!)
  drawBluntedWebbedFoot(hl * 0.20, hh * 0.44, hl * 0.35, hh * 0.32, 0.74 + step, '#7B9E4E', false);
  drawBluntedWebbedFoot(-hl * 0.32, hh * 0.40, hl * 0.32, hh * 0.30, 0.86 - step, '#7B9E4E', false);
}

function drawIchthyosaurus(ctx, f, hl, hh, phase, tail, rimStroke, rimWidth) {
  // Tall Sickle Dorsal Fin
  ctx.fillStyle = '#2B3F7C';
  ctx.beginPath();
  ctx.moveTo(hl * 0.08, -hh * 0.74);
  ctx.quadraticCurveTo(-hl * 0.14, -hh * 1.58, -hl * 0.34, -hh * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Symmetrical High-Speed Vertical Crescent Tail
  ctx.fillStyle = '#2B3F7C';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.62, -hh * 0.10);
  ctx.quadraticCurveTo(-hl * 0.94, -hh * 0.54, -hl * 1.24 + tail, -hh * 1.04);
  ctx.quadraticCurveTo(-hl * 0.96 + tail * 0.4, 0, -hl * 1.24 + tail, hh * 1.04);
  ctx.quadraticCurveTo(-hl * 0.94, hh * 0.54, -hl * 0.62, hh * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Far pectoral fin
  drawRealisticFlipper(ctx, hl * 0.20, hh * 0.44, hl * 0.34, hh * 0.26, 1.02, 'rgba(28, 42, 88, 0.75)', rimStroke, true);

  // Streamlined Dolphin-Like Body + Slender Pointed Rostrum Beak
  ctx.fillStyle = '#2B3F7C';
  ctx.beginPath();
  ctx.moveTo(hl * 1.24, hh * 0.06);
  ctx.quadraticCurveTo(hl * 0.90, -hh * 0.10, hl * 0.64, -hh * 0.36);
  ctx.bezierCurveTo(hl * 0.34, -hh * 0.98, -hl * 0.34, -hh * 0.88, -hl * 0.72, 0);
  ctx.bezierCurveTo(-hl * 0.34, hh * 0.82, hl * 0.34, hh * 0.86, hl * 0.66, hh * 0.30);
  ctx.quadraticCurveTo(hl * 0.92, hh * 0.20, hl * 1.24, hh * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimStroke;
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // Natural Countershaded Pale Belly & Sleek Lateral Highlight Band
  ctx.fillStyle = 'rgba(232, 242, 250, 0.62)';
  ctx.beginPath();
  ctx.moveTo(hl * 1.12, hh * 0.12);
  ctx.bezierCurveTo(hl * 0.52, hh * 0.78, -hl * 0.26, hh * 0.72, -hl * 0.68, hh * 0.08);
  ctx.quadraticCurveTo(hl * 0.18, hh * 0.18, hl * 1.12, hh * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(187, 222, 251, 0.45)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-hl * 0.56, 0);
  ctx.quadraticCurveTo(hl * 0.05, -hh * 0.14, hl * 0.56, -hh * 0.06);
  ctx.stroke();

  // Rostrum jaw line & nostril
  ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(hl * 0.64, hh * 0.14); ctx.lineTo(hl * 1.20, hh * 0.09); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(hl * 0.78, -hh * 0.04, 1.8, 0, Math.PI * 2); ctx.fill();

  // Near-side Streamlined Pectoral & Small Pelvic Fins
  drawRealisticFlipper(ctx, hl * 0.14, hh * 0.46, hl * 0.40, hh * 0.28, 0.78 + Math.sin(phase) * 0.12, '#4761A8', rimStroke, false);
  drawRealisticFlipper(ctx, -hl * 0.30, hh * 0.42, hl * 0.20, hh * 0.18, 0.94, '#4761A8', rimStroke, false);

  // Iconic Huge Round Eye with Soft-Toned Bony Sclerotic Ring
  drawNaturalEye(ctx, hl * 0.48, -hh * 0.16, 7.6, 'rgba(207, 216, 220, 0.82)');
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
