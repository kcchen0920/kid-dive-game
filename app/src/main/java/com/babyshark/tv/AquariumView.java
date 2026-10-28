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

    // Food Dropper position at top
    private float dropperX = 960f;

    // Food Pellets
    private static class FoodPellet {
        float x, y, vy, r;
        boolean eaten = false;
    }
    private final List<FoodPellet> pellets = new ArrayList<>();

    // Heart Bubbles
    private static class HeartBubble {
        float x, y, vy, size, alpha;
        long spawnTime;
    }
    private final List<HeartBubble> hearts = new ArrayList<>();

    // Aquarium Ambient Air Bubbles
    private static class AirBubble {
        float x, y, vy, r;
    }
    private final List<AirBubble> airBubbles = new ArrayList<>();

    // Aquarium Swimming Fish
    private static class AquariumFish {
        String name;
        int color;
        int secondaryColor;
        float x, y, vx, vy;
        float size;
        float facing = 1f;
        float swimPhase = 0f;
        float spinAngle = 0f;
        boolean isSpinning = false;
        boolean isTurtle = false;
        boolean isShark = false;
    }
    private final List<AquariumFish> aquariumFishes = new ArrayList<>();

    private long lastTime = 0;
    private boolean isRunning = true;
    private String feedNotice = "❤️ 歡迎來到客廳水族箱！使用 [◀ / ▶] 移動飼料罐，按 [OK] 投餵餅乾！";
    private long noticeTime = 0;

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

        // 2. Populate Happy Aquarium Fishes
        addFish("小丑魚 尼莫", 0xFFFF6D00, 0xFFFFFFFF, 65f, false, false);
        addFish("小丑魚 多莉伴侶", 0xFFFF8F00, 0xFFFFFFFF, 60f, false, false);
        addFish("藍倒吊 多莉", 0xFF1565C0, 0xFFFFD600, 72f, false, false);
        addFish("黃金蝶魚", 0xFFFFEA00, 0xFFFFFFFF, 68f, false, false);
        addFish("Baby Shark 小鯊魚", 0xFFFFD166, 0xFFFFFFFF, 120f, false, true);
        addFish("海月水母", 0xCCBA68C8, 0xEE7B1FA2, 65f, false, false);
        addFish("深海安康魚 (特邀來客)", 0xFF37474F, 0xFF00E5FF, 110f, false, false);
        addFish("綠海龜 奔奔", 0xFF2E7D32, 0xFFFFD54F, 115f, true, false);

        lastTime = SystemClock.uptimeMillis();
    }

    private void addFish(String name, int c1, int c2, float size, boolean isTurtle, boolean isShark) {
        AquariumFish f = new AquariumFish();
        f.name = name;
        f.color = c1;
        f.secondaryColor = c2;
        f.size = size;
        f.isTurtle = isTurtle;
        f.isShark = isShark;
        f.x = 250f + random.nextFloat() * 1420f;
        f.y = 260f + random.nextFloat() * 580f;
        f.vx = (random.nextBoolean() ? 1f : -1f) * (60f + random.nextFloat() * 60f);
        f.facing = f.vx > 0 ? 1f : -1f;
        f.swimPhase = random.nextFloat() * 6.28f;
        aquariumFishes.add(f);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                dropperX = Math.max(220f, dropperX - 45f);
                postInvalidate();
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                dropperX = Math.min(1700f, dropperX + 45f);
                postInvalidate();
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
                dropFood();
                return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void dropFood() {
        for (int i = 0; i < 3; i++) {
            FoodPellet p = new FoodPellet();
            p.x = dropperX + (random.nextFloat() - 0.5f) * 30f;
            p.y = 195f;
            p.vy = 85f + random.nextFloat() * 50f;
            p.r = 6f + random.nextFloat() * 3f;
            pellets.add(p);
        }
        SoundManager.get(getContext()).playBubble();
        feedNotice = "🍪 投下了美味小蝦米餅乾！小魚們爭先恐後游過來啦~";
        noticeTime = SystemClock.uptimeMillis();
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
            if (b.y < 180f) {
                b.y = 880f;
                b.x = 200f + random.nextFloat() * 1520f;
            }
        }

        // 2. Food Pellets sinking
        Iterator<FoodPellet> pIt = pellets.iterator();
        while (pIt.hasNext()) {
            FoodPellet p = pIt.next();
            p.y += p.vy * dt;
            if (p.eaten || p.y > 880f) {
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

                    // Spawn Heart Bubble!
                    HeartBubble hb = new HeartBubble();
                    hb.x = f.x;
                    hb.y = f.y - 25f;
                    hb.vy = -65f;
                    hb.size = 28f;
                    hb.alpha = 1f;
                    hb.spawnTime = now;
                    hearts.add(hb);

                    // Reward coins for happy fish feeding
                    state.coins += 5;
                    state.save();
                    if (coinsListener != null) coinsListener.onCoinsChanged(state.coins);
                    SoundManager.get(getContext()).playCatch();
                    feedNotice = "💖 " + f.name + " 吃到了小蝦米！開心吐出愛心泡泡！+5 貝殼金幣！";
                    noticeTime = now;
                }
            } else {
                // Normal calm swimming
                f.x += f.vx * dt;
                f.y += (float) Math.sin(f.swimPhase) * 0.8f;
                if (f.x < 240f) {
                    f.x = 240f;
                    f.vx = Math.abs(f.vx);
                    f.facing = 1f;
                } else if (f.x > 1680f) {
                    f.x = 1680f;
                    f.vx = -Math.abs(f.vx);
                    f.facing = -1f;
                }
            }
        }
    }

    private void renderScene(Canvas canvas, long now) {
        int w = getWidth();
        int h = getHeight();

        // 1. Living Room Wall Ambient
        canvas.drawColor(Color.parseColor("#0B132B"));

        // 2. Crystal Acrylic Tank Frame
        float tankL = 160f, tankT = 160f, tankR = w - 160f, tankB = h - 90f;
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF1C2541);
        canvas.drawRoundRect(tankL - 20f, tankT - 20f, tankR + 20f, tankB + 20f, 24f, 24f, paint);

        // Tank Water Gradient
        Paint waterPaint = new Paint();
        waterPaint.setShader(new LinearGradient(
            0, tankT, 0, tankB,
            new int[]{ 0xEE00B4D8, 0xEE0077B6, 0xEE023E8A },
            new float[]{ 0.0f, 0.45f, 1.0f },
            Shader.TileMode.CLAMP
        ));
        canvas.drawRoundRect(tankL, tankT, tankR, tankB, 18f, 18f, waterPaint);

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
            renderFish(canvas, f);
        }

        // Rising Heart Bubbles
        for (HeartBubble hb : hearts) {
            textPaint.setColor(0xFFFF4081);
            textPaint.setAlpha((int)(hb.alpha * 255));
            textPaint.setTextSize(hb.size);
            canvas.drawText("❤️", hb.x, hb.y, textPaint);
        }

        // Glass Gloss Reflection
        Paint glossPaint = new Paint();
        glossPaint.setColor(0x18FFFFFF);
        Path gloss = new Path();
        gloss.moveTo(tankL, tankT);
        gloss.lineTo(tankL + 220f, tankT);
        gloss.lineTo(tankL + 80f, tankB);
        gloss.lineTo(tankL, tankB);
        gloss.close();
        canvas.drawPath(gloss, glossPaint);

        // Top Food Dropper Tool
        renderFoodDropper(canvas, dropperX, tankT);

        // Title and Interactive Guide Banner
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setColor(0xFFFFD166);
        textPaint.setTextSize(26f);
        textPaint.setFakeBoldText(true);
        canvas.drawText("🐠 我的客廳水族箱 (Living Room Aquarium)", w / 2f, 110f, textPaint);

        // Live Feeding Notice Banner
        textPaint.setTextSize(21f);
        textPaint.setColor(0xFF48CAE4);
        canvas.drawText(feedNotice, w / 2f, tankT - 18f, textPaint);

        // Bottom Remote Instructions
        textPaint.setTextSize(19f);
        textPaint.setColor(Color.WHITE);
        canvas.drawText("🎮 遙控器指南：[◀ / ▶ 方向鍵] 移動飼料罐  |  [OK 鍵] 投下小蝦米餅乾 (看魚兒爭食吐愛心泡泡！)  |  [返回鍵] 返回主選單", w / 2f, h - 35f, textPaint);
        textPaint.setTextAlign(Paint.Align.LEFT);
    }

    private void renderFoodDropper(Canvas canvas, float x, float y) {
        // Shaker Container
        paint.setColor(0xFFFFD54F);
        canvas.drawRoundRect(x - 22f, y - 48f, x + 22f, y - 6f, 8f, 8f, paint);
        paint.setColor(0xFFFF8F00); // Shaker lid
        canvas.drawRect(x - 14f, y - 6f, x + 14f, y + 6f, paint);

        textPaint.setTextSize(16f);
        textPaint.setColor(0xFF3E2723);
        textPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("飼料", x, y - 22f, textPaint);
        textPaint.setTextAlign(Paint.Align.LEFT);
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

    private void renderFish(Canvas canvas, AquariumFish f) {
        canvas.save();
        canvas.translate(f.x, f.y);
        canvas.scale(f.facing, 1.0f);
        if (f.isSpinning) {
            canvas.rotate(f.spinAngle);
        }

        float halfL = f.size / 2f;
        float halfH = f.size * 0.35f;
        float tailWave = (float) Math.sin(f.swimPhase) * 8f;

        paint.setColor(f.color);
        if (f.isTurtle) {
            // Cute Green Sea Turtle
            paint.setColor(0xFF2E7D32);
            canvas.drawOval(new RectF(-halfL, -halfH * 1.2f, halfL * 0.8f, halfH * 1.2f), paint);
            // Shell Hexagon Pattern
            paint.setColor(0xFFFFD54F);
            canvas.drawCircle(0, 0, halfH * 0.6f, paint);
            // Head
            paint.setColor(0xFF388E3C);
            canvas.drawCircle(halfL * 0.95f, 0, 12f, paint);
            // Eye
            paint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 1.05f, -3f, 2.5f, paint);
            // Flippers
            canvas.drawLine(-halfL * 0.2f, -halfH, halfL * 0.4f, -halfH * 2.2f, paint);
            canvas.drawLine(-halfL * 0.2f, halfH, halfL * 0.4f, halfH * 2.2f, paint);
        } else {
            // Fish Body
            Path body = new Path();
            body.moveTo(halfL, 0);
            body.quadTo(0, -halfH * 1.15f, -halfL * 0.6f, -halfH * 0.3f);
            body.lineTo(-halfL + tailWave, 0);
            body.lineTo(-halfL * 0.6f, halfH * 0.3f);
            body.quadTo(0, halfH * 1.15f, halfL, 0);
            body.close();
            canvas.drawPath(body, paint);

            // Tail
            paint.setColor(f.secondaryColor);
            Path tail = new Path();
            tail.moveTo(-halfL * 0.6f, 0);
            tail.lineTo(-halfL * 1.25f + tailWave, -halfH * 0.8f);
            tail.lineTo(-halfL * 1.05f + tailWave, 0);
            tail.lineTo(-halfL * 1.25f + tailWave, halfH * 0.8f);
            tail.close();
            canvas.drawPath(tail, paint);

            // Eye
            paint.setColor(Color.WHITE);
            canvas.drawCircle(halfL * 0.65f, -halfH * 0.25f, 5.5f, paint);
            paint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 0.67f, -halfH * 0.25f, 2.8f, paint);
        }

        canvas.restore();
    }
}
