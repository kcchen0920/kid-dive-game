package com.babyshark.tv;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.List;

public class GameState {
    private static GameState instance;
    private final SharedPreferences prefs;

    public int coins;
    public int oxygenLevel;
    public int speedLevel;
    public int harpoonLevel;
    public int lightLevel;

    // Challenge Milestones
    public int babySharkCount;
    public int reefSharkCount;
    public int tunaCount;
    public int greatSharkCount;
    public int anglerfishCount;
    public int pearlCount;

    public static final int MAX_TIER = 8;

    public static class CaughtFish {
        public final String name;
        public final int value;
        public final float weightKg;

        public CaughtFish(String name, int value, float weightKg) {
            this.name = name;
            this.value = value;
            this.weightKg = weightKg;
        }
    }

    public final List<CaughtFish> currentBasket = new ArrayList<>();

    private GameState(Context context) {
        prefs = context.getSharedPreferences("babyshark_save", Context.MODE_PRIVATE);
        coins = prefs.getInt("coins", 250);
        oxygenLevel = prefs.getInt("oxygenLevel", 1);
        speedLevel = prefs.getInt("speedLevel", 1);
        harpoonLevel = prefs.getInt("harpoonLevel", 1);
        lightLevel = prefs.getInt("lightLevel", 1);

        babySharkCount = prefs.getInt("babySharkCount", 0);
        reefSharkCount = prefs.getInt("reefSharkCount", 0);
        tunaCount = prefs.getInt("tunaCount", 0);
        greatSharkCount = prefs.getInt("greatSharkCount", 0);
        anglerfishCount = prefs.getInt("anglerfishCount", 0);
        pearlCount = prefs.getInt("pearlCount", 0);
    }

    public static synchronized GameState get(Context context) {
        if (instance == null) {
            instance = new GameState(context.getApplicationContext());
        }
        return instance;
    }

    public void save() {
        prefs.edit()
            .putInt("coins", coins)
            .putInt("oxygenLevel", oxygenLevel)
            .putInt("speedLevel", speedLevel)
            .putInt("harpoonLevel", harpoonLevel)
            .putInt("lightLevel", lightLevel)
            .putInt("babySharkCount", babySharkCount)
            .putInt("reefSharkCount", reefSharkCount)
            .putInt("tunaCount", tunaCount)
            .putInt("greatSharkCount", greatSharkCount)
            .putInt("anglerfishCount", anglerfishCount)
            .putInt("pearlCount", pearlCount)
            .apply();
    }

    public int getMaxOxygen() {
        return 120 + (oxygenLevel - 1) * 45; // up to 435 at Lv.8
    }

    public float getSwimSpeed() {
        return 7.5f + (speedLevel - 1) * 1.8f;
    }

    public float getHarpoonRange() {
        return 420f + (harpoonLevel - 1) * 110f; // up to 1190px at Lv.8
    }

    public float getLightRadius() {
        return 380f + (lightLevel - 1) * 95f; // up to 1045px at Lv.8
    }

    public void addCaughtFish(String name, int value, float weightKg) {
        coins += value;
        currentBasket.add(new CaughtFish(name, value, weightKg));

        if (name.contains("Baby Shark")) {
            babySharkCount++;
        } else if (name.contains("礁鯊") || name.contains("Reef Shark")) {
            reefSharkCount++;
        } else if (name.contains("鮪") || name.contains("Tuna")) {
            tunaCount++;
        } else if (name.contains("大白鯊") || name.contains("Great White")) {
            greatSharkCount++;
        } else if (name.contains("安康") || name.contains("Anglerfish")) {
            anglerfishCount++;
        }
        save();
    }

    public static int getTierCost(int currentLevel) {
        switch (currentLevel) {
            case 1: return 150;
            case 2: return 350;
            case 3: return 750;
            case 4: return 1200;
            case 5: return 2000;
            case 6: return 3200;
            case 7: return 5000;
            default: return 9999;
        }
    }

    public boolean isChallengeMet(int currentLevel) {
        switch (currentLevel) {
            case 3: // Need Baby Shark to reach Lv.4
                return babySharkCount >= 1;
            case 5: // Need Reef Shark to reach Lv.6
                return reefSharkCount >= 1;
            case 6: // Need Giant Tuna to reach Lv.7
                return tunaCount >= 1;
            case 7: // Need Great White Shark to reach Lv.8
                return greatSharkCount >= 1;
            default:
                return true;
        }
    }

    public String getChallengeRequirementText(int currentLevel) {
        switch (currentLevel) {
            case 3:
                return "需先捕獲 🦈 Baby Shark 解鎖！";
            case 5:
                return "需先捕獲 🦈 黑鰭礁鯊 解鎖！";
            case 6:
                return "需先捕獲 🐟 藍鰭巨鮪 解鎖！";
            case 7:
                return "需擊退捕獲 👑 大白鯊 登頂神級！";
            default:
                return "";
        }
    }
}
