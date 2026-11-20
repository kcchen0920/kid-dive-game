package com.babyshark.tv;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

public class AquariumView extends View {

    public interface OnCoinsChangeListener {
        void onCoinsChanged(int newCoins);
    }

    private final GameState state;
    private final OnCoinsChangeListener coinsListener;
    private final Random random = new Random();

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private Paint waterPaint;
    private final Paint glossPaint = new Paint();
    private final Path glossPath = new Path();

    // Dynamic tank bounds
    private float tankL = 160f, tankT = 160f, tankR = 1760f, tankB = 990f;
    private boolean boundsReady = false;

    // Food Dropper position at top & cooldown animation
    private float dropperX = 960f;
    private static final long FEED_COOLDOWN_MS = 650L;
    private static final long DROPPER_ANIM_MS = 420L;
    private long lastFeedTime = 0L;

    // Food Pellets
    private static class FoodPellet {
        float x, y, vy, r;
        boolean eaten = false;
    }
    private final List<FoodPellet> pellets = new ArrayList<>();

    // Heart & Coin Bubbles
    private static class HeartBubble {
        float x, y, vy, size, alpha;
        long spawnTime;
        String symbol = "❤️";
    }
    private final List<HeartBubble> hearts = new ArrayList<>();

    // Aquarium Ambient Air Bubbles
    private static class AirBubble {
        float x, y, vy, r;
    }
    private final List<AirBubble> airBubbles = new ArrayList<>();

    // Aquarium Swimming Fish
    private final CreatureRenderer creatureRenderer = new CreatureRenderer();

    private static class AquariumFish {
        DiverGameView.RealisticFish.Species species = DiverGameView.RealisticFish.Species.CLOWNFISH;
        String name;
        int color;
        int secondaryColor;
        float x, y, vx, vy;
        float size;
        float bodyHeight;
        float facing = 1f;
        float swimPhase = 0f;
        float spinAngle = 0f;
        float chompTimer = 0f;
        boolean isSpinning = false;
    }
    private final List<AquariumFish> aquariumFishes = new ArrayList<>();

    private long lastTime = 0;
    private boolean isRunning = true;

    public AquariumView(Context context, OnCoinsChangeListener listener) {
        super(context);
        this.state = GameState.get(context);
        this.coinsListener = listener;
        setFocusable(true);
        setFocusableInTouchMode(true);
        initAquarium();
    }

    private void initAquarium() {
        aquariumFishes.clear();
        pellets.clear();
        hearts.clear();
        airBubbles.clear();

        // 1. Aeration Air Bubbles
        for (int i = 0; i < 35; i++) {
            AirBubble b = new AirBubble();
            b.x = 200f + random.nextFloat() * 1520f;
            b.y = 200f + random.nextFloat() * 700f;
            b.r = 4f + random.nextFloat() * 8f;
            b.vy = -1.2f - random.nextFloat() * 2f;
            airBubbles.add(b);
        }

        // 2. Populate Happy Aquarium Fishes (including Prehistoric Guests!)
        addFish(DiverGameView.RealisticFish.Species.CLOWNFISH, "小丑魚 尼莫", 0xFFFF6D00, 0xFFFFFFFF, 72f, 44f);
        addFish(DiverGameView.RealisticFish.Species.BLUE_TANG, "藍倒吊 多莉", 0xFF1565C0, 0xFFFFD600, 78f, 48f);
        addFish(DiverGameView.RealisticFish.Species.YELLOW_TANG, "黃金蝶魚", 0xFFFFEA00, 0xFFFFFFFF, 74f, 52f);
        addFish(DiverGameView.RealisticFish.Species.BABY_SHARK, "Baby Shark 小鯊魚", 0xFFFFD166, 0xFFFFFFFF, 120f, 56f);
        addFish(DiverGameView.RealisticFish.Species.JELLYFISH, "海月水母", 0xCCBA68C8, 0xEE7B1FA2, 68f, 74f);
        addFish(DiverGameView.RealisticFish.Species.ANGLERFISH, "深海安康魚", 0xFF37474F, 0xFF00E5FF, 110f, 72f);
        addFish(DiverGameView.RealisticFish.Species.TURTLE, "綠海龜 奔奔", 0xFF2E7D32, 0xFFFFD54F, 115f, 70f);
        addFish(DiverGameView.RealisticFish.Species.PLESIOSAURUS, "蛇頸龍 小寶", 0xFF00897B, 0xFFFFF176, 130f, 56f);
        addFish(DiverGameView.RealisticFish.Species.DUNKLEOSTEUS, "鐵甲鄧氏魚", 0xFF5D4037, 0xFFFFB300, 145f, 66f);

        lastTime = SystemClock.uptimeMillis();
    }

    private void addFish(DiverGameView.RealisticFish.Species sp, String name, int c1, int c2, float size, float bh) {
        AquariumFish f = new AquariumFish();
        f.species = sp;
        f.name = name;
        f.color = c1;
        f.secondaryColor = c2;
        f.size = size;
        f.bodyHeight = bh;
        f.x = 280f + random.nextFloat() * 1360f;
        f.y = 260f + random.nextFloat() * 580f;
        f.vx = (random.nextBoolean() ? 1f : -1f) * (60f + random.nextFloat() * 60f);
        f.facing = f.vx > 0 ? 1f : -1f;
        f.swimPhase = random.nextFloat() * 6.28f;
        aquariumFishes.add(f);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (w <= 0 || h <= 0) return;

        tankL = Math.max(80f, w * 0.08f);
        tankR = w - tankL;
        tankT = Math.max(120f, h * 0.16f);
        tankB = h - Math.max(85f, h * 0.10f);

        waterPaint = new Paint();
        waterPaint.setShader(new LinearGradient(
            0, tankT, 0, tankB,
            new int[]{ 0xEE00B4D8, 0xEE0077B6, 0xEE023E8A },
            new float[]{ 0.0f, 0.45f, 1.0f },
            Shader.TileMode.CLAMP
        ));

        glossPaint.setColor(0x18FFFFFF);
        glossPath.reset();
        glossPath.moveTo(tankL, tankT);
        glossPath.lineTo(tankL + Math.min(220f, (tankR - tankL) * 0.18f), tankT);
        glossPath.lineTo(tankL + Math.min(80f, (tankR - tankL) * 0.07f), tankB);
        glossPath.lineTo(tankL, tankB);
        glossPath.close();

        float spanX = Math.max(120f, tankR - tankL - 140f);
        float spanY = Math.max(100f, tankB - tankT - 145f);
        if (!boundsReady) {
            dropperX = w / 2f;
            for (AirBubble b : airBubbles) {
                b.x = tankL + 30f + random.nextFloat() * Math.max(100f, tankR - tankL - 60f);
                b.y = tankT + 20f + random.nextFloat() * Math.max(80f, tankB - tankT - 65f);
            }
            for (AquariumFish f : aquariumFishes) {
                f.x = tankL + 70f + random.nextFloat() * spanX;
                f.y = tankT + 70f + random.nextFloat() * spanY;
            }
            boundsReady = true;
        } else {
            dropperX = Math.max(tankL + 60f, Math.min(tankR - 60f, dropperX));
            for (AquariumFish f : aquariumFishes) {
                f.x = Math.max(tankL + 80f, Math.min(tankR - 80f, f.x));
                f.y = Math.max(tankT + 65f, Math.min(tankB - 75f, f.y));
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        float step = Math.max(30f, (tankR - tankL) * 0.03f);
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                dropperX = Math.max(tankL + 60f, dropperX - step);
                postInvalidate();
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                dropperX = Math.min(tankR - 60f, dropperX + step);
                postInvalidate();
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
                if (event.getRepeatCount() == 0) {
                    dropFood();
                }
                return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        int action = event.getActionMasked();
        if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_MOVE) {
            dropperX = Math.max(tankL + 60f, Math.min(tankR - 60f, event.getX()));
            if (action == MotionEvent.ACTION_DOWN) {
                dropFood();
            }
            postInvalidate();
            return true;
        }
        return true;
    }

    private void dropFood() {
        long now = SystemClock.uptimeMillis();
        if (now - lastFeedTime < FEED_COOLDOWN_MS) {
            return;
        }
        lastFeedTime = now;

        for (int i = 0; i < 3; i++) {
            FoodPellet p = new FoodPellet();
            p.x = dropperX + (random.nextFloat() - 0.5f) * 30f;
            p.y = tankT + 20f;
            p.vy = 85f + random.nextFloat() * 50f;
            p.r = 6f + random.nextFloat() * 3f;
            pellets.add(p);
        }
        SoundManager.get(getContext()).playBubble();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        long now = SystemClock.uptimeMillis();
        float dt = Math.min((now - lastTime) / 1000f, 0.05f);
        lastTime = now;

        updatePhysics(dt, now);
        renderScene(canvas, now);

        if (isRunning) {
            postInvalidateOnAnimation();
        }
    }

    private void updatePhysics(float dt, long now) {
        int w = getWidth();
        int h = getHeight();
        if (w == 0 || h == 0) return;

        // 1. Aeration Bubbles
        for (AirBubble b : airBubbles) {
            b.y += b.vy * 60f * dt;
            if (b.y < tankT + 15f) {
                b.y = tankB - 45f;
                b.x = tankL + 30f + random.nextFloat() * Math.max(100f, tankR - tankL - 60f);
            }
        }

        // 2. Food Pellets sinking
        Iterator<FoodPellet> pIt = pellets.iterator();
        while (pIt.hasNext()) {
            FoodPellet p = pIt.next();
            p.y += p.vy * dt;
            if (p.eaten || p.y > tankB - 45f) {
                pIt.remove();
            }
        }

        // 3. Heart Bubbles rising
        Iterator<HeartBubble> hIt = hearts.iterator();
        while (hIt.hasNext()) {
            HeartBubble hb = hIt.next();
            hb.y += hb.vy * dt;
            float age = (now - hb.spawnTime) / 1000f;
            hb.alpha = Math.max(0f, 1f - age / 2.0f);
            if (age > 2.0f) {
                hIt.remove();
            }
        }

        // 4. Fish AI & Feeding
        for (AquariumFish f : aquariumFishes) {
            f.swimPhase += dt * 4.5f;
            if (f.chompTimer > 0f) f.chompTimer = Math.max(0f, f.chompTimer - dt);

            if (f.isSpinning) {
                f.spinAngle += dt * 720f;
                if (f.spinAngle >= 360f) {
                    f.isSpinning = false;
                    f.spinAngle = 0f;
                }
            }

            // Check nearest food pellet
            FoodPellet nearestPellet = null;
            float minDist = 320f;
            for (FoodPellet p : pellets) {
                if (p.eaten) continue;
                float d = (float) Math.hypot(p.x - f.x, p.y - f.y);
                if (d < minDist) {
                    minDist = d;
                    nearestPellet = p;
                }
            }

            if (nearestPellet != null) {
                // Swim towards food
                float dx = nearestPellet.x - f.x;
                float dy = nearestPellet.y - f.y;
                float dist = (float) Math.hypot(dx, dy);
                if (dist > 18f) {
                    f.x += (dx / dist) * 140f * dt;
                    f.y += (dy / dist) * 140f * dt;
                    f.facing = dx > 0 ? 1f : -1f;
                } else {
                    // Eat food!
                    nearestPellet.eaten = true;
                    f.isSpinning = true;
                    f.spinAngle = 0f;
                    f.chompTimer = 0.55f;

                    // Spawn Heart & Coin Bubbles!
                    HeartBubble hb = new HeartBubble();
                    hb.x = f.x;
                    hb.y = f.y - 25f;
                    hb.vy = -65f;
                    hb.size = 30f;
                    hb.alpha = 1f;
                    hb.spawnTime = now;
                    hb.symbol = "❤️";
                    hearts.add(hb);

                    HeartBubble cb = new HeartBubble();
                    cb.x = f.x + 26f;
                    cb.y = f.y - 42f;
                    cb.vy = -80f;
                    cb.size = 24f;
                    cb.alpha = 1f;
                    cb.spawnTime = now;
                    cb.symbol = "+5 🪙";
                    hearts.add(cb);

                    // Reward coins for happy fish feeding
                    state.coins += 5;
                    state.save();
                    if (coinsListener != null) coinsListener.onCoinsChanged(state.coins);
                    SoundManager.get(getContext()).playCatch();
                }
            } else {
                // Normal calm swimming (extra margin for long-neck dinos & Dunkleosteus)
                float marginX = (f.species == DiverGameView.RealisticFish.Species.ELASMOSAURUS
                        || f.species == DiverGameView.RealisticFish.Species.PLESIOSAURUS
                        || f.species == DiverGameView.RealisticFish.Species.DUNKLEOSTEUS)
                        ? Math.max(115f, f.size * 0.9f) : 80f;
                f.x += f.vx * dt;
                f.y += (float) Math.sin(f.swimPhase) * 0.8f;
                if (f.x < tankL + marginX) {
                    f.x = tankL + marginX;
                    f.vx = Math.abs(f.vx);
                    f.facing = 1f;
                } else if (f.x > tankR - marginX) {
                    f.x = tankR - marginX;
                    f.vx = -Math.abs(f.vx);
                    f.facing = -1f;
                }
                f.y = Math.max(tankT + 65f, Math.min(tankB - 75f, f.y));
            }
        }
    }

    private void renderScene(Canvas canvas, long now) {
        int w = getWidth();
        int h = getHeight();

        // 1. Living Room Wall Ambient
        canvas.drawColor(Color.parseColor("#0B132B"));

        // 2. Crystal Acrylic Tank Frame
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF1C2541);
        canvas.drawRoundRect(tankL - 20f, tankT - 20f, tankR + 20f, tankB + 20f, 24f, 24f, paint);

        // Tank Water Gradient
        if (waterPaint != null) {
            canvas.drawRoundRect(tankL, tankT, tankR, tankB, 18f, 18f, waterPaint);
        }

        // Seabed Coral Gravel & Rocks
        paint.setColor(0xFFE0A96D); // Sandy coral gravel
        canvas.drawRoundRect(tankL, tankB - 45f, tankR, tankB, 14f, 14f, paint);

        // Decorative Aquarium Castle in Center
        renderAquariumCastle(canvas, w / 2f, tankB - 45f);

        // Aeration Bubbles
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(2f);
        paint.setColor(0xAAFFFFFF);
        for (AirBubble b : airBubbles) {
            canvas.drawCircle(b.x, b.y, b.r, paint);
        }
        paint.setStyle(Paint.Style.FILL);

        // Sinking Food Pellets
        paint.setColor(0xFFFFB74D); // Golden shrimp cookie
        for (FoodPellet p : pellets) {
            canvas.drawCircle(p.x, p.y, p.r, paint);
            paint.setColor(0xFFE65100);
            canvas.drawCircle(p.x, p.y, p.r * 0.5f, paint);
            paint.setColor(0xFFFFB74D);
        }

        // Swimming Aquarium Fishes
        for (AquariumFish f : aquariumFishes) {
            renderFish(canvas, f, now);
        }

        // Rising Heart & Coin Bubbles
        for (HeartBubble hb : hearts) {
            textPaint.setColor(hb.symbol.contains("🪙") ? 0xFFFFD700 : 0xFFFF4081);
            textPaint.setAlpha((int)(hb.alpha * 255));
            textPaint.setTextSize(hb.size);
            canvas.drawText(hb.symbol, hb.x, hb.y, textPaint);
        }
        textPaint.setAlpha(255);

        // Glass Gloss Reflection
        canvas.drawPath(glossPath, glossPaint);

        // Top Food Dropper Tool with tilt animation & cooldown ring
        renderFoodDropper(canvas, dropperX, tankT, now);

        // Minimal Title
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setColor(0xFFFFD166);
        textPaint.setTextSize(28f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("🐠 快樂水族箱", w / 2f, tankT * 0.62f, textPaint);

        // Icon-First Bottom Remote Guide
        renderBottomGuide(canvas, w, h);
        textPaint.setTextAlign(Paint.Align.LEFT);
    }

    private void renderFoodDropper(Canvas canvas, float x, float y, long now) {
        long elapsed = now - lastFeedTime;
        float tiltDeg = 0f;
        float dipY = 0f;
        if (elapsed >= 0 && elapsed < DROPPER_ANIM_MS) {
            float t = elapsed / (float) DROPPER_ANIM_MS;
            tiltDeg = (float) Math.sin(t * Math.PI) * 38f;
            dipY = (float) Math.sin(t * Math.PI) * 10f;
        }

        // Pulsing left/right directional hint arrows beside jar
        int arrowAlpha = (int) (150 + 100 * Math.sin(now / 220.0));
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(22f);
        textPaint.setColor(Color.argb(arrowAlpha, 255, 255, 255));
        canvas.drawText("◀", x - 44f, y - 16f, textPaint);
        canvas.drawText("▶", x + 44f, y - 16f, textPaint);

        // Shaker Container with tilt
        canvas.save();
        canvas.translate(x, y - 20f + dipY);
        canvas.rotate(tiltDeg);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFFFFD54F);
        canvas.drawRoundRect(-22f, -28f, 22f, 14f, 8f, 8f, paint);
        paint.setColor(0xFFFF8F00); // Shaker lid
        canvas.drawRect(-14f, 14f, 14f, 26f, paint);
        // 3 cookie dots instead of text
        paint.setColor(0xFFE65100);
        canvas.drawCircle(-8f, -8f, 4.5f, paint);
        canvas.drawCircle(8f, -12f, 4.5f, paint);
        canvas.drawCircle(1f, 1f, 4.5f, paint);
        canvas.restore();

        // Mini cooldown arc above jar
        if (elapsed >= 0 && elapsed < FEED_COOLDOWN_MS) {
            float prog = elapsed / (float) FEED_COOLDOWN_MS;
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(4f);
            paint.setColor(0xFF00E5FF);
            canvas.drawArc(x - 16f, y - 78f, x + 16f, y - 46f, -90f, 360f * prog, false, paint);
            paint.setStyle(Paint.Style.FILL);
        }
    }

    private void renderBottomGuide(Canvas canvas, int w, int h) {
        String[] pills = { "◀ ▶  🥫", "⭕ OK  🍪", "↩️  🏠" };
        float pillW = 175f;
        float pillH = 44f;
        float gap = 28f;
        float totalW = pills.length * pillW + (pills.length - 1) * gap;
        float startX = (w - totalW) / 2f;
        float py = h - 58f;

        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(22f);
        textPaint.setFakeBoldText(true);

        for (int i = 0; i < pills.length; i++) {
            float px = startX + i * (pillW + gap);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xCC1C2541);
            canvas.drawRoundRect(px, py, px + pillW, py + pillH, 22f, 22f, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2.5f);
            paint.setColor(0x8848CAE4);
            canvas.drawRoundRect(px, py, px + pillW, py + pillH, 22f, 22f, paint);
            paint.setStyle(Paint.Style.FILL);

            textPaint.setColor(Color.WHITE);
            canvas.drawText(pills[i], px + pillW / 2f, py + 30f, textPaint);
        }
    }

    private void renderAquariumCastle(Canvas canvas, float cx, float base) {
        paint.setColor(0xFF78909C);
        canvas.drawRect(cx - 70f, base - 110f, cx + 70f, base, paint);
        // Battlements
        canvas.drawRect(cx - 75f, base - 130f, cx - 40f, base - 110f, paint);
        canvas.drawRect(cx - 15f, base - 130f, cx + 15f, base - 110f, paint);
        canvas.drawRect(cx + 40f, base - 130f, cx + 75f, base - 110f, paint);

        // Arched Gateway
        paint.setColor(0xFF003865);
        canvas.drawRoundRect(cx - 25f, base - 70f, cx + 25f, base, 12f, 12f, paint);
    }

    private void renderFish(Canvas canvas, AquariumFish f, long now) {
        creatureRenderer.renderCreature(
                canvas, f.species, f.x, f.y, f.facing, f.size, f.bodyHeight, f.swimPhase,
                f.color, f.secondaryColor, false, 0f, f.chompTimer, 0f,
                f.isSpinning ? f.spinAngle : 0f, now
        );
    }
}
