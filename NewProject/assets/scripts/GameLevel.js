/* Level management: tilemap rendering + collision + entity management */

window.GameLevel = cc.Class({
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
        this._pipes   = [];

        this._buildTileNodes();
        this._buildBlocks();
        this._buildEnemies();
        this._buildPipes();
    },

    // Merge contiguous pipe tiles into single collision rectangles
    _buildPipes: function() {
        var T = CFG.T; var TS = CFG.TS; var map = this._map;
        var visited = {};
        for (var key in map) {
            if (visited[key]) continue;
            if (map[key] !== T.PIPE_TL) continue;
            var parts = key.split(',');
            var c = parseInt(parts[0]);
            var r = parseInt(parts[1]);
            // pipe is 2 cols wide starting from c
            // scan downward while next row is PIPE_BL
            var rBottom = r;
            while (map[c+','+(rBottom+1)] === T.PIPE_BL) rBottom++;
            // mark visited
            for (var rr = r; rr <= rBottom; rr++) {
                visited[c+','+rr] = true;
                visited[(c+1)+','+rr] = true;
            }
            this._pipes.push({ x: c*TS, y: r*TS, w: 2*TS, h: (rBottom - r + 1) * TS });
        }
    },

    // ── Tile sprite pool ────────────────────────────────────────────────
    _buildTileNodes: function() {
        // Create a pool of tile sprite nodes, update each frame based on camera
        var pool = [];
        var cols = 45, rows = LevelData.ROWS;
        for (var i = 0; i < cols * rows; i++) {
            var n = new cc.Node('tile_'+i);
            n.anchorX = 0.5; n.anchorY = 0.5;  // center anchor so rotation pivots around center
            n.width = CFG.TS; n.height = CFG.TS;
            var s = n.addComponent(cc.Sprite);
            s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            s.trim = false;
            this._worldNode.addChild(n);
            pool.push(n);
        }
        this._tileNodes = pool;
    },

    updateTiles: function(camX) {
        var TS = CFG.TS;
        var startCol = Math.floor(camX / TS);
        var endCol   = startCol + 43;
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
                // reset transform
                n.x = col * TS + TS / 2;
                n.y = -(row * TS) - TS / 2;
                n.angle = 0; n.scaleX = 1; n.scaleY = 1;
                n.color = cc.Color.WHITE;
                var sprName = null;
                if (t === T.GROUND) sprName = CFG.TILE_SPR[1];
                else if (t === T.SOLID) sprName = CFG.TILE_SPR[9];
                else if (t === T.PIPE_TL) {
                    // pipe lip — slightly wider than body so inner body aligns with 468
                    sprName = 'tiles_467.png';
                    n.x = (col + 1) * TS;
                    n.scaleY = 2.29;            // 467 body is 28/32, so scale to 64/(28/32) = 73.14 ≈ 2.29*32
                    n.angle = -90;
                } else if (t === T.PIPE_BL) {
                    sprName = 'tiles_468.png';
                    n.x = (col + 1) * TS;
                    n.scaleY = 2;
                    n.angle = -90;
                } else if (t === T.PIPE_TR || t === T.PIPE_BR) {
                    // right side rendered by the left tile of the same row
                    n.active = false;
                    continue;
                }
                var spr2 = n.getComponent(cc.Sprite);
                if (spr2) {
                    spr2.enabled = true;
                    if (sprName) SPR.setSprite(spr2, sprName);
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
                // pipes handled separately as combined rects (see below)
                if (t === T.GROUND || t === T.SOLID || t === T.USED_Q) {
                    var solid = { x:c*TS, y:r*TS, w:TS, h:TS };
                    var res = Physics.resolve(ent, solid);
                    if (res) {
                        if (res.bottom) { result.bottom = true; ent.onGround = true; }
                        if (res.top)    result.top = true;
                        if (res.left)   result.left = true;
                        if (res.right)  result.right = true;
                    }
                }
            }
        }
        // pipes — single combined rectangle per pipe (avoids snag at tile seams)
        for (var pi = 0; pi < this._pipes.length; pi++) {
            var p = this._pipes[pi];
            var rp = Physics.resolve(ent, p);
            if (rp) {
                if (rp.bottom) { result.bottom = true; ent.onGround = true; }
                if (rp.top)    result.top = true;
                if (rp.left)   result.left = true;
                if (rp.right)  result.right = true;
            }
        }
        var game = this._game;
        // question blocks (always solid until removed)
        this._qBlocks.forEach(function(qb) {
            if (!qb._node || !qb._node.active) return;
            var solid = { x:qb.x, y:qb.y, w:qb.w, h:qb.h };
            // detect bump BEFORE resolving (resolve pushes player out, killing overlap)
            var ov = Physics.overlap(ent, solid);
            // bump from below (jumping up)
            if (ov && !qb.used && ent.vy < 0 && ov.oy <= ov.ox && ent.y > qb.y
                && ov.ox >= ent.w / 4) {
                qb.bump(game);
            }
            // trigger from above (fast-fall onto Q block)
            if (ov && !qb.used && ent.state === 'fall' && ent.vy > 0 && ov.oy <= ov.ox
                && ent.y < qb.y && ov.ox >= ent.w / 4) {
                qb.bump(game);
            }
            var r = Physics.resolve(ent, solid);
            if (r) {
                if (r.bottom) { result.bottom = true; ent.onGround = true; }
                if (r.top)    result.top = true;
                if (r.left)   result.left = true;
                if (r.right)  result.right = true;
            }
        });
        // bricks
        this._bricks.forEach(function(b) {
            if (b.removed) return;
            var solid = { x:b.x, y:b.y, w:b.w, h:b.h };
            var ov = Physics.overlap(ent, solid);
            // fast-fall break (player in fall state crashing down through brick from above)
            if (ov && ent.state === 'fall' && ent.vy > 0 && ov.oy <= ov.ox && ent.y < b.y
                && ov.ox >= ent.w / 4) {
                b._break(game);
                return;   // don't resolve — player keeps falling
            }
            // bump from below (big mario jumping into brick)
            if (ov && ent.vy < 0 && ov.oy <= ov.ox && ent.y > b.y && ent.big !== undefined
                && ov.ox >= ent.w / 4) {
                b.bump(ent, game);
            }
            var r = Physics.resolve(ent, solid);
            if (r) {
                if (r.bottom) { result.bottom = true; ent.onGround = true; }
                if (r.top)    result.top = true;
                if (r.left)   result.left = true;
                if (r.right)  result.right = true;
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
            // bump when player moving up + vertical overlap + player below block
            if (ov && ov.oy < ov.ox && player.vy < 0 && player.y > qb.y) {
                qb.bump(game);
            }
        });
        // Check bricks
        this._bricks.forEach(function(b) {
            if (b.removed) return;
            var ov = Physics.overlap(player, b);
            if (ov && ov.oy < ov.ox && player.vy < 0 && player.y > b.y) {
                b.bump(player, game);
            }
        });
    },

    spawnItem: function(qb) {
        // play SFX per content type
        if (qb.type === 'mushroom' || qb.type === 'star') {
            AudioMgr.playSFX('powerUpAppear');
        }

        var wx = qb.x; var wy = qb.y - CFG.TS;
        if (qb.type === 'mushroom') {
            this._items.push(new Mushroom(this._worldNode, wx, wy));
        } else if (qb.type === 'star') {
            this._items.push(new StarItem(this._worldNode, wx, wy));
        } else {
            // coin effect — pop animated coin + score popup + sfx
            this._game.addScore(200);
            this._game.addCoin();
            AudioMgr.playSFX('coin');
            this._effects.push(new Coin(this._worldNode, wx, wy));
            this._effects.push(new ScorePopup(this._worldNode, 200, wx, wy));
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

        // Sliding shell ↔ enemy — shell kills any enemy it touches
        this._enemies.forEach(function(e) {
            if (e.state !== 'slide' || e.dead) return;
            self._enemies.forEach(function(other) {
                if (other === e || other.dead) return;
                if (Physics.overlap(e, other)) {
                    if (other.stomp) {
                        other.stomp();
                        game.addScore(200);
                        self.addScore(200, other.x, other.y - 20);
                    }
                }
            });
        });

        // Player ↔ enemy — collect all collisions first, then resolve
        if (!player.dead) {
            var stomps = [];
            var hurt = false;
            this._enemies.forEach(function(e) {
                if (e.dead) return;
                var ov = Physics.overlap(player, e);
                if (!ov) return;
                if (player.vy > 0 && player.y + player.h - e.y < 20) {
                    stomps.push(e);
                } else {
                    hurt = true;
                }
            });
            stomps.forEach(function(e) {
                if (e.stomp) {
                    e.stomp();
                    game.addScore(100);
                    self.addScore(100, e.x, e.y - 20);
                }
            });
            if (stomps.length > 0) {
                player.vy = -350;
            } else if (hurt) {
                player.hurt(game);
            }
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
