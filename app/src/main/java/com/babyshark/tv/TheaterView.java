package com.babyshark.tv;

import android.content.Context;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;

public class TheaterView extends FrameLayout {

    private final SoundManager soundManager;
    private final List<TextView> playBadges = new ArrayList<>();
    private final TextView nowPlayingText;
    private final TextView danceAnimationText;
    private int currentSongIndex = -1;
    private boolean isAnimating = false;
    private int animStep = 0;

    private static final String[] SONG_TITLES = {
        "🦈 Baby Shark (經典兒歌)",
        "👨‍👩‍👧 鯊魚一家 (歡樂交響)",
        "🌊 海底派對 (加勒比鋼鼓)",
        "🦀 泡泡舞曲 (電音舞會)"
    };

    private static final int[] SONG_RES_IDS = {
        R.raw.song_baby_shark,
        R.raw.song_family_shark,
        R.raw.song_ocean_party,
        R.raw.song_bubble_dance
    };

    private static final int[] ICON_DRAWABLES = {
        R.drawable.banner,
        R.drawable.ic_launcher,
        R.drawable.banner,
        R.drawable.ic_launcher
    };

    public TheaterView(Context context) {
        super(context);
        soundManager = SoundManager.get(context);
        setBackgroundColor(Color.parseColor("#001529"));

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(60, 30, 60, 30);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(context);
        title.setText("🎬 兒歌音樂廳 (Baby Shark Kids Theater)");
        title.setTextSize(30f);
        title.setTextColor(Color.parseColor("#FFD166"));
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 20);
        root.addView(title);

        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);

        for (int i = 0; i < SONG_TITLES.length; i++) {
            final int index = i;
            final String songName = SONG_TITLES[i];
            final int resId = SONG_RES_IDS[i];

            LinearLayout card = new LinearLayout(context);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);
            card.setBackgroundResource(R.drawable.shop_card_selector);
            card.setFocusable(true);
            card.setClickable(true);
            card.setPadding(20, 20, 20, 20);

            ImageView iv = new ImageView(context);
            iv.setImageResource(ICON_DRAWABLES[i]);
            int iconH = (int)(85 * context.getResources().getDisplayMetrics().density);
            card.addView(iv, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, iconH));

            TextView tv = new TextView(context);
            tv.setText(songName);
            tv.setTextSize(20f);
            tv.setTextColor(Color.WHITE);
            tv.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(0, 10, 0, 8);
            card.addView(tv);

            TextView playBadge = new TextView(context);
            playBadge.setText("▶️ 點擊播放");
            playBadge.setTextSize(17f);
            playBadge.setTextColor(Color.WHITE);
            playBadge.setBackgroundResource(R.drawable.price_badge_selector);
            playBadge.setPadding(24, 6, 24, 6);
            card.addView(playBadge);
            playBadges.add(playBadge);

            card.setOnFocusChangeListener((v, hasFocus) -> {
                card.animate().scaleX(hasFocus ? 1.06f : 1.0f).scaleY(hasFocus ? 1.06f : 1.0f).setDuration(160).start();
            });

            card.setOnClickListener(v -> toggleSong(index));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            lp.setMargins(14, 0, 14, 0);
            row.addView(card, lp);

            if (i == 0) {
                post(() -> card.requestFocus());
            }
        }

        root.addView(row, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        // Bottom Animated Stage & Visualizer Area
        LinearLayout stage = new LinearLayout(context);
        stage.setOrientation(LinearLayout.VERTICAL);
        stage.setGravity(Gravity.CENTER);
        stage.setBackgroundColor(Color.parseColor("#8000284D"));
        stage.setPadding(30, 20, 30, 20);
        LinearLayout.LayoutParams stageLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        );
        stageLp.setMargins(0, 25, 0, 0);
        root.addView(stage, stageLp);

        nowPlayingText = new TextView(context);
        nowPlayingText.setText("🎵 請使用遙控器選擇想聽的兒歌，按下 [OK 鍵] 享受歡樂海洋音樂！");
        nowPlayingText.setTextSize(22f);
        nowPlayingText.setTextColor(Color.parseColor("#48CAE4"));
        nowPlayingText.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        nowPlayingText.setGravity(Gravity.CENTER);
        stage.addView(nowPlayingText);

        danceAnimationText = new TextView(context);
        danceAnimationText.setText("🦈 ✨ 🌊 🦀 🎶 🐬 ✨ 🐠");
        danceAnimationText.setTextSize(28f);
        danceAnimationText.setTextColor(Color.parseColor("#FFD166"));
        danceAnimationText.setGravity(Gravity.CENTER);
        danceAnimationText.setPadding(0, 10, 0, 0);
        stage.addView(danceAnimationText);

        addView(root);
        startAnimationLoop();
    }

    private void toggleSong(int index) {
        if (currentSongIndex == index && soundManager.isChildSongPlaying(SONG_RES_IDS[index])) {
            // Already playing this song -> stop
            soundManager.stopChildSong();
            currentSongIndex = -1;
            updateBadges();
            nowPlayingText.setText("⏸️ 已暫停播放兒歌 (恢復背景海洋音樂)");
            nowPlayingText.setTextColor(Color.parseColor("#90CAF9"));
        } else {
            // Play new song
            currentSongIndex = index;
            soundManager.playChildSong(SONG_RES_IDS[index]);
            updateBadges();
            nowPlayingText.setText("🎶 正在播放: " + SONG_TITLES[index] + " 🎵 (跟著小鯊魚一起唱歌跳舞吧！)");
            nowPlayingText.setTextColor(Color.parseColor("#00E676"));
        }
    }

    private void updateBadges() {
        for (int i = 0; i < playBadges.size(); i++) {
            TextView b = playBadges.get(i);
            if (i == currentSongIndex && soundManager.isChildSongPlaying(SONG_RES_IDS[i])) {
                b.setText("⏸️ 正在播放 🎵");
                b.setTextColor(Color.parseColor("#00E676"));
            } else {
                b.setText("▶️ 點擊播放");
                b.setTextColor(Color.WHITE);
            }
        }
    }

    private void startAnimationLoop() {
        isAnimating = true;
        post(new Runnable() {
            @Override
            public void run() {
                if (!isAnimating) return;
                animStep++;
                if (currentSongIndex >= 0 && soundManager.isChildSongPlaying(SONG_RES_IDS[currentSongIndex])) {
                    // Joyful dancing animation
                    String[] danceFrames = {
                        "🦈 🎵 🌊 🦀 🎶 🐬 ✨ 🐠",
                        "✨ 🦈 🎶 🌊 🐬 🎵 🦀 💖",
                        "🐠 ✨ 🦈 🎵 🦀 🎶 🐬 🌊",
                        "🎶 🐬 💖 🦈 🌊 🎵 🐠 🦀"
                    };
                    danceAnimationText.setText(danceFrames[animStep % danceFrames.length]);
                } else {
                    danceAnimationText.setText("🦈 ✨ 🌊 🦀 🎶 🐬 ✨ 🐠");
                }
                postDelayed(this, 500);
            }
        });
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        isAnimating = false;
        // Cleanly stop child song when navigating away to game/shop, resuming background BGM!
        soundManager.stopChildSong();
    }
}
