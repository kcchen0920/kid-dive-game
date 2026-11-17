package com.babyshark.tv;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

public class TheaterView extends FrameLayout {

    private final SoundManager soundManager;
    private final List<LinearLayout> songCards = new ArrayList<>();
    private final List<TextView> playBadges = new ArrayList<>();
    private final TextView nowPlayingText;
    private final StageVisualizerView stageVisualizer;
    private int currentSongIndex = -1;

    private static final String[] SONG_TITLES = {
        "Baby Shark",
        "鯊魚一家",
        "海底派對",
        "泡泡舞曲"
    };

    private static final String[] SONG_ICONS = {
        "🦈",
        "👨‍👩‍👧‍👦",
        "🌊🐠",
        "🦀🫧"
    };

    private static final int[] SONG_BG_COLORS = {
        0xFF0277BD,
        0xFF00838F,
        0xFF1565C0,
        0xFF6A1B9A
    };

    private static final int[] SONG_RES_IDS = {
        R.raw.song_baby_shark,
        R.raw.song_family_shark,
        R.raw.song_ocean_party,
        R.raw.song_bubble_dance
    };

    public TheaterView(Context context) {
        super(context);
        soundManager = SoundManager.get(context);
        setBackgroundColor(Color.parseColor("#001529"));

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(60, 24, 60, 24);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(context);
        title.setText("🎵 海洋音樂廳");
        title.setTextSize(30f);
        title.setTextColor(Color.parseColor("#FFD166"));
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        root.addView(title);

        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);

        for (int i = 0; i < SONG_TITLES.length; i++) {
            final int index = i;

            LinearLayout card = new LinearLayout(context);
            card.setId(View.generateViewId());
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);
            card.setBackgroundResource(R.drawable.shop_card_selector);
            card.setFocusable(true);
            card.setClickable(true);
            card.setPadding(18, 18, 18, 18);

            // Big Emoji Icon Badge (Zero-reading for 4-year-olds)
            TextView iconBadge = new TextView(context);
            iconBadge.setText(SONG_ICONS[i]);
            iconBadge.setTextSize(46f);
            iconBadge.setGravity(Gravity.CENTER);
            iconBadge.setBackgroundColor(SONG_BG_COLORS[i]);
            int badgeSize = (int) (88 * context.getResources().getDisplayMetrics().density);
            card.addView(iconBadge, new LinearLayout.LayoutParams(badgeSize, badgeSize));

            TextView tv = new TextView(context);
            tv.setText(SONG_TITLES[i]);
            tv.setTextSize(17f);
            tv.setTextColor(Color.parseColor("#CFD8DC"));
            tv.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(0, 8, 0, 8);
            card.addView(tv);

            TextView playBadge = new TextView(context);
            playBadge.setText("▶️");
            playBadge.setTextSize(22f);
            playBadge.setTextColor(Color.WHITE);
            playBadge.setGravity(Gravity.CENTER);
            playBadge.setBackgroundResource(R.drawable.price_badge_selector);
            playBadge.setPadding(32, 6, 32, 6);
            card.addView(playBadge);
            playBadges.add(playBadge);

            card.setOnFocusChangeListener((v, hasFocus) -> {
                card.animate()
                    .scaleX(hasFocus ? 1.10f : 1.0f)
                    .scaleY(hasFocus ? 1.10f : 1.0f)
                    .setInterpolator(new OvershootInterpolator())
                    .setDuration(170)
                    .start();
            });

            card.setOnClickListener(v -> toggleSong(index));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            lp.setMargins(14, 0, 14, 0);
            row.addView(card, lp);
            songCards.add(card);
        }

        // D-Pad Left/Right wrap-around wiring
        for (int i = 0; i < songCards.size(); i++) {
            int prev = (i - 1 + songCards.size()) % songCards.size();
            int next = (i + 1) % songCards.size();
            songCards.get(i).setNextFocusLeftId(songCards.get(prev).getId());
            songCards.get(i).setNextFocusRightId(songCards.get(next).getId());
        }
        if (!songCards.isEmpty()) {
            post(() -> songCards.get(0).requestFocus());
        }

        root.addView(row, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        // Bottom Animated Stage & Visualizer Area
        LinearLayout stage = new LinearLayout(context);
        stage.setOrientation(LinearLayout.VERTICAL);
        stage.setGravity(Gravity.CENTER);
        stage.setBackgroundColor(Color.parseColor("#8000284D"));
        stage.setPadding(24, 14, 24, 14);
        LinearLayout.LayoutParams stageLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        );
        stageLp.setMargins(0, 20, 0, 0);
        root.addView(stage, stageLp);

        nowPlayingText = new TextView(context);
        nowPlayingText.setText("🎧  👉  🎵");
        nowPlayingText.setTextSize(26f);
        nowPlayingText.setTextColor(Color.parseColor("#48CAE4"));
        nowPlayingText.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        nowPlayingText.setGravity(Gravity.CENTER);
        stage.addView(nowPlayingText);

        stageVisualizer = new StageVisualizerView(context);
        LinearLayout.LayoutParams visLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        );
        visLp.topMargin = 8;
        stage.addView(stageVisualizer, visLp);

        addView(root);
    }

    private void toggleSong(int index) {
        if (currentSongIndex == index && soundManager.isChildSongPlaying(SONG_RES_IDS[index])) {
            soundManager.stopChildSong();
            currentSongIndex = -1;
            updateBadges();
            nowPlayingText.setText("⏸️  🌊");
            nowPlayingText.setTextColor(Color.parseColor("#90CAF9"));
        } else {
            currentSongIndex = index;
            soundManager.playChildSong(SONG_RES_IDS[index]);
            updateBadges();
            nowPlayingText.setText(SONG_ICONS[index] + "  🎶  🔊");
            nowPlayingText.setTextColor(Color.parseColor("#00E676"));
            stageVisualizer.burstNotes(14);
        }
    }

    private void updateBadges() {
        for (int i = 0; i < playBadges.size(); i++) {
            TextView b = playBadges.get(i);
            ObjectAnimator existing = (ObjectAnimator) b.getTag();
            if (existing != null) {
                existing.cancel();
                b.setTag(null);
                b.setScaleX(1.0f);
                b.setScaleY(1.0f);
            }
            if (i == currentSongIndex && soundManager.isChildSongPlaying(SONG_RES_IDS[i])) {
                b.setText("⏸️ 🎶");
                b.setTextColor(Color.parseColor("#00E676"));
                ObjectAnimator pulse = ObjectAnimator.ofPropertyValuesHolder(
                    b,
                    PropertyValuesHolder.ofFloat("scaleX", 1.0f, 1.09f),
                    PropertyValuesHolder.ofFloat("scaleY", 1.0f, 1.09f)
                );
                pulse.setDuration(550);
                pulse.setRepeatMode(ObjectAnimator.REVERSE);
                pulse.setRepeatCount(ObjectAnimator.INFINITE);
                pulse.start();
                b.setTag(pulse);
            } else {
                b.setText("▶️");
                b.setTextColor(Color.WHITE);
            }
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        stageVisualizer.stop();
        for (TextView b : playBadges) {
            ObjectAnimator anim = (ObjectAnimator) b.getTag();
            if (anim != null) anim.cancel();
        }
        soundManager.stopChildSong();
    }

    private class StageVisualizerView extends View {
        private class NoteParticle {
            float x, y, vx, vy, phase, size, alpha;
            String symbol;
            int color;
        }

        private final List<NoteParticle> particles = new ArrayList<>();
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Random random = new Random();
        private long lastSpawnTime = 0L;
        private long lastFrameTime = SystemClock.uptimeMillis();
        private boolean active = true;

        private final String[] NOTE_SYMBOLS = { "🎵", "🎶", "✨", "💖", "🫧" };
        private final int[] NOTE_COLORS = { 0xFFFFD166, 0xFF00E676, 0xFF48CAE4, 0xFFFF4081, 0xFFB388FF };
        private final String[] STAGE_CAST = { "🐠", "🦈", "🐬", "🦀" };

        public StageVisualizerView(Context context) {
            super(context);
            textPaint.setTextAlign(Paint.Align.CENTER);
        }

        public void stop() {
            active = false;
        }

        public void burstNotes(int count) {
            int w = getWidth();
            int h = getHeight();
            if (w <= 0 || h <= 0) return;
            for (int i = 0; i < count; i++) {
                NoteParticle np = new NoteParticle();
                double ang = (Math.PI * 2.0 * i / count) + (random.nextFloat() - 0.5f) * 0.4f;
                float spd = 80f + random.nextFloat() * 140f;
                np.x = w / 2f;
                np.y = h * 0.55f;
                np.vx = (float) Math.cos(ang) * spd;
                np.vy = (float) Math.sin(ang) * spd - 90f;
                np.phase = random.nextFloat() * 6.28f;
                np.size = 28f + random.nextFloat() * 16f;
                np.alpha = 1f;
                np.symbol = NOTE_SYMBOLS[random.nextInt(NOTE_SYMBOLS.length)];
                np.color = NOTE_COLORS[random.nextInt(NOTE_COLORS.length)];
                particles.add(np);
            }
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            int w = getWidth();
            int h = getHeight();
            if (w <= 0 || h <= 0) return;

            long now = SystemClock.uptimeMillis();
            float dt = Math.min((now - lastFrameTime) / 1000f, 0.05f);
            lastFrameTime = now;

            boolean isPlaying = (currentSongIndex >= 0 && soundManager.isChildSongPlaying(SONG_RES_IDS[currentSongIndex]));

            // 1. Equalizer Bars along bottom
            int barCount = 11;
            float barAreaW = w * 0.72f;
            float startX = (w - barAreaW) / 2f;
            float barStep = barAreaW / barCount;
            float barW = barStep * 0.58f;
            float maxBarH = h * 0.36f;

            for (int i = 0; i < barCount; i++) {
                float factor = isPlaying
                    ? (0.25f + 0.75f * (float) Math.abs(Math.sin(now * 0.008 + i * 0.7)))
                    : (0.12f + 0.08f * (float) Math.abs(Math.sin(now * 0.002 + i * 0.6)));
                float bh = maxBarH * factor;
                float bx = startX + i * barStep;
                paint.setColor(NOTE_COLORS[i % NOTE_COLORS.length]);
                paint.setAlpha(isPlaying ? 210 : 100);
                canvas.drawRoundRect(bx, h - bh - 6f, bx + barW, h - 6f, 10f, 10f, paint);
            }
            paint.setAlpha(255);

            // 2. Dancing Ocean Cast
            float castSpacing = w * 0.16f;
            float castBaseX = w / 2f - castSpacing * 1.5f;
            for (int i = 0; i < STAGE_CAST.length; i++) {
                float cx = castBaseX + i * castSpacing;
                float bounceY = isPlaying ? -Math.abs((float) Math.sin(now * 0.007 + i)) * 22f : (float) Math.sin(now * 0.002 + i) * 4f;
                float rot = isPlaying ? (float) Math.sin(now * 0.006 + i) * 10f : 0f;

                String icon = STAGE_CAST[i];
                float textSize = 54f;
                if (isPlaying && i == 1) {
                    icon = SONG_ICONS[currentSongIndex];
                    textSize = 66f;
                }

                canvas.save();
                canvas.translate(cx, h * 0.56f + bounceY);
                canvas.rotate(rot);
                textPaint.setColor(Color.WHITE);
                textPaint.setAlpha(255);
                textPaint.setTextSize(textSize);
                canvas.drawText(icon, 0f, 0f, textPaint);
                canvas.restore();
            }

            // 3. Floating Note Particles
            if (isPlaying && now - lastSpawnTime > 180L) {
                lastSpawnTime = now;
                NoteParticle np = new NoteParticle();
                np.x = w * 0.20f + random.nextFloat() * (w * 0.60f);
                np.y = h * 0.72f;
                np.vx = 0f;
                np.vy = -75f - random.nextFloat() * 65f;
                np.phase = random.nextFloat() * 6.28f;
                np.size = 26f + random.nextFloat() * 14f;
                np.alpha = 1f;
                np.symbol = NOTE_SYMBOLS[random.nextInt(NOTE_SYMBOLS.length)];
                np.color = NOTE_COLORS[random.nextInt(NOTE_COLORS.length)];
                particles.add(np);
            }

            Iterator<NoteParticle> it = particles.iterator();
            while (it.hasNext()) {
                NoteParticle np = it.next();
                np.phase += dt * 4f;
                np.x += (np.vx + (float) Math.sin(np.phase) * 35f) * dt;
                np.y += np.vy * dt;
                np.vx *= 0.96f;
                np.alpha = Math.max(0f, np.y / (h * 0.85f));
                if (np.y < -20f || np.alpha <= 0.02f) {
                    it.remove();
                    continue;
                }
                textPaint.setColor(np.color);
                textPaint.setAlpha((int) (np.alpha * 255));
                textPaint.setTextSize(np.size);
                canvas.drawText(np.symbol, np.x, np.y, textPaint);
            }
            textPaint.setAlpha(255);

            if (active) {
                postInvalidateOnAnimation();
            }
        }
    }
}
