/* Level management: tilemap rendering + collision + entity management */

var GameLevel = cc.Class({
    name: 'GameLevel',
    extends: cc.Component,

    properties: {
        _map: null,
        _qBlocks: null,
        _bricks:  null,
        _enemies: null,
        _items:   null,
        _effects: null,
        _tileNodes: null,
        _worldNode: null,
        _game: null,
    },

    init: function(worldNode, game) {
        this._worldNode = worldNode;
        this._game = game;
        this._map     = LevelData.build();
        this._qBlocks = [];
        this._bricks  = [];
        this._enemies = [];
        this._items   = [];
        this._effects = [];
        this._tileNodes = [];

        this._buildTileNodes();
        this._buildBlocks();
        this._buildEnemies();
    },

    // ── Tile sprite pool ────────────────────────────────────────────────
    _buildTileNodes: function() {
        // Create a pool of tile sprite nodes, update each frame based on camera
        var pool = [];
        var cols = 30, rows = LevelData.ROWS;
        for (var i = 0; i < cols * rows; i++) {
            var n = new cc.Node('tile_'+i);
            n.anchorX = 0; n.anchorY = 1;
            n.width = CFG.TS; n.height = CFG.TS;
            n.addComponent(cc.Sprite);
            this._worldNode.addChild(n);
            pool.push(n);
        }
        this._tileNodes = pool;
    },

    updateTiles: function(camX) {
        var TS = CFG.TS;
        var startCol = Math.floor(camX / TS);
        var endCol   = startCol + 28;
        var T = CFG.T;
        var idx = 0;
        for (var row = 0; row < LevelData.ROWS; row++) {
            for (var col = startCol; col <= endCol && idx < this._tileNodes.length; col++, idx++) {
                var n = this._tileNodes[idx];
                var t = this._map[col+','+row] || T.EMPTY;
                if (t === T.EMPTY || t === T.QUESTION || t === T.USED_Q || t === T.BRICK) {
                    n.active = false;
                    continue;
                }
                n.active = true;
                n.x = col * TS;
                n.y = -(row * TS);
                var sprName = null;
                if (t === T.GROUND) sprName = CFG.TILE_SPR[1];
                else if (t === T.SOLID) sprName = CFG.TILE_SPR[9];
                else if (t === T.PIPE_TL || t === T.PIPE_TR || t === T.PIPE_BL || t === T.PIPE_BR) {
                    // draw pipe as solid green color node (no sprite)
                    n.color = cc.color(40, 160, 20);
                    var spr = n.getComponent(cc.Sprite);
                    if (spr) spr.enabled = false;
                    continue;
                }
                var spr2 = n.getComponent(cc.Sprite);
                if (spr2) {
                    spr2.enabled = true;
                    if (sprName) SPR.setSprite(spr2, sprName);
                    n.color = cc.Color.WHITE;
                }
            }
        }
        // hide remaining
        for (; idx < this._tileNodes.length; idx++) {
            this._tileNodes[idx].active = false;
        }
    },

    // ── Question / Brick blocks ─────────────────────────────────────────
    _buildBlocks: function() {
        var T = CFG.T;
        var map = this._map;
        for (var key in map) {
            var t = map[key];
            if (t !== T.QUESTION && t !== T.BRICK) continue;
            var parts = key.split(',');
            var col = parseInt(parts[0]); var row = parseInt(parts[1]);
            if (t === T.QUESTION) {
                var type = 'coin';
                if (LevelData.mushBlocks[key]) type = 'mushroom';
                if (LevelData.starBlocks && LevelData.starBlocks[key]) type = 'star';
                this._qBlocks.push(new QuestionBlock(this._worldNode, col, row, type));
            } else {
                this._bricks.push(new BrickBlock(this._worldNode, col, row));
            }
        }
    },

    _buildEnemies: function() {
        var TS = CFG.TS;
        LevelData.enemies.forEach(function(e) {
            var wx = e.col * TS;
            var wy = e.row * TS;
            if (e.type === 'goomba') this._enemies.push(new Goomba(this._worldNode, wx, wy));
            else this._enemies.push(new Turtle(this._worldNode, wx, wy));
        }, this);
    },

    // ── Collision resolution ─────────────────────────────────────────────
    resolveEntity: function(ent) {
        var T = CFG.T; var TS = CFG.TS; var map = this._map;
        var result = { top:false, bottom:false, left:false, right:false };
        // gather touching tiles
        var c0 = Math.floor(ent.x / TS) - 1;
        var c1 = Math.floor((ent.x + ent.w) / TS) + 1;
        var r0 = Math.floor(ent.y / TS) - 1;
        var r1 = Math.floor((ent.y + ent.h) / TS) + 1;
        for (var c = c0; c <= c1; c++) {
            for (var r = r0; r <= r1; r++) {
                var t = map[c+','+r];
                if (!t || t === T.EMPTY) continue;
                if (t === T.PIPE_TL || t === T.PIPE_TR || t === T.PIPE_BL || t === T.PIPE_BR ||
                    t === T.GROUND || t === T.SOLID || t === T.USED_Q) {
                    var solid = { x:c*TS, y:r*TS, w:TS, h:TS };
                    var res = Physics.resolve(ent, solid);
                    if (res) {
                        if (res.bottom) { result.bottom = true; ent.onGround = true; }
                        if (res.top)    result.top = true;
                        if (res.left)   { result.left = true; if (ent.vx) ent.vx = -ent.vx; }
                        if (res.right)  { result.right = true; if (ent.vx) ent.vx = -ent.vx; }
                    }
                }
            }
        }
        // question blocks
        this._qBlocks.forEach(function(qb) {
            if (qb.used && qb._node.active) {
                var solid = { x:qb.x, y:qb.y, w:qb.w, h:qb.h };
                Physics.resolve(ent, solid);
            }
        });
        // bricks
        this._bricks.forEach(function(b) {
            if (!b.removed) {
                var solid = { x:b.x, y:b.y, w:b.w, h:b.h };
                Physics.resolve(ent, solid);
            }
        });
        return result;
    },

    // ── Block bumping (from below) ────────────────────────────────────────
    checkBlockBump: function(player) {
        var TS = CFG.TS;
        var game = this._game;
        // Check question blocks
        this._qBlocks.forEach(function(qb) {
            if (qb.used) return;
            var ov = Physics.overlap(player, qb);
            if (ov && ov.oy < ov.ox && player.y < qb.y) {
                qb.bump(game);
            }
        });
        // Check bricks
        this._bricks.forEach(function(b) {
            if (b.removed) return;
            var ov = Physics.overlap(player, b);
            if (ov && ov.oy < ov.ox && player.y < b.y) {
                b.bump(player, game);
            }
        });
    },

    spawnItem: function(qb) {
        var wx = qb.x; var wy = qb.y - CFG.TS;
        if (qb.type === 'mushroom') {
            this._items.push(new Mushroom(this._worldNode, wx, wy));
        } else if (qb.type === 'star') {
            this._items.push(new StarItem(this._worldNode, wx, wy));
        } else {
            // coin effect
            this._game.addScore(200);
            this._game.addCoin();
            AudioMgr.playSFX('coin');
            var pop = new ScorePopup(this._worldNode, 200, wx, wy);
            this._effects.push(pop);
        }
    },

    addScore: function(val, wx, wy) {
        var pop = new ScorePopup(this._worldNode, val, wx, wy);
        this._effects.push(pop);
    },

    // ── Main update ───────────────────────────────────────────────────────
    tick: function(dt, player, game) {
        var self = this;

        // Update blocks
        this._qBlocks.forEach(function(b) { b.update(dt); b.syncNode(); });
        this._bricks.forEach(function(b) { if (!b.removed) { b.update(dt); b.syncNode(); } });

        // Enemies
        this._enemies = this._enemies.filter(function(e) {
            if (e.removed) { return false; }
            e.update(dt, self);
            e.syncNode();
            // enemy wall turn
            if (e.vx > 0 && e.x > LevelData.COLS * CFG.TS - e.w) e.vx = -Math.abs(e.vx);
            if (e.vx < 0 && e.x < 0) e.vx = Math.abs(e.vx);
            return true;
        });

        // Player ↔ enemy
        if (!player.dead) {
            this._enemies.forEach(function(e) {
                if (e.dead) return;
                var ov = Physics.overlap(player, e);
                if (!ov) return;
                // stomp from above
                if (player.vy > 0 && player.y + player.h - e.y < 20) {
                    e.stomp ? e.stomp() : null;
                    if (e.stomp) {
                        player.vy = -350;
                        game.addScore(100);
                        self.addScore(100, e.x, e.y - 20);
                    }
                } else {
                    player.hurt(game);
                }
            });
        }

        // Items
        this._items = this._items.filter(function(item) {
            if (item.removed) return false;
            item.update(dt, self);
            item.syncNode();
            if (!player.dead) {
                if (Physics.overlap(player, item)) {
                    if (item instanceof Mushroom) {
                        player.grow();
                        game.addScore(1000);
                        AudioMgr.playSFX('powerUp');
                    } else {
                        // star
                        player.invTimer = 10;
                        game.addScore(1000);
                        AudioMgr.playSFX('powerUp');
                    }
                    item._node.active = false;
                    item.removed = true;
                    return false;
                }
            }
            return true;
        });

        // Effects
        this._effects = this._effects.filter(function(ef) {
            if (ef.removed) return false;
            ef.update(dt);
            ef.syncNode();
            return !ef.removed;
        });
    },

    // Check pit (player falls below level)
    checkPit: function(player) {
        return player.y > LevelData.ROWS * CFG.TS + 64;
    },
});
