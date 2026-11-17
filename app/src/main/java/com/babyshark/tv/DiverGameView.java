package com.babyshark.tv;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

public class DiverGameView extends View {

    public interface OnGameEventListener {
        void onSurfaced(int caughtCount);
        void onCoinsUpdated(int totalCoins);
    }

    private final GameState state;
    private OnGameEventListener listener;
    private final Random random = new Random();

    // Paints
    private final Paint diverPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fishPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint harpoonPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint ropePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint hudPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint lightPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint envPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint abyssOverlayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Bitmap kidHeadBitmap;
    private final RectF kidHeadRect = new RectF(-12f, -44f, 56f, 24f);
    private final RectF hudAvatarRect = new RectF(40f, 33f, 108f, 101f);

    // Player Dave Diver State
    private float diverX = 850f;
    private float diverY = 240f;
    private float diverVx = 0f;
    private float diverVy = 0f;
    private float diverAngle = 0f;
    private float facingScale = 1.0f; // Smooth horizontal turn [-1.0 to 1.0]
    private float targetFacingScale = 1.0f;
    private float swimCycle = 0f;
    private float breathTimer = 0f;
    private float oxygen;
    private float maxOxygen;

    // Damage & Screen Shake
    private float invincibleTimer = 0f;
    private float screenShakeTimer = 0f;
    private float hurtFlashTimer = 0f;

    // World & Camera (Expanded down to 4600f for Deep Abyssal Caves!)
    private final float worldWidth = 2600f;
    private final float worldHeight = 4600f;
    private float cameraX = 0f;
    private float cameraY = 0f;

    // Remote Input State & Watchdog
    private float inputX = 0f;
    private float inputY = 0f;
    private long lastInputTime = 0;

    // Pad / Touch Virtual Joystick & On-Screen Action Buttons
    private int joystickPointerId = -1;
    private float joystickOriginX = 0f;
    private float joystickOriginY = 0f;
    private float joystickKnobX = 0f;
    private float joystickKnobY = 0f;
    private boolean isTouchJoystickActive = false;
    private boolean isTouchActionPressed = false;
    private static final float JOYSTICK_RADIUS = 95f;

    // Weapons: 1. Harpoon 2. Bubble Stun Gun
    public enum WeaponMode { HARPOON, BUBBLE_GUN }
    private WeaponMode currentWeapon = WeaponMode.HARPOON;

    // Redesigned Weapon Switching: Long-Press OK or dedicated Play/Pause button (No conflict with UP arrow)
    private boolean isActionKeyDown = false;
    private long actionKeyDownTime = 0;
    private boolean actionLongPressTriggered = false;
    private final Runnable longPressWeaponSwitchRunnable = new Runnable() {
        @Override
        public void run() {
            if (isActionKeyDown && !actionLongPressTriggered) {
                actionLongPressTriggered = true;
                toggleWeapon();
                invalidate();
            }
        }
    };

    // Proposal A: Rideable Friendly Creatures (Turtle & Blue Whale)
    private RealisticFish mountedCreature = null;

    // Harpoon Gun & Reel State
    private enum HarpoonState { IDLE, FIRING, REELING }
    private HarpoonState harpoonState = HarpoonState.IDLE;
    private float harpoonStartX, harpoonStartY;
    private float harpoonX, harpoonY;
    private float harpoonVx, harpoonVy;
    private float harpoonDist = 0f;
    private RealisticFish hookedFish = null;
    private RealisticFish targetFish = null;

    // Bubble Stun Projectile
    private static class BubbleBullet {
        float x, y, vx, vy, radius;
        float lifeTime;
    }
    private final List<BubbleBullet> activeBubbles = new ArrayList<>();

    // Sequence 1: Deep Abyssal Cave Glowing Crystals
    private static class GlowingCrystal {
        float x, y, size;
        int color;
        float pulseSpeed;
    }
    private final List<GlowingCrystal> caveCrystals = new ArrayList<>();

    // Sequence 2: Sunken Pirate Galleon Shipwreck
    private static class SunkenShipwreck {
        float x = 1150f;
        float y = 3280f;
        float width = 640f;
        float height = 240f;
    }
    private final SunkenShipwreck shipwreck = new SunkenShipwreck();

    // Sequence 2: Interactive Sunken Treasure Chests
    private static class TreasureChest {
        float x, y;
        boolean opened;
        int rewardCoins;
        float openProgress; // 0.0 to 1.0
        String name;
    }
    private final List<TreasureChest> treasureChests = new ArrayList<>();

    // Sequence 2: Giant Pearl Clams
    private static class PearlClam {
        float x, y;
        boolean hasPearl = true;
        float openCycle = 0f; // Oscillates opening and closing
        float respawnTimer = 0f;
        int rewardCoins = 90;
    }
    private final List<PearlClam> pearlClams = new ArrayList<>();

    // Sequence 3: Friendly Dolphin Rescue Bobo
    private static class FriendlyDolphin {
        float x = 500f;
        float y = 500f;
        float vx = 0f;
        float vy = 0f;
        float facing = 1.0f;
        float swimPhase = 0f;
        boolean active = false;
        boolean isRescuing = false;
        float callSoundTimer = 0f;
    }
    private final FriendlyDolphin bobo = new FriendlyDolphin();

    // Dave the Diver Kelp Forest & Coral Formations
    private static class KelpPlant {
        float x, baseY, height, phaseOffset;
        int leafCount;
        boolean isBackground;
    }
    private final List<KelpPlant> kelpForest = new ArrayList<>();

    private static class CoralShelf {
        float x, y, width;
        int coralType; // 0: Staghorn coral, 1: Table coral, 2: Sea anemone
        int color;
    }
    private final List<CoralShelf> coralShelves = new ArrayList<>();

    private static class MarineSnow {
        float x, y, r, speedX, speedY;
    }
    private final List<MarineSnow> planktonList = new ArrayList<>();

    // Visual FX
    private static class GameFX {
        float x, y, vy;
        String text;
        int color;
        float alpha;
        long spawnTime;
        float size;
    }
    private final List<GameFX> effects = new ArrayList<>();

    // Celebratory Burst Particles (stars / coins / bubbles for 4-year-old delight)
    private static class BurstParticle {
        float x, y, vx, vy, size, life, maxLife;
        int color;
        boolean isStar;
    }
    private final List<BurstParticle> burstParticles = new ArrayList<>();

    private void spawnBurst(float x, float y, int baseColor, int count) {
        int[] palette = { baseColor, 0xFFFFD700, 0xFF00E5FF, 0xFFFF80AB, 0xFF69F0AE };
        for (int i = 0; i < count; i++) {
            BurstParticle p = new BurstParticle();
            double angle = (Math.PI * 2.0 * i / count) + (random.nextFloat() - 0.5f) * 0.45f;
            float speed = 90f + random.nextFloat() * 190f;
            p.x = x;
            p.y = y;
            p.vx = (float) Math.cos(angle) * speed;
            p.vy = (float) Math.sin(angle) * speed - 50f;
            p.size = 6f + random.nextFloat() * 8f;
            p.maxLife = 0.55f + random.nextFloat() * 0.45f;
            p.life = p.maxLife;
            p.color = palette[random.nextInt(palette.length)];
            p.isStar = (i % 2 == 0);
            burstParticles.add(p);
        }
    }

    // Bubbles
    private static class Bubble {
        float x, y, r, speed;
        boolean isOxygenPickup;
        boolean isDaveBreath;
    }
    private final List<Bubble> bubbles = new ArrayList<>();

    // Realistic Fish Class
    public static class RealisticFish {
        public enum Species {
            CLOWNFISH, BLUE_TANG, YELLOW_TANG, BABY_SHARK, REEF_SHARK, GREAT_SHARK, GIANT_TUNA, JELLYFISH,
            ANGLERFISH, NEON_JELLYFISH, TURTLE, BLUE_WHALE
        }

        public Species species;
        public String name;
        public int value;
        public float weightKg;
        public float x, y, vx, vy;
        public float length, bodyHeight;
        public float facing = 1f; // 1 = right, -1 = left
        public float swimPhase;
        public float swimSpeedMultiplier;
        public int primaryColor, secondaryColor, bellyColor;
        public boolean isAttacking = false;

        // Sequence 3: Stun / Sleep State from Bubble Gun
        public boolean isSleeping = false;
        public float sleepTimer = 0f;
        public float bubbleEncloseRadius = 0f;
    }
    private final List<RealisticFish> fishes = new ArrayList<>();

    private long lastFrameTime = 0;
    private boolean isRunning = true;

    public DiverGameView(Context context) {
        super(context);
        setFocusable(true);
        setFocusableInTouchMode(true);
        state = GameState.get(context);
        kidHeadBitmap = BitmapFactory.decodeResource(context.getResources(), R.drawable.kid_diver_head);
        initGame();
    }

    public void setOnGameEventListener(OnGameEventListener listener) {
        this.listener = listener;
    }

    public void initGame() {
        maxOxygen = state.getMaxOxygen();
        oxygen = maxOxygen;
        diverX = 900f;
        diverY = 240f;
        diverVx = 0;
        diverVy = 0;
        diverAngle = 0;
        facingScale = 1.0f;
        targetFacingScale = 1.0f;
        swimCycle = 0;
        currentWeapon = WeaponMode.HARPOON;
        harpoonState = HarpoonState.IDLE;
        hookedFish = null;
        targetFish = null;
        invincibleTimer = 0f;
        screenShakeTimer = 0f;
        hurtFlashTimer = 0f;

        fishes.clear();
        effects.clear();
        bubbles.clear();
        kelpForest.clear();
        coralShelves.clear();
        treasureChests.clear();
        pearlClams.clear();
        caveCrystals.clear();
        activeBubbles.clear();
        planktonList.clear();

        // 1. Generate marine snow / drifting plankton for deep underwater feel
        for (int i = 0; i < 90; i++) {
            MarineSnow ms = new MarineSnow();
            ms.x = random.nextFloat() * worldWidth;
            ms.y = random.nextFloat() * worldHeight;
            ms.r = 1.5f + random.nextFloat() * 2.5f;
            ms.speedX = (random.nextFloat() - 0.5f) * 0.8f;
            ms.speedY = -0.4f - random.nextFloat() * 0.8f;
            planktonList.add(ms);
        }

        // 2. Layered Kelp Forest (Background & Foreground lush fronds with air vesicles)
        for (float x = 60f; x < worldWidth - 60f; x += 75f) {
            KelpPlant bgKelp = new KelpPlant();
            bgKelp.x = x + (random.nextFloat() - 0.5f) * 30f;
            bgKelp.baseY = 2800f;
            bgKelp.height = 280f + random.nextFloat() * 300f;
            bgKelp.phaseOffset = random.nextFloat() * 6.28f;
            bgKelp.leafCount = 6 + random.nextInt(4);
            bgKelp.isBackground = true;
            kelpForest.add(bgKelp);

            if (random.nextBoolean()) {
                KelpPlant fgKelp = new KelpPlant();
                fgKelp.x = x + 35f + (random.nextFloat() - 0.5f) * 20f;
                fgKelp.baseY = 2820f;
                fgKelp.height = 320f + random.nextFloat() * 320f;
                fgKelp.phaseOffset = random.nextFloat() * 6.28f;
                fgKelp.leafCount = 7 + random.nextInt(4);
                fgKelp.isBackground = false;
                kelpForest.add(fgKelp);
            }
        }

        // 3. Natural Underwater Coral Reef Shelves & Formations
        float[] shelfDepths = { 650f, 1350f, 2150f, 2950f, 3850f };
        for (float depth : shelfDepths) {
            for (int k = 0; k < 3; k++) {
                CoralShelf cs = new CoralShelf();
                cs.x = 200f + k * 800f + random.nextFloat() * 200f;
                cs.y = depth + random.nextFloat() * 150f;
                cs.width = 170f + random.nextFloat() * 120f;
                cs.coralType = random.nextInt(3);
                int[] coralColors = { 0xFFFF6F00, 0xFFE91E63, 0xFF9C27B0, 0xFF00BCD4, 0xFFFFB300 };
                cs.color = coralColors[random.nextInt(coralColors.length)];
                coralShelves.add(cs);
            }
        }

        // Sequence 1: Glowing cave crystals in deep abyssal zone (Y: 3400 ~ 4550)
        int[] crystalColors = { 0xFF00E5FF, 0xFFE040FB, 0xFF00E676, 0xFFFFD700, 0xFF76FF03 };
        for (int i = 0; i < 45; i++) {
            GlowingCrystal gc = new GlowingCrystal();
            gc.x = 80f + random.nextFloat() * (worldWidth - 160f);
            gc.y = 3450f + random.nextFloat() * 1100f;
            gc.size = 18f + random.nextFloat() * 24f;
            gc.color = crystalColors[random.nextInt(crystalColors.length)];
            gc.pulseSpeed = 2f + random.nextFloat() * 3.5f;
            caveCrystals.add(gc);
        }

        // Sequence 2: 4 Interactive Sunken Treasure Chests
        addTreasureChest(420f, 820f, 80, "淺海珊瑚寶箱");
        addTreasureChest(2150f, 1850f, 130, "巨藻林暗礁寶箱");
        addTreasureChest(1460f, 3270f, 220, "沉船甲板主寶箱");
        addTreasureChest(750f, 4320f, 320, "深淵神秘水晶寶箱");

        // Sequence 2: Giant Pearl Clams on Coral Shelves
        addPearlClam(320f, 950f);
        addPearlClam(1950f, 2180f);
        addPearlClam(1100f, 3950f);

        // Sequence 3: Friendly Dolphin Bobo setup
        bobo.x = 200f;
        bobo.y = 300f;
        bobo.active = false;
        bobo.isRescuing = false;

        // 5. Ambient bubbles
        for (int i = 0; i < 45; i++) {
            Bubble b = new Bubble();
            b.x = random.nextFloat() * worldWidth;
            b.y = random.nextFloat() * worldHeight;
            b.r = 6f + random.nextFloat() * 14f;
            b.speed = 1.2f + random.nextFloat() * 2.5f;
            b.isOxygenPickup = (random.nextInt(5) == 0);
            bubbles.add(b);
        }

        // 6. Populate realistic marine fish species across depths
        // Shallow Reef (0m - 90m / Y: 200 - 1050)
        spawnSpecies(RealisticFish.Species.CLOWNFISH, "小丑魚 (Clownfish)", 20, 1.2f, 10, 200f, 1000f);
        spawnSpecies(RealisticFish.Species.BLUE_TANG, "藍倒吊 (Blue Tang)", 25, 1.8f, 8, 250f, 1100f);
        spawnSpecies(RealisticFish.Species.YELLOW_TANG, "黃金蝶魚 (Yellow Tang)", 28, 1.5f, 7, 350f, 1200f);

        // Mid Blue Hole (90m - 230m / Y: 1050 - 2450)
        spawnSpecies(RealisticFish.Species.BABY_SHARK, "Baby Shark 小鯊魚", 55, 8.5f, 5, 700f, 2250f);
        spawnSpecies(RealisticFish.Species.JELLYFISH, "海月水母 (Moon Jellyfish)", 40, 2.5f, 6, 750f, 2400f);
        spawnSpecies(RealisticFish.Species.REEF_SHARK, "黑鰭礁鯊 (Reef Shark)", 75, 15.0f, 4, 1100f, 2600f);

        // Deep Trench (230m - 340m / Y: 2450 - 3500)
        spawnSpecies(RealisticFish.Species.GREAT_SHARK, "大白鯊 (Great White Shark)", 120, 28.0f, 2, 2350f, 3400f);
        spawnSpecies(RealisticFish.Species.GIANT_TUNA, "藍鰭巨鮪 (Giant Bluefin Tuna)", 160, 35.0f, 2, 2450f, 3450f);
        spawnSpecies(RealisticFish.Species.NEON_JELLYFISH, "深海霓虹發光水母", 85, 3.8f, 4, 2300f, 3600f);

        // Proposal A: Rideable Green Sea Turtles (0m - 120m)
        spawnSpecies(RealisticFish.Species.TURTLE, "綠海龜 奔奔 (可騎乘)", 110, 45.0f, 3, 260f, 1300f);

        // Proposal A: Rideable Giant Blue Whale (220m - 340m)
        spawnSpecies(RealisticFish.Species.BLUE_WHALE, "深海巨型藍鯨 (可騎乘)", 250, 120.0f, 2, 2300f, 3450f);

        // Sequence 1: Abyssal Bioluminescent Cave (340m - 440m+ / Y: 3500 - 4550)
        spawnSpecies(RealisticFish.Species.ANGLERFISH, "深海安康魚 (Anglerfish)", 180, 22.0f, 4, 3550f, 4520f);
        spawnSpecies(RealisticFish.Species.NEON_JELLYFISH, "深海霓虹發光水母", 85, 3.8f, 3, 3700f, 4550f);

        lastFrameTime = SystemClock.uptimeMillis();
    }

    private void addTreasureChest(float x, float y, int reward, String name) {
        TreasureChest tc = new TreasureChest();
        tc.x = x;
        tc.y = y;
        tc.rewardCoins = reward;
        tc.name = name;
        tc.opened = false;
        tc.openProgress = 0f;
        treasureChests.add(tc);
    }

    private void addPearlClam(float x, float y) {
        PearlClam pc = new PearlClam();
        pc.x = x;
        pc.y = y;
        pc.hasPearl = true;
        pc.openCycle = random.nextFloat() * 6.28f;
        pearlClams.add(pc);
    }

    private void spawnSpecies(RealisticFish.Species sp, String name, int val, float weight, int count, float minY, float maxY) {
        for (int i = 0; i < count; i++) {
            RealisticFish f = new RealisticFish();
            f.species = sp;
            f.name = name;
            f.value = val;
            f.weightKg = weight;
            f.x = random.nextFloat() * worldWidth;
            f.y = minY + random.nextFloat() * (maxY - minY);
            f.vx = (random.nextBoolean() ? 1f : -1f) * (1.3f + random.nextFloat() * 1.8f);
            f.facing = f.vx > 0 ? 1f : -1f;
            f.swimPhase = random.nextFloat() * 6.28f;
            f.swimSpeedMultiplier = 4f + random.nextFloat() * 2f;

            switch (sp) {
                case CLOWNFISH:
                    f.length = 78f; f.bodyHeight = 48f;
                    f.primaryColor = 0xFFFF6D00; f.secondaryColor = 0xFFFFFFFF; f.bellyColor = 0xFFFF8F00;
                    break;
                case BLUE_TANG:
                    f.length = 85f; f.bodyHeight = 54f;
                    f.primaryColor = 0xFF1565C0; f.secondaryColor = 0xFF212121; f.bellyColor = 0xFFFFD600;
                    break;
                case YELLOW_TANG:
                    f.length = 82f; f.bodyHeight = 58f;
                    f.primaryColor = 0xFFFFEA00; f.secondaryColor = 0xFFFFD600; f.bellyColor = 0xFFFFF59D;
                    break;
                case JELLYFISH:
                    f.length = 70f; f.bodyHeight = 80f;
                    f.primaryColor = 0xDDBA68C8; f.secondaryColor = 0xAA7B1FA2; f.bellyColor = 0x66E1BEE7;
                    break;
                case NEON_JELLYFISH:
                    f.length = 82f; f.bodyHeight = 92f;
                    f.primaryColor = 0xCC00E5FF; f.secondaryColor = 0xEEFF4081; f.bellyColor = 0x8876FF03;
                    break;
                case BABY_SHARK:
                    f.length = 150f; f.bodyHeight = 68f;
                    f.primaryColor = 0xFFFFD166; f.secondaryColor = 0xFFFFB703; f.bellyColor = 0xFFFFFFFF;
                    break;
                case REEF_SHARK:
                    f.length = 190f; f.bodyHeight = 74f;
                    f.primaryColor = 0xFF607D8B; f.secondaryColor = 0xFF212121; f.bellyColor = 0xFFF5F5F5;
                    break;
                case GREAT_SHARK:
                    f.length = 240f; f.bodyHeight = 95f;
                    f.primaryColor = 0xFF37474F; f.secondaryColor = 0xFF212121; f.bellyColor = 0xFFFFFFFF;
                    break;
                case GIANT_TUNA:
                    f.length = 215f; f.bodyHeight = 84f;
                    f.primaryColor = 0xFF0D47A1; f.secondaryColor = 0xFFFFD700; f.bellyColor = 0xFFECEFF1;
                    break;
                case ANGLERFISH:
                    f.length = 165f; f.bodyHeight = 110f;
                    f.primaryColor = 0xFF263238; f.secondaryColor = 0xFF00E5FF; f.bellyColor = 0xFF1A237E;
                    break;
                case TURTLE:
                    f.length = 150f; f.bodyHeight = 85f;
                    f.primaryColor = 0xFF2E7D32; f.secondaryColor = 0xFFFFD54F; f.bellyColor = 0xFFA5D6A7;
                    break;
                case BLUE_WHALE:
                    f.length = 390f; f.bodyHeight = 130f;
                    f.primaryColor = 0xFF0277BD; f.secondaryColor = 0xFFFFFFFF; f.bellyColor = 0xFFE1F5FE;
                    break;
            }
            fishes.add(f);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        long now = SystemClock.uptimeMillis();
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                inputX = -1.0f;
                targetFacingScale = -1.0f;
                lastInputTime = now;
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                inputX = 1.0f;
                targetFacingScale = 1.0f;
                lastInputTime = now;
                return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                inputY = -1.0f;
                lastInputTime = now;
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                inputY = 1.0f;
                lastInputTime = now;
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
                if (!isActionKeyDown) {
                    isActionKeyDown = true;
                    actionKeyDownTime = now;
                    actionLongPressTriggered = false;
                    postDelayed(longPressWeaponSwitchRunnable, 380);
                }
                return true;
            // Dedicated button triggers for TV Remote & Gamepads:
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
            case KeyEvent.KEYCODE_BUTTON_X:
            case KeyEvent.KEYCODE_BUTTON_Y:
            case KeyEvent.KEYCODE_BUTTON_L1:
            case KeyEvent.KEYCODE_BUTTON_R1:
            case KeyEvent.KEYCODE_PROG_BLUE:
            case KeyEvent.KEYCODE_PROG_YELLOW:
                toggleWeapon();
                return true;
            case KeyEvent.KEYCODE_BACK:
                surfaceAndReturn();
                return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (inputX < 0f) inputX = 0f;
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (inputX > 0f) inputX = 0f;
                return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (inputY < 0f) inputY = 0f;
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (inputY > 0f) inputY = 0f;
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
                removeCallbacks(longPressWeaponSwitchRunnable);
                if (isActionKeyDown && !actionLongPressTriggered) {
                    onActionPressed();
                }
                isActionKeyDown = false;
                actionLongPressTriggered = false;
                return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        int w = getWidth();
        int h = getHeight();
        if (w == 0 || h == 0) return true;

        int action = event.getActionMasked();
        int actionIndex = event.getActionIndex();
        int pointerId = event.getPointerId(actionIndex);

        switch (action) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: {
                float tx = event.getX(actionIndex);
                float ty = event.getY(actionIndex);

                // 1. Top-Center Weapon Switcher Pill
                if (tx >= w / 2f - 190f && tx <= w / 2f + 190f && ty >= 18f && ty <= 102f) {
                    toggleWeapon();
                    return true;
                }

                // 2. Top-Right "🏠 商店" Button
                if (tx >= w - 205f && tx <= w - 35f && ty >= 118f && ty <= 178f) {
                    surfaceAndReturn();
                    return true;
                }

                // 3. Bottom-Right Weapon Switch Circle
                float swCx = w - 260f;
                float swCy = h - 105f;
                if (Math.hypot(tx - swCx, ty - swCy) <= 56f) {
                    toggleWeapon();
                    return true;
                }

                // 4. Bottom-Right Big Action Circle (or tapping right half of screen)
                float actCx = w - 125f;
                float actCy = h - 135f;
                if (Math.hypot(tx - actCx, ty - actCy) <= 84f || tx >= w * 0.55f) {
                    isTouchActionPressed = true;
                    onActionPressed();
                    return true;
                }

                // 5. Left Half of Screen -> Virtual Floating Joystick
                if (joystickPointerId == -1) {
                    joystickPointerId = pointerId;
                    isTouchJoystickActive = true;
                    joystickOriginX = tx;
                    joystickOriginY = ty;
                    joystickKnobX = tx;
                    joystickKnobY = ty;
                    lastInputTime = SystemClock.uptimeMillis();
                }
                return true;
            }

            case MotionEvent.ACTION_MOVE: {
                if (joystickPointerId != -1) {
                    int idx = event.findPointerIndex(joystickPointerId);
                    if (idx >= 0) {
                        float mx = event.getX(idx);
                        float my = event.getY(idx);
                        float dx = mx - joystickOriginX;
                        float dy = my - joystickOriginY;
                        float dist = (float) Math.hypot(dx, dy);
                        if (dist > JOYSTICK_RADIUS) {
                            dx = (dx / dist) * JOYSTICK_RADIUS;
                            dy = (dy / dist) * JOYSTICK_RADIUS;
                        }
                        joystickKnobX = joystickOriginX + dx;
                        joystickKnobY = joystickOriginY + dy;

                        inputX = dx / JOYSTICK_RADIUS;
                        inputY = dy / JOYSTICK_RADIUS;
                        if (Math.abs(inputX) > 0.12f) {
                            targetFacingScale = (inputX > 0f) ? 1.0f : -1.0f;
                        }
                        lastInputTime = SystemClock.uptimeMillis();
                    }
                }
                return true;
            }

            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP:
            case MotionEvent.ACTION_CANCEL: {
                isTouchActionPressed = false;
                if (action == MotionEvent.ACTION_CANCEL || pointerId == joystickPointerId) {
                    joystickPointerId = -1;
                    isTouchJoystickActive = false;
                    inputX = 0f;
                    inputY = 0f;
                }
                return true;
            }
        }
        return true;
    }

    private void toggleWeapon() {
        if (currentWeapon == WeaponMode.HARPOON) {
            currentWeapon = WeaponMode.BUBBLE_GUN;
            SoundManager.get(getContext()).playBubbleGun();
            addFX(diverX, diverY - 55f, "🫧 切換至：氣泡催眠槍！(可活捉大魚)", 0xFF00E5FF, 32f);
        } else {
            currentWeapon = WeaponMode.HARPOON;
            SoundManager.get(getContext()).playHarpoon();
            addFX(diverX, diverY - 55f, "🎯 切換至：強力捕魚叉！", 0xFFFFD700, 32f);
        }
    }

    private void onActionPressed() {
        // Proposal A: If already mounted, pressing OK dismounts peacefully!
        if (mountedCreature != null) {
            mountedCreature = null;
            SoundManager.get(getContext()).playBubble();
            addFX(diverX, diverY - 45f, "🌟 平安下騎！感謝海洋夥伴的護送！", 0xFF00E676, 32f);
            return;
        }

        // Sequence 3: Dolphin rescue prompt triggered
        if (bobo.active && !bobo.isRescuing && (oxygen / maxOxygen < 0.25f)) {
            triggerDolphinRescue();
            return;
        }

        // Proposal A: Check mounting Green Sea Turtle or Blue Whale
        for (RealisticFish f : fishes) {
            if (f.species == RealisticFish.Species.TURTLE && Math.hypot(diverX - f.x, diverY - f.y) < 130f) {
                mountedCreature = f;
                SoundManager.get(getContext()).playUpgrade();
                addFX(diverX, diverY - 50f, "🐢 騎乘海龜奔奔！免耗氧氣悠游珊瑚區！(再次按 OK 下騎)", 0xFF2E7D32, 34f);
                return;
            }
            if (f.species == RealisticFish.Species.BLUE_WHALE && Math.hypot(diverX - f.x, diverY - f.y) < 180f) {
                mountedCreature = f;
                SoundManager.get(getContext()).playDolphin();
                addFX(diverX, diverY - 55f, "🐋 騎乘深海巨型藍鯨！彩虹噴水高速下潛！(再次按 OK 下騎)", 0xFF0288D1, 36f);
                return;
            }
        }

        // Sequence 2: Check Treasure Chests interaction
        for (TreasureChest c : treasureChests) {
            if (!c.opened && Math.hypot(diverX - c.x, diverY - c.y) < 140f) {
                c.opened = true;
                state.coins += c.rewardCoins;
                state.save();
                SoundManager.get(getContext()).playChest();
                spawnBurst(c.x, c.y - 20f, 0xFFFFD700, 18);
                addFX(c.x, c.y - 45f, "🎁 打開 " + c.name + "！獲得 +" + c.rewardCoins + " 貝殼金幣！", 0xFFFFD700, 36f);
                if (listener != null) listener.onCoinsUpdated(state.coins);
                return;
            }
        }

        // Sequence 2: Check Giant Pearl Clams interaction
        for (PearlClam pc : pearlClams) {
            if (pc.hasPearl && Math.sin(pc.openCycle) > 0.35f && Math.hypot(diverX - pc.x, diverY - pc.y) < 120f) {
                pc.hasPearl = false;
                pc.respawnTimer = 22f;
                state.coins += pc.rewardCoins;
                state.pearlCount++;
                state.save();
                SoundManager.get(getContext()).playPearl();
                spawnBurst(pc.x, pc.y - 15f, 0xFFE040FB, 16);
                addFX(pc.x, pc.y - 50f, "🦪 拾獲璀璨大珍珠！+" + pc.rewardCoins + " 貝殼金幣！", 0xFFE040FB, 34f);
                if (listener != null) listener.onCoinsUpdated(state.coins);
                return;
            }
        }

        // Sequence 3: Check Catching Sleeping Fish nearby
        for (RealisticFish f : fishes) {
            if (f.isSleeping && Math.hypot(diverX - f.x, diverY - f.y) < 120f) {
                // Rescue / collect the peaceful sleeping creature!
                state.addCaughtFish(f.name, f.value + 35, f.weightKg);
                SoundManager.get(getContext()).playUpgrade();
                spawnBurst(f.x, f.y, 0xFFFF80AB, 16);
                addFX(diverX, diverY - 60f, "🌟 溫柔活捉 " + f.name + "！", 0xFFFFD700, 34f);
                addFX(diverX, diverY - 20f, "💖 獲得愛心活捉獎勵 +" + (f.value + 35) + " 金幣！", 0xFF00E676, 30f);
                if (listener != null) listener.onCoinsUpdated(state.coins);

                // Respawn
                f.isSleeping = false;
                f.sleepTimer = 0f;
                f.x = (random.nextBoolean() ? 80f : worldWidth - 80f);
                f.y = 350f + random.nextFloat() * (worldHeight - 700f);
                return;
            }
        }

        // Tool / Weapon Action: Fire based on weapon mode
        if (currentWeapon == WeaponMode.HARPOON) {
            if (harpoonState == HarpoonState.IDLE) {
                fireHarpoon();
            }
        } else {
            fireBubbleGun();
        }
    }

    private void fireHarpoon() {
        harpoonState = HarpoonState.FIRING;
        boolean facingRight = targetFacingScale > 0;
        harpoonStartX = diverX + (facingRight ? 55f : -55f);
        harpoonStartY = diverY + 8f;
        harpoonX = harpoonStartX;
        harpoonY = harpoonStartY;
        harpoonDist = 0f;
        hookedFish = null;

        float targetAngle;
        if (targetFish != null) {
            targetAngle = (float) Math.atan2(targetFish.y - harpoonStartY, targetFish.x - harpoonStartX);
        } else {
            targetAngle = facingRight ? diverAngle : (float) Math.PI - diverAngle;
        }

        float speed = 32f;
        harpoonVx = (float) Math.cos(targetAngle) * speed;
        harpoonVy = (float) Math.sin(targetAngle) * speed;

        SoundManager.get(getContext()).playHarpoon();
        addFX(harpoonStartX, harpoonStartY, "💨 魚叉發射！", 0xFFFFD700, 24f);
    }

    private void fireBubbleGun() {
        boolean facingRight = targetFacingScale > 0;
        float startX = diverX + (facingRight ? 55f : -55f);
        float startY = diverY + 8f;

        float targetAngle;
        if (targetFish != null) {
            targetAngle = (float) Math.atan2(targetFish.y - startY, targetFish.x - startX);
        } else {
            targetAngle = facingRight ? diverAngle : (float) Math.PI - diverAngle;
        }

        BubbleBullet bb = new BubbleBullet();
        bb.x = startX;
        bb.y = startY;
        float speed = 25f;
        bb.vx = (float) Math.cos(targetAngle) * speed;
        bb.vy = (float) Math.sin(targetAngle) * speed;
        bb.radius = 22f;
        bb.lifeTime = 1.6f;
        activeBubbles.add(bb);

        SoundManager.get(getContext()).playBubbleGun();
        addFX(startX, startY, "🫧 七彩催眠氣泡！", 0xFF00E5FF, 26f);
    }

    private void triggerDolphinRescue() {
        bobo.isRescuing = true;
        SoundManager.get(getContext()).playDolphin();
        addFX(diverX, diverY - 50f, "🐬 海豚波波前來救援！準備起飛回水面！", 0xFFFF80AB, 36f);
    }

    private void surfaceAndReturn() {
        int count = state.currentBasket.size();
        if (listener != null) {
            listener.onSurfaced(count);
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        long now = SystemClock.uptimeMillis();
        float dt = Math.min((now - lastFrameTime) / 1000f, 0.05f);
        lastFrameTime = now;

        updatePhysics(dt, now);
        renderScene(canvas, now);

        if (isRunning) {
            postInvalidateOnAnimation();
        }
    }

    private void updatePhysics(float dt, long now) {
        invincibleTimer = Math.max(0f, invincibleTimer - dt);
        screenShakeTimer = Math.max(0f, screenShakeTimer - dt);
        hurtFlashTimer = Math.max(0f, hurtFlashTimer - dt);

        // Smooth horizontal facing interpolation
        facingScale += (targetFacingScale - facingScale) * Math.min(1f, dt * 12f);

        // Remote Watchdog (skip timeout while finger is holding virtual joystick)
        if (isTouchJoystickActive) {
            lastInputTime = now;
        } else if (now - lastInputTime > 220) {
            inputX = 0f;
            inputY = 0f;
        }

        // Proposal A: Mounted on Turtle or Blue Whale
        if (mountedCreature != null) {
            diverX = mountedCreature.x;
            diverY = mountedCreature.y - (mountedCreature.species == RealisticFish.Species.BLUE_WHALE ? 50f : 24f);
            diverAngle = 0f;
            facingScale = mountedCreature.facing;

            if (mountedCreature.species == RealisticFish.Species.BLUE_WHALE) {
                if (random.nextInt(12) == 0) {
                    addFX(mountedCreature.x, mountedCreature.y - 65f, "🌈 呼咻~！", 0xFF00E5FF, 26f);
                }
            }
            // Dave rests and breathes freely: NO oxygen consumption!
        } else if (bobo.isRescuing) {
            // Move dolphin towards Dave, then launch to surface
            float ddx = diverX - bobo.x;
            float ddy = diverY - bobo.y;
            float dist = (float) Math.hypot(ddx, ddy);
            if (dist > 35f) {
                bobo.x += (ddx / dist) * 550f * dt;
                bobo.y += (ddy / dist) * 550f * dt;
            } else {
                // Locked together: Ascend to surface!
                bobo.y -= 700f * dt;
                diverX = bobo.x;
                diverY = bobo.y - 30f;
                diverAngle = -0.3f;

                // Jet bubbles behind dolphin
                if (random.nextInt(3) == 0) {
                    Bubble b = new Bubble();
                    b.x = bobo.x + (random.nextFloat() - 0.5f) * 20f;
                    b.y = bobo.y + 40f;
                    b.r = 8f + random.nextFloat() * 10f;
                    b.speed = 4f;
                    b.isDaveBreath = true;
                    bubbles.add(b);
                }

                if (diverY <= 150f) {
                    // Safe at Cobra Boat!
                    bobo.isRescuing = false;
                    bobo.active = false;
                    state.coins += 50;
                    state.save();
                    SoundManager.get(getContext()).playUpgrade();
                    addFX(diverX, diverY, "🎉 平安抵達水面！獲得海豚守護獎勵 +50 貝殼金幣！", 0xFF00E676, 36f);
                    if (listener != null) listener.onCoinsUpdated(state.coins);
                    surfaceAndReturn();
                    return;
                }
            }
        } else {
            // Controlled swimming
            float maxSpeed = 230f + (state.speedLevel - 1) * 35f;
            float targetVx = inputX * maxSpeed;
            float targetVy = inputY * maxSpeed;

            boolean isMoving = (inputX != 0f || inputY != 0f);
            float accelRate = isMoving ? 8.0f : 5.0f;
            diverVx += (targetVx - diverVx) * Math.min(1f, dt * accelRate);
            diverVy += (targetVy - diverVy) * Math.min(1f, dt * accelRate);

            diverX += diverVx * dt;
            diverY += diverVy * dt;

            if (isMoving) {
                swimCycle += dt * 8.5f;
                float targetAngle = (float) Math.atan2(diverVy, Math.abs(diverVx));
                diverAngle += (targetAngle - diverAngle) * 0.18f;
            } else {
                diverAngle *= 0.85f;
                swimCycle += dt * 1.5f;
            }

            // Oxygen consumption
            oxygen -= dt * 0.5f;
            if (oxygen <= 0) {
                oxygen = 0;
                // Auto trigger dolphin rescue instead of game over!
                triggerDolphinRescue();
            }
        }

        // Breathing bubbles
        breathTimer += dt;
        if (breathTimer > 2.6f) {
            breathTimer = 0f;
            for (int k = 0; k < 3; k++) {
                Bubble b = new Bubble();
                b.x = diverX + (targetFacingScale > 0 ? 30f : -30f) + (random.nextFloat() - 0.5f) * 12f;
                b.y = diverY - 12f;
                b.r = 4f + random.nextFloat() * 6f;
                b.speed = 2.2f + random.nextFloat() * 1.5f;
                b.isDaveBreath = true;
                bubbles.add(b);
            }
        }

        // Clamp boundaries
        if (diverX < 80f) diverX = 80f;
        if (diverX > worldWidth - 80f) diverX = worldWidth - 80f;
        if (diverY < 140f) diverY = 140f;
        if (diverY > worldHeight - 110f) diverY = worldHeight - 110f;

        // Camera follow
        float targetCamX = diverX - getWidth() / 2f;
        float targetCamY = diverY - getHeight() / 2f;
        targetCamX = Math.max(0, Math.min(worldWidth - getWidth(), targetCamX));
        targetCamY = Math.max(0, Math.min(worldHeight - getHeight(), targetCamY));
        cameraX += (targetCamX - cameraX) * Math.min(1f, dt * 5.5f);
        cameraY += (targetCamY - cameraY) * Math.min(1f, dt * 5.5f);

        // Sequence 3: Friendly Dolphin Bobo AI
        float oxPercent = oxygen / maxOxygen;
        if (oxPercent < 0.25f && !bobo.isRescuing) {
            bobo.active = true;
            bobo.swimPhase += dt * 6f;
            // Swim towards Dave peacefully
            float bdx = (diverX + 100f) - bobo.x;
            float bdy = (diverY + 50f) - bobo.y;
            float bdist = (float) Math.hypot(bdx, bdy);
            if (bdist > 60f) {
                bobo.x += (bdx / bdist) * 220f * dt;
                bobo.y += (bdy / bdist) * 220f * dt;
                bobo.facing = (bdx > 0 ? 1f : -1f);
            }
            bobo.callSoundTimer += dt;
            if (bobo.callSoundTimer > 5.5f) {
                bobo.callSoundTimer = 0f;
                SoundManager.get(getContext()).playDolphin();
                addFX(bobo.x, bobo.y - 35f, "🐬 啾啾！海豚波波隨時支援！", 0xFFFF80AB, 26f);
            }
        }

        // Sequence 2: Pearl Clams open cycle & respawn
        for (PearlClam pc : pearlClams) {
            pc.openCycle += dt * 1.5f;
            if (!pc.hasPearl) {
                pc.respawnTimer -= dt;
                if (pc.respawnTimer <= 0f) {
                    pc.hasPearl = true;
                    addFX(pc.x, pc.y - 35f, "✨ 孕育出新的璀璨珍珠！", 0xFFE040FB, 24f);
                }
            }
        }

        // Sequence 2: Treasure Chests open animation
        for (TreasureChest tc : treasureChests) {
            if (tc.opened && tc.openProgress < 1.0f) {
                tc.openProgress = Math.min(1.0f, tc.openProgress + dt * 2.5f);
            }
        }

        // Marine Snow drifting
        for (MarineSnow ms : planktonList) {
            ms.x += ms.speedX;
            ms.y += ms.speedY;
            if (ms.y < 0) ms.y = worldHeight;
            if (ms.x < 0) ms.x = worldWidth;
            if (ms.x > worldWidth) ms.x = 0;
        }

        // Ambient Bubbles
        Iterator<Bubble> bIt = bubbles.iterator();
        while (bIt.hasNext()) {
            Bubble b = bIt.next();
            b.y -= b.speed * 60f * dt;
            if (b.y < 70f) {
                if (b.isDaveBreath) {
                    bIt.remove();
                    continue;
                }
                b.y = worldHeight - 50f;
                b.x = random.nextFloat() * worldWidth;
            }
            if (b.isOxygenPickup) {
                float oxDx = diverX - b.x;
                float oxDy = diverY - b.y;
                float oxDist = (float) Math.hypot(oxDx, oxDy);
                // Gentle magnet pull for 4-year-old kids
                if (oxDist > 1f && oxDist < 140f) {
                    b.x += (oxDx / oxDist) * 190f * dt;
                    b.y += (oxDy / oxDist) * 190f * dt;
                }
                if (oxDist < (b.r + 52f)) {
                    oxygen = Math.min(maxOxygen, oxygen + 25f);
                    SoundManager.get(getContext()).playBubble();
                    spawnBurst(b.x, b.y, 0xFF00E5FF, 10);
                    addFX(b.x, b.y, "🫧 +25 氧氣！", 0xFF00FFFF, 26f);
                    b.y = worldHeight - 50f;
                }
            }
        }

        // Sequence 3: Active Bubble Bullets update
        Iterator<BubbleBullet> bbIt = activeBubbles.iterator();
        while (bbIt.hasNext()) {
            BubbleBullet bb = bbIt.next();
            bb.lifeTime -= dt;
            bb.x += bb.vx;
            bb.y += bb.vy;

            // Collision with fish: Envelop in sleep bubble!
            boolean hit = false;
            for (RealisticFish f : fishes) {
                if (!f.isSleeping && Math.hypot(bb.x - f.x, bb.y - f.y) < (f.bodyHeight * 0.7f + bb.radius)) {
                    f.isSleeping = true;
                    f.sleepTimer = 8.0f;
                    f.isAttacking = false;
                    f.bubbleEncloseRadius = Math.max(f.length, f.bodyHeight) * 0.8f;
                    hit = true;
                    SoundManager.get(getContext()).playBubble();
                    addFX(f.x, f.y - 45f, "💤 氣泡催眠成功！(游近按 OK 溫柔活捉)", 0xFF00E5FF, 32f);
                    break;
                }
            }

            if (hit || bb.lifeTime <= 0f) {
                bbIt.remove();
            }
        }

        // Realistic Fish AI
        targetFish = null;
        float nearestDist = state.getHarpoonRange();

        for (RealisticFish f : fishes) {
            // Sequence 3: Sleeping state
            if (f.isSleeping) {
                f.sleepTimer -= dt;
                f.y -= 8f * dt; // Gently float upward inside protective bubble
                if (f.sleepTimer <= 0f) {
                    f.isSleeping = false;
                    addFX(f.x, f.y - 30f, "☀️ 睡醒游走啦~", 0xFFFFD700, 22f);
                }
                continue;
            }

            boolean isSharkPredator = (f.species == RealisticFish.Species.REEF_SHARK || f.species == RealisticFish.Species.GREAT_SHARK);
            float sdx = diverX - f.x;
            float sdy = diverY - f.y;
            float sDist = (float) Math.hypot(sdx, sdy);

            if (isSharkPredator && sDist < 350f && !bobo.isRescuing && mountedCreature == null) {
                f.isAttacking = true;
                f.facing = (sdx > 0 ? 1f : -1f);
                float chargeSpeed = (f.species == RealisticFish.Species.GREAT_SHARK ? 145f : 110f);
                f.x += (sdx / sDist) * chargeSpeed * dt;
                f.y += (sdy / sDist) * chargeSpeed * dt;
                f.swimPhase += dt * (f.swimSpeedMultiplier * 1.8f);

                if (sDist < (f.bodyHeight * 0.65f + 32f)) {
                    if (invincibleTimer <= 0f) {
                        float loss = (f.species == RealisticFish.Species.GREAT_SHARK) ? 22f : 14f;
                        oxygen = Math.max(0f, oxygen - loss);
                        invincibleTimer = 1.6f;
                        screenShakeTimer = 0.35f;
                        hurtFlashTimer = 0.35f;

                        diverVx += (sdx / sDist) * 220f;
                        diverVy += (sdy / sDist) * 220f;

                        SoundManager.get(getContext()).playHurt();
                        addFX(diverX, diverY - 50f, "🫧 哎呀！被鯊魚頂了一下！", 0xFFFFB74D, 32f);

                        if (oxygen <= 0f) {
                            triggerDolphinRescue();
                        }
                    }
                }
            } else {
                f.isAttacking = false;
                f.swimPhase += dt * f.swimSpeedMultiplier;
                f.x += f.vx * 60f * dt;
                f.y += (float) Math.sin(f.swimPhase) * 1.6f;

                if (f.x < 70f) {
                    f.x = 70f;
                    f.vx = Math.abs(f.vx);
                    f.facing = 1f;
                } else if (f.x > worldWidth - 70f) {
                    f.x = worldWidth - 70f;
                    f.vx = -Math.abs(f.vx);
                    f.facing = -1f;
                }
            }

            if (f.species == RealisticFish.Species.BABY_SHARK && random.nextInt(200) == 0) {
                addFX(f.x, f.y - 35f, "🎵 Doo Doo Doo~", 0xFFFFD166, 24f);
            }

            // Auto-aim target
            float dx = f.x - diverX;
            float dy = f.y - diverY;
            boolean inFront = (targetFacingScale > 0 ? dx > 0 : dx < 0);
            if (inFront) {
                float dist = (float) Math.hypot(dx, dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    targetFish = f;
                }
            }
        }

        // Harpoon Update
        float maxHarpoonRange = state.getHarpoonRange();
        if (harpoonState == HarpoonState.FIRING) {
            harpoonX += harpoonVx;
            harpoonY += harpoonVy;
            harpoonDist = (float) Math.hypot(harpoonX - harpoonStartX, harpoonY - harpoonStartY);

            for (RealisticFish f : fishes) {
                if (Math.hypot(harpoonX - f.x, harpoonY - f.y) < (f.bodyHeight * 0.65f)) {
                    hookedFish = f;
                    harpoonState = HarpoonState.REELING;
                    addFX(f.x, f.y - 25f, "🎯 鎖定命中！收線回捲！", 0xFFFFD700, 32f);
                    break;
                }
            }

            if (harpoonState == HarpoonState.FIRING && harpoonDist >= maxHarpoonRange) {
                harpoonState = HarpoonState.REELING;
            }
        } else if (harpoonState == HarpoonState.REELING) {
            float hx = diverX + (targetFacingScale > 0 ? 45f : -45f);
            float hy = diverY + 8f;
            float dx = hx - harpoonX;
            float dy = hy - harpoonY;
            float dist = (float) Math.hypot(dx, dy);

            if (dist < 40f) {
                if (hookedFish != null) {
                    state.addCaughtFish(hookedFish.name, hookedFish.value, hookedFish.weightKg);
                    SoundManager.get(getContext()).playCatch();
                    spawnBurst(diverX, diverY, 0xFFFFD700, 14);
                    addFX(diverX, diverY - 65f, "⭐ 捕獲 " + hookedFish.name + " (" + hookedFish.weightKg + "kg)！", 0xFFFFD700, 34f);
                    addFX(diverX, diverY - 25f, "💰 自動兌換金幣 +" + hookedFish.value + " 貝殼金幣！", 0xFF00E676, 30f);
                    if (listener != null) listener.onCoinsUpdated(state.coins);

                    hookedFish.x = (random.nextBoolean() ? 80f : worldWidth - 80f);
                    hookedFish.y = 350f + random.nextFloat() * (worldHeight - 700f);
                    hookedFish.vx = (random.nextBoolean() ? 1f : -1f) * (1.3f + random.nextFloat() * 1.8f);
                    hookedFish.facing = hookedFish.vx > 0 ? 1f : -1f;
                    hookedFish = null;
                }
                harpoonState = HarpoonState.IDLE;
            } else {
                float reelSpeed = 26f;
                harpoonX += (dx / dist) * reelSpeed;
                harpoonY += (dy / dist) * reelSpeed;
                if (hookedFish != null) {
                    hookedFish.x = harpoonX;
                    hookedFish.y = harpoonY;
                }
            }
        }

        // FX
        Iterator<GameFX> fxIt = effects.iterator();
        while (fxIt.hasNext()) {
            GameFX fx = fxIt.next();
            float age = (now - fx.spawnTime) / 1000f;
            if (age > 1.4f) {
                fxIt.remove();
                continue;
            }
            fx.y += fx.vy * dt;
            fx.alpha = Math.max(0f, 1f - age / 1.4f);
        }

        // Celebratory Burst Particles
        Iterator<BurstParticle> bpIt = burstParticles.iterator();
        while (bpIt.hasNext()) {
            BurstParticle p = bpIt.next();
            p.life -= dt;
            if (p.life <= 0f) {
                bpIt.remove();
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 180f * dt; // gentle underwater drift-down
            p.vx *= 0.96f;
        }
    }

    private void addFX(float x, float y, String text, int color, float size) {
        GameFX fx = new GameFX();
        fx.x = x;
        fx.y = y;
        fx.vy = -45f;
        fx.text = text;
        fx.color = color;
        fx.size = size;
        fx.alpha = 1f;
        fx.spawnTime = SystemClock.uptimeMillis();
        effects.add(fx);
    }

    private void renderScene(Canvas canvas, long now) {
        int w = getWidth();
        int h = getHeight();
        if (w == 0 || h == 0) return;

        // Sequence 1: 4-Tier Depth Water Color Gradient (Turquoise -> Ocean -> Abyssal Dark)
        Paint bgPaint = new Paint();
        bgPaint.setShader(new LinearGradient(
            0, -cameraY, 0, worldHeight - cameraY,
            new int[]{ 0xFF4DC9E6, 0xFF0077BE, 0xFF003865, 0xFF001529, 0xFF000814, 0xFF000308 },
            new float[]{ 0.0f, 0.18f, 0.45f, 0.70f, 0.88f, 1.0f },
            Shader.TileMode.CLAMP
        ));
        canvas.drawRect(0, 0, w, h, bgPaint);

        // Tropical Sky above ocean surface (visible near surface)
        if (cameraY < 160f) {
            Paint skyPaint = new Paint();
            skyPaint.setShader(new LinearGradient(
                0, -cameraY, 0, 145f - cameraY,
                new int[]{ 0xFF64B5F6, 0xFFB3E5FC, 0xFFE0F7FA },
                new float[]{ 0f, 0.6f, 1f },
                Shader.TileMode.CLAMP
            ));
            canvas.drawRect(0, 0, w, Math.max(0f, 145f - cameraY), skyPaint);
        }

        canvas.save();
        float shakeX = (screenShakeTimer > 0f) ? (random.nextFloat() - 0.5f) * 16f : 0f;
        float shakeY = (screenShakeTimer > 0f) ? (random.nextFloat() - 0.5f) * 16f : 0f;
        canvas.translate(-cameraX + shakeX, -cameraY + shakeY);

        // Dave the Diver Blue Hole Layered Canyon Cliffs (Left & Right)
        envPaint.setStyle(Paint.Style.FILL);
        envPaint.setColor(0x28001A33);
        Path farLeftCliff = new Path();
        farLeftCliff.moveTo(0, 140f);
        farLeftCliff.lineTo(440f, 760f);
        farLeftCliff.lineTo(290f, 1850f);
        farLeftCliff.lineTo(520f, 3150f);
        farLeftCliff.lineTo(360f, worldHeight);
        farLeftCliff.lineTo(0, worldHeight);
        farLeftCliff.close();
        canvas.drawPath(farLeftCliff, envPaint);

        Path farRightCliff = new Path();
        farRightCliff.moveTo(worldWidth, 140f);
        farRightCliff.lineTo(worldWidth - 420f, 820f);
        farRightCliff.lineTo(worldWidth - 260f, 1950f);
        farRightCliff.lineTo(worldWidth - 500f, 3100f);
        farRightCliff.lineTo(worldWidth - 340f, worldHeight);
        farRightCliff.lineTo(worldWidth, worldHeight);
        farRightCliff.close();
        canvas.drawPath(farRightCliff, envPaint);

        // Foreground Rocky Trench Silhouettes
        envPaint.setColor(0x45001022);
        Path nearLeftCliff = new Path();
        nearLeftCliff.moveTo(0, 140f);
        nearLeftCliff.lineTo(170f, 920f);
        nearLeftCliff.lineTo(110f, 2100f);
        nearLeftCliff.lineTo(230f, 3400f);
        nearLeftCliff.lineTo(140f, worldHeight);
        nearLeftCliff.lineTo(0, worldHeight);
        nearLeftCliff.close();
        canvas.drawPath(nearLeftCliff, envPaint);

        Path nearRightCliff = new Path();
        nearRightCliff.moveTo(worldWidth, 140f);
        nearRightCliff.lineTo(worldWidth - 160f, 960f);
        nearRightCliff.lineTo(worldWidth - 105f, 2200f);
        nearRightCliff.lineTo(worldWidth - 220f, 3500f);
        nearRightCliff.lineTo(worldWidth - 135f, worldHeight);
        nearRightCliff.lineTo(worldWidth, worldHeight);
        nearRightCliff.close();
        canvas.drawPath(nearRightCliff, envPaint);

        // Abyssal Seafloor & Glowing Hydrothermal Vents
        if (cameraY + h > worldHeight - 250f) {
            envPaint.setColor(0xFF040D1A);
            Path seabed = new Path();
            seabed.moveTo(0, worldHeight - 85f);
            for (float sx = 0; sx <= worldWidth; sx += 260f) {
                float mound = (float) Math.sin(sx * 0.005f) * 28f;
                seabed.lineTo(sx, worldHeight - 85f + mound);
            }
            seabed.lineTo(worldWidth, worldHeight);
            seabed.lineTo(0, worldHeight);
            seabed.close();
            canvas.drawPath(seabed, envPaint);

            float ventPulse = 0.65f + 0.35f * (float) Math.sin(now / 350.0);
            for (float vx = 420f; vx < worldWidth - 300f; vx += 680f) {
                lightPaint.setStyle(Paint.Style.FILL);
                lightPaint.setColor(Color.argb((int) (95 * ventPulse), 0, 229, 255));
                canvas.drawCircle(vx, worldHeight - 95f, 45f * ventPulse, lightPaint);
                envPaint.setColor(0xFF102030);
                canvas.drawRect(vx - 18f, worldHeight - 105f, vx + 18f, worldHeight - 75f, envPaint);
            }
        }

        // Volumetric Gradient Sunlight God-Rays
        float sway = (float) Math.sin(now / 1100.0) * 55f;
        envPaint.setShader(new LinearGradient(
            0, 140f, 0, 980f,
            new int[]{ 0x26FFFFFF, 0x0FFFFFFF, 0x00FFFFFF },
            new float[]{ 0f, 0.55f, 1f },
            Shader.TileMode.CLAMP
        ));
        for (float rx = 180f; rx < worldWidth; rx += 460f) {
            Path ray = new Path();
            ray.moveTo(rx + sway * 0.4f, 140f);
            ray.lineTo(rx + 200f + sway, 980f);
            ray.lineTo(rx + 85f + sway, 980f);
            ray.lineTo(rx - 75f + sway * 0.4f, 140f);
            ray.close();
            canvas.drawPath(ray, envPaint);
        }
        envPaint.setShader(null);

        // Shallow Water Caustic Shimmer
        if (cameraY < 900f) {
            envPaint.setStyle(Paint.Style.STROKE);
            envPaint.setStrokeWidth(3f);
            envPaint.setColor(0x16B2EBF2);
            for (int c = 0; c < 6; c++) {
                float cx = 220f + c * 420f + (float) Math.sin(now / 700.0 + c) * 35f;
                float cy = 260f + (c % 2) * 140f + (float) Math.cos(now / 900.0 + c) * 20f;
                canvas.drawOval(cx - 85f, cy - 16f, cx + 85f, cy + 16f, envPaint);
            }
            envPaint.setStyle(Paint.Style.FILL);
        }

        // Animated Ocean Surface Waves & Foam Line
        if (cameraY < 260f) {
            Path wavePath = new Path();
            wavePath.moveTo(0, 140f);
            for (float wx = 0; wx <= worldWidth; wx += 40f) {
                float wy = 140f + (float) Math.sin(wx * 0.025 + now / 320.0) * 7f;
                wavePath.lineTo(wx, wy);
            }
            envPaint.setStyle(Paint.Style.STROKE);
            envPaint.setStrokeWidth(7f);
            envPaint.setColor(0xCCE0F7FA);
            canvas.drawPath(wavePath, envPaint);
            envPaint.setStyle(Paint.Style.FILL);
        }

        // Detailed Cobra Rescue Boat (gently bobbing on surface waves)
        float boatBob = (float) Math.sin(now / 360.0) * 5f;
        // Boat Cabin
        diverPaint.setStyle(Paint.Style.FILL);
        diverPaint.setColor(0xFFFFFFFF);
        canvas.drawRoundRect(740f, 34f + boatBob, 1020f, 88f + boatBob, 14f, 14f, diverPaint);
        diverPaint.setColor(0xFF29B6F6);
        canvas.drawRoundRect(765f, 46f + boatBob, 860f, 76f + boatBob, 8f, 8f, diverPaint);
        canvas.drawRoundRect(880f, 46f + boatBob, 995f, 76f + boatBob, 8f, 8f, diverPaint);
        // Boat Hull
        diverPaint.setColor(0xFFFF8C00);
        canvas.drawRoundRect(600f, 76f + boatBob, 1200f, 142f + boatBob, 22f, 22f, diverPaint);
        diverPaint.setColor(0xFFE65100);
        canvas.drawRoundRect(615f, 120f + boatBob, 1185f, 142f + boatBob, 10f, 10f, diverPaint);
        // Life Ring
        diverPaint.setStyle(Paint.Style.STROKE);
        diverPaint.setStrokeWidth(6f);
        diverPaint.setColor(0xFFFF5252);
        canvas.drawCircle(665f, 104f + boatBob, 14f, diverPaint);
        diverPaint.setStyle(Paint.Style.FILL);
        diverPaint.setColor(0xFFFFFFFF);
        diverPaint.setTextSize(24f);
        diverPaint.setFakeBoldText(true);
        canvas.drawText("⛵ 柯布拉救援基地 (游回水面升級)", 705f, 112f + boatBob, diverPaint);

        // Sequence 1: Deep Abyssal Bioluminescent Crystals (Y > 3400)
        for (GlowingCrystal gc : caveCrystals) {
            renderGlowingCrystal(canvas, gc, now);
        }

        // Dave the Diver Kelp Forest (Background Layer)
        for (KelpPlant kp : kelpForest) {
            if (!kp.isBackground) continue;
            renderKelp(canvas, kp, now, 0x88004D40);
        }

        // Sequence 2: Sunken Pirate Galleon Shipwreck
        renderSunkenShipwreck(canvas, shipwreck, now);

        // Natural Underwater Coral Reef Shelves & Formations
        for (CoralShelf cs : coralShelves) {
            renderCoralShelf(canvas, cs, now);
        }

        // Marine Snow / Plankton Particles
        envPaint.setColor(0x35FFFFFF);
        for (MarineSnow ms : planktonList) {
            canvas.drawCircle(ms.x, ms.y, ms.r, envPaint);
        }

        // Dave the Diver Kelp Forest (Foreground Layer)
        for (KelpPlant kp : kelpForest) {
            if (kp.isBackground) continue;
            renderKelp(canvas, kp, now, 0xD000796B);
        }

        // Sequence 2: Interactive Sunken Treasure Chests
        for (TreasureChest tc : treasureChests) {
            renderTreasureChest(canvas, tc, now);
        }

        // Sequence 2: Giant Pearl Clams
        for (PearlClam pc : pearlClams) {
            renderPearlClam(canvas, pc, now);
        }

        // Ambient Bubbles
        for (Bubble b : bubbles) {
            if (b.isOxygenPickup) {
                diverPaint.setStyle(Paint.Style.STROKE);
                diverPaint.setStrokeWidth(3.5f);
                diverPaint.setColor(0xEE00FFFF);
                canvas.drawCircle(b.x, b.y, b.r, diverPaint);
                diverPaint.setStyle(Paint.Style.FILL);
                diverPaint.setColor(0x6600E5FF);
                canvas.drawCircle(b.x, b.y, b.r - 2f, diverPaint);
            } else {
                diverPaint.setStyle(Paint.Style.FILL);
                diverPaint.setColor(b.isDaveBreath ? 0x99E0F7FA : 0x35FFFFFF);
                canvas.drawCircle(b.x, b.y, b.r, diverPaint);
            }
        }

        // Realistic Marine Fishes
        for (RealisticFish f : fishes) {
            renderRealisticFish(canvas, f, now);
        }

        // Sequence 3: Active Bubble Bullets
        for (BubbleBullet bb : activeBubbles) {
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0x8800E5FF);
            canvas.drawCircle(bb.x, bb.y, bb.radius, diverPaint);
            diverPaint.setStyle(Paint.Style.STROKE);
            diverPaint.setStrokeWidth(3.5f);
            diverPaint.setColor(0xEEFFFFFF);
            canvas.drawCircle(bb.x, bb.y, bb.radius, diverPaint);
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0xEEFFFFFF);
            canvas.drawCircle(bb.x - bb.radius * 0.35f, bb.y - bb.radius * 0.35f, 4f, diverPaint);
        }

        // Sequence 3: Friendly Dolphin Bobo
        if (bobo.active || bobo.isRescuing) {
            renderFriendlyDolphin(canvas, bobo, now);
        }

        // Auto-Aim Targeting Reticle
        if (targetFish != null && harpoonState == HarpoonState.IDLE) {
            drawAimReticle(canvas, targetFish);
        }

        // Harpoon Rope & Spear
        if (harpoonState != HarpoonState.IDLE) {
            ropePaint.setColor(0xFFFFDF00);
            ropePaint.setStrokeWidth(4.5f);
            ropePaint.setStyle(Paint.Style.STROKE);
            canvas.drawLine(harpoonStartX, harpoonStartY, harpoonX, harpoonY, ropePaint);

            harpoonPaint.setColor(0xFFE0E0E0);
            harpoonPaint.setStyle(Paint.Style.FILL);
            canvas.drawCircle(harpoonX, harpoonY, 9f, harpoonPaint);
        }

        // Humanoid Scuba Dave Diver
        renderDaveDiver(canvas, now);

        // Visual Weapon-Switch Hold Ring around Dave (helps 4-year-old see long-press progress)
        if (isActionKeyDown && !actionLongPressTriggered) {
            long heldMs = now - actionKeyDownTime;
            if (heldMs > 120) {
                float progress = Math.min(1f, (heldMs - 120f) / 260f);
                diverPaint.setStyle(Paint.Style.STROKE);
                diverPaint.setStrokeWidth(7f);
                diverPaint.setColor(currentWeapon == WeaponMode.HARPOON ? 0xFF00E5FF : 0xFFFFD700);
                canvas.drawArc(diverX - 58f, diverY - 58f, diverX + 58f, diverY + 58f, -90f, 360f * progress, false, diverPaint);
                diverPaint.setStyle(Paint.Style.FILL);
            }
        }

        // Bouncing [OK] Interaction Prompt for 4-year-old kids
        renderNearbyActionPrompt(canvas, now);

        // Celebratory Burst Particles
        for (BurstParticle p : burstParticles) {
            float alpha = Math.max(0f, p.life / p.maxLife);
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(p.color);
            diverPaint.setAlpha((int) (alpha * 255));
            if (p.isStar) {
                canvas.drawCircle(p.x, p.y, p.size * alpha, diverPaint);
                diverPaint.setColor(0xFFFFFFFF);
                diverPaint.setAlpha((int) (alpha * 200));
                canvas.drawCircle(p.x, p.y, p.size * 0.45f * alpha, diverPaint);
            } else {
                canvas.drawCircle(p.x, p.y, p.size * alpha, diverPaint);
            }
            diverPaint.setAlpha(255);
        }

        // Floating FX
        for (GameFX fx : effects) {
            textPaint.setColor(fx.color);
            textPaint.setAlpha((int) (fx.alpha * 255));
            textPaint.setTextSize(fx.size);
            textPaint.setFakeBoldText(true);
            canvas.drawText(fx.text, fx.x, fx.y, textPaint);
        }
        textPaint.setAlpha(255);

        canvas.restore();

        // Deep Abyssal 160m+ Headlamp Vignette Overlay (Dave the Diver atmosphere)
        float depthMeters = Math.max(0f, (diverY - 140f) / 10f);
        if (depthMeters > 160f) {
            float darkFactor = Math.min(1f, (depthMeters - 160f) / 180f);
            float focusX = (diverX - cameraX) + facingScale * 95f;
            float focusY = (diverY - cameraY);
            float beamRadius = state.getLightRadius() * 1.45f;
            abyssOverlayPaint.setShader(new RadialGradient(
                focusX, focusY, beamRadius,
                new int[]{
                    0x0000040E,
                    Color.argb((int) (95 * darkFactor), 0, 6, 18),
                    Color.argb((int) (185 * darkFactor), 0, 4, 14)
                },
                new float[]{ 0.0f, 0.55f, 1.0f },
                Shader.TileMode.CLAMP
            ));
            canvas.drawRect(0, 0, w, h, abyssOverlayPaint);
            abyssOverlayPaint.setShader(null);
        }

        // Modern Dave the Diver TV HUD
        renderTVHUD(canvas, w, h);
    }

    private void renderNearbyActionPrompt(Canvas canvas, long now) {
        if (mountedCreature != null || bobo.isRescuing) return;

        float targetX = 0f, targetY = 0f;
        String prompt = null;
        int pillColor = 0xEE00BFA5;

        if (bobo.active && (oxygen / maxOxygen < 0.25f)) {
            targetX = bobo.x;
            targetY = bobo.y - 65f;
            prompt = "🐬 按 OK 救救我!";
            pillColor = 0xEEFF4081;
        } else {
            for (TreasureChest c : treasureChests) {
                if (!c.opened && Math.hypot(diverX - c.x, diverY - c.y) < 140f) {
                    targetX = c.x;
                    targetY = c.y - 75f;
                    prompt = "🎁 按 OK 開寶箱!";
                    pillColor = 0xEEFF9800;
                    break;
                }
            }
            if (prompt == null) {
                for (PearlClam pc : pearlClams) {
                    if (pc.hasPearl && Math.sin(pc.openCycle) > 0.35f && Math.hypot(diverX - pc.x, diverY - pc.y) < 120f) {
                        targetX = pc.x;
                        targetY = pc.y - 70f;
                        prompt = "🦪 按 OK 拿珍珠!";
                        pillColor = 0xEEAB47BC;
                        break;
                    }
                }
            }
            if (prompt == null) {
                for (RealisticFish f : fishes) {
                    if (f.isSleeping && Math.hypot(diverX - f.x, diverY - f.y) < 120f) {
                        targetX = f.x;
                        targetY = f.y - 65f;
                        prompt = "💖 按 OK 抱抱抓!";
                        pillColor = 0xEEEC407A;
                        break;
                    }
                    if (f.species == RealisticFish.Species.TURTLE && Math.hypot(diverX - f.x, diverY - f.y) < 130f) {
                        targetX = f.x;
                        targetY = f.y - 65f;
                        prompt = "🐢 按 OK 騎海龜!";
                        pillColor = 0xEE43A047;
                        break;
                    }
                    if (f.species == RealisticFish.Species.BLUE_WHALE && Math.hypot(diverX - f.x, diverY - f.y) < 180f) {
                        targetX = f.x;
                        targetY = f.y - 95f;
                        prompt = "🐋 按 OK 騎藍鯨!";
                        pillColor = 0xEE039BE5;
                        break;
                    }
                }
            }
        }

        if (prompt != null) {
            float bounce = (float) Math.sin(now / 140.0) * 7f;
            float py = targetY + bounce;
            hudPaint.setStyle(Paint.Style.FILL);
            hudPaint.setColor(pillColor);
            canvas.drawRoundRect(targetX - 115f, py - 34f, targetX + 115f, py + 14f, 24f, 24f, hudPaint);
            hudPaint.setStyle(Paint.Style.STROKE);
            hudPaint.setStrokeWidth(3f);
            hudPaint.setColor(Color.WHITE);
            canvas.drawRoundRect(targetX - 115f, py - 34f, targetX + 115f, py + 14f, 24f, 24f, hudPaint);
            hudPaint.setStyle(Paint.Style.FILL);

            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(23f);
            textPaint.setFakeBoldText(true);
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText(prompt, targetX, py - 3f, textPaint);
            textPaint.setTextAlign(Paint.Align.LEFT);
        }
    }

    // Sequence 1: Render Glowing Abyssal Crystals
    private void renderGlowingCrystal(Canvas canvas, GlowingCrystal gc, long now) {
        float pulse = 0.85f + (float) Math.sin((now / 1000.0) * gc.pulseSpeed) * 0.15f;
        float r = gc.size * pulse;

        // Glowing aura
        lightPaint.setStyle(Paint.Style.FILL);
        lightPaint.setColor(gc.color & 0x44FFFFFF);
        canvas.drawCircle(gc.x, gc.y, r * 1.8f, lightPaint);

        // Faceted crystal diamond shape
        envPaint.setColor(gc.color);
        Path crystal = new Path();
        crystal.moveTo(gc.x, gc.y - r);
        crystal.lineTo(gc.x + r * 0.6f, gc.y);
        crystal.lineTo(gc.x, gc.y + r);
        crystal.lineTo(gc.x - r * 0.6f, gc.y);
        crystal.close();
        canvas.drawPath(crystal, envPaint);

        // Highlight
        envPaint.setColor(0x88FFFFFF);
        Path highlight = new Path();
        highlight.moveTo(gc.x, gc.y - r);
        highlight.lineTo(gc.x, gc.y);
        highlight.lineTo(gc.x - r * 0.6f, gc.y);
        highlight.close();
        canvas.drawPath(highlight, envPaint);
    }

    // Sequence 2: Render Sunken Pirate Galleon Shipwreck
    private void renderSunkenShipwreck(Canvas canvas, SunkenShipwreck sw, long now) {
        // Ship Hull Base
        envPaint.setColor(0xFF3E2723); // Dark antique wood
        envPaint.setStyle(Paint.Style.FILL);

        // Broken Bow & Hull Planks
        Path hull = new Path();
        hull.moveTo(sw.x, sw.y + sw.height);
        hull.lineTo(sw.x + 60f, sw.y + 70f);
        hull.lineTo(sw.x + sw.width - 50f, sw.y + 40f);
        hull.lineTo(sw.x + sw.width, sw.y + sw.height);
        hull.close();
        canvas.drawPath(hull, envPaint);

        // Hull Plank Lines & Green Sea Moss
        envPaint.setColor(0xFF2E7D32); // Sea moss algae
        canvas.drawRoundRect(sw.x + 50f, sw.y + sw.height - 25f, sw.x + sw.width - 40f, sw.y + sw.height, 8f, 8f, envPaint);

        // Tall Broken Mast
        envPaint.setColor(0xFF4E342E);
        canvas.drawRect(sw.x + 280f, sw.y - 140f, sw.x + 300f, sw.y + 60f, envPaint);
        // Crow's Nest
        canvas.drawRoundRect(sw.x + 265f, sw.y - 160f, sw.x + 315f, sw.y - 135f, 6f, 6f, envPaint);

        // Rigging ropes
        ropePaint.setColor(0x888D6E63);
        ropePaint.setStrokeWidth(2.5f);
        canvas.drawLine(sw.x + 290f, sw.y - 140f, sw.x + 100f, sw.y + 70f, ropePaint);
        canvas.drawLine(sw.x + 290f, sw.y - 140f, sw.x + sw.width - 80f, sw.y + 50f, ropePaint);

        // Pirate Ship Helm (Wheel)
        envPaint.setColor(0xFF8D6E63);
        float hx = sw.x + 420f;
        float hy = sw.y + 20f;
        canvas.drawCircle(hx, hy, 24f, envPaint);
        envPaint.setColor(0xFF3E2723);
        canvas.drawCircle(hx, hy, 16f, envPaint);
        for (int a = 0; a < 8; a++) {
            float rad = a * 0.785f;
            canvas.drawLine(hx + (float)Math.cos(rad) * 8f, hy + (float)Math.sin(rad) * 8f,
                            hx + (float)Math.cos(rad) * 30f, hy + (float)Math.sin(rad) * 30f, envPaint);
        }

        // Heavy Pirate Iron Anchor on Seabed
        envPaint.setColor(0xFF263238);
        canvas.drawCircle(sw.x - 70f, sw.y + sw.height - 50f, 16f, envPaint);
        canvas.drawRect(sw.x - 75f, sw.y + sw.height - 40f, sw.x - 65f, sw.y + sw.height, envPaint);
        // Anchor Flukes
        Path flukes = new Path();
        flukes.moveTo(sw.x - 110f, sw.y + sw.height - 25f);
        flukes.quadTo(sw.x - 70f, sw.y + sw.height + 15f, sw.x - 30f, sw.y + sw.height - 25f);
        envPaint.setStyle(Paint.Style.STROKE);
        envPaint.setStrokeWidth(9f);
        canvas.drawPath(flukes, envPaint);
        envPaint.setStyle(Paint.Style.FILL);

        // Glowing Portholes
        lightPaint.setColor(0x8800E5FF);
        canvas.drawCircle(sw.x + 160f, sw.y + 110f, 15f, lightPaint);
        canvas.drawCircle(sw.x + 260f, sw.y + 100f, 15f, lightPaint);
        canvas.drawCircle(sw.x + 360f, sw.y + 90f, 15f, lightPaint);

        // Text banner
        textPaint.setColor(0xDDFFFFFF);
        textPaint.setTextSize(22f);
        canvas.drawText("⚓ 傳奇深海沉船 (藏有豐富秘寶)", sw.x + 170f, sw.y - 180f, textPaint);
    }

    // Sequence 2: Render Interactive Sunken Treasure Chest
    private void renderTreasureChest(Canvas canvas, TreasureChest tc, long now) {
        float dx = diverX - tc.x;
        float dy = diverY - tc.y;
        boolean inRange = (!tc.opened && Math.hypot(dx, dy) < 140f);

        // Golden focus ring when Dave approaches
        if (inRange) {
            float pulse = (float) Math.sin(now / 150.0) * 8f;
            diverPaint.setStyle(Paint.Style.STROKE);
            diverPaint.setStrokeWidth(3.5f);
            diverPaint.setColor(0xEEFFD700);
            canvas.drawCircle(tc.x, tc.y, 65f + pulse, diverPaint);
            diverPaint.setStyle(Paint.Style.FILL);

            textPaint.setColor(0xFFFFD700);
            textPaint.setTextSize(22f);
            textPaint.setFakeBoldText(true);
            canvas.drawText("🎁 按 [OK] 開啟！(+" + tc.rewardCoins + " 金幣)", tc.x - 110f, tc.y - 50f, textPaint);
        }

        // Chest Body
        envPaint.setColor(tc.opened ? 0xFF5D4037 : 0xFF8D6E63);
        envPaint.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(tc.x - 42f, tc.y - 20f, tc.x + 42f, tc.y + 24f, 8f, 8f, envPaint);

        // Brass Metal Straps
        envPaint.setColor(0xFFFFB300);
        canvas.drawRect(tc.x - 32f, tc.y - 20f, tc.x - 24f, tc.y + 24f, envPaint);
        canvas.drawRect(tc.x + 24f, tc.y - 20f, tc.x + 32f, tc.y + 24f, envPaint);

        // Chest Lid (Swings open when opened)
        float lidLift = tc.openProgress * 28f;
        canvas.save();
        canvas.translate(tc.x, tc.y - 20f);
        canvas.rotate(-tc.openProgress * 55f, -40f, 0f);
        envPaint.setColor(0xFFA1887F);
        canvas.drawRoundRect(-44f, -18f, 44f, 4f, 7f, 7f, envPaint);
        envPaint.setColor(0xFFFFB300); // Lock latch
        canvas.drawRoundRect(-8f, 0f, 8f, 10f, 3f, 3f, envPaint);
        canvas.restore();

        // Sparkling golden light fountain if open
        if (tc.opened) {
            lightPaint.setColor(0x88FFD700);
            canvas.drawCircle(tc.x, tc.y - 12f, 22f, lightPaint);
        }
    }

    // Sequence 2: Render Giant Pearl Clam
    private void renderPearlClam(Canvas canvas, PearlClam pc, long now) {
        float openRatio = (float) Math.sin(pc.openCycle); // [-1.0 to 1.0]
        float openH = Math.max(0f, openRatio) * 36f;

        // Bottom Shell
        envPaint.setColor(0xFFB0BEC5);
        Path botShell = new Path();
        botShell.moveTo(pc.x - 38f, pc.y);
        botShell.quadTo(pc.x, pc.y + 28f, pc.x + 38f, pc.y);
        botShell.close();
        canvas.drawPath(botShell, envPaint);

        // Inside fleshy mantle
        envPaint.setColor(0xFFFF80AB);
        canvas.drawOval(new RectF(pc.x - 30f, pc.y - 6f, pc.x + 30f, pc.y + 14f), envPaint);

        // Top Shell (Opens upward)
        envPaint.setColor(0xFFCFD8DC);
        Path topShell = new Path();
        topShell.moveTo(pc.x - 38f, pc.y);
        topShell.quadTo(pc.x, pc.y - openH - 24f, pc.x + 38f, pc.y);
        topShell.close();
        canvas.drawPath(topShell, envPaint);

        // Radiant Pearl inside
        if (pc.hasPearl && openH > 10f) {
            float pearlPulse = (float) Math.sin(now / 180.0) * 3f;
            lightPaint.setColor(0x66E040FB);
            canvas.drawCircle(pc.x, pc.y - 4f, 18f + pearlPulse, lightPaint);

            // Glistening pearl ball
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0xFFFFFFFF);
            canvas.drawCircle(pc.x, pc.y - 4f, 12f, diverPaint);
            diverPaint.setColor(0xFFE040FB);
            canvas.drawCircle(pc.x, pc.y - 4f, 8f, diverPaint);
            diverPaint.setColor(0xFFFFFFFF);
            canvas.drawCircle(pc.x - 3f, pc.y - 7f, 3.5f, diverPaint);

            // Proximity indicator
            if (Math.hypot(diverX - pc.x, diverY - pc.y) < 130f) {
                textPaint.setColor(0xFFE040FB);
                textPaint.setTextSize(22f);
                canvas.drawText("🦪 游近拾取大珍珠！(+90 金幣)", pc.x - 110f, pc.y - 45f, textPaint);
            }
        }
    }

    // Sequence 3: Render Friendly Dolphin Bobo
    private void renderFriendlyDolphin(Canvas canvas, FriendlyDolphin d, long now) {
        canvas.save();
        canvas.translate(d.x, d.y);
        canvas.scale(d.facing, 1.0f);

        float tailWave = (float) Math.sin(d.swimPhase) * 14f;

        // Friendly Pink/Blue Smooth Dolphin Body
        diverPaint.setStyle(Paint.Style.FILL);
        diverPaint.setColor(0xFF42A5F5); // Cheerful ocean cyan-blue
        Path dBody = new Path();
        dBody.moveTo(85f, 0); // Beak tip
        dBody.quadTo(35f, -42f, -30f, -30f);
        dBody.quadTo(-75f, -15f + tailWave * 0.5f, -110f + tailWave, 0);
        dBody.quadTo(-75f, 15f + tailWave * 0.5f, -30f, 32f);
        dBody.quadTo(35f, 40f, 85f, 0);
        dBody.close();
        canvas.drawPath(dBody, diverPaint);

        // Soft rosy underbelly
        diverPaint.setColor(0xFFFFE0B2);
        Path dBelly = new Path();
        dBelly.moveTo(70f, 0);
        dBelly.quadTo(25f, 35f, -30f, 28f);
        dBelly.lineTo(-30f, 0);
        dBelly.close();
        canvas.drawPath(dBelly, diverPaint);

        // Curved Friendly Dorsal Fin
        diverPaint.setColor(0xFF1E88E5);
        Path dDorsal = new Path();
        dDorsal.moveTo(-10f, -32f);
        dDorsal.quadTo(-35f, -75f, -45f, -70f);
        dDorsal.quadTo(-35f, -45f, -38f, -28f);
        dDorsal.close();
        canvas.drawPath(dDorsal, diverPaint);

        // Horizontal Fluke Tail
        diverPaint.setColor(0xFF1E88E5);
        Path dTail = new Path();
        dTail.moveTo(-110f + tailWave, 0);
        dTail.lineTo(-135f + tailWave, -28f);
        dTail.lineTo(-125f + tailWave, 0);
        dTail.lineTo(-135f + tailWave, 28f);
        dTail.close();
        canvas.drawPath(dTail, diverPaint);

        // Cheerful Smiling Eye & Rosy Cheek
        diverPaint.setColor(0xFFFF80AB); // Rosy blush
        canvas.drawCircle(45f, 8f, 7f, diverPaint);
        diverPaint.setColor(Color.WHITE);
        canvas.drawCircle(55f, -10f, 6.5f, diverPaint);
        diverPaint.setColor(0xFF212121);
        canvas.drawCircle(56f, -10f, 3.5f, diverPaint);
        diverPaint.setColor(Color.WHITE);
        canvas.drawCircle(57.5f, -11.5f, 1.5f, diverPaint);

        // Friendly Smile mouth
        ropePaint.setColor(0xFF1565C0);
        ropePaint.setStrokeWidth(2.5f);
        canvas.drawLine(72f, 2f, 60f, 6f, ropePaint);

        canvas.restore();
    }

    private void renderKelp(Canvas canvas, KelpPlant kp, long now, int kelpColor) {
        float wave = (float) Math.sin((now / 850.0) + kp.phaseOffset) * 36f;
        envPaint.setColor(kelpColor);
        envPaint.setStyle(Paint.Style.FILL);

        // Central Kelp Stem
        Path stem = new Path();
        stem.moveTo(kp.x - 7f, kp.baseY);
        stem.quadTo(kp.x + wave * 0.4f, kp.baseY - kp.height * 0.5f, kp.x + wave, kp.baseY - kp.height);
        stem.lineTo(kp.x + wave + 9f, kp.baseY - kp.height);
        stem.quadTo(kp.x + 9f + wave * 0.4f, kp.baseY - kp.height * 0.5f, kp.x + 9f, kp.baseY);
        stem.close();
        canvas.drawPath(stem, envPaint);

        // Branching Leaf Fronds & Golden Air Vesicles
        float stepH = kp.height / (kp.leafCount + 1);
        for (int i = 1; i <= kp.leafCount; i++) {
            float frondY = kp.baseY - (i * stepH);
            float stemX = kp.x + (wave * (float)i / kp.leafCount);
            boolean leftSide = (i % 2 == 0);
            float sideSign = leftSide ? -1f : 1f;
            float leafWave = (float) Math.sin((now / 650.0) + kp.phaseOffset + i * 0.8) * 14f;

            envPaint.setColor(0xCCFFD54F);
            canvas.drawCircle(stemX + sideSign * 7f, frondY, 5f, envPaint);

            envPaint.setColor(kelpColor);
            Path leaf = new Path();
            leaf.moveTo(stemX, frondY);
            leaf.quadTo(stemX + sideSign * 35f, frondY - 18f + leafWave * 0.5f, stemX + sideSign * 65f, frondY - 8f + leafWave);
            leaf.quadTo(stemX + sideSign * 35f, frondY + 12f + leafWave * 0.5f, stemX, frondY + 4f);
            leaf.close();
            canvas.drawPath(leaf, envPaint);
        }
    }

    private void renderCoralShelf(Canvas canvas, CoralShelf cs, long now) {
        envPaint.setColor(0xFF263238);
        envPaint.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(cs.x, cs.y, cs.x + cs.width, cs.y + 24f, 10f, 10f, envPaint);
        envPaint.setColor(0xFF37474F);
        canvas.drawRect(cs.x + 8f, cs.y + 2f, cs.x + cs.width - 8f, cs.y + 12f, envPaint);

        envPaint.setColor(cs.color);
        if (cs.coralType == 0) {
            for (float cx = cs.x + 20f; cx < cs.x + cs.width - 20f; cx += 32f) {
                Path branch = new Path();
                branch.moveTo(cx, cs.y);
                branch.lineTo(cx - 10f, cs.y - 38f);
                branch.lineTo(cx - 6f, cs.y - 42f);
                branch.lineTo(cx, cs.y - 25f);
                branch.lineTo(cx + 8f, cs.y - 44f);
                branch.lineTo(cx + 12f, cs.y - 40f);
                branch.lineTo(cx + 4f, cs.y);
                branch.close();
                canvas.drawPath(branch, envPaint);
            }
        } else if (cs.coralType == 1) {
            for (int t = 0; t < 3; t++) {
                float ty = cs.y - 12f - t * 16f;
                float tw = cs.width * (0.8f - t * 0.15f);
                float tx = cs.x + (cs.width - tw) / 2f;
                canvas.drawOval(new RectF(tx, ty - 6f, tx + tw, ty + 6f), envPaint);
            }
        } else {
            for (float cx = cs.x + 24f; cx < cs.x + cs.width - 24f; cx += 18f) {
                float wave = (float) Math.sin((now / 500.0) + cx) * 8f;
                canvas.drawLine(cx, cs.y, cx + wave, cs.y - 26f, envPaint);
                canvas.drawCircle(cx + wave, cs.y - 26f, 3.5f, envPaint);
            }
        }
    }

    private void renderRealisticFish(Canvas canvas, RealisticFish f, long now) {
        canvas.save();
        canvas.translate(f.x, f.y);
        canvas.scale(f.facing, 1.0f);

        float wave = (float) Math.sin(f.swimPhase) * 6f;
        float tailWave = (float) Math.sin(f.swimPhase - 1.2f) * 12f;

        // Sequence 3: Render Sleeping Protective Bubble
        if (f.isSleeping) {
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0x5500E5FF);
            canvas.drawCircle(0, 0, f.bubbleEncloseRadius, diverPaint);
            diverPaint.setStyle(Paint.Style.STROKE);
            diverPaint.setStrokeWidth(4f);
            diverPaint.setColor(0xEEFFFFFF);
            canvas.drawCircle(0, 0, f.bubbleEncloseRadius, diverPaint);
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0xEEFFFFFF);
            canvas.drawCircle(-f.bubbleEncloseRadius * 0.35f, -f.bubbleEncloseRadius * 0.35f, 5f, diverPaint);

            // Floating cartoon Zzz
            textPaint.setColor(0xFF00E5FF);
            textPaint.setTextSize(26f);
            textPaint.setFakeBoldText(true);
            canvas.drawText("💤 呼嚕呼嚕... (活捉 +35 金幣)", -80f, -f.bubbleEncloseRadius - 15f, textPaint);
        }

        if (f.isAttacking && !f.isSleeping) {
            textPaint.setColor(0xFFFF1744);
            textPaint.setTextSize(24f);
            textPaint.setFakeBoldText(true);
            canvas.drawText("⚠️ 獵食衝刺！", -60f, -f.bodyHeight * 1.15f, textPaint);
        }

        fishPaint.setStyle(Paint.Style.FILL);

        // Sequence 1: Deep-Sea Bioluminescent Anglerfish
        if (f.species == RealisticFish.Species.ANGLERFISH) {
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;

            // Bioluminescent Esca Lantern Glow
            float pulse = 0.85f + (float) Math.sin(now / 150.0) * 0.15f;
            float lureX = halfL * 0.95f;
            float lureY = -halfH * 1.35f;

            lightPaint.setStyle(Paint.Style.FILL);
            lightPaint.setColor(0x8800E5FF);
            canvas.drawCircle(lureX, lureY, 32f * pulse, lightPaint);
            lightPaint.setColor(0xEEFFF59D);
            canvas.drawCircle(lureX, lureY, 14f * pulse, lightPaint);

            // Illicium (Curved Fishing Rod from forehead)
            ropePaint.setColor(0xFF37474F);
            ropePaint.setStrokeWidth(4f);
            Path rod = new Path();
            rod.moveTo(halfL * 0.25f, -halfH * 0.75f);
            rod.quadTo(halfL * 0.65f, -halfH * 1.7f, lureX, lureY);
            canvas.drawPath(rod, ropePaint);

            // Round Deep-Sea Body
            fishPaint.setColor(f.primaryColor);
            canvas.drawOval(new RectF(-halfL, -halfH, halfL * 0.7f, halfH), fishPaint);

            // Cavernous Jaw
            fishPaint.setColor(0xFF1A237E);
            Path jaw = new Path();
            jaw.moveTo(halfL * 0.7f, -halfH * 0.1f);
            jaw.lineTo(halfL * 0.15f, halfH * 0.65f);
            jaw.lineTo(halfL * 0.65f, halfH * 0.75f);
            jaw.close();
            canvas.drawPath(jaw, fishPaint);

            // Translucent Sharp Fangs
            fishPaint.setColor(0xEEFFFFFF);
            for (int t = 0; t < 5; t++) {
                float tx = halfL * 0.22f + t * 9f;
                canvas.drawLine(tx, halfH * 0.2f, tx + 4f, -halfH * 0.15f, fishPaint);
                canvas.drawLine(tx + 4f, -halfH * 0.15f, tx + 8f, halfH * 0.2f, fishPaint);
            }

            // Glowing Green Abyssal Eye
            fishPaint.setColor(0xFF76FF03);
            canvas.drawCircle(halfL * 0.35f, -halfH * 0.35f, 7.5f, fishPaint);
            fishPaint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 0.36f, -halfH * 0.35f, 3.5f, fishPaint);

            // Caudal Tail Fin
            fishPaint.setColor(0xFF37474F);
            Path aTail = new Path();
            aTail.moveTo(-halfL, 0);
            aTail.lineTo(-halfL - 35f + tailWave, -22f);
            aTail.lineTo(-halfL - 25f + tailWave, 0);
            aTail.lineTo(-halfL - 35f + tailWave, 22f);
            aTail.close();
            canvas.drawPath(aTail, fishPaint);

        } else if (f.species == RealisticFish.Species.NEON_JELLYFISH) {
            // Sequence 1: Neon Bioluminescent Jellyfish
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;
            float pulse = (float) Math.sin(f.swimPhase * 1.5) * 0.18f;

            // Radiant Outer Glow
            lightPaint.setColor(0x5500E5FF);
            canvas.drawCircle(0, -halfH * 0.2f, halfL * 1.25f, lightPaint);

            // Translucent Neon Bell
            fishPaint.setColor(f.primaryColor);
            RectF dome = new RectF(-halfL * (1f + pulse), -halfH, halfL * (1f + pulse), halfH * 0.4f);
            canvas.drawArc(dome, 180f, 180f, true, fishPaint);

            // Shifting Rainbow Rim
            fishPaint.setStyle(Paint.Style.STROKE);
            fishPaint.setStrokeWidth(5f);
            fishPaint.setColor(f.secondaryColor);
            canvas.drawArc(dome, 180f, 180f, false, fishPaint);
            fishPaint.setStyle(Paint.Style.FILL);

            // Glowing Trailing Tentacles
            for (int k = -3; k <= 3; k++) {
                float tx = k * 9f;
                float tWave = (float) Math.sin(f.swimPhase * 1.2f + k * 0.7) * 16f;
                ropePaint.setColor(k % 2 == 0 ? 0xCCFF4081 : 0xCC76FF03);
                ropePaint.setStrokeWidth(3f);
                canvas.drawLine(tx, halfH * 0.2f, tx + tWave, halfH * 1.2f, ropePaint);
            }

        } else if (f.species == RealisticFish.Species.REEF_SHARK || f.species == RealisticFish.Species.GREAT_SHARK || f.species == RealisticFish.Species.BABY_SHARK) {
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;

            // Shark Body
            fishPaint.setColor(f.primaryColor);
            Path sharkBody = new Path();
            sharkBody.moveTo(halfL, 0);
            sharkBody.quadTo(halfL * 0.35f, -halfH * 1.18f, -halfL * 0.4f + wave * 0.3f, -halfH * 0.65f);
            sharkBody.quadTo(-halfL * 0.75f + wave * 0.6f, -halfH * 0.28f, -halfL + tailWave, 0);
            sharkBody.quadTo(-halfL * 0.75f + wave * 0.6f, halfH * 0.28f, -halfL * 0.4f + wave * 0.3f, halfH * 0.65f);
            sharkBody.quadTo(halfL * 0.35f, halfH * 1.18f, halfL, 0);
            sharkBody.close();
            canvas.drawPath(sharkBody, fishPaint);

            // Underbelly
            fishPaint.setColor(f.bellyColor);
            Path belly = new Path();
            belly.moveTo(halfL * 0.88f, 0);
            belly.quadTo(halfL * 0.25f, halfH * 1.05f, -halfL * 0.4f + wave * 0.3f, halfH * 0.45f);
            belly.lineTo(-halfL * 0.4f + wave * 0.3f, 0);
            belly.close();
            canvas.drawPath(belly, fishPaint);

            // Dorsal Fin
            fishPaint.setColor(f.primaryColor);
            Path dorsal = new Path();
            dorsal.moveTo(halfL * 0.12f, -halfH * 0.85f);
            dorsal.lineTo(-halfL * 0.14f, -halfH * 1.95f);
            dorsal.lineTo(-halfL * 0.02f, -halfH * 0.65f);
            dorsal.close();
            canvas.drawPath(dorsal, fishPaint);

            if (f.species == RealisticFish.Species.REEF_SHARK) {
                fishPaint.setColor(0xFF1A1A1A);
                Path dTip = new Path();
                dTip.moveTo(-halfL * 0.05f, -halfH * 1.55f);
                dTip.lineTo(-halfL * 0.14f, -halfH * 1.95f);
                dTip.lineTo(-halfL * 0.09f, -halfH * 1.45f);
                dTip.close();
                canvas.drawPath(dTip, fishPaint);
            }

            // Tail Fin
            fishPaint.setColor(f.primaryColor);
            Path tail = new Path();
            tail.moveTo(-halfL + tailWave, 0);
            tail.lineTo(-halfL * 1.38f + tailWave * 1.3f, -halfH * 1.25f);
            tail.lineTo(-halfL * 1.18f + tailWave * 1.1f, -halfH * 0.2f);
            tail.lineTo(-halfL * 1.32f + tailWave * 1.3f, halfH * 0.85f);
            tail.close();
            canvas.drawPath(tail, fishPaint);

            // Gill Slits
            fishPaint.setColor(0x88212121);
            fishPaint.setStrokeWidth(2f);
            fishPaint.setStyle(Paint.Style.STROKE);
            for (int g = 0; g < 5; g++) {
                float gx = halfL * 0.36f - g * 5f;
                canvas.drawLine(gx, -halfH * 0.22f, gx - 2.5f, halfH * 0.22f, fishPaint);
            }
            fishPaint.setStyle(Paint.Style.FILL);

            // Eye
            fishPaint.setColor(Color.WHITE);
            canvas.drawCircle(halfL * 0.72f, -halfH * 0.22f, 7f, fishPaint);
            fishPaint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 0.74f, -halfH * 0.22f, 3.8f, fishPaint);

        } else if (f.species == RealisticFish.Species.JELLYFISH) {
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;
            float pulse = (float) Math.sin(f.swimPhase * 1.5) * 0.15f;

            fishPaint.setColor(f.primaryColor);
            RectF dome = new RectF(-halfL * (1f + pulse), -halfH, halfL * (1f + pulse), halfH * 0.35f);
            canvas.drawArc(dome, 180f, 180f, true, fishPaint);

            for (int k = -2; k <= 2; k++) {
                float tx = k * 11f;
                float tWave = (float) Math.sin(f.swimPhase + k) * 12f;
                ropePaint.setColor(0x99BA68C8);
                ropePaint.setStrokeWidth(2.5f);
                canvas.drawLine(tx, halfH * 0.2f, tx + tWave, halfH * 1.1f, ropePaint);
            }

        } else if (f.species == RealisticFish.Species.TURTLE) {
            // Green Sea Turtle
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;
            fishPaint.setColor(f.primaryColor);
            canvas.drawOval(new RectF(-halfL * 0.8f, -halfH, halfL * 0.7f, halfH), fishPaint);
            fishPaint.setColor(f.secondaryColor);
            canvas.drawCircle(-halfL * 0.2f, 0, halfH * 0.45f, fishPaint);
            canvas.drawCircle(halfL * 0.25f, 0, halfH * 0.4f, fishPaint);
            fishPaint.setColor(0xFF388E3C);
            canvas.drawCircle(halfL * 0.82f, -halfH * 0.1f, 15f, fishPaint);
            fishPaint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 0.88f, -halfH * 0.15f, 3f, fishPaint);
            fishPaint.setColor(0xFF2E7D32);
            float fWave = (float) Math.sin(f.swimPhase) * 15f;
            Path frontFin = new Path();
            frontFin.moveTo(halfL * 0.2f, -halfH * 0.6f);
            frontFin.lineTo(halfL * 0.5f, -halfH * 1.8f + fWave);
            frontFin.lineTo(0f, -halfH * 0.8f);
            frontFin.close();
            canvas.drawPath(frontFin, fishPaint);
            Path rearFin = new Path();
            rearFin.moveTo(-halfL * 0.5f, -halfH * 0.5f);
            rearFin.lineTo(-halfL * 0.85f, -halfH * 1.2f - fWave);
            rearFin.lineTo(-halfL * 0.4f, -halfH * 0.4f);
            rearFin.close();
            canvas.drawPath(rearFin, fishPaint);
            if (mountedCreature == null && Math.hypot(diverX - f.x, diverY - f.y) < 130f) {
                textPaint.setColor(0xFF00E676);
                textPaint.setTextSize(22f);
                canvas.drawText("🐢 按 [OK] 騎上海龜！", -80f, -halfH * 1.3f, textPaint);
            }
        } else if (f.species == RealisticFish.Species.BLUE_WHALE) {
            // Giant Blue Whale
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;
            fishPaint.setColor(f.primaryColor);
            Path whaleBody = new Path();
            whaleBody.moveTo(halfL, 0);
            whaleBody.quadTo(halfL * 0.4f, -halfH * 1.05f, -halfL * 0.3f, -halfH * 0.6f);
            whaleBody.quadTo(-halfL * 0.7f, -halfH * 0.25f, -halfL + tailWave, 0);
            whaleBody.quadTo(-halfL * 0.7f, halfH * 0.25f, -halfL * 0.3f, halfH * 0.6f);
            whaleBody.quadTo(halfL * 0.4f, halfH * 1.05f, halfL, 0);
            whaleBody.close();
            canvas.drawPath(whaleBody, fishPaint);

            fishPaint.setColor(f.bellyColor);
            Path wBelly = new Path();
            wBelly.moveTo(halfL * 0.85f, 0);
            wBelly.quadTo(halfL * 0.25f, halfH * 0.95f, -halfL * 0.3f, halfH * 0.45f);
            wBelly.lineTo(-halfL * 0.3f, 0);
            wBelly.close();
            canvas.drawPath(wBelly, fishPaint);

            fishPaint.setColor(0x440277BD);
            fishPaint.setStrokeWidth(2.5f);
            fishPaint.setStyle(Paint.Style.STROKE);
            for (int k = 0; k < 6; k++) {
                float py = halfH * 0.2f + k * 8f;
                canvas.drawLine(halfL * 0.6f - k * 18f, py, -halfL * 0.2f, py, fishPaint);
            }
            fishPaint.setStyle(Paint.Style.FILL);

            fishPaint.setColor(f.primaryColor);
            Path wTail = new Path();
            wTail.moveTo(-halfL + tailWave, 0);
            wTail.lineTo(-halfL * 1.25f + tailWave, -halfH * 0.9f);
            wTail.lineTo(-halfL * 1.12f + tailWave, 0);
            wTail.lineTo(-halfL * 1.25f + tailWave, halfH * 0.9f);
            wTail.close();
            canvas.drawPath(wTail, fishPaint);

            fishPaint.setColor(Color.WHITE);
            canvas.drawCircle(halfL * 0.72f, -halfH * 0.2f, 6.5f, fishPaint);
            fishPaint.setColor(0xFF212121);
            canvas.drawCircle(halfL * 0.73f, -halfH * 0.2f, 3.2f, fishPaint);

            if (mountedCreature == null && Math.hypot(diverX - f.x, diverY - f.y) < 180f) {
                textPaint.setColor(0xFF40C4FF);
                textPaint.setTextSize(24f);
                canvas.drawText("🐋 按 [OK] 騎乘藍鯨！(彩虹噴水)", -110f, -halfH * 1.3f, textPaint);
            }
        } else {
            // General Coral Fish (Clownfish, Blue Tang, Yellow Tang, Tuna)
            float halfL = f.length / 2f;
            float halfH = f.bodyHeight / 2f;

            fishPaint.setColor(f.primaryColor);
            Path fishBody = new Path();
            fishBody.moveTo(halfL, 0);
            fishBody.quadTo(0, -halfH * 1.15f, -halfL * 0.6f + wave * 0.4f, -halfH * 0.3f);
            fishBody.lineTo(-halfL + tailWave, 0);
            fishBody.lineTo(-halfL * 0.6f + wave * 0.4f, halfH * 0.3f);
            fishBody.quadTo(0, halfH * 1.15f, halfL, 0);
            fishBody.close();
            canvas.drawPath(fishBody, fishPaint);

            // Tail Fin
            fishPaint.setColor(f.secondaryColor);
            Path tail = new Path();
            tail.moveTo(-halfL * 0.6f + wave * 0.4f, 0);
            tail.lineTo(-halfL * 1.25f + tailWave, -halfH * 0.7f);
            tail.lineTo(-halfL * 1.1f + tailWave, 0);
            tail.lineTo(-halfL * 1.25f + tailWave, halfH * 0.7f);
            tail.close();
            canvas.drawPath(tail, fishPaint);

            // White stripes for Clownfish
            if (f.species == RealisticFish.Species.CLOWNFISH) {
                fishPaint.setColor(Color.WHITE);
                canvas.drawRect(halfL * 0.15f, -halfH * 0.75f, halfL * 0.35f, halfH * 0.75f, fishPaint);
                canvas.drawRect(-halfL * 0.2f, -halfH * 0.6f, -halfL * 0.05f, halfH * 0.6f, fishPaint);
            }

            // Eye
            fishPaint.setColor(Color.WHITE);
            canvas.drawCircle(halfL * 0.62f, -halfH * 0.25f, 6.5f, fishPaint);
            fishPaint.setColor(Color.BLACK);
            canvas.drawCircle(halfL * 0.64f, -halfH * 0.25f, 3.2f, fishPaint);
        }

        canvas.restore();
    }

    private void renderDaveDiver(Canvas canvas, long now) {
        if (invincibleTimer > 0f && ((int)(invincibleTimer * 10f) % 2 == 0)) {
            // Draw gentle protective bubble shield even during blink frame
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0x5500E5FF);
            canvas.drawCircle(diverX, diverY, 52f, diverPaint);
            diverPaint.setStyle(Paint.Style.STROKE);
            diverPaint.setStrokeWidth(3.5f);
            diverPaint.setColor(0xCCFFFFFF);
            canvas.drawCircle(diverX, diverY, 52f, diverPaint);
            diverPaint.setStyle(Paint.Style.FILL);
            return;
        }

        canvas.save();
        canvas.translate(diverX, diverY);
        canvas.scale(facingScale, 1.0f);
        canvas.rotate((float) Math.toDegrees(diverAngle));

        // Headlamp Flashlight Light Cone
        float lightRadius = state.getLightRadius();
        lightPaint.setStyle(Paint.Style.FILL);
        lightPaint.setShader(new RadialGradient(
            45f, 0f, lightRadius,
            new int[]{ 0x77FFFDE7, 0x22FFE082, 0x00000000 },
            new float[]{ 0.0f, 0.55f, 1.0f },
            Shader.TileMode.CLAMP
        ));
        Path lightCone = new Path();
        lightCone.moveTo(42f, -8f);
        lightCone.lineTo(lightRadius, -lightRadius * 0.35f);
        lightCone.lineTo(lightRadius, lightRadius * 0.35f);
        lightCone.close();
        canvas.drawPath(lightCone, lightPaint);
        lightPaint.setShader(null);

        // Legs & Flutter kick
        float kick1 = (float) Math.sin(swimCycle) * 16f;
        float kick2 = (float) Math.sin(swimCycle + Math.PI) * 16f;

        diverPaint.setColor(0xFF003865);
        canvas.drawRoundRect(-32f, -14f + kick1 * 0.3f, -14f, -4f + kick1 * 0.3f, 4f, 4f, diverPaint);
        diverPaint.setColor(0xFFFF6D00);
        Path fin1 = new Path();
        fin1.moveTo(-32f, -9f + kick1 * 0.3f);
        fin1.lineTo(-68f, -18f + kick1);
        fin1.lineTo(-52f, -4f + kick1 * 0.5f);
        fin1.close();
        canvas.drawPath(fin1, diverPaint);

        diverPaint.setColor(0xFF004D80);
        canvas.drawRoundRect(-30f, 4f + kick2 * 0.3f, -12f, 14f + kick2 * 0.3f, 4f, 4f, diverPaint);
        diverPaint.setColor(0xFFFF8500);
        Path fin2 = new Path();
        fin2.moveTo(-30f, 9f + kick2 * 0.3f);
        fin2.lineTo(-68f, 18f + kick2);
        fin2.lineTo(-52f, 4f + kick2 * 0.5f);
        fin2.close();
        canvas.drawPath(fin2, diverPaint);

        // Scuba Twin Tanks
        diverPaint.setColor(0xFFFFD166);
        canvas.drawRoundRect(-36f, -22f, -18f, 22f, 7f, 7f, diverPaint);
        diverPaint.setColor(0xFF263238);
        canvas.drawRect(-34f, -6f, -20f, 6f, diverPaint);

        // Dave Wetsuit Torso
        diverPaint.setColor(0xFF0077BE);
        canvas.drawRoundRect(-24f, -24f, 26f, 24f, 16f, 16f, diverPaint);

        // Scuba Collar & Clear Glass Diving Helmet with Real Kid Face
        diverPaint.setColor(0xFFFFD166);
        canvas.drawRoundRect(6f, -6f, 34f, 14f, 6f, 6f, diverPaint);

        if (kidHeadBitmap != null) {
            // Soft helmet back glow
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0x3300E5FF);
            canvas.drawCircle(22f, -10f, 36f, diverPaint);

            // Real kid portrait (100% opaque!)
            diverPaint.setColor(Color.WHITE);
            diverPaint.setAlpha(255);
            canvas.drawBitmap(kidHeadBitmap, null, kidHeadRect, diverPaint);

            // Crystal-clear scuba helmet glass dome & highlight
            diverPaint.setStyle(Paint.Style.STROKE);
            diverPaint.setStrokeWidth(3.5f);
            diverPaint.setColor(0xDD80DEEA);
            canvas.drawCircle(22f, -10f, 36f, diverPaint);
            diverPaint.setStyle(Paint.Style.FILL);
            diverPaint.setColor(0x66FFFFFF);
            canvas.drawCircle(9f, -29f, 5.5f, diverPaint);

            // Mini headlamp on top of helmet
            diverPaint.setColor(0xFFFFD166);
            canvas.drawRoundRect(18f, -50f, 32f, -42f, 4f, 4f, diverPaint);
            diverPaint.setColor(0xFFFFF59D);
            canvas.drawCircle(32f, -46f, 4.5f, diverPaint);
        } else {
            diverPaint.setColor(0xFF003865);
            canvas.drawCircle(18f, -2f, 18f, diverPaint);
            diverPaint.setColor(0xFFFFD166);
            canvas.drawRoundRect(14f, -14f, 36f, 10f, 6f, 6f, diverPaint);
            diverPaint.setColor(0xFF00E5FF);
            canvas.drawCircle(25f, -2f, 7f, diverPaint);
            diverPaint.setColor(Color.WHITE);
            canvas.drawCircle(23f, -4f, 2.5f, diverPaint);
        }

        // Weapon in hand: Harpoon, Bubble Gun, or Camera
        if (currentWeapon == WeaponMode.HARPOON) {
            diverPaint.setColor(0xFF455A64);
            canvas.drawRoundRect(18f, 5f, 55f, 14f, 3f, 3f, diverPaint);
            diverPaint.setColor(0xFFB0BEC5);
            canvas.drawRect(52f, 7f, 64f, 12f, diverPaint);
        } else if (currentWeapon == WeaponMode.BUBBLE_GUN) {
            // Cute Bubble Gun (Bright cyan/pink water blaster)
            diverPaint.setColor(0xFF00E5FF);
            canvas.drawRoundRect(18f, 3f, 52f, 15f, 5f, 5f, diverPaint);
            diverPaint.setColor(0xFFFF4081);
            canvas.drawCircle(46f, 9f, 6f, diverPaint);
        } else {
            // Cute Underwater Camera
            diverPaint.setColor(0xFFFFD166);
            canvas.drawRoundRect(18f, 2f, 52f, 18f, 4f, 4f, diverPaint);
            diverPaint.setColor(0xFF263238); // Lens
            canvas.drawCircle(35f, 10f, 6.5f, diverPaint);
            diverPaint.setColor(0xFF00E5FF);
            canvas.drawCircle(35f, 10f, 3.5f, diverPaint);
        }

        if (mountedCreature != null) {
            textPaint.setColor(0xFFFFD700);
            textPaint.setTextSize(20f);
            canvas.drawText("🏇 騎乘中", -30f, -38f, textPaint);
        }

        canvas.restore();
    }

    private void drawAimReticle(Canvas canvas, RealisticFish target) {
        int reticleColor = (currentWeapon == WeaponMode.HARPOON ? 0xFFFFD700 : 0xFF00E5FF);
        ropePaint.setColor(reticleColor & 0x88FFFFFF);
        ropePaint.setStrokeWidth(2.5f);
        canvas.drawLine(diverX + (targetFacingScale > 0 ? 50f : -50f), diverY + 8f, target.x, target.y, ropePaint);

        harpoonPaint.setStyle(Paint.Style.STROKE);
        harpoonPaint.setColor(reticleColor);
        harpoonPaint.setStrokeWidth(3.5f);
        float r = target.bodyHeight * 0.75f;
        canvas.drawCircle(target.x, target.y, r, harpoonPaint);

        canvas.drawLine(target.x - r - 12f, target.y, target.x - r + 8f, target.y, harpoonPaint);
        canvas.drawLine(target.x + r - 8f, target.y, target.x + r + 12f, target.y, harpoonPaint);
        canvas.drawLine(target.x, target.y - r - 12f, target.x, target.y - r + 8f, harpoonPaint);
        canvas.drawLine(target.x, target.y + r - 8f, target.x, target.y + r + 12f, harpoonPaint);

        textPaint.setColor(reticleColor);
        textPaint.setTextSize(22f);
        String actionPrompt = (currentWeapon == WeaponMode.HARPOON) ? "🎯 鎖定 [按 OK 發射魚叉]" : "🫧 鎖定 [按 OK 發射催眠氣泡]";
        canvas.drawText(actionPrompt, target.x - 70f, target.y - r - 16f, textPaint);
    }

    private void renderTVHUD(Canvas canvas, int w, int h) {
        // Gentle Warm Orange Bump Flash (kid-friendly)
        if (hurtFlashTimer > 0f) {
            hudPaint.setColor(0x2AFFAB40);
            canvas.drawRect(0, 0, w, h, hudPaint);
        }

        float oxPercent = Math.max(0f, oxygen / maxOxygen);

        // Low O2 Pulsing Warning Vignette + Dolphin Rescue Visual Badge
        if (oxPercent < 0.25f && !bobo.isRescuing && mountedCreature == null) {
            int pulseAlpha = (int)(45 + Math.sin(SystemClock.uptimeMillis() / 150.0) * 35);
            hudPaint.setColor(Color.argb(pulseAlpha, 255, 82, 82));
            canvas.drawRect(0, 0, w, 14, hudPaint);
            canvas.drawRect(0, h - 14, w, h, hudPaint);
            canvas.drawRect(0, 0, 14, h, hudPaint);
            canvas.drawRect(w - 14, 0, w, h, hudPaint);

            // Sequence 3: Big Friendly Dolphin Rescue Alert Banner!
            hudPaint.setColor(0xEEFF4081);
            canvas.drawRoundRect(w * 0.25f, 15f, w * 0.75f, 75f, 16f, 16f, hudPaint);

            float badgePulse = 1.0f + 0.14f * (float) Math.sin(SystemClock.uptimeMillis() / 130.0);
            hudPaint.setColor(0xFF00E5FF);
            canvas.drawCircle(w * 0.25f + 36f, 45f, 22f * badgePulse, hudPaint);
            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(26f);
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("🐬", w * 0.25f + 36f, 54f, textPaint);

            textPaint.setTextSize(24f);
            textPaint.setFakeBoldText(true);
            canvas.drawText("按 OK 呼叫海豚波波救援！", w / 2f + 16f, 52f, textPaint);
            textPaint.setTextAlign(Paint.Align.LEFT);
        }

        // Top Left: Big O2 Gauge with Kid Portrait & Circular O2 Ring
        hudPaint.setStyle(Paint.Style.FILL);
        hudPaint.setColor(0xDD001428);
        canvas.drawRoundRect(26f, 20f, 445f, 114f, 22f, 22f, hudPaint);

        int oxColor = oxPercent > 0.5f ? 0xFF00E676 : (oxPercent > 0.25f ? 0xFFFFD166 : 0xFFFF1744);

        // Circular Kid Avatar + O2 Ring
        float avCx = 74f, avCy = 67f, avR = 39f;
        hudPaint.setColor(0xFF00284D);
        canvas.drawCircle(avCx, avCy, avR, hudPaint);
        if (kidHeadBitmap != null) {
            hudPaint.setColor(Color.WHITE);
            hudPaint.setAlpha(255);
            canvas.drawBitmap(kidHeadBitmap, null, hudAvatarRect, hudPaint);
        }
        // Background track ring
        hudPaint.setStyle(Paint.Style.STROKE);
        hudPaint.setStrokeWidth(6f);
        hudPaint.setColor(0x40FFFFFF);
        canvas.drawCircle(avCx, avCy, avR, hudPaint);
        // Active O2 sweep ring
        hudPaint.setColor(oxColor);
        canvas.drawArc(avCx - avR, avCy - avR, avCx + avR, avCy + avR, -90f, 360f * oxPercent, false, hudPaint);
        hudPaint.setStyle(Paint.Style.FILL);

        // Horizontal O2 Bar beside avatar
        hudPaint.setColor(0x40FFFFFF);
        canvas.drawRoundRect(128f, 66f, 425f, 94f, 10f, 10f, hudPaint);
        hudPaint.setColor(oxColor);
        canvas.drawRoundRect(128f, 66f, 128f + 297f * oxPercent, 94f, 10f, 10f, hudPaint);

        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(21f);
        textPaint.setFakeBoldText(true);
        if (mountedCreature != null) {
            textPaint.setColor(0xFF00E676);
            canvas.drawText("🏇 騎乘漫遊中 💖", 128f, 56f, textPaint);
        } else if (oxPercent < 0.25f) {
            textPaint.setColor(0xFFFF5252);
            canvas.drawText("⚠️ 氧氣低: " + (int)(oxPercent * 100) + "%", 128f, 56f, textPaint);
        } else {
            canvas.drawText("🤿 O₂ 氧氣: " + (int)(oxPercent * 100) + "%", 128f, 56f, textPaint);
        }

        // Top Center: 4-Year-Old Friendly Dual-Icon Weapon Switcher
        hudPaint.setColor(0xDD001D3D);
        canvas.drawRoundRect(w / 2f - 190f, 22f, w / 2f + 190f, 96f, 22f, 22f, hudPaint);

        boolean isHarpoon = (currentWeapon == WeaponMode.HARPOON);
        // Harpoon Pill
        hudPaint.setColor(isHarpoon ? 0xFFFFB300 : 0x33FFFFFF);
        canvas.drawRoundRect(w / 2f - 178f, 30f, w / 2f - 6f, 88f, 16f, 16f, hudPaint);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(23f);
        textPaint.setColor(isHarpoon ? 0xFF001428 : 0xAAFFFFFF);
        canvas.drawText("🎯 魚叉", w / 2f - 92f, 67f, textPaint);

        // Bubble Gun Pill
        hudPaint.setColor(!isHarpoon ? 0xFF00B8D4 : 0x33FFFFFF);
        canvas.drawRoundRect(w / 2f + 6f, 30f, w / 2f + 178f, 88f, 16f, 16f, hudPaint);
        textPaint.setColor(!isHarpoon ? Color.WHITE : 0xAAFFFFFF);
        canvas.drawText("🫧 泡泡", w / 2f + 92f, 67f, textPaint);
        textPaint.setTextAlign(Paint.Align.LEFT);

        // Top Right: Water Depth & Realtime Coins
        hudPaint.setColor(0xCC001428);
        canvas.drawRoundRect(w - 440f, 25f, w - 40f, 110f, 16f, 16f, hudPaint);

        int depthMeters = (int) Math.max(0, (diverY - 140f) / 10f);
        String zone;
        if (depthMeters < 75) zone = "(陽光珊瑚礁)";
        else if (depthMeters < 200) zone = "(中層巨藻林)";
        else if (depthMeters < 340) zone = "(沉船海溝)";
        else zone = "(深淵發光洞穴)";

        textPaint.setColor(0xFF48CAE4);
        textPaint.setTextSize(20f);
        canvas.drawText("🌊 水深: " + depthMeters + " 米 " + zone, w - 420f, 58f, textPaint);

        textPaint.setColor(0xFFFFD700);
        canvas.drawText("💰 金幣: " + state.coins + " 貝殼金幣", w - 420f, 92f, textPaint);

        // Top-Right Touch Button: Return to Shop / Boat
        hudPaint.setStyle(Paint.Style.FILL);
        hudPaint.setColor(0xDD003865);
        canvas.drawRoundRect(w - 200f, 122f, w - 40f, 174f, 20f, 20f, hudPaint);
        hudPaint.setStyle(Paint.Style.STROKE);
        hudPaint.setStrokeWidth(2.5f);
        hudPaint.setColor(0xAA48CAE4);
        canvas.drawRoundRect(w - 200f, 122f, w - 40f, 174f, 20f, 20f, hudPaint);
        hudPaint.setStyle(Paint.Style.FILL);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(21f);
        textPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("🏠 商店", w - 120f, 156f, textPaint);

        // Pad / Touch Controls: Left Virtual Joystick
        float jx = isTouchJoystickActive ? joystickOriginX : 145f;
        float jy = isTouchJoystickActive ? joystickOriginY : h - 145f;
        float kx = isTouchJoystickActive ? joystickKnobX : 145f;
        float ky = isTouchJoystickActive ? joystickKnobY : h - 145f;

        hudPaint.setStyle(Paint.Style.FILL);
        hudPaint.setColor(isTouchJoystickActive ? 0x4400E5FF : 0x26FFFFFF);
        canvas.drawCircle(jx, jy, JOYSTICK_RADIUS, hudPaint);
        hudPaint.setStyle(Paint.Style.STROKE);
        hudPaint.setStrokeWidth(3f);
        hudPaint.setColor(isTouchJoystickActive ? 0xCC00E5FF : 0x66FFFFFF);
        canvas.drawCircle(jx, jy, JOYSTICK_RADIUS, hudPaint);
        hudPaint.setStyle(Paint.Style.FILL);
        hudPaint.setColor(isTouchJoystickActive ? 0xEE00E5FF : 0x88FFFFFF);
        canvas.drawCircle(kx, ky, 38f, hudPaint);

        // Pad / Touch Controls: Bottom-Right Big Action & Switch Buttons
        float actCx = w - 125f;
        float actCy = h - 135f;
        float actR = isTouchActionPressed ? 64f : 72f;
        hudPaint.setColor(isHarpoon ? 0xDDFFB300 : 0xDD00B8D4);
        canvas.drawCircle(actCx, actCy, actR, hudPaint);
        hudPaint.setStyle(Paint.Style.STROKE);
        hudPaint.setStrokeWidth(4f);
        hudPaint.setColor(Color.WHITE);
        canvas.drawCircle(actCx, actCy, actR, hudPaint);
        hudPaint.setStyle(Paint.Style.FILL);
        textPaint.setTextSize(42f);
        canvas.drawText(isHarpoon ? "🎯" : "🫧", actCx, actCy + 14f, textPaint);

        float swCx = w - 260f;
        float swCy = h - 105f;
        hudPaint.setColor(0xCC002244);
        canvas.drawCircle(swCx, swCy, 46f, hudPaint);
        hudPaint.setStyle(Paint.Style.STROKE);
        hudPaint.setStrokeWidth(3f);
        hudPaint.setColor(0xAA48CAE4);
        canvas.drawCircle(swCx, swCy, 46f, hudPaint);
        hudPaint.setStyle(Paint.Style.FILL);
        textPaint.setTextSize(30f);
        canvas.drawText("🔄", swCx, swCy + 10f, textPaint);

        // Bottom Remote Guide (Icon-First for 4-year-old kids)
        hudPaint.setColor(0xD8001226);
        canvas.drawRoundRect(w * 0.22f, h - 64f, w * 0.78f, h - 14f, 24f, 24f, hudPaint);

        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(20f);
        textPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("🕹️ 左手拖曳游動   •   🎯 右手點擊互動/捕魚", w / 2f, h - 32f, textPaint);
        textPaint.setTextAlign(Paint.Align.LEFT);
    }
}
