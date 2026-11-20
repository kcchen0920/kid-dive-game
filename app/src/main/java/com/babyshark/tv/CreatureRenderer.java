package com.babyshark.tv;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;

/**
 * Shared Zero-Allocation 1-Second Silhouette Creature Renderer (v1.9)
 * Used by both DiverGameView and AquariumView.
 * Reuses member Path, RectF, and Paint instances — zero per-frame object allocations.
 */
public class CreatureRenderer {
    private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path tmpPath = new Path();
    private final RectF tmpRect = new RectF();

    public CreatureRenderer() {
        fillPaint.setStyle(Paint.Style.FILL);
        strokePaint.setStyle(Paint.Style.STROKE);
        strokePaint.setStrokeCap(Paint.Cap.ROUND);
        strokePaint.setStrokeJoin(Paint.Join.ROUND);
    }

    public void renderCreature(
            Canvas canvas,
            DiverGameView.RealisticFish.Species species,
            float x,
            float y,
            float facing,
            float length,
            float bodyHeight,
            float swimPhase,
            int primaryColor,
            int secondaryColor,
            boolean isAttacking,
            float telegraphTimer,
            float chompTimer,
            float deepGlow,
            float spinDeg,
            long nowMs) {

        canvas.save();
        canvas.translate(x, y);
        canvas.scale(facing == 0f ? 1f : facing, 1f);
        if (spinDeg != 0f) {
            canvas.rotate(spinDeg);
        }

        float hl = length * 0.5f;
        float hh = bodyHeight * 0.46f;
        float tail = (float) Math.sin(swimPhase) * Math.min(14f, hl * 0.12f);

        int rimColor = deepGlow > 0.05f
                ? Color.argb((int) ((0.22f + 0.30f * deepGlow) * 255f), 128, 222, 234)
                : 0x73000000;
        float rimWidth = deepGlow > 0.05f ? 3.2f : 2.4f;

        switch (species) {
            case DUNKLEOSTEUS:
                drawDunkleosteus(canvas, hl, hh, swimPhase, tail, telegraphTimer, chompTimer, rimColor, rimWidth);
                break;
            case MOSASAURUS:
                drawMosasaurus(canvas, hl, hh, swimPhase, rimColor, rimWidth);
                break;
            case LIOPLEURODON:
                drawLiopleurodon(canvas, hl, hh, swimPhase, tail, rimColor, rimWidth);
                break;
            case PLESIOSAURUS:
                drawPlesiosaurus(canvas, hl, hh, swimPhase, tail, rimColor, rimWidth);
                break;
            case ELASMOSAURUS:
                drawElasmosaurus(canvas, hl, hh, swimPhase, tail, rimColor, rimWidth);
                break;
            case NOTHOSAURUS:
                drawNothosaurus(canvas, hl, hh, swimPhase, tail, rimColor, rimWidth);
                break;
            case ICHTHYOSAURUS:
                drawIchthyosaurus(canvas, hl, hh, swimPhase, tail, rimColor, rimWidth);
                break;
            case JELLYFISH:
            case NEON_JELLYFISH:
                drawJellyfish(canvas, hl, hh, swimPhase, primaryColor, secondaryColor);
                break;
            case TURTLE:
                drawTurtle(canvas, hl, hh, swimPhase, primaryColor, secondaryColor, rimColor);
                break;
            default:
                drawStandardFish(canvas, species, hl, hh, swimPhase, tail, primaryColor, secondaryColor, isAttacking, rimColor, rimWidth);
                break;
        }

        // Calm amber telegraph warning arc (never harsh red)
        if (telegraphTimer > 0f || isAttacking) {
            int alpha = (int) ((0.55f + 0.25f * Math.sin(nowMs * 0.008)) * 255f);
            strokePaint.setColor(Color.argb(alpha, 255, 193, 7));
            strokePaint.setStrokeWidth(4f);
            float r = hh * 1.15f;
            tmpRect.set(hl * 0.55f - r, -r, hl * 0.55f + r, r);
            canvas.drawArc(tmpRect, -75f, 150f, false, strokePaint);
        }

        canvas.restore();
    }

    private void drawDunkleosteus(Canvas canvas, float hl, float hh, float phase, float tail,
                                  float telegraphTimer, float chompTimer, int rimColor, float rimWidth) {
        // 1. Heterocercal Paleozoic Tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.78f, -hh * 0.18f);
        tmpPath.quadTo(-hl * 1.08f, -hh * 0.52f + tail * 0.5f, -hl * 1.38f + tail, -hh * 1.08f);
        tmpPath.quadTo(-hl * 1.12f + tail * 0.5f, -hh * 0.12f, -hl * 1.12f + tail * 0.8f, hh * 0.56f);
        tmpPath.quadTo(-hl * 0.94f, hh * 0.35f, -hl * 0.78f, hh * 0.18f);
        tmpPath.close();
        fillPaint.setColor(0xFF1A237E);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(2f);
        canvas.drawPath(tmpPath, strokePaint);

        // 2. Rear-set Dorsal Fin
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.25f, -hh * 0.62f);
        tmpPath.quadTo(-hl * 0.46f, -hh * 1.18f, -hl * 0.62f, -hh * 0.48f);
        tmpPath.close();
        fillPaint.setColor(0xFF3949AB);
        canvas.drawPath(tmpPath, fillPaint);

        // 3. Muscular Steel-Blue Rear Torso
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.22f, -hh * 0.88f);
        tmpPath.cubicTo(-hl * 0.25f, -hh * 0.92f, -hl * 0.65f, -hh * 0.48f, -hl * 0.90f, 0f);
        tmpPath.cubicTo(-hl * 0.65f, hh * 0.46f, -hl * 0.25f, hh * 0.82f, hl * 0.22f, hh * 0.78f);
        tmpPath.close();
        fillPaint.setColor(0xFF283593);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawPath(tmpPath, strokePaint);

        // Belly + 2 Amber Lateral Stripes
        fillPaint.setColor(0xFFCFD8DC);
        tmpRect.set(-hl * 0.66f, hh * 0.18f, hl * 0.18f, hh * 0.66f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);
        strokePaint.setColor(0xFFFFD54F);
        strokePaint.setStrokeWidth(3f);
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.04f, -hh * 0.16f);
        tmpPath.quadTo(-hl * 0.35f, -hh * 0.12f, -hl * 0.72f, -hh * 0.04f);
        tmpPath.moveTo(hl * 0.02f, hh * 0.06f);
        tmpPath.quadTo(-hl * 0.35f, hh * 0.10f, -hl * 0.66f, hh * 0.08f);
        canvas.drawPath(tmpPath, strokePaint);

        // Thick Amber-Edged Pectoral Fin
        float finDeg = (float) Math.toDegrees(0.32f + (float) Math.sin(phase * 0.9f) * 0.22f);
        canvas.save();
        canvas.translate(hl * 0.04f, hh * 0.62f);
        canvas.rotate(finDeg);
        tmpRect.set(-hl * 0.20f, -hh * 0.14f, hl * 0.20f, hh * 0.58f);
        fillPaint.setColor(0xFF4E342E);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(0xFFFFB300);
        strokePaint.setStrokeWidth(2.5f);
        canvas.drawOval(tmpRect, strokePaint);
        canvas.restore();

        // 4. Scissor Bone-Plate Lower Jaw
        float jawRad = 0.08f + 0.14f * Math.abs((float) Math.sin(phase * 0.65f));
        if (telegraphTimer > 0f) {
            jawRad = 0.10f + 0.30f * Math.abs((float) Math.sin(telegraphTimer * 22f));
        } else if (chompTimer > 0f) {
            jawRad = 0.06f + 0.32f * Math.abs((float) Math.sin(chompTimer * 26f));
        }
        canvas.save();
        canvas.translate(hl * 0.28f, hh * 0.26f);
        canvas.rotate((float) Math.toDegrees(jawRad));
        tmpPath.reset();
        tmpPath.moveTo(0f, 0f);
        tmpPath.lineTo(hl * 0.66f, hh * 0.04f);
        tmpPath.quadTo(hl * 0.56f, hh * 0.44f, hl * 0.02f, hh * 0.42f);
        tmpPath.close();
        fillPaint.setColor(0xFF4E342E);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(0xFFFFB300);
        strokePaint.setStrokeWidth(2.6f);
        canvas.drawPath(tmpPath, strokePaint);

        // Ivory Lower Bone Blade
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.14f, 0f);
        tmpPath.quadTo(hl * 0.32f, -hh * 0.18f, hl * 0.44f, -hh * 0.04f);
        tmpPath.quadTo(hl * 0.55f, -hh * 0.20f, hl * 0.65f, 0f);
        tmpPath.lineTo(hl * 0.62f, hh * 0.10f);
        tmpPath.lineTo(hl * 0.14f, hh * 0.10f);
        tmpPath.close();
        fillPaint.setColor(0xFFFFF8E1);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(0xFFFFB300);
        strokePaint.setStrokeWidth(1.8f);
        canvas.drawPath(tmpPath, strokePaint);
        canvas.restore();

        // 5. Heavy Armored Head Shield (42% length)
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.06f, -hh * 0.96f);
        tmpPath.cubicTo(hl * 0.46f, -hh * 1.06f, hl * 0.88f, -hh * 0.66f, hl * 0.98f, -hh * 0.06f);
        tmpPath.lineTo(hl * 0.94f, hh * 0.16f);
        tmpPath.lineTo(hl * 0.44f, hh * 0.18f);
        tmpPath.lineTo(hl * 0.22f, hh * 0.34f);
        tmpPath.lineTo(hl * 0.06f, hh * 0.84f);
        tmpPath.quadTo(hl * 0.18f, 0f, hl * 0.06f, -hh * 0.96f);
        tmpPath.close();
        fillPaint.setColor(0xFF5D4037);
        canvas.drawPath(tmpPath, fillPaint);

        // Top highlight plate
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.14f, -hh * 0.86f);
        tmpPath.quadTo(hl * 0.54f, -hh * 0.94f, hl * 0.86f, -hh * 0.46f);
        tmpPath.quadTo(hl * 0.48f, -hh * 0.44f, hl * 0.16f, -hh * 0.36f);
        tmpPath.close();
        fillPaint.setColor(0xFF8D6E63);
        canvas.drawPath(tmpPath, fillPaint);

        // Upper Ivory Bone Blade
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.46f, hh * 0.12f);
        tmpPath.lineTo(hl * 0.95f, hh * 0.10f);
        tmpPath.quadTo(hl * 0.86f, hh * 0.32f, hl * 0.72f, hh * 0.18f);
        tmpPath.quadTo(hl * 0.58f, hh * 0.32f, hl * 0.46f, hh * 0.18f);
        tmpPath.close();
        fillPaint.setColor(0xFFFFF8E1);
        canvas.drawPath(tmpPath, fillPaint);

        // Bold Amber-Gold Collar & Plate Seams
        strokePaint.setColor(0xFFFFB300);
        strokePaint.setStrokeWidth(3f);
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.06f, -hh * 0.96f);
        tmpPath.cubicTo(hl * 0.46f, -hh * 1.06f, hl * 0.88f, -hh * 0.66f, hl * 0.98f, -hh * 0.06f);
        tmpPath.moveTo(hl * 0.06f, -hh * 0.96f);
        tmpPath.quadTo(hl * 0.22f, 0f, hl * 0.06f, hh * 0.84f);
        canvas.drawPath(tmpPath, strokePaint);

        strokePaint.setStrokeWidth(2.2f);
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.38f, -hh * 0.94f);
        tmpPath.lineTo(hl * 0.30f, -hh * 0.22f);
        tmpPath.lineTo(hl * 0.72f, -hh * 0.16f);
        tmpPath.moveTo(hl * 0.30f, -hh * 0.22f);
        tmpPath.lineTo(hl * 0.14f, hh * 0.25f);
        canvas.drawPath(tmpPath, strokePaint);

        // 3 Gold Rivets
        fillPaint.setColor(0xFFFFD54F);
        canvas.drawCircle(hl * 0.22f, -hh * 0.62f, 3.6f, fillPaint);
        canvas.drawCircle(hl * 0.22f, -hh * 0.30f, 3.6f, fillPaint);
        canvas.drawCircle(hl * 0.20f, hh * 0.04f, 3.6f, fillPaint);

        // Prominent Glowing Eye
        float ex = hl * 0.56f;
        float ey = -hh * 0.30f;
        fillPaint.setColor(0xFFFFB300);
        canvas.drawCircle(ex, ey, 10.5f, fillPaint);
        fillPaint.setColor(0xFF80DEEA);
        canvas.drawCircle(ex, ey, 7.5f, fillPaint);
        fillPaint.setColor(0xFF111111);
        canvas.drawCircle(ex + 1.5f, ey, 4.0f, fillPaint);
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(ex + 3.0f, ey - 2.2f, 2.0f, fillPaint);
    }

    private void drawMosasaurus(Canvas canvas, float hl, float hh, float phase, int rimColor, float rimWidth) {
        float s1 = (float) Math.sin(phase) * hh * 0.24f;
        float s2 = (float) Math.sin(phase - 1.3f) * hh * 0.38f;
        float padDeg = (float) Math.toDegrees((float) Math.sin(phase * 0.9f) * 0.26f);
        float jawDeg = (float) Math.toDegrees(0.06f + 0.10f * Math.abs((float) Math.sin(phase * 0.55f)));

        // Sea-snake tail + upturned fluke
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.45f, -hh * 0.42f);
        tmpPath.quadTo(-hl * 0.92f, -hh * 0.28f + s1, -hl * 1.48f, s2 - hh * 0.12f);
        tmpPath.lineTo(-hl * 1.62f, s2 - hh * 0.65f);
        tmpPath.quadTo(-hl * 1.44f, s2 + hh * 0.18f, -hl * 1.56f, s2 + hh * 0.42f);
        tmpPath.quadTo(-hl * 0.95f, hh * 0.32f + s1, -hl * 0.45f, hh * 0.40f);
        tmpPath.close();
        fillPaint.setColor(0xFF006064);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(2f);
        canvas.drawPath(tmpPath, strokePaint);

        // Elongated body
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.55f, -hh * 0.46f);
        tmpPath.cubicTo(hl * 0.15f, -hh * 0.88f, -hl * 0.25f, -hh * 0.78f, -hl * 0.52f, -hh * 0.36f);
        tmpPath.lineTo(-hl * 0.52f, hh * 0.38f);
        tmpPath.cubicTo(-hl * 0.25f, hh * 0.74f, hl * 0.15f, hh * 0.78f, hl * 0.55f, hh * 0.42f);
        tmpPath.close();
        fillPaint.setColor(0xFF006064);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawPath(tmpPath, strokePaint);

        // Belly
        fillPaint.setColor(0xFFE0F7FA);
        tmpRect.set(-hl * 0.46f, hh * 0.04f, hl * 0.50f, hh * 0.64f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        // Cyan dorsal ridge scales
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.42f, -hh * 0.52f);
        for (int i = 0; i < 8; i++) {
            float sx = hl * 0.36f - i * hl * 0.18f;
            float sy = -hh * (0.72f - i * 0.05f) + (i > 4 ? s1 * 0.4f : 0f);
            tmpPath.lineTo(sx, sy - hh * 0.28f);
            tmpPath.lineTo(sx - hl * 0.09f, sy + hh * 0.04f);
        }
        tmpPath.close();
        fillPaint.setColor(0xFF26C6DA);
        canvas.drawPath(tmpPath, fillPaint);

        // Swept paddles
        fillPaint.setColor(0xFF00838F);
        strokePaint.setColor(0xFF26C6DA);
        strokePaint.setStrokeWidth(2f);
        canvas.save(); canvas.translate(hl * 0.22f, hh * 0.56f); canvas.rotate(26f + padDeg);
        tmpRect.set(-hl * 0.17f, -hh * 0.14f, hl * 0.17f, hh * 0.58f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();
        canvas.save(); canvas.translate(-hl * 0.24f, hh * 0.50f); canvas.rotate(-20f - padDeg);
        tmpRect.set(-hl * 0.14f, -hh * 0.12f, hl * 0.14f, hh * 0.48f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();

        // Long crocodile upper snout
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.46f, -hh * 0.54f);
        tmpPath.quadTo(hl * 0.85f, -hh * 0.58f, hl * 1.12f, -hh * 0.14f);
        tmpPath.lineTo(hl * 1.08f, hh * 0.06f);
        tmpPath.lineTo(hl * 0.46f, hh * 0.08f);
        tmpPath.close();
        fillPaint.setColor(0xFF006064);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(0xFF26C6DA);
        strokePaint.setStrokeWidth(2f);
        canvas.drawPath(tmpPath, strokePaint);

        fillPaint.setColor(Color.WHITE);
        for (int t = 0; t < 5; t++) {
            canvas.drawCircle(hl * 0.58f + t * hl * 0.10f, hh * 0.09f, 3.2f, fillPaint);
        }

        // Hinged lower jaw
        canvas.save();
        canvas.translate(hl * 0.48f, hh * 0.14f);
        canvas.rotate(jawDeg);
        tmpPath.reset();
        tmpPath.moveTo(0f, 0f);
        tmpPath.lineTo(hl * 0.56f, hh * 0.02f);
        tmpPath.quadTo(hl * 0.46f, hh * 0.34f, 0f, hh * 0.30f);
        tmpPath.close();
        fillPaint.setColor(0xFFE0F7FA);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(0xFF006064);
        strokePaint.setStrokeWidth(2f);
        canvas.drawPath(tmpPath, strokePaint);
        canvas.restore();

        // Eye
        fillPaint.setColor(0xFFFFF176);
        canvas.drawCircle(hl * 0.64f, -hh * 0.26f, 7.5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(hl * 0.66f, -hh * 0.26f, 3.6f, fillPaint);
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(hl * 0.68f, -hh * 0.30f, 1.6f, fillPaint);
    }

    private void drawLiopleurodon(Canvas canvas, float hl, float hh, float phase, float tail, int rimColor, float rimWidth) {
        float fPadDeg = (float) Math.toDegrees((float) Math.sin(phase) * 0.34f);
        float rPadDeg = (float) Math.toDegrees((float) Math.sin(phase + Math.PI) * 0.34f);

        // Short thick tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.55f, -hh * 0.34f);
        tmpPath.quadTo(-hl * 0.88f, tail * 0.4f, -hl * 1.10f, tail * 0.7f);
        tmpPath.quadTo(-hl * 0.86f, hh * 0.36f, -hl * 0.55f, hh * 0.34f);
        tmpPath.close();
        fillPaint.setColor(0xFF455A64);
        canvas.drawPath(tmpPath, fillPaint);

        // Chunky body + huge triangular head (35%)
        tmpPath.reset();
        tmpPath.moveTo(hl * 1.12f, 0f);
        tmpPath.lineTo(hl * 0.42f, -hh * 0.76f);
        tmpPath.cubicTo(hl * 0.05f, -hh * 1.02f, -hl * 0.38f, -hh * 0.88f, -hl * 0.64f, -hh * 0.32f);
        tmpPath.lineTo(-hl * 0.64f, hh * 0.34f);
        tmpPath.cubicTo(-hl * 0.38f, hh * 0.88f, hl * 0.05f, hh * 0.96f, hl * 0.44f, hh * 0.66f);
        tmpPath.lineTo(hl * 1.12f, hh * 0.12f);
        tmpPath.close();
        fillPaint.setColor(0xFF455A64);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawPath(tmpPath, strokePaint);

        // Gold belly
        fillPaint.setColor(0xFFFFF3E0);
        tmpRect.set(-hl * 0.53f, hh * 0.10f, hl * 0.43f, hh * 0.78f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        // Bright Coral-Orange Patches
        fillPaint.setColor(0xFFFF8A65);
        tmpRect.set(hl * 0.10f, -hh * 0.62f, hl * 0.38f, -hh * 0.22f);
        canvas.drawOval(tmpRect, fillPaint);
        tmpRect.set(-hl * 0.26f, -hh * 0.68f, hl * 0.06f, -hh * 0.24f);
        canvas.drawOval(tmpRect, fillPaint);
        tmpRect.set(-hl * 0.54f, -hh * 0.44f, -hl * 0.30f, -hh * 0.08f);
        canvas.drawOval(tmpRect, fillPaint);

        // Massive Diamond Flippers
        fillPaint.setColor(0xFF546E7A);
        strokePaint.setColor(0xFFFF8A65);
        strokePaint.setStrokeWidth(2.4f);
        canvas.save(); canvas.translate(hl * 0.14f, hh * 0.56f); canvas.rotate(16f + fPadDeg);
        tmpPath.reset();
        tmpPath.moveTo(0f, 0f); tmpPath.lineTo(hl * 0.12f, hh * 0.62f);
        tmpPath.lineTo(-hl * 0.16f, hh * 1.05f); tmpPath.lineTo(-hl * 0.24f, hh * 0.34f); tmpPath.close();
        canvas.drawPath(tmpPath, fillPaint); canvas.drawPath(tmpPath, strokePaint); canvas.restore();

        canvas.save(); canvas.translate(-hl * 0.32f, hh * 0.52f); canvas.rotate(-10f + rPadDeg);
        tmpPath.reset();
        tmpPath.moveTo(0f, 0f); tmpPath.lineTo(hl * 0.08f, hh * 0.56f);
        tmpPath.lineTo(-hl * 0.16f, hh * 0.94f); tmpPath.lineTo(-hl * 0.22f, hh * 0.30f); tmpPath.close();
        canvas.drawPath(tmpPath, fillPaint); canvas.drawPath(tmpPath, strokePaint); canvas.restore();

        // Jaw + rounded teeth
        strokePaint.setColor(0xFFFFF3E0);
        strokePaint.setStrokeWidth(2.4f);
        canvas.drawLine(hl * 0.45f, hh * 0.22f, hl * 1.06f, hh * 0.10f, strokePaint);
        fillPaint.setColor(Color.WHITE);
        for (int t = 0; t < 5; t++) {
            canvas.drawCircle(hl * 0.54f + t * hl * 0.11f, hh * 0.20f - t * hh * 0.02f, 3.0f, fillPaint);
        }

        // Eye
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(hl * 0.58f, -hh * 0.26f, 7.5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(hl * 0.60f, -hh * 0.26f, 3.8f, fillPaint);
    }

    private void drawPlesiosaurus(Canvas canvas, float hl, float hh, float phase, float tail, int rimColor, float rimWidth) {
        float flapDeg = (float) Math.toDegrees((float) Math.sin(phase * 1.1f) * 0.40f);
        float neckNod = (float) Math.sin(phase * 0.8f) * hh * 0.18f;

        // Short tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.46f, -hh * 0.22f);
        tmpPath.quadTo(-hl * 0.85f, tail * 0.4f, -hl * 1.05f, tail * 0.6f);
        tmpPath.quadTo(-hl * 0.82f, hh * 0.28f, -hl * 0.46f, hh * 0.24f);
        tmpPath.close();
        fillPaint.setColor(0xFF00897B);
        canvas.drawPath(tmpPath, fillPaint);

        // Plump turtle-like torso
        tmpRect.set(-hl * 0.62f, -hh * 0.92f, hl * 0.50f, hh * 0.92f);
        fillPaint.setColor(0xFF00897B);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawOval(tmpRect, strokePaint);

        // Belly + lemon-yellow polka dots
        fillPaint.setColor(0xFFB2DFDB);
        tmpRect.set(-hl * 0.48f, hh * 0.06f, hl * 0.36f, hh * 0.78f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);
        fillPaint.setColor(0xFFFFF176);
        canvas.drawCircle(-hl * 0.26f, -hh * 0.32f, 7.5f, fillPaint);
        canvas.drawCircle(-hl * 0.04f, -hh * 0.48f, 8.5f, fillPaint);
        canvas.drawCircle(hl * 0.16f, -hh * 0.24f, 7f, fillPaint);
        canvas.drawCircle(-hl * 0.14f, -hh * 0.06f, 6f, fillPaint);

        // Graceful S-curved mid-long neck
        float headX = hl * 1.12f;
        float headY = -hh * 0.85f + neckNod;
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.36f, -hh * 0.14f);
        tmpPath.cubicTo(hl * 0.72f, -hh * 0.12f, hl * 0.76f, -hh * 0.96f, headX - 6f, headY);
        strokePaint.setColor(0xFF00897B);
        strokePaint.setStrokeWidth(hh * 0.48f);
        canvas.drawPath(tmpPath, strokePaint);

        // Head crest + head
        tmpPath.reset();
        tmpPath.moveTo(headX - 8f, headY - 10f);
        tmpPath.lineTo(headX - 18f, headY - 22f);
        tmpPath.lineTo(headX + 2f, headY - 12f);
        tmpPath.close();
        fillPaint.setColor(0xFFFFF176);
        canvas.drawPath(tmpPath, fillPaint);

        tmpRect.set(headX - 18f, headY - 13f, headX + 26f, headY + 13f);
        fillPaint.setColor(0xFF00897B);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(2f);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(headX + 10f, headY - 4f, 5.5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(headX + 11.5f, headY - 4f, 2.8f, fillPaint);

        // Large wing-like paddles
        fillPaint.setColor(0xFF26A69A);
        strokePaint.setColor(0xFFFFF176);
        strokePaint.setStrokeWidth(2.2f);
        canvas.save(); canvas.translate(hl * 0.16f, hh * 0.58f); canvas.rotate(16f + flapDeg);
        tmpRect.set(-hl * 0.17f, -hh * 0.20f, hl * 0.17f, hh * 1.04f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();

        canvas.save(); canvas.translate(-hl * 0.28f, hh * 0.54f); canvas.rotate(-12f + flapDeg);
        tmpRect.set(-hl * 0.15f, -hh * 0.18f, hl * 0.15f, hh * 0.90f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();
    }

    private void drawElasmosaurus(Canvas canvas, float hl, float hh, float phase, float tail, int rimColor, float rimWidth) {
        float flapDeg = (float) Math.toDegrees((float) Math.sin(phase) * 0.34f);
        float w1 = (float) Math.sin(phase * 0.9f) * hh * 0.32f;
        float w2 = (float) Math.sin(phase * 0.9f - 1.5f) * hh * 0.38f;

        // Tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.50f, -hh * 0.22f);
        tmpPath.quadTo(-hl * 0.90f, tail * 0.5f, -hl * 1.12f, tail);
        tmpPath.quadTo(-hl * 0.86f, hh * 0.26f, -hl * 0.50f, hh * 0.24f);
        tmpPath.close();
        fillPaint.setColor(0xFF1E88E5);
        canvas.drawPath(tmpPath, fillPaint);

        // Compact gem-blue body
        tmpRect.set(-hl * 0.64f, -hh * 0.82f, hl * 0.32f, hh * 0.82f);
        fillPaint.setColor(0xFF1E88E5);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(0xFFE3F2FD);
        tmpRect.set(-hl * 0.52f, hh * 0.04f, hl * 0.20f, hh * 0.68f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        // Ultra-long swan neck (1.4x body length, double S)
        float nx0 = hl * 0.22f, ny0 = -hh * 0.12f;
        float nx1 = hl * 0.72f, ny1 = -hh * 0.88f + w1;
        float nx2 = hl * 1.12f, ny2 = hh * 0.22f + w2;
        float headX = hl * 1.56f;
        float headY = -hh * 0.72f + w2 * 0.8f;

        tmpPath.reset();
        tmpPath.moveTo(nx0, ny0);
        tmpPath.cubicTo(nx1, ny1, nx2, ny2, headX - 4f, headY);
        strokePaint.setColor(0xFF1E88E5);
        strokePaint.setStrokeWidth(hh * 0.34f);
        canvas.drawPath(tmpPath, strokePaint);

        // Neon sky-blue neck rings
        strokePaint.setColor(0xFF80D8FF);
        strokePaint.setStrokeWidth(4f);
        float[] ringTs = { 0.22f, 0.44f, 0.66f, 0.84f };
        for (float t : ringTs) {
            float it = 1f - t;
            float rx = it * it * it * nx0 + 3f * it * it * t * nx1 + 3f * it * t * t * nx2 + t * t * t * (headX - 4f);
            float ry = it * it * it * ny0 + 3f * it * it * t * ny1 + 3f * it * t * t * ny2 + t * t * t * headY;
            canvas.drawCircle(rx, ry, hh * 0.18f, strokePaint);
        }

        // Tiny head
        tmpRect.set(headX - 11f, headY - 10f, headX + 23f, headY + 10f);
        fillPaint.setColor(0xFF1E88E5);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(0xFF80D8FF);
        strokePaint.setStrokeWidth(2f);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(headX + 11f, headY - 3f, 4.5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(headX + 12.2f, headY - 3f, 2.2f, fillPaint);

        // Paddles
        fillPaint.setColor(0xFF42A5F5);
        strokePaint.setColor(0xFF80D8FF);
        strokePaint.setStrokeWidth(2f);
        canvas.save(); canvas.translate(hl * 0.04f, hh * 0.56f); canvas.rotate(16f + flapDeg);
        tmpRect.set(-hl * 0.14f, -hh * 0.16f, hl * 0.14f, hh * 0.88f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();

        canvas.save(); canvas.translate(-hl * 0.34f, hh * 0.52f); canvas.rotate(-12f - flapDeg);
        tmpRect.set(-hl * 0.12f, -hh * 0.14f, hl * 0.12f, hh * 0.78f);
        canvas.drawOval(tmpRect, fillPaint); canvas.drawOval(tmpRect, strokePaint); canvas.restore();
    }

    private void drawNothosaurus(Canvas canvas, float hl, float hh, float phase, float tail, int rimColor, float rimWidth) {
        float stepDeg = (float) Math.toDegrees((float) Math.sin(phase * 1.2f) * 0.35f);

        // Whip-like tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.45f, -hh * 0.24f);
        tmpPath.quadTo(-hl * 1.05f, tail * 0.5f, -hl * 1.52f, tail * 1.1f);
        tmpPath.quadTo(-hl * 1.00f, hh * 0.28f, -hl * 0.45f, hh * 0.24f);
        tmpPath.close();
        fillPaint.setColor(0xFF689F38);
        canvas.drawPath(tmpPath, fillPaint);

        // Flat otter/lizard body
        tmpRect.set(-hl * 0.62f, -hh * 0.62f, hl * 0.62f, hh * 0.62f);
        fillPaint.setColor(0xFF689F38);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(0xFFF1F8E9);
        tmpRect.set(-hl * 0.48f, hh * 0.02f, hl * 0.48f, hh * 0.50f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        // Yellow tiger stripes
        strokePaint.setColor(0xFFFFEE58);
        strokePaint.setStrokeWidth(4.5f);
        for (int i = -2; i <= 2; i++) {
            float sx = i * hl * 0.20f;
            canvas.drawLine(sx, -hh * 0.54f, sx - hl * 0.05f, -hh * 0.06f, strokePaint);
        }

        // Neck + head
        float headX = hl * 0.92f;
        float headY = -hh * 0.22f + (float) Math.sin(phase * 0.9f) * 5f;
        strokePaint.setColor(0xFF689F38);
        strokePaint.setStrokeWidth(hh * 0.46f);
        canvas.drawLine(hl * 0.46f, -hh * 0.04f, headX - 8f, headY, strokePaint);

        tmpRect.set(headX - 18f, headY - 12f, headX + 30f, headY + 12f);
        fillPaint.setColor(0xFF689F38);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(2f);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(headX + 12f, headY - 4f, 5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(headX + 13.5f, headY - 4f, 2.5f, fillPaint);

        // Webbed feet
        drawWebbedFoot(canvas, hl * 0.26f, hh * 0.42f, 17f + stepDeg, hh);
        drawWebbedFoot(canvas, -hl * 0.28f, hh * 0.42f, -14f - stepDeg, hh);
    }

    private void drawWebbedFoot(Canvas canvas, float fx, float fy, float deg, float hh) {
        canvas.save();
        canvas.translate(fx, fy);
        canvas.rotate(deg);
        strokePaint.setColor(0xFF558B2F);
        strokePaint.setStrokeWidth(6f);
        canvas.drawLine(0f, 0f, 0f, hh * 0.50f, strokePaint);
        tmpPath.reset();
        tmpPath.moveTo(0f, hh * 0.44f);
        tmpPath.lineTo(-10f, hh * 0.72f);
        tmpPath.lineTo(0f, hh * 0.78f);
        tmpPath.lineTo(10f, hh * 0.72f);
        tmpPath.close();
        fillPaint.setColor(0xFFFFEE58);
        canvas.drawPath(tmpPath, fillPaint);
        canvas.restore();
    }

    private void drawIchthyosaurus(Canvas canvas, float hl, float hh, float phase, float tail, int rimColor, float rimWidth) {
        // Sickle dorsal fin
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.08f, -hh * 0.76f);
        tmpPath.quadTo(-hl * 0.16f, -hh * 1.72f, -hl * 0.36f, -hh * 0.68f);
        tmpPath.close();
        fillPaint.setColor(0xFF3949AB);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(0xFF80DEEA);
        strokePaint.setStrokeWidth(2f);
        canvas.drawPath(tmpPath, strokePaint);

        // Crescent tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.62f, 0f);
        tmpPath.quadTo(-hl * 0.94f, -hh * 0.52f, -hl * 1.24f + tail, -hh * 1.02f);
        tmpPath.quadTo(-hl * 0.94f + tail * 0.4f, 0f, -hl * 1.24f + tail, hh * 1.02f);
        tmpPath.quadTo(-hl * 0.94f, hh * 0.52f, -hl * 0.62f, 0f);
        tmpPath.close();
        fillPaint.setColor(0xFF3949AB);
        canvas.drawPath(tmpPath, fillPaint);
        canvas.drawPath(tmpPath, strokePaint);

        // Body + needle snout
        tmpPath.reset();
        tmpPath.moveTo(hl * 1.24f, hh * 0.04f);
        tmpPath.lineTo(hl * 0.66f, -hh * 0.18f);
        tmpPath.cubicTo(hl * 0.38f, -hh * 1.05f, -hl * 0.36f, -hh * 0.92f, -hl * 0.72f, 0f);
        tmpPath.cubicTo(-hl * 0.36f, hh * 0.88f, hl * 0.38f, hh * 0.92f, hl * 0.66f, hh * 0.22f);
        tmpPath.lineTo(hl * 1.24f, hh * 0.12f);
        tmpPath.close();
        fillPaint.setColor(0xFF3949AB);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawPath(tmpPath, strokePaint);

        // White belly
        fillPaint.setColor(Color.WHITE);
        tmpRect.set(-hl * 0.50f, hh * 0.06f, hl * 0.54f, hh * 0.70f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        // Silver-cyan lightning stripe
        strokePaint.setColor(0xFF80DEEA);
        strokePaint.setStrokeWidth(4f);
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.56f, 0f);
        tmpPath.lineTo(-hl * 0.12f, -hh * 0.16f);
        tmpPath.lineTo(hl * 0.08f, hh * 0.04f);
        tmpPath.lineTo(hl * 0.54f, -hh * 0.14f);
        canvas.drawPath(tmpPath, strokePaint);

        // Huge eye with sclerotic ring
        float ex = hl * 0.46f;
        float ey = -hh * 0.22f;
        fillPaint.setColor(0xFF80DEEA);
        canvas.drawCircle(ex, ey, 11.5f, fillPaint);
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(ex, ey, 8.8f, fillPaint);
        fillPaint.setColor(0xFF1A237E);
        canvas.drawCircle(ex + 1.5f, ey, 5.2f, fillPaint);
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(ex + 3.2f, ey - 2.6f, 2.4f, fillPaint);
    }

    private void drawJellyfish(Canvas canvas, float hl, float hh, float phase, int c1, int c2) {
        float pulse = (float) Math.sin(phase * 1.4f) * 0.12f;
        float r = hl * (0.72f + pulse);
        tmpRect.set(-r, -hh * 0.15f - r, r, -hh * 0.15f + r);
        fillPaint.setColor(c1);
        canvas.drawArc(tmpRect, 180f, 180f, true, fillPaint);

        strokePaint.setColor(c2);
        strokePaint.setStrokeWidth(3f);
        for (int t = -2; t <= 2; t++) {
            float tx = t * (hl * 0.24f);
            float tw = (float) Math.sin(phase + t) * 7f;
            tmpPath.reset();
            tmpPath.moveTo(tx, hh * 0.15f);
            tmpPath.quadTo(tx + tw, hh * 0.65f, tx - tw * 0.5f, hh * 1.15f);
            canvas.drawPath(tmpPath, strokePaint);
        }
    }

    private void drawTurtle(Canvas canvas, float hl, float hh, float phase, int c1, int c2, int rimColor) {
        float flapDeg = (float) Math.toDegrees((float) Math.sin(phase) * 0.25f);
        fillPaint.setColor(c2);
        canvas.save(); canvas.translate(hl * 0.32f, hh * 0.55f); canvas.rotate(22f + flapDeg);
        tmpRect.set(-hl * 0.28f, -hh * 0.22f, hl * 0.28f, hh * 0.22f);
        canvas.drawOval(tmpRect, fillPaint); canvas.restore();
        canvas.save(); canvas.translate(-hl * 0.34f, hh * 0.50f); canvas.rotate(-17f - flapDeg);
        tmpRect.set(-hl * 0.22f, -hh * 0.18f, hl * 0.22f, hh * 0.18f);
        canvas.drawOval(tmpRect, fillPaint); canvas.restore();

        // Head
        fillPaint.setColor(0xFF43A047);
        tmpRect.set(hl * 0.63f, -hh * 0.34f, hl * 1.07f, hh * 0.18f);
        canvas.drawOval(tmpRect, fillPaint);

        // Shell
        fillPaint.setColor(c1);
        tmpRect.set(-hl * 0.78f, -hh * 0.85f, hl * 0.78f, hh * 0.85f);
        canvas.drawOval(tmpRect, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(2.4f);
        canvas.drawOval(tmpRect, strokePaint);
        strokePaint.setColor(0xFFFFD54F);
        tmpRect.set(-hl * 0.45f, -hh * 0.53f, hl * 0.45f, hh * 0.37f);
        canvas.drawOval(tmpRect, strokePaint);

        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(hl * 0.92f, -hh * 0.16f, 4.5f, fillPaint);
        fillPaint.setColor(Color.BLACK);
        canvas.drawCircle(hl * 0.94f, -hh * 0.16f, 2.2f, fillPaint);
    }

    private void drawStandardFish(Canvas canvas, DiverGameView.RealisticFish.Species sp,
                                  float hl, float hh, float phase, float tail,
                                  int c1, int c2, boolean isAttacking, int rimColor, float rimWidth) {
        // Dorsal fin
        fillPaint.setColor(c2);
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.15f, -hh * 0.82f);
        tmpPath.quadTo(-hl * 0.35f, -hh * 1.45f, -hl * 0.52f, -hh * 0.72f);
        tmpPath.close();
        canvas.drawPath(tmpPath, fillPaint);

        // Crescent tail
        tmpPath.reset();
        tmpPath.moveTo(-hl * 0.68f, 0f);
        tmpPath.quadTo(-hl * 0.95f, -hh * 0.5f, -hl * 1.18f + tail, -hh * 0.85f);
        tmpPath.quadTo(-hl * 0.92f + tail * 0.4f, 0f, -hl * 1.18f + tail, hh * 0.85f);
        tmpPath.quadTo(-hl * 0.95f, hh * 0.5f, -hl * 0.68f, 0f);
        tmpPath.close();
        canvas.drawPath(tmpPath, fillPaint);

        // Main body
        tmpPath.reset();
        tmpPath.moveTo(hl * 0.88f, 0f);
        tmpPath.cubicTo(hl * 0.55f, -hh * 1.05f, -hl * 0.45f, -hh * 0.95f, -hl * 0.78f, 0f);
        tmpPath.cubicTo(-hl * 0.45f, hh * 0.95f, hl * 0.55f, hh * 1.05f, hl * 0.88f, 0f);
        tmpPath.close();
        fillPaint.setColor(c1);
        canvas.drawPath(tmpPath, fillPaint);
        strokePaint.setColor(rimColor);
        strokePaint.setStrokeWidth(rimWidth);
        canvas.drawPath(tmpPath, strokePaint);

        // Belly highlight
        fillPaint.setColor(0x47FFFFFF);
        tmpRect.set(-hl * 0.46f, -hh * 0.02f, hl * 0.62f, hh * 0.70f);
        canvas.drawArc(tmpRect, 0f, 180f, true, fillPaint);

        if (sp == DiverGameView.RealisticFish.Species.CLOWNFISH) {
            float[] bxs = { hl * 0.32f, -hl * 0.05f, -hl * 0.42f };
            for (float bx : bxs) {
                fillPaint.setColor(0xFF1A1A1A);
                canvas.drawRect(bx - 2f, -hh * 0.72f, bx + hl * 0.16f + 2f, hh * 0.72f, fillPaint);
                fillPaint.setColor(Color.WHITE);
                canvas.drawRect(bx, -hh * 0.70f, bx + hl * 0.16f, hh * 0.70f, fillPaint);
            }
        } else if (sp == DiverGameView.RealisticFish.Species.BLUE_TANG) {
            fillPaint.setColor(0xFF111111);
            tmpRect.set(-hl * 0.44f, -hh * 0.53f, hl * 0.28f, hh * 0.23f);
            canvas.drawOval(tmpRect, fillPaint);
        } else if (sp == DiverGameView.RealisticFish.Species.ANGLERFISH) {
            strokePaint.setColor(0xFF80DEEA);
            strokePaint.setStrokeWidth(2.5f);
            tmpPath.reset();
            tmpPath.moveTo(hl * 0.55f, -hh * 0.70f);
            tmpPath.quadTo(hl * 0.85f, -hh * 1.15f, hl * 0.98f, -hh * 0.65f);
            canvas.drawPath(tmpPath, strokePaint);
            fillPaint.setColor(0x9900E5FF);
            canvas.drawCircle(hl * 0.98f, -hh * 0.65f, 11f, fillPaint);
        }

        // Eye
        fillPaint.setColor(Color.WHITE);
        canvas.drawCircle(hl * 0.52f, -hh * 0.20f, 6f, fillPaint);
        fillPaint.setColor(isAttacking ? 0xFFFFB300 : Color.BLACK);
        canvas.drawCircle(hl * 0.54f, -hh * 0.20f, 3f, fillPaint);
    }
}
