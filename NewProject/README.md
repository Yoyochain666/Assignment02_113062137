# NewProject — Cocos Creator 2.4.8 Mario

## How to Open & Build

1. Open **Cocos Dashboard** → "Open Project" → select the `NewProject/` folder
2. Creator will auto-compile scripts and generate asset metadata on first open
3. In the editor, set the **Start Scene** to `assets/scenes/main.fire`
   - Menu → Project → Project Settings → Start Scene → select `main`
4. Press **Ctrl+P** to preview in browser, or **Menu → Project → Build** to build for **Web Desktop**

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Move |
| ↑ / W / Space | Jump |
| Shift | Run |
| P / Escape | Pause |
| M | Toggle mute |

## Architecture

All game logic lives in `assets/scripts/`:

| File | Purpose |
|------|---------|
| Config.js | Constants (gravity, speed, tile types, animation frames) |
| SpriteLib.js | Sprite atlas registry — `SPR.getFrame(name)` |
| AudioMgr.js | BGM/SFX via `cc.audioEngine` |
| Physics.js | AABB overlap + resolution |
| LevelData.js | World 1-1 tilemap data + enemy positions |
| Entities.js | Player, Goomba, Turtle, QuestionBlock, BrickBlock, Mushroom, StarItem, ScorePopup |
| GameLevel.js | cc.Component — tilemap rendering + collision + entity management |
| HUD.js | cc.Component — score/coins/timer/lives labels |
| Game.js | cc.Component — master game controller, state machine |
| Bootstrap.js | cc.Component — asset loading entry point (attached to scene) |
