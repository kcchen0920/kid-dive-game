package com.babyshark.tv;

import android.content.Context;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class TheaterView extends FrameLayout {

    public TheaterView(Context context) {
        super(context);
        setBackgroundColor(Color.parseColor("#001529"));

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(60, 40, 60, 40);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(context);
        title.setText("🎬 兒歌音樂廳 (Songs)");
        title.setTextSize(32f);
        title.setTextColor(Color.parseColor("#FFD166"));
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 30);
        root.addView(title);

        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);

        String[] songTitles = {"🦈 Baby Shark", "👨‍👩‍👧 鯊魚一家", "🌊 海底派對", "🦀 泡泡舞曲"};
        int[] iconDrawables = {R.drawable.banner, R.drawable.ic_launcher, R.drawable.banner, R.drawable.ic_launcher};

        for (int i = 0; i < songTitles.length; i++) {
            final String songName = songTitles[i];
            LinearLayout card = new LinearLayout(context);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);
            card.setBackgroundResource(R.drawable.shop_card_selector);
            card.setFocusable(true);
            card.setClickable(true);
            card.setPadding(20, 24, 20, 24);

            ImageView iv = new ImageView(context);
            iv.setImageResource(iconDrawables[i]);
            int iconH = (int)(90 * context.getResources().getDisplayMetrics().density);
            card.addView(iv, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, iconH));

            TextView tv = new TextView(context);
            tv.setText(songName);
            tv.setTextSize(22f);
            tv.setTextColor(Color.WHITE);
            tv.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(0, 14, 0, 10);
            card.addView(tv);

            TextView playBadge = new TextView(context);
            playBadge.setText("▶️ 播放");
            playBadge.setTextSize(18f);
            playBadge.setTextColor(Color.WHITE);
            playBadge.setBackgroundResource(R.drawable.price_badge_selector);
            playBadge.setPadding(30, 8, 30, 8);
            card.addView(playBadge);

            card.setOnFocusChangeListener((v, hasFocus) -> {
                card.animate().scaleX(hasFocus ? 1.06f : 1.0f).scaleY(hasFocus ? 1.06f : 1.0f).setDuration(160).start();
            });

            card.setOnClickListener(v -> {
                Toast.makeText(context, "🎵 正在為您播放：" + songName, Toast.LENGTH_SHORT).show();
            });

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

        addView(root);
    }
}
