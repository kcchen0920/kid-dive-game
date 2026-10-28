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
    private Button btnReset;
    private Button btnExit;

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
        contentFrame = findViewById(R.id.content_frame);
        coinsText = findViewById(R.id.coins_text);
        btnGame = findViewById(R.id.btn_game);
        btnShop = findViewById(R.id.btn_shop);
        btnTheater = findViewById(R.id.btn_theater);
        btnAquarium = findViewById(R.id.btn_aquarium);
        btnReset = findViewById(R.id.btn_reset);
        btnExit = findViewById(R.id.btn_exit);

        btnGame.setOnClickListener(v -> switchMode(Mode.GAME));
        btnShop.setOnClickListener(v -> switchMode(Mode.SHOP));
        btnTheater.setOnClickListener(v -> switchMode(Mode.THEATER));
        btnAquarium.setOnClickListener(v -> switchMode(Mode.AQUARIUM));
        btnReset.setOnClickListener(v -> showResetConfirmationDialog());
        btnExit.setOnClickListener(v -> showExitConfirmationDialog());

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

    private void switchMode(Mode mode) {
        currentMode = mode;
        contentFrame.removeAllViews();

        if (mode == Mode.GAME) {
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
        } else if (mode == Mode.SHOP) {
            shopView = new ShopView(this, coins -> updateCoins());
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

    private void showResetConfirmationDialog() {
        new androidx.appcompat.app.AlertDialog.Builder(this, androidx.appcompat.R.style.Theme_AppCompat_Dialog_Alert)
            .setTitle("🔄 重新開始全新冒險？")
            .setMessage("確定要將金幣、裝備與圖鑑重置，回到起點重新體驗小戴夫的水下大冒險嗎？")
            .setPositiveButton("✅ 確定從頭開始", (dialog, which) -> {
                state.resetGame();
                updateCoins();
                SoundManager.get(this).playUpgrade();
                if (gameView != null) {
                    gameView.initGame();
                }
                switchMode(Mode.GAME);
            })
            .setNegativeButton("❌ 繼續冒險", (dialog, which) -> dialog.dismiss())
            .show();
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
