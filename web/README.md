# Assignment 02 — Web Mario

**Student ID:** 113062137  
**Course:** CS2410 Software Studio  
**Platform:** HTML5 Canvas (pure JavaScript)

---

## Completed Items

### Complete Game Process (5%)
- [x] Start menu with title screen (Super Mario Bros. assets)
- [x] Level select screen (WORLD 1-1)
- [x] Game view with HUD (score, coins, timer, lives, world)
- [x] Game Over screen
- [x] Level Clear / Course Clear screen
- [x] Game state management: Menu → Level Select → Playing → Death/Clear → Game Over

### Basic Rules (50%)

#### World Map (10%)
- [x] Physics engine with gravity, velocity, AABB collision detection
- [x] All objects fall due to gravity; collision prevents overlap
- [x] Background scrolls; camera follows player horizontally
- [x] 1 world map (WORLD 1-1 inspired, 210 tiles wide)

#### Level Design (5%)
- [x] Static walls (solid tile boundary and platform blocks)
- [x] Question blocks that interact with player (bump from below)

#### Player (15%)
- [x] Player has correct physics (gravity, velocity, ground collision)
- [x] Keyboard control: Arrow keys / WASD to move, Space/W/Up to jump
- [x] Taking damage from enemies decreases life (or shrinks if big)
- [x] Falling into pit decreases life
- [x] Player respawns at initial position after death

#### Enemies (15%)
- [x] Goomba: walks back and forth with physics, turns at obstacles
- [x] Koopa Turtle: walks and enters shell when stomped
- [x] Enemies have correct physics (gravity, ground collision)
- [x] **Only stomping on head kills enemies** (touching from side hurts player)

#### Question Blocks (5%)
- [x] Super Mushroom: makes Mario grow big
- [x] Coin blocks: award coins + score
- [x] Star blocks: temporary invincibility
- [x] Blocks turn into "used" state after being hit

### Animations (10%)
- [x] Player: idle, walk (3-frame cycle), jump animation
- [x] Player: skid animation when braking
- [x] Big Mario: separate animation set when powered up
- [x] Goomba walk animation (2-frame cycle)
- [x] Goomba squish animation on death
- [x] Turtle walk and shell animations

### Sound Effects (10%)
- [x] BGM: bgm_1.mp3 (gameplay), bgm_2.mp3 (menus)
- [x] Jump sound (jump.wav)
- [x] Player die sound (loseOneLife.wav)
- [x] Game Over music (Game Over.mp3)
- [x] Enemy stomp (stomp.wav)
- [x] Power-up appear (powerUpAppear.wav)
- [x] Power-up collect (PowerUp.mp3)
- [x] Coin collect (coin.wav)
- [x] Level clear (levelClear.mp3)
- [x] Power down / shrink (powerDown.wav)
- [x] BGM does not stop when SFX play
- [x] Mute toggle with M key

### UI (10%)
- [x] Player lives displayed (LIVES x N)
- [x] Player score displayed (6-digit format)
- [x] Coin count displayed (COINS xNN)
- [x] Countdown timer displayed (TIME NNN, turns red under 100)
- [x] World indicator (WORLD 1-1)

### Appearance (10%)
- [x] All sprites from provided AS2_source assets (mario_small.png, mario_big.png, Goomba.png, Turtle.png, items.png, tiles.png)
- [x] Sky gradient background
- [x] Decorative clouds
- [x] Pixel-art rendering (image-rendering: pixelated)
- [x] Animated question blocks
- [x] Green pipe sections

### Git (5%)
- [x] Git version control used with regular commits

---

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Move left/right |
| ↑ / W / Space | Jump |
| Shift | Run faster |
| P / Escape | Pause |
| M | Toggle mute |

---

## Game Mechanics

- **Small Mario**: Can jump on enemies and hit question blocks
- **Big Mario**: Breaks brick blocks, shrinks to small when hit (instead of dying)
- **Invincibility**: Brief invincibility frames after getting hit (flashing)
- **Mushroom**: Grow from small to big Mario
- **Star**: Temporary invincibility — kills enemies on contact
- **Score**: Stomp Goomba = 100pts, Stomp Turtle = 100/200pts, Coin = 200pts, Mushroom = 1000pts
- **Timer**: Bonus points for remaining time on level clear (50pts × seconds)

---

## Technical Stack

- **Rendering**: HTML5 Canvas API (no game framework)
- **Physics**: Custom AABB collision detection
- **Assets**: Cocos Creator plist sprite sheets parsed at runtime
- **Audio**: Web Audio API (HTML Audio elements)
- **Architecture**: Scene manager, entity components, tilemap system

---

## File Structure

```
web/
├── index.html          # Entry point
├── README.md           # This file
├── js/
│   ├── config.js       # Constants, sprite names, animation sequences
│   ├── loader.js       # Asset loading + plist parser
│   ├── spritesheet.js  # Sprite rendering from sheets
│   ├── audio.js        # BGM and SFX management
│   ├── physics.js      # AABB collision detection
│   ├── entities.js     # Player, enemies, items, blocks
│   ├── level.js        # Level data (World 1-1) + tilemap
│   ├── hud.js          # HUD rendering (score, lives, timer)
│   ├── scenes.js       # All game scenes + scene manager
│   └── main.js         # Game loop entry point
└── assets/
    ├── audio/          # BGM and SFX files
    └── images/         # Sprite sheets and images
```
