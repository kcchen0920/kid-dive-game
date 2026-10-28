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

    private DiverGameView gameView;
    private ShopView shopView;
    private TheaterView theaterView;

    private enum Mode {
        GAME, SHOP, THEATER
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

        btnGame.setOnClickListener(v -> switchMode(Mode.GAME));
        btnShop.setOnClickListener(v -> switchMode(Mode.SHOP));
        btnTheater.setOnClickListener(v -> switchMode(Mode.THEATER));

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
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // If kid presses BACK while in Game, switch to Shop/Boat
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (currentMode != Mode.SHOP) {
                switchMode(Mode.SHOP);
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
