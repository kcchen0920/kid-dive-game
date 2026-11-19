# Kid Adviser Gatekeeper Rule (`kid-dive-game`)

When developing or optimizing `kid-dive-game`, **always** use a read-only `kid-adviser` subagent to evaluate any proposed optimization, new feature, or UX/visual change **before** implementing it.

## `kid-adviser` Evaluation Checklist
1. **Child-Friendly UX & Safety**:
   - Ensure accidental-tap protection (e.g., shop double-tap guard, appropriate touch zones).
   - No jarring or rapid-blinking visuals (e.g., keep shields/glows calm and non-blinking).
   - Pre-reader friendly: prefer clear icons and visual cues over long text.
2. **Game Feel & Visual Consistency**:
   - Preserve Q-version chibi proportions, touch ripples, and cohesive underwater style.
   - Maintain clear foreground/background contrast so hazards and collectibles are unmistakable.
3. **Android Performance & Code Quality**:
   - Avoid per-frame object allocations (`Path`, `Paint`, `RadialGradient`, etc.) inside `onDraw`.
   - Respect Android lifecycle (`onPause` / `onResume`) and avoid `System.exit(0)`.

## Workflow
1. Define/invoke `kid-adviser` (read-only) with the proposed change.
2. Wait for `kid-adviser` to return **APPROVED** (or **APPROVED WITH CONDITIONS**).
3. Only proceed to code implementation after approval, and verify with `.\gradlew.bat test` or `.\gradlew.bat assembleDebug` (or browser/JS check for `web/`).
4. **Mandatory Git Sync**: After every modification and verification, commit and push changes to `origin/main` (`git push origin main`) so the GitHub Pages deployment stays in sync.
