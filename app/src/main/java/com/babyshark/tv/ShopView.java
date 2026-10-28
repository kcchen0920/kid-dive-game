package com.babyshark.tv;

import android.content.Context;
import android.graphics.Color;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class ShopView extends FrameLayout {

    public interface OnShopActionListener {
        void onCoinsChanged(int coins);
    }

    private final GameState state;
    private final OnShopActionListener listener;
    private final TextView topCoinsBadge;
    private final TextView trophyBar;

    private GearCard cardTank;
    private GearCard cardFins;
    private GearCard cardHarpoon;
    private GearCard cardLight;

    public ShopView(Context context, OnShopActionListener listener) {
        super(context);
        this.state = GameState.get(context);
        this.listener = listener;

        setBackgroundColor(Color.parseColor("#001529"));

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 30, 40, 30);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        // 1. Top Header with Big Shiny Coin Bank & Trophy Bar
        LinearLayout header = new LinearLayout(context);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(0, 0, 0, 16);

        topCoinsBadge = new TextView(context);
        topCoinsBadge.setText("🐚 0 金幣");
        topCoinsBadge.setTextSize(30f);
        topCoinsBadge.setTextColor(Color.parseColor("#FFD700"));
        topCoinsBadge.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        topCoinsBadge.setBackgroundColor(Color.parseColor("#40000000"));
        topCoinsBadge.setPadding(30, 10, 30, 10);
        header.addView(topCoinsBadge);

        View spacer = new View(context);
        LinearLayout.LayoutParams spLp = new LinearLayout.LayoutParams(0, 1, 1f);
        header.addView(spacer, spLp);

        trophyBar = new TextView(context);
        trophyBar.setTextSize(18f);
        trophyBar.setTextColor(Color.parseColor("#80D8FF"));
        trophyBar.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        header.addView(trophyBar);

        root.addView(header, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        // 2. Horizontal Row of 4 Big Visual Cards (8 Tiers Mastery)
        LinearLayout cardRow = new LinearLayout(context);
        cardRow.setOrientation(LinearLayout.HORIZONTAL);
        cardRow.setGravity(Gravity.CENTER);

        int cardMargin = 14;
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        cardLp.setMargins(cardMargin, 0, cardMargin, 0);

        // Card 1: Oxygen Tank
        cardTank = new GearCard(context, R.drawable.ic_gear_tank, "🤿 氧氣瓶", () -> {
            tryUpgrade(cardTank, 1);
        });
        cardRow.addView(cardTank, cardLp);

        // Card 2: Fins
        cardFins = new GearCard(context, R.drawable.ic_gear_fins, "🐬 潛水腳蹼", () -> {
            tryUpgrade(cardFins, 2);
        });
        cardRow.addView(cardFins, cardLp);

        // Card 3: Harpoon
        cardHarpoon = new GearCard(context, R.drawable.ic_gear_harpoon, "🎯 魚叉槍", () -> {
            tryUpgrade(cardHarpoon, 3);
        });
        cardRow.addView(cardHarpoon, cardLp);

        // Card 4: Light
        cardLight = new GearCard(context, R.drawable.ic_gear_light, "🔦 探照燈", () -> {
            tryUpgrade(cardLight, 4);
        });
        cardRow.addView(cardLight, cardLp);

        root.addView(cardRow, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        addView(root);
        updateUI();

        post(() -> cardTank.requestFocus());
    }

    private void tryUpgrade(GearCard card, int gearType) {
        int currentLevel;
        switch (gearType) {
            case 1: currentLevel = state.oxygenLevel; break;
            case 2: currentLevel = state.speedLevel; break;
            case 3: currentLevel = state.harpoonLevel; break;
            case 4: default: currentLevel = state.lightLevel; break;
        }

        if (currentLevel >= GameState.MAX_TIER) {
            Toast.makeText(getContext(), "👑 該裝備已達傳奇神級 MAX！", Toast.LENGTH_SHORT).show();
            return;
        }

        // Check Milestone Challenge
        if (!state.isChallengeMet(currentLevel)) {
            String req = state.getChallengeRequirementText(currentLevel);
            Toast.makeText(getContext(), "🔒 挑戰未完成：" + req, Toast.LENGTH_LONG).show();
            return;
        }

        int cost = GameState.getTierCost(currentLevel);
        if (state.coins < cost) {
            Toast.makeText(getContext(), "🐚 金幣不足！還需要 " + (cost - state.coins) + " 金幣", Toast.LENGTH_SHORT).show();
            return;
        }

        // Success!
        state.coins -= cost;
        switch (gearType) {
            case 1: state.oxygenLevel++; break;
            case 2: state.speedLevel++; break;
            case 3: state.harpoonLevel++; break;
            case 4: state.lightLevel++; break;
        }
        state.save();

        SoundManager.get(getContext()).playUpgrade();
        card.animate().scaleX(1.18f).scaleY(1.18f).setDuration(120)
            .setInterpolator(new OvershootInterpolator())
            .withEndAction(() -> card.animate().scaleX(1.06f).scaleY(1.06f).setDuration(100).start())
            .start();

        Toast.makeText(getContext(), "🎉 裝備突破升級！邁向更高階大師！", Toast.LENGTH_SHORT).show();
        updateUI();
        if (listener != null) listener.onCoinsChanged(state.coins);
    }

    public void updateUI() {
        topCoinsBadge.setText("🐚 " + state.coins + " 金幣");

        trophyBar.setText("🏆 狩獵徽章: 🦈小鯊x" + state.babySharkCount + "  🦈礁鯊x" + state.reefSharkCount + "  🐟巨鮪x" + state.tunaCount + "  👑大白鯊x" + state.greatSharkCount);

        cardTank.update(state.oxygenLevel, state);
        cardFins.update(state.speedLevel, state);
        cardHarpoon.update(state.harpoonLevel, state);
        cardLight.update(state.lightLevel, state);
    }

    private static class GearCard extends LinearLayout {
        private final ImageView iconView;
        private final TextView titleView;
        private final TextView starsView;
        private final TextView challengeNotice;
        private final TextView priceBadge;
        private final Runnable onAction;

        public GearCard(Context context, int iconRes, String title, Runnable onAction) {
            super(context);
            this.onAction = onAction;

            setOrientation(LinearLayout.VERTICAL);
            setGravity(Gravity.CENTER_HORIZONTAL);
            setBackgroundResource(R.drawable.shop_card_selector);
            setFocusable(true);
            setClickable(true);
            setPadding(20, 24, 20, 24);

            iconView = new ImageView(context);
            iconView.setImageResource(iconRes);
            int iconSize = (int)(95 * context.getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams icLp = new LinearLayout.LayoutParams(iconSize, iconSize);
            icLp.setMargins(0, 8, 0, 10);
            addView(iconView, icLp);

            titleView = new TextView(context);
            titleView.setText(title);
            titleView.setTextSize(21f);
            titleView.setTextColor(Color.WHITE);
            titleView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            titleView.setGravity(Gravity.CENTER);
            titleView.setPadding(0, 0, 0, 8);
            addView(titleView);

            // 8 Stars Visual Progress Meter
            starsView = new TextView(context);
            starsView.setTextSize(20f);
            starsView.setTextColor(Color.parseColor("#FFD700"));
            starsView.setGravity(Gravity.CENTER);
            starsView.setPadding(0, 0, 0, 8);
            addView(starsView);

            // Challenge Alert Notice (Shown if challenge locked)
            challengeNotice = new TextView(context);
            challengeNotice.setTextSize(15f);
            challengeNotice.setTextColor(Color.parseColor("#FF8A80"));
            challengeNotice.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            challengeNotice.setGravity(Gravity.CENTER);
            challengeNotice.setPadding(0, 0, 0, 10);
            addView(challengeNotice);

            // Price / Action Pill
            priceBadge = new TextView(context);
            priceBadge.setTextSize(19f);
            priceBadge.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            priceBadge.setGravity(Gravity.CENTER);
            priceBadge.setPadding(24, 10, 24, 10);
            addView(priceBadge);

            setOnFocusChangeListener((v, hasFocus) -> {
                animate().scaleX(hasFocus ? 1.06f : 1.0f).scaleY(hasFocus ? 1.06f : 1.0f).setDuration(160).start();
            });

            setOnClickListener(v -> {
                if (onAction != null) onAction.run();
            });
        }

        public void update(int level, GameState state) {
            // Build 8-star meter: ★ for active, ☆ for remaining
            StringBuilder sb = new StringBuilder();
            for (int i = 1; i <= GameState.MAX_TIER; i++) {
                if (i <= level) {
                    sb.append("★ ");
                } else {
                    sb.append("☆ ");
                }
            }
            starsView.setText(sb.toString().trim());

            if (level >= GameState.MAX_TIER) {
                challengeNotice.setText("🌟 巔峰傳奇裝備");
                challengeNotice.setTextColor(Color.parseColor("#00E676"));
                priceBadge.setText("👑 MAX");
                priceBadge.setTextColor(Color.parseColor("#FFD700"));
                priceBadge.setBackgroundColor(Color.parseColor("#4DFFD700"));
                return;
            }

            int cost = GameState.getTierCost(level);
            boolean challengeMet = state.isChallengeMet(level);

            if (!challengeMet) {
                challengeNotice.setText(state.getChallengeRequirementText(level));
                challengeNotice.setTextColor(Color.parseColor("#FF5252"));
                priceBadge.setText("🔒 需解鎖挑戰");
                priceBadge.setTextColor(Color.parseColor("#CFD8DC"));
                priceBadge.setBackgroundColor(Color.parseColor("#4D37474F"));
            } else {
                challengeNotice.setText("✅ 挑戰已達成！");
                challengeNotice.setTextColor(Color.parseColor("#00E676"));

                if (state.coins >= cost) {
                    priceBadge.setText("🐚 " + cost + "  ⬆️");
                    priceBadge.setTextColor(Color.WHITE);
                    priceBadge.setBackgroundResource(R.drawable.price_badge_selector);
                } else {
                    priceBadge.setText("🐚 " + cost + "  🔒");
                    priceBadge.setTextColor(Color.parseColor("#B0BEC5"));
                    priceBadge.setBackgroundColor(Color.parseColor("#4D37474F"));
                }
            }
        }

        @Override
        public boolean onKeyDown(int keyCode, KeyEvent event) {
            if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_BUTTON_A) {
                if (onAction != null) {
                    onAction.run();
                    return true;
                }
            }
            return super.onKeyDown(keyCode, event);
        }
    }
}
