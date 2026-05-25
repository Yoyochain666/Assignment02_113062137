/* Master game controller CC component.
   Manages: game state machine, player, level, HUD, scene overlays. */

var Game = cc.Class({
    name: 'Game',
    extends: cc.Component,

    // ── lifecycle ─────────────────────────────────────────────────────────
    onLoad: function() {
        // state: LOADING | MENU | LEVEL_SELECT | PLAYING | PAUSED | DEAD | GAME_OVER | LEVEL_CLEAR
        this._state     = 'LOADING';
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
        if (this._state === 'MENU' && (e.keyCode === K.space || e.keyCode === K.enter))
            this._showLevelSelect();
        if (this._state === 'LEVEL_SELECT' && (e.keyCode === K.space || e.keyCode === K.enter))
            this._startGame();
        if ((this._state === 'GAME_OVER' || this._state === 'LEVEL_CLEAR') &&
            (e.keyCode === K.space || e.keyCode === K.enter)) this._showMenu();
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
        var bg = new cc.Node('sky');
        bg.anchorX = 0.5; bg.anchorY = 0.5;
        bg.x = 0; bg.y = 0;
        bg.width = CFG.W; bg.height = CFG.H;
        bg.color = cc.color(92, 148, 252);  // Mario sky blue
        canvasNode.addChild(bg, -10);
        this._bgNode = bg;
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
        this._bgNode.color = cc.color(0, 0, 0);

        // Try to show menu_bg sprite
        var bg = new cc.Node('menubg');
        bg.anchorX = 0.5; bg.anchorY = 0.5;
        bg.x = 0; bg.y = 0;
        bg.width = CFG.W; bg.height = CFG.H;
        var spr = bg.addComponent(cc.Sprite);
        var frame = SPR.getFrame ? null : null;
        this._overlayNode.addChild(bg, -5);

        var title0 = new cc.Node('t0');
        title0.anchorX = 0.5; title0.anchorY = 0.5;
        title0.x = 0; title0.y = 80;
        title0.width = 256; title0.height = 60;
        var s0 = title0.addComponent(cc.Sprite);
        var f0 = SPR.getFrame('title_0.png');
        if (f0) s0.spriteFrame = f0;
        this._overlayNode.addChild(title0);

        this._makeLabel(this._overlayNode, 'SUPER MARIO BROS', 40, 28, cc.Color.WHITE);
        this._makeLabel(this._overlayNode, 'Press SPACE to Start', -40, 18, cc.color(200,200,200));
        this._makeLabel(this._overlayNode, '← → / A D  Move    ↑ / W / Space  Jump', -90, 14, cc.color(180,180,180));
        this._makeLabel(this._overlayNode, 'Shift: Run    P: Pause    M: Mute', -115, 14, cc.color(180,180,180));

        AudioMgr.playBGM('bgm2');
        this._hud.setVisible(false);
        this._hud.update(0,0,this._lives,CFG.TIMER,AudioMgr.isMuted(),'');
    },

    // ── LEVEL SELECT screen ───────────────────────────────────────────────
    _showLevelSelect: function() {
        this._state = 'LEVEL_SELECT';
        this._clearOverlay();
        this._bgNode.color = cc.color(0, 0, 0);

        this._makeLabel(this._overlayNode, 'SELECT LEVEL', 140, 32);
        this._makeLabel(this._overlayNode, 'WORLD 1-1', 50, 28, cc.color(255, 220, 0));
        this._makeLabel(this._overlayNode, 'Press SPACE to Play', -60, 18, cc.color(200,200,200));
    },

    // ── start / restart game ─────────────────────────────────────────────
    _startGame: function() {
        this._clearOverlay();
        this._clearWorld();
        this._score  = 0;
        this._coins  = 0;
        this._lives  = CFG.LIVES;
        this._time   = CFG.TIMER;
        this._camX   = 0;
        this._minCamX = 0;
        this._bgNode.color = cc.color(92, 148, 252);
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
        this._bgNode.color = cc.color(92, 148, 252);
        this._buildWorld();
        this._state = 'PLAYING';
        this._timerOn = true;
        AudioMgr.playBGM('bgm1');
    },

    // ── world node (scrolling game area) ─────────────────────────────────
    _buildWorld: function() {
        var wn = new cc.Node('world');
        wn.anchorX = 0; wn.anchorY = 1;
        wn.x = -CFG.W/2; wn.y = CFG.H/2 - CFG.HUD_H;
        this._canvasNode.addChild(wn, 0);
        this._worldNode = wn;

        // Level
        var levelNode = new cc.Node('level');
        wn.addChild(levelNode);
        var level = levelNode.addComponent(GameLevel);
        level.init(wn, this);
        this._level = level;

        // Player
        var startX = CFG.TS * 3;
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

            // block bump check
            if (!p.dead) level.checkBlockBump(p);

            // level tick
            level.tick(dt, p, this);

            // pit check
            if (!p.dead && level.checkPit(p)) p.die(this);

            // flag check
            if (!p.dead && p.x >= LevelData.flagCol * CFG.TS) this._levelClear();

            // camera
            var targetCam = p.x - 300;
            if (targetCam > this._camX) this._camX = targetCam;
            if (this._camX < this._minCamX) this._camX = this._minCamX;
            var maxCam = LevelData.COLS * CFG.TS - CFG.W;
            if (this._camX > maxCam) this._camX = maxCam;
            this._worldNode.x = -CFG.W/2 - this._camX;

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
        this._hud.update(this._score, this._coins, this._lives, this._time,
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
        AudioMgr.stopBGM();
        AudioMgr.playSFX('gameover');
        this._clearWorld();
        this._clearOverlay();
        this._bgNode.color = cc.color(0,0,0);
        this._makeLabel(this._overlayNode, 'GAME OVER', 60, 48, cc.color(255,50,50));
        this._makeLabel(this._overlayNode, 'SCORE: ' + String(this._score).padStart(6,'0'), -10, 24);
        this._makeLabel(this._overlayNode, 'Press SPACE to return to Menu', -70, 16, cc.color(200,200,200));
        this._hud.update(this._score, this._coins, 0, 0, AudioMgr.isMuted(), '');
    },
});
