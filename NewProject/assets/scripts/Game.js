/* Master game controller CC component.
   Manages: game state machine, player, level, HUD, scene overlays. */

window.Game = cc.Class({
    extends: cc.Component,

    // ── lifecycle ─────────────────────────────────────────────────────────
    onLoad: function() {
        // state: LOADING | MENU | LEVEL_SELECT | PLAYING | PAUSED | DEAD | GAME_OVER | LEVEL_CLEAR
        this._state     = 'LOADING';
        this._starBgmActive = false;
        this._selectedLevel = 1;
        this._levelLabels = null;
        this._score     = 0;
        this._coins     = 0;
        this._lives     = CFG.LIVES;
        this._time      = CFG.TIMER;
        this._timerOn   = false;
        this._deadTimer = 0;
        this._paused    = false;
        this._camX      = 0;
        this._minCamX   = 0;
        this._keys      = {};
        this._level     = null;
        this._player    = null;
        this._hud       = null;
        this._worldNode = null;
        this._overlayNode = null;
        this._bgNode    = null;

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
    },

    onDestroy: function() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
    },

    _onKeyDown: function(e) {
        this._keys[e.keyCode] = true;
        var K = cc.macro.KEY;
        if (e.keyCode === K.m) AudioMgr.toggleMute();
        if (e.keyCode === K.p || e.keyCode === K.escape) this._togglePause();
        if (this._state === 'MENU') {
            if (e.keyCode === K.space || e.keyCode === K.enter) this._showLevelSelect();
        } else if (this._state === 'GAME_OVER' || this._state === 'LEVEL_CLEAR') {
            if (e.keyCode === K.space || e.keyCode === K.enter) this._showMenu();
        }
    },
    _onKeyUp: function(e) { this._keys[e.keyCode] = false; },

    // ── public: called by Bootstrap after assets loaded ───────────────────
    startMenu: function(canvasNode) {
        this._canvasNode = canvasNode;
        this._buildOverlay(canvasNode);
        this._buildBackground(canvasNode);
        this._buildHUD(canvasNode);
        this._showMenu();
    },

    // ── background / sky ──────────────────────────────────────────────────
    _buildBackground: function(canvasNode) {
        // ── Layer 3a: gradient sky (Graphics; doesn't scroll)
        var sky = new cc.Node('sky');
        sky.anchorX = 0.5; sky.anchorY = 0.5;
        sky.x = 0; sky.y = 0;
        var g = sky.addComponent(cc.Graphics);
        var W = 4000, H = 3000;
        var steps = 20;
        var top    = [120, 200, 255];   // light sky
        var bottom = [40,  100, 200];   // deep blue
        var stripH = H / steps;
        for (var i = 0; i < steps; i++) {
            var t = i / (steps - 1);
            var r = Math.floor(top[0] + (bottom[0] - top[0]) * t);
            var gg = Math.floor(top[1] + (bottom[1] - top[1]) * t);
            var b = Math.floor(top[2] + (bottom[2] - top[2]) * t);
            g.fillColor = cc.color(r, gg, b);
            var y = H / 2 - (i + 1) * stripH;
            g.rect(-W/2, y, W, stripH + 1);
            g.fill();
        }
        canvasNode.addChild(sky, -20);
        this._bgNode = sky;

        // ── Layer 3b: cloud parallax (scrolls at 0.3x camera)
        var clouds = new cc.Node('clouds');
        clouds.anchorX = 0; clouds.anchorY = 1;
        clouds.x = -CFG.W / 2;
        clouds.y = CFG.H / 2 - CFG.HUD_H;
        canvasNode.addChild(clouds, -10);
        this._cloudLayer = clouds;

        // ── Distant rounded mountain ridge near horizon ──
        // clouds layer is at canvas (-640, 288). Bottom of game area is at
        // canvas y = -CFG.H/2 = -360, which in clouds-local is -648.
        // Put ridge bottom near the ground (canvas y ~ -296 = clouds-local -584).
        var ridge = new cc.Node('ridge');
        ridge.anchorX = 0; ridge.anchorY = 0;
        ridge.x = 0; ridge.y = -584;
        var ridgeG = ridge.addComponent(cc.Graphics);
        clouds.addChild(ridge);
        var seedR = 7919;
        function rndR() { seedR = (seedR * 9301 + 49297) % 233280; return seedR / 233280; }
        // Three layers, back→front, deepest blue tucked at the back
        var ridgeColors = [
            cc.color( 80, 140, 190),   // back / deepest
            cc.color(110, 160, 205),
            cc.color(140, 185, 220),   // front / lightest
        ];
        var ridgeWidth = 7000;
        var BOTTOM = -1000;     // far below visible area to cover pits
        function roundedHill(g, x, w, h) {
            var bodyH = Math.max(0, h - w / 2);
            var cx = x + w / 2;
            g.moveTo(x, BOTTOM);
            g.lineTo(x, bodyH);
            g.arc(cx, bodyH, w / 2, Math.PI, 0, false);
            g.lineTo(x + w, BOTTOM);
            g.close();
            g.fill();
        }
        for (var L = 0; L < ridgeColors.length; L++) {
            ridgeG.fillColor = ridgeColors[L];
            var x = -50;
            while (x < ridgeWidth) {
                var w = 80 + Math.floor(rndR() * 80);                  // 80–160 wide
                var h = 30 + Math.floor(rndR() * (60 + (2-L)*40));     // back layer taller
                roundedHill(ridgeG, x, w, h);
                x += Math.floor(w * 0.55) + Math.floor(rndR() * 10);   // overlap by ~45%
            }
        }

        var cloudFrame = SPR.getFrame('cloud') || SPR.getFrame('cloud.png');
        // deterministic pseudo-random (seeded) so layout stays stable between frames
        var seed = 12345;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        var totalW = 6500;
        var x = 30;
        while (x < totalW) {
            var y = 20 + rnd() * 200;          // y between 20 and 220
            var sz = 0.65 + rnd() * 0.9;        // scale 0.65x ~ 1.55x
            var w = Math.floor(96 * sz);
            var h = Math.floor(32 * sz);
            var c = new cc.Node('cloud');
            c.anchorX = 0; c.anchorY = 1;
            c.x = x; c.y = -y;
            c.width = w; c.height = h;
            c.opacity = 180 + Math.floor(rnd() * 75);   // 180~255 alpha
            var s = c.addComponent(cc.Sprite);
            s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            s.trim = false;
            if (cloudFrame) s.spriteFrame = cloudFrame;
            clouds.addChild(c);
            x += 120 + Math.floor(rnd() * 280);   // gap 120-400 px
        }
    },

    _setBgColor: function(r, g, b) {
        // gradient is fixed; just toggle cloud visibility for menu vs game
        if (this._cloudLayer) {
            this._cloudLayer.active = (r === 92 && g === 148 && b === 252);
        }
    },

    // ── HUD ───────────────────────────────────────────────────────────────
    _buildHUD: function(canvasNode) {
        var hudNode = new cc.Node('hud');
        canvasNode.addChild(hudNode, 100);
        var hud = hudNode.addComponent(HUD);
        hud.init(canvasNode);
        this._hud = hud;
    },

    // ── overlay (menus/screens) ───────────────────────────────────────────
    _buildOverlay: function(canvasNode) {
        var ov = new cc.Node('overlay');
        ov.anchorX = 0.5; ov.anchorY = 0.5;
        ov.x = 0; ov.y = 0;
        ov.width = CFG.W; ov.height = CFG.H;
        canvasNode.addChild(ov, 50);
        this._overlayNode = ov;
    },

    _clearOverlay: function() {
        this._overlayNode.destroyAllChildren();
        this._overlayNode.removeAllChildren();
    },

    _makeLabel: function(parent, text, y, size, color) {
        var n = new cc.Node();
        n.anchorX = 0.5; n.anchorY = 0.5;
        n.x = 0; n.y = y;
        var lbl = n.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = size || 24;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        n.color = color || cc.Color.WHITE;
        parent.addChild(n);
        return lbl;
    },

    _makeButton: function(parent, text, y, cb) {
        var n = new cc.Node();
        n.anchorX = 0.5; n.anchorY = 0.5;
        n.x = 0; n.y = y;
        n.width = 200; n.height = 40;
        n.color = cc.color(60,60,180);
        var lbl = n.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = 20;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        n.color = cc.color(60, 60, 180);
        var btn = n.addComponent(cc.Button);
        btn.normalColor = cc.color(60, 60, 180);
        btn.hoverColor  = cc.color(80, 80, 220);
        btn.pressedColor = cc.color(40, 40, 140);
        n.on(cc.Node.EventType.TOUCH_END, cb, this);
        parent.addChild(n);
        return n;
    },

    // ── MENU screen ───────────────────────────────────────────────────────
    _showMenu: function() {
        this._state = 'MENU';
        this._clearOverlay();
        this._clearWorld();
        this._setBgColor(0, 0, 0);

        // menu background image
        var bg = new cc.Node('menubg');
        bg.anchorX = 0.5; bg.anchorY = 0.5;
        bg.x = 0; bg.y = 0;
        bg.width = 1280; bg.height = 720;
        var spr = bg.addComponent(cc.Sprite);
        spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        spr.trim = false;
        var bgFrame = SPR.getFrame('menu_bg') || SPR.getFrame('menu_bg.png');
        if (bgFrame) spr.spriteFrame = bgFrame;
        this._overlayNode.addChild(bg, -5);

        var title0 = new cc.Node('t0');
        title0.anchorX = 0.5; title0.anchorY = 0.5;
        title0.x = 0; title0.y = 80;
        title0.width = 320; title0.height = 80;
        var s0 = title0.addComponent(cc.Sprite);
        s0.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        s0.trim = false;
        var f0 = SPR.getFrame('title_0') || SPR.getFrame('title_0.png');
        if (f0) s0.spriteFrame = f0;
        this._overlayNode.addChild(title0);

        this._makeLabel(this._overlayNode, 'SUPER MARIO BROS', 40, 28, cc.Color.WHITE);
        this._makeLabel(this._overlayNode, 'Press SPACE to Start', -40, 18, cc.color(200,200,200));
        this._makeLabel(this._overlayNode, '← → / A D  Move    ↑ / W / Space  Jump', -90, 14, cc.color(180,180,180));
        this._makeLabel(this._overlayNode, 'Shift: Run    P: Pause    M: Mute', -115, 14, cc.color(180,180,180));

        AudioMgr.playBGM('bgm2');
        this._hud.setVisible(false);
        this._hud.refresh(0,0,this._lives,CFG.TIMER,AudioMgr.isMuted(),'');
    },

    // ── LEVEL SELECT screen ───────────────────────────────────────────────
    _showLevelSelect: function() {
        this._state = 'LEVEL_SELECT';
        this._clearOverlay();
        this._setBgColor(0, 0, 0);
        this._makeLabel(this._overlayNode, 'SELECT LEVEL', 140, 36);
        var self = this;
        this._makeLevelButton(-160, 30, 'WORLD 1', function () {
            self._selectedLevel = 1; self._startGame();
        });
        this._makeLevelButton( 160, 30, 'WORLD 2', function () {
            self._selectedLevel = 2; self._startGame();
        });
    },

    _makeLevelButton: function(x, y, label, onClick) {
        var node = new cc.Node('lvlBtn');
        node.anchorX = 0.5; node.anchorY = 0.5;
        node.x = x; node.y = y;
        node.width = 220; node.height = 90;
        var spr = node.addComponent(cc.Sprite);
        spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        spr.trim = false;
        var normal  = SPR.getFrame('button_orange') || SPR.getFrame('button_orange.png');
        var hover   = SPR.getFrame('button_orange_hover') || SPR.getFrame('button_orange_hover.png');
        var pressed = SPR.getFrame('button_oriange_press') || SPR.getFrame('button_oriange_press.png');
        if (normal) spr.spriteFrame = normal;
        var btn = node.addComponent(cc.Button);
        btn.transition = cc.Button.Transition.SPRITE;
        btn.target = node;
        if (normal)  btn.normalSprite  = normal;
        if (pressed) btn.pressedSprite = pressed;
        if (hover)   btn.hoverSprite   = hover;
        node.on(cc.Node.EventType.TOUCH_END, onClick, this);
        // label on top of button
        var lblNode = new cc.Node('btnLabel');
        lblNode.anchorX = 0.5; lblNode.anchorY = 0.5;
        lblNode.x = 0; lblNode.y = 0;
        var lbl = lblNode.addComponent(cc.Label);
        var FONTS = window.FONTS || {};
        if (FONTS.white_font) { lbl.font = FONTS.white_font; lbl.useSystemFont = false; }
        lbl.string = label;
        lbl.fontSize = 32;
        lbl.lineHeight = 32;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lblNode.color = cc.Color.WHITE;
        node.addChild(lblNode);
        this._overlayNode.addChild(node);
        return node;
    },

    // ── start / restart game ─────────────────────────────────────────────
    _startGame: function() {
        LevelData.setLevel(this._selectedLevel);
        this._levelLabels = null;
        this._clearOverlay();
        this._clearWorld();
        this._score  = 0;
        this._coins  = 0;
        this._lives  = CFG.LIVES;
        this._time   = CFG.TIMER;
        this._camX   = 0;
        this._minCamX = 0;
        this._setBgColor(92, 148, 252);
        this._hud.setVisible(true);
        this._buildWorld();
        this._state = 'PLAYING';
        this._timerOn = true;
        AudioMgr.playBGM('bgm1');
    },

    _respawn: function() {
        this._clearWorld();
        this._camX = 0; this._minCamX = 0;
        this._time = CFG.TIMER;
        this._setBgColor(92, 148, 252);
        this._buildWorld();
        this._state = 'PLAYING';
        this._timerOn = true;
        AudioMgr.playBGM('bgm1');
    },

    // ── world node (scrolling game area) ─────────────────────────────────
    _buildWorld: function() {
        var wn = new cc.Node('world');
        wn.anchorX = 0; wn.anchorY = 1;
        wn.x = -CFG.W/2;
        // align ground to bottom of visible screen
        wn.y = -CFG.H/2 + LevelData.ROWS * CFG.TS;
        this._canvasNode.addChild(wn, 0);
        this._worldNode = wn;

        // Level
        var levelNode = new cc.Node('level');
        wn.addChild(levelNode);
        var level = levelNode.addComponent(GameLevel);
        level.init(wn, this);
        this._level = level;

        // Player — spawn at the camera tracking threshold so camera follows immediately
        var startX = CFG.W * 0.35;
        var startY = (LevelData.ROWS - 2) * CFG.TS - CFG.TS;
        this._player = new Player(wn, startX, startY);
        this._player.syncNode();
    },

    _clearWorld: function() {
        if (this._worldNode) {
            this._worldNode.destroy();
            this._worldNode = null;
        }
        this._player = null;
        this._level  = null;
    },

    // ── main update ───────────────────────────────────────────────────────
    update: function(dt) {
        if (this._state !== 'PLAYING' && this._state !== 'DEAD') return;

        var p = this._player;
        var level = this._level;

        if (this._state === 'PLAYING') {
            // timer
            if (this._timerOn) {
                this._time -= dt;
                if (this._time <= 0) { this._time = 0; p.hurt(this); }
            }

            // player update
            p.update(dt, this._keys, level);

            // Star BGM management
            if (p.starTimer > 0) {
                if (!this._starBgmActive) {
                    this._starBgmActive = true;
                    AudioMgr.playBGM('starbgm');
                }
                if (!AudioMgr.isMuted()) {
                    // fade out in the last 1.5 sec
                    var vol = p.starTimer < 1.5 ? Math.max(0, p.starTimer / 1.5) : 1;
                    cc.audioEngine.setMusicVolume(vol);
                }
            } else if (this._starBgmActive) {
                this._starBgmActive = false;
                if (!AudioMgr.isMuted()) cc.audioEngine.setMusicVolume(1);
                AudioMgr.playBGM('bgm1');
            }

            // block bump check
            if (!p.dead) level.checkBlockBump(p);

            // level tick
            level.tick(dt, p, this);

            // pit check
            if (!p.dead && level.checkPit(p)) p.die(this);

            // flag check
            if (!p.dead && p.x >= LevelData.flagCol * CFG.TS) this._levelClear();

            // camera (follows player both directions, clamped to level bounds)
            this._camX = p.x - CFG.W * 0.35;
            if (this._camX < this._minCamX) this._camX = this._minCamX;
            var maxCam = LevelData.COLS * CFG.TS - CFG.W;
            if (this._camX > maxCam) this._camX = maxCam;
            this._worldNode.x = -CFG.W/2 - this._camX;
            // Parallax cloud layer (slower than world)
            if (this._cloudLayer) this._cloudLayer.x = -CFG.W/2 - this._camX * 0.3;

            level.updateTiles(this._camX);
        }

        if (this._state === 'DEAD') {
            p.update(dt, {}, level);  // dead bounce
            this._deadTimer -= dt;
            if (this._deadTimer <= 0) {
                if (this._lives > 0) {
                    this._respawn();
                } else {
                    this._gameOver();
                }
                return;
            }
        }

        // sync player node
        p.syncNode();

        // HUD
        this._hud.refresh(this._score, this._coins, this._lives, this._time,
                         AudioMgr.isMuted(), this._paused ? 'PAUSED' : '');
    },

    // ── game events ───────────────────────────────────────────────────────
    onPlayerDead: function() {
        this._lives--;
        this._state = 'DEAD';
        this._deadTimer = 3;
        this._timerOn = false;
    },

    addScore: function(v) { this._score += v; },
    addCoin:  function()  { this._coins++; if (this._coins >= 100) { this._coins=0; this._lives++; } },

    spawnItem: function(qb) { this._level.spawnItem(qb); },

    _togglePause: function() {
        if (this._state !== 'PLAYING' && this._state !== 'PAUSED') return;
        this._paused = !this._paused;
        this._state  = this._paused ? 'PAUSED' : 'PLAYING';
        // we still update in PLAYING, skip in PAUSED handled by state check above
        // re-enable update when unpausing
        this.enabled = true;
    },

    // ── LEVEL CLEAR ───────────────────────────────────────────────────────
    _levelClear: function() {
        if (this._state === 'LEVEL_CLEAR') return;
        this._state = 'LEVEL_CLEAR';
        this._timerOn = false;
        this._hud.setVisible(false);
        AudioMgr.stopBGM();
        AudioMgr.playSFX('levelClear');

        var bonus = Math.ceil(this._time) * 50;
        this._score += bonus;

        this._clearOverlay();
        this._makeLabel(this._overlayNode, 'COURSE CLEAR!', 80, 36, cc.color(255,220,0));
        this._makeLabel(this._overlayNode, 'SCORE: ' + String(this._score).padStart(6,'0'), 20, 24);
        this._makeLabel(this._overlayNode, 'TIME BONUS: +' + bonus, -20, 20, cc.color(255,200,0));
        this._makeLabel(this._overlayNode, 'Press SPACE to continue', -80, 16, cc.color(200,200,200));
    },

    // ── GAME OVER ─────────────────────────────────────────────────────────
    _gameOver: function() {
        this._state = 'GAME_OVER';
        this._hud.setVisible(false);
        AudioMgr.stopBGM();
        AudioMgr.playSFX('gameover');
        this._clearWorld();
        this._clearOverlay();
        this._setBgColor(0, 0, 0);
        this._makeLabel(this._overlayNode, 'GAME OVER', 60, 48, cc.color(255,50,50));
        this._makeLabel(this._overlayNode, 'SCORE: ' + String(this._score).padStart(6,'0'), -10, 24);
        this._makeLabel(this._overlayNode, 'Press SPACE to return to Menu', -70, 16, cc.color(200,200,200));
    },
});
