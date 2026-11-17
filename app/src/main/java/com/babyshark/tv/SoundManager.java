package com.babyshark.tv;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.SoundPool;
import android.util.Log;

public class SoundManager {
    private static final String TAG = "SoundManager";
    private static SoundManager instance;
    private final Context appContext;
    private MediaPlayer bgmPlayer;
    private MediaPlayer songPlayer;
    private int currentSongResId = 0;
    private SoundPool soundPool;

    private int sfxCatchId;
    private int sfxBubbleId;
    private int sfxHarpoonId;
    private int sfxUpgradeId;
    private int sfxHurtId;
    private int sfxChestId;
    private int sfxPearlId;
    private int sfxBubbleGunId;
    private int sfxDolphinId;

    private boolean isMuted = false;

    private SoundManager(Context context) {
        this.appContext = context.getApplicationContext();
        initBgm();
        initSoundPool();
    }

    public static synchronized SoundManager get(Context context) {
        if (instance == null) {
            instance = new SoundManager(context.getApplicationContext());
        }
        return instance;
    }

    private void initBgm() {
        try {
            if (bgmPlayer != null) {
                try {
                    bgmPlayer.stop();
                    bgmPlayer.release();
                } catch (Exception ignored) {}
                bgmPlayer = null;
            }

            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            bgmPlayer = MediaPlayer.create(appContext, R.raw.bgm_ocean, audioAttrs, 0);
            if (bgmPlayer != null) {
                bgmPlayer.setLooping(true);
                bgmPlayer.setVolume(1.0f, 1.0f);
                bgmPlayer.setOnCompletionListener(mp -> {
                    try {
                        mp.seekTo(0);
                        mp.start();
                    } catch (Exception e) {
                        Log.e(TAG, "Error restarting loop: " + e.getMessage());
                    }
                });
                Log.d(TAG, "BGM initialized successfully, looping=true");
            } else {
                Log.e(TAG, "MediaPlayer.create returned null for bgm_ocean!");
            }
        } catch (Exception e) {
            Log.e(TAG, "initBgm failed: " + e.getMessage(), e);
        }
    }

    private void initSoundPool() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        soundPool = new SoundPool.Builder()
            .setMaxStreams(10)
            .setAudioAttributes(attrs)
            .build();

        sfxCatchId = soundPool.load(appContext, R.raw.sfx_catch, 1);
        sfxBubbleId = soundPool.load(appContext, R.raw.sfx_bubble, 1);
        sfxHarpoonId = soundPool.load(appContext, R.raw.sfx_harpoon, 1);
        sfxUpgradeId = soundPool.load(appContext, R.raw.sfx_upgrade, 1);
        sfxHurtId = soundPool.load(appContext, R.raw.sfx_hurt, 1);
        sfxChestId = soundPool.load(appContext, R.raw.sfx_chest, 1);
        sfxPearlId = soundPool.load(appContext, R.raw.sfx_pearl, 1);
        sfxBubbleGunId = soundPool.load(appContext, R.raw.sfx_bubble_gun, 1);
        sfxDolphinId = soundPool.load(appContext, R.raw.sfx_dolphin, 1);
    }

    public void startBgm() {
        if (isMuted) return;
        try {
            if (bgmPlayer == null) {
                initBgm();
            }
            if (bgmPlayer != null) {
                if (!bgmPlayer.isPlaying()) {
                    bgmPlayer.start();
                    Log.d(TAG, "startBgm: playing started");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "startBgm error: " + e.getMessage(), e);
            initBgm();
            try {
                if (bgmPlayer != null) bgmPlayer.start();
            } catch (Exception ignored) {}
        }
    }

    public boolean isMuted() {
        return isMuted;
    }

    public boolean toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            pauseBgm();
            try {
                if (songPlayer != null && songPlayer.isPlaying()) {
                    songPlayer.pause();
                }
            } catch (Exception ignored) {}
        } else {
            try {
                if (currentSongResId != 0 && songPlayer != null) {
                    songPlayer.start();
                } else {
                    startBgm();
                }
            } catch (Exception ignored) {
                startBgm();
            }
        }
        return isMuted;
    }

    public void pauseBgm() {
        try {
            if (bgmPlayer != null && bgmPlayer.isPlaying()) {
                bgmPlayer.pause();
                Log.d(TAG, "pauseBgm: paused");
            }
        } catch (Exception e) {
            Log.e(TAG, "pauseBgm error: " + e.getMessage());
        }
    }

    public void playChildSong(int resId) {
        try {
            pauseBgm();
            if (songPlayer != null) {
                try {
                    songPlayer.stop();
                    songPlayer.release();
                } catch (Exception ignored) {}
                songPlayer = null;
            }

            currentSongResId = resId;
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            songPlayer = MediaPlayer.create(appContext, resId, audioAttrs, 0);
            if (songPlayer != null) {
                songPlayer.setLooping(true);
                songPlayer.setVolume(1.0f, 1.0f);
                if (!isMuted) {
                    songPlayer.start();
                }
                Log.d(TAG, "playChildSong: playing song resId=" + resId);
            }
        } catch (Exception e) {
            Log.e(TAG, "playChildSong failed", e);
        }
    }

    public void stopChildSong() {
        try {
            if (songPlayer != null) {
                try {
                    songPlayer.stop();
                    songPlayer.release();
                } catch (Exception ignored) {}
                songPlayer = null;
            }
            currentSongResId = 0;
            startBgm();
        } catch (Exception e) {
            Log.e(TAG, "stopChildSong failed", e);
        }
    }

    public boolean isChildSongPlaying(int resId) {
        return songPlayer != null && songPlayer.isPlaying() && currentSongResId == resId;
    }

    public int getCurrentSongResId() {
        return currentSongResId;
    }

    public void playCatch() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxCatchId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playBubble() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxBubbleId, 0.9f, 0.9f, 1, 0, 1.0f);
    }

    public void playHarpoon() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxHarpoonId, 0.9f, 0.9f, 1, 0, 1.0f);
    }

    public void playUpgrade() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxUpgradeId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playHurt() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxHurtId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playChest() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxChestId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playPearl() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxPearlId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playBubbleGun() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxBubbleGunId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void playDolphin() {
        if (isMuted || soundPool == null) return;
        soundPool.play(sfxDolphinId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    public void release() {
        if (songPlayer != null) {
            try {
                songPlayer.stop();
                songPlayer.release();
            } catch (Exception ignored) {}
            songPlayer = null;
        }
        if (bgmPlayer != null) {
            try {
                bgmPlayer.stop();
                bgmPlayer.release();
            } catch (Exception ignored) {}
            bgmPlayer = null;
        }
        if (soundPool != null) {
            try {
                soundPool.release();
            } catch (Exception ignored) {}
            soundPool = null;
        }
    }
}
