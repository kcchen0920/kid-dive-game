package com.babyshark.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private GameState state;
    private FrameLayout contentFrame;
    private TextView coinsText;
    private Button btnGame;
    private Button btnShop;
    private Button btnTheater;
    private Button btnAquarium;
    private View topNavBar;
    private Button btnReset;
    private Button btnExit;
    private Button btnMute;

    private DiverGameView gameView;
    private ShopView shopView;
    private TheaterView theaterView;
    private AquariumView aquariumView;

    private enum Mode {
        GAME, SHOP, THEATER, AQUARIUM
    }
    private Mode currentMode = Mode.GAME;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        state = GameState.get(this);
        topNavBar = findViewById(R.id.top_nav_bar);
        contentFrame = findViewById(R.id.content_frame);
        coinsText = findViewById(R.id.coins_text);
        btnGame = findViewById(R.id.btn_game);
        btnShop = findViewById(R.id.btn_shop);
        btnTheater = findViewById(R.id.btn_theater);
        btnAquarium = findViewById(R.id.btn_aquarium);
        btnReset = findViewById(R.id.btn_reset);
        btnExit = findViewById(R.id.btn_exit);
        btnMute = findViewById(R.id.btn_mute);

        btnGame.setOnClickListener(v -> switchMode(Mode.GAME));
        btnShop.setOnClickListener(v -> switchMode(Mode.SHOP));
        btnTheater.setOnClickListener(v -> switchMode(Mode.THEATER));
        btnAquarium.setOnClickListener(v -> switchMode(Mode.AQUARIUM));
        btnReset.setOnClickListener(v -> showResetConfirmationDialog());
        btnExit.setOnClickListener(v -> showExitConfirmationDialog());
        btnMute.setOnClickListener(v -> {
            SoundManager.get(this).toggleMute();
            updateMuteButton();
        });
        updateMuteButton();

        updateCoins();
        switchMode(Mode.GAME);
        SoundManager.get(this).startBgm();
    }

    @Override
    protected void onResume() {
        super.onResume();
        SoundManager.get(this).startBgm();
    }

    @Override
    protected void onPause() {
        super.onPause();
        SoundManager.get(this).pauseBgm();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        SoundManager.get(this).release();
    }

    private void updateCoins() {
        coinsText.setText("🐚 " + state.coins + " 金幣");
    }

    private void updateMuteButton() {
        if (btnMute == null) return;
        boolean muted = SoundManager.get(this).isMuted();
        btnMute.setText(muted ? "🔇 靜音" : "🔊 音效");
        btnMute.setTextColor(muted ? android.graphics.Color.parseColor("#FFCDD2") : android.graphics.Color.WHITE);
    }

    private void switchMode(Mode mode) {
        currentMode = mode;
        contentFrame.removeAllViews();

        if (mode == Mode.GAME) {
            // Hide top options in Game so it doesn't impact screen visibility at all!
            topNavBar.setVisibility(View.GONE);
            if (gameView == null) {
                gameView = new DiverGameView(this);
                gameView.setOnGameEventListener(new DiverGameView.OnGameEventListener() {
                    @Override
                    public void onSurfaced(int caughtCount) {
                        switchMode(Mode.SHOP);
                    }

                    @Override
                    public void onCoinsUpdated(int totalCoins) {
                        updateCoins();
                    }
                });
            } else {
                gameView.initGame();
            }
            contentFrame.addView(gameView);
            gameView.requestFocus();
        } else {
            // Show top options clearly above non-game views (Shop, Theater, Aquarium)
            topNavBar.setVisibility(View.VISIBLE);
            if (mode == Mode.SHOP) {
                shopView = new ShopView(this, new ShopView.OnShopActionListener() {
                    @Override
                    public void onCoinsChanged(int coins) {
                        updateCoins();
                    }

                    @Override
                    public void onDiveRequested() {
                        switchMode(Mode.GAME);
                    }
                });
                contentFrame.addView(shopView);
                shopView.requestFocus();
            } else if (mode == Mode.THEATER) {
                theaterView = new TheaterView(this);
                contentFrame.addView(theaterView);
                theaterView.requestFocus();
            } else if (mode == Mode.AQUARIUM) {
                aquariumView = new AquariumView(this, coins -> updateCoins());
                contentFrame.addView(aquariumView);
                aquariumView.requestFocus();
            }
        }
    }

    private void showResetConfirmationDialog() {
        java.util.Random r = new java.util.Random();
        int a = 2 + r.nextInt(7);
        int b = 2 + r.nextInt(7);
        int answer = a + b;
        java.util.List<Integer> options = new java.util.ArrayList<>();
        options.add(answer);
        options.add(answer + 1);
        options.add(Math.max(1, answer - 1));
        java.util.Collections.shuffle(options, r);

        String[] labels = new String[options.size()];
        for (int i = 0; i < options.size(); i++) {
            labels[i] = "🔢  " + options.get(i);
        }

        androidx.appcompat.app.AlertDialog dialog = new androidx.appcompat.app.AlertDialog.Builder(this, androidx.appcompat.R.style.Theme_AppCompat_Dialog_Alert)
            .setTitle("🔒 家長確認：請選出 " + a + " + " + b + " = ?")
            .setItems(labels, (d, which) -> {
                if (options.get(which) == answer) {
                    state.resetGame();
                    updateCoins();
                    SoundManager.get(this).playUpgrade();
                    if (gameView != null) {
                        gameView.initGame();
                    }
                    switchMode(Mode.GAME);
                } else {
                    SoundManager.get(this).playBubble();
                    d.dismiss();
                }
            })
            .setNegativeButton("✅ 繼續冒險 / 取消", (d, which) -> d.dismiss())
            .show();

        Button cancelBtn = dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_NEGATIVE);
        if (cancelBtn != null) {
            cancelBtn.requestFocus();
        }
    }

    private void showExitConfirmationDialog() {
        new androidx.appcompat.app.AlertDialog.Builder(this, androidx.appcompat.R.style.Theme_AppCompat_Dialog_Alert)
            .setTitle("🚪 退出遊戲？")
            .setMessage("確定要關閉遊戲並返回電視桌面嗎？金幣與所有進度皆已為您自動儲存！")
            .setPositiveButton("❌ 退出關閉", (dialog, which) -> {
                SoundManager.get(this).release();
                finishAffinity();
                System.exit(0);
            })
            .setNegativeButton("🌊 繼續遊玩", (dialog, which) -> dialog.dismiss())
            .show();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MUTE || keyCode == KeyEvent.KEYCODE_VOLUME_MUTE) {
            SoundManager.get(this).toggleMute();
            updateMuteButton();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            if (currentMode == Mode.GAME) {
                if (topNavBar.getVisibility() == View.VISIBLE) {
                    topNavBar.setVisibility(View.GONE);
                    if (gameView != null) gameView.requestFocus();
                } else {
                    topNavBar.setVisibility(View.VISIBLE);
                    btnGame.requestFocus();
                }
                return true;
            }
        }

        // If kid presses BACK while in Game/Theater/Aquarium, switch to Shop/Boat
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (currentMode != Mode.SHOP) {
                switchMode(Mode.SHOP);
                return true;
            } else {
                showExitConfirmationDialog();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
