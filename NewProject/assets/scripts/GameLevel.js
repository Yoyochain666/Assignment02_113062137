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
        this._platforms = [];

        // Layer 2 (decorations) — build before everything else so it sits at the back
        this._buildDecorations();
        this._buildTileNodes();
        this._buildBlocks();
        this._buildEnemies();
        this._buildPipes();
        this._buildFlag();
        this._buildPlatforms();
    },

    // One-way platforms — 9-slice composition with optional back/front stacking
    _buildPlatforms: function() {
        var TS = CFG.TS;
        var SL = 32;   // each 16×16 source stretched to 32×32
        var self = this;

        function placeSlice(parent, frame, x, y) {
            var n = new cc.Node('plat_slice');
            n.anchorX = 0; n.anchorY = 1;
            n.x = x; n.y = -y;
            n.width = SL; n.height = SL;
            var s = n.addComponent(cc.Sprite);
            s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            s.trim = false;
            var f = SPR.getFrame(frame);
            if (f) s.spriteFrame = f;
            parent.addChild(n);
        }

        function buildPlat(baseX, baseY, cellsW, cellsH, parent, prefix) {
            for (var cx = 0; cx < cellsW; cx++) {
                for (var cy = 0; cy < cellsH; cy++) {
                    var isL = cx === 0, isR = cx === cellsW - 1;
                    var isT = cy === 0, isB = cy === cellsH - 1;
                    var f;
                    if (isT && isL)      f = prefix + 'tl';
                    else if (isT && isR) f = prefix + 'tr';
                    else if (isB && isL) f = prefix + 'bl';
                    else if (isB && isR) f = prefix + 'br';
                    else if (isT)        f = prefix + 'tm';
                    else if (isB)        f = prefix + 'bm';
                    else if (isL)        f = prefix + 'ml';
                    else if (isR)        f = prefix + 'mr';
                    else                 f = prefix + 'mc';
                    placeSlice(parent, f, baseX + cx * SL, baseY + cy * SL);
                }
            }
        }

        function buildShadow(x, baseY, heightCells, parent, shadowPrefix) {
            for (var cy = 0; cy < heightCells; cy++) {
                var f;
                if (cy === 0)                       f = shadowPrefix + 'top';
                else if (cy === heightCells - 1)    f = shadowPrefix + 'bot';
                else                                f = shadowPrefix + 'mid';
                placeSlice(parent, f, x, baseY + cy * SL);
            }
        }

        // colour 1 = orange (plat_xx + shadow_xx); 2 = right-of-orange; 3 = below-orange
        var COLOR_PREFIX = {
            1: { plat: 'plat_',  shadow: 'shadow_'        },
            2: { plat: 'plat2_', shadow: 'plat2_shadow_' },
            3: { plat: 'plat3_', shadow: 'plat3_shadow_' },
        };

        // Each stack: back + 0 or more fronts. All bottoms align to ground (row 12).
        // back.cellsH is auto-derived as (12 - back.row). Same for fronts:
        //   front.row > back.row so front is shorter; bottom aligns to ground.
        // Each platform inside a stack must use a DIFFERENT color (1/2/3).
        // Spacing buffer (≥2 cols) from any Level 1 obstacle (pipes/blocks/stairs).
        // Mix of proportions: tall-thin, wide-flat, multi-tier.
        var stacks = [
            // tall narrow tower, no fronts
            { back:{ col: 33, row: 3, cellsW: 3, color: 2 } , fronts:[
                { dx:-2, cellsW: 3, row: 7, color: 3 },
            ]},

            // wide multi-tier staircase
            { back:{ col: 65, row: 3, cellsW: 8, color: 1 }, fronts:[
                { dx:2, cellsW: 4, row: 7, color: 3 },
                { dx: -1, cellsW: 4, row: 9, color: 2 },
            ]},

            // moderate, single front
            { back:{ col:105, row: 3, cellsW: 5, color: 2 }, fronts:[
                { dx:-2, cellsW: 3, row: 9, color: 3 },
            ]},

            // very wide low platform, no fronts
            { back:{ col:139, row: 6, cellsW: 3, cellsH: 3, color: 3 } },

            { back:{ col:145, row: 4, cellsW: 3, cellsH: 3, color: 2 } },

            // medium with 2 fronts on opposite ends
            { back:{ col:153, row: 3, cellsW: 3, cellsH: 3, color: 1 } },
        ];

        var GROUND_Y = 12 * TS;   // bottoms must touch this
        stacks.forEach(function(s) {
            var b = s.back;
            // back.cellsH optional — if not provided, bottom auto-aligns to ground
            var backCellsH = (b.cellsH !== undefined) ? b.cellsH : (12 - b.row);
            var backX = b.col * TS;
            var backY = b.row * TS;
            var backPx = COLOR_PREFIX[b.color] || COLOR_PREFIX[1];

            var backNode = new cc.Node('plat_back');
            backNode.anchorX = 0; backNode.anchorY = 1;
            backNode.x = backX; backNode.y = -backY;
            self._worldNode.addChild(backNode, -1);
            buildPlat(0, 0, b.cellsW, backCellsH, backNode, backPx.plat);
            self._platforms.push({ x: backX, y: backY, w: b.cellsW * SL, h: backCellsH * SL });

            // fronts cascade: each front's shadow uses the platform directly
            // behind it (back for fronts[0], previous front for later ones).
            var prevShadowPrefix = backPx.shadow;
            (s.fronts || []).forEach(function(fr) {
                var frPx = COLOR_PREFIX[fr.color] || COLOR_PREFIX[2];
                var frontX = backX + fr.dx * SL;
                var frontY = fr.row * TS;
                // front.cellsH optional — default = ground-aligned
                var frontCellsH = (fr.cellsH !== undefined) ? fr.cellsH : (12 - fr.row);
                var frontNode = new cc.Node('plat_front');
                frontNode.anchorX = 0; frontNode.anchorY = 1;
                frontNode.x = frontX; frontNode.y = -frontY;
                self._worldNode.addChild(frontNode, -1);
                buildShadow(fr.cellsW * SL, 0, frontCellsH, frontNode, prevShadowPrefix);
                buildPlat(0, 0, fr.cellsW, frontCellsH, frontNode, frPx.plat);
                self._platforms.push({ x: frontX, y: frontY, w: fr.cellsW * SL, h: frontCellsH * SL });
                prevShadowPrefix = frPx.shadow;
            });
        });
    },

    // ── Layer 2: non-interactive hill decorations (scroll with world)
    _buildDecorations: function() {
        var TS = CFG.TS;
        var deco = new cc.Node('deco');
        deco.anchorX = 0; deco.anchorY = 1;
        deco.x = 0; deco.y = 0;
        this._worldNode.addChild(deco, -10);   // behind tiles/entities

        function makeTile(parent, frameName, x, y, w, h) {
            var n = new cc.Node('hillTile');
            n.anchorX = 0; n.anchorY = 1;
            n.x = x; n.y = -y;
            n.width = w; n.height = h;
            var s = n.addComponent(cc.Sprite);
            s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            s.trim = false;
            var f = SPR.getFrame(frameName);
            if (f) s.spriteFrame = f;
            parent.addChild(n);
            return n;
        }

        // Hill: 2 cols wide, top is 274/275, body rows are 316/317 stacked.
        // `height` = total rows (1 = just top, 2 = top + 1 body row, etc.).
        function hill(col, baseRow, height) {
            var topRow = baseRow - height + 1;
            makeTile(deco, 'hill_top_left',   col      * TS, topRow * TS, TS, TS);
            makeTile(deco, 'hill_top_right', (col + 1) * TS, topRow * TS, TS, TS);
            for (var r = topRow + 1; r <= baseRow; r++) {
                makeTile(deco, 'tiles_316.png',  col      * TS, r * TS, TS, TS);
                makeTile(deco, 'tiles_317.png', (col + 1) * TS, r * TS, TS, TS);
            }
        }
        // Hill style 2 (different color) — body right is hill2_body_left flipped
        function hill2(col, baseRow, height) {
            var topRow = baseRow - height + 1;
            makeTile(deco, 'hill2_top_left',   col      * TS, topRow * TS, TS, TS);
            makeTile(deco, 'hill2_top_right', (col + 1) * TS, topRow * TS, TS, TS);
            for (var r = topRow + 1; r <= baseRow; r++) {
                makeTile(deco, 'hill2_body_left',  col      * TS, r * TS, TS, TS);
                makeTile(deco, 'temp0',           (col + 1) * TS, r * TS, TS, TS);
            }
        }

        // ── Cluster placement ───────────────────────────────────────────
        // Each cluster: same color, hills overlap by half-width (1 tile),
        // adjacent heights differ by >= 1. Tallest drawn first → shorter
        // ones appear in front.
        var groundRow = 12;
        // Cluster positions chosen to avoid Level 1 floating blocks (col 15-25,
        // 78-82, 95-98), pipes (28-29, 38-39, 46-47, 57-58) and stairs
        // (133-136, 145-148, 160-167). Heights capped at 4 (won't reach row 8).
        // Platforms occupy roughly: 31-35, 64-72, 103-109, 139-141, 145-147, 153-155.
        // Layer 1 obstacles in the usual columns. Hills go only in the gaps.
        var clusters = [
            [1,  4, [3, 2, 4]],
            [2,  9, [2, 3]],
            [1, 41, [3, 2, 4]],
            [2, 49, [2, 3, 4]],
            [1, 53, [3, 2]],
            [2, 59, [3, 2]],
            [1, 74, [2, 3]],
            [2, 84, [2, 4, 3]],
            [1, 89, [3, 2]],
            [2, 99, [3, 2]],
            [1,111, [2, 3, 4]],
            [2,120, [3, 2]],
            [1,126, [4, 2, 3]],
            [2,142, [2, 3]],
            [1,150, [3, 2]],
            [2,156, [2, 3]],
            [1,168, [2, 3]],
            [2,174, [3, 2, 4]],
            [1,183, [2, 4, 3, 2]],
            [2,190, [3, 2]],
        ];
        clusters.forEach(function(c) {
            var fn = (c[0] === 1) ? hill : hill2;
            var startCol = c[1];
            var heights = c[2];
            // pair each hill with its draw column; tallest goes first (back)
            var hills = heights.map(function(h, i) {
                return { col: startCol + i, h: h };
            });
            hills.sort(function(a, b) { return b.h - a.h; });
            hills.forEach(function(hh) { fn(hh.col, groundRow, hh.h); });
        });
    },

    _buildFlag: function() {
        var TS = CFG.TS;
        var flagX = LevelData.flagCol * TS;

        // ── Flag pole + flag (build first, lower z-order so base covers its bottom)
        var w = 64;
        var h = 9 * TS;
        var worldX = flagX - w / 2 + TS / 2 - 6;   // shifted 6px left
        var worldTopY = 3 * TS;
        var n = new cc.Node('flag');
        n.anchorX = 0; n.anchorY = 1;
        n.x = worldX; n.y = -worldTopY;
        n.width = w; n.height = h;
        var s = n.addComponent(cc.Sprite);
        s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        s.trim = false;
        var f = SPR.getFrame('flag') || SPR.getFrame('flag.png');
        if (f) s.spriteFrame = f;
        this._worldNode.addChild(n, -6);

        // ── Orange base / pedestal — rendered on top of flag pole bottom
        var baseW = 32;
        var baseH = 32;
        var baseX = flagX - baseW / 2 + TS / 2;
        var baseTopY = 12 * TS - baseH;
        var base = new cc.Node('flagBase');
        base.anchorX = 0; base.anchorY = 1;
        base.x = baseX; base.y = -baseTopY;
        base.width = baseW; base.height = baseH;
        var baseSpr = base.addComponent(cc.Sprite);
        baseSpr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        baseSpr.trim = false;
        var bFrame = SPR.getFrame('button_orange') || SPR.getFrame('button_orange.png');
        if (bFrame) baseSpr.spriteFrame = bFrame;
        this._worldNode.addChild(base, -5);
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
                if (t === T.GROUND) {
                    // top-surface tile — pick edge variant based on neighbours
                    var lG = this._map[(col-1)+','+row] === T.GROUND;
                    var rG = this._map[(col+1)+','+row] === T.GROUND;
                    if (lG && rG)      sprName = 'tiles_272.png';
                    else if (!lG && rG) sprName = 'tiles_271.png';
                    else if (lG && !rG) sprName = 'tiles_273.png';
                    else                sprName = 'tiles_272.png';
                } else if (t === T.SOLID) {
                    if (row === 13) {
                        // sub-surface fill — same edge logic with 313/314/315
                        var lS = this._map[(col-1)+','+row] === T.SOLID;
                        var rS = this._map[(col+1)+','+row] === T.SOLID;
                        if (lS && rS)      sprName = 'tiles_314.png';
                        else if (!lS && rS) sprName = 'tiles_313.png';
                        else if (lS && !rS) sprName = 'tiles_315.png';
                        else                sprName = 'tiles_314.png';
                    } else {
                        // above-ground solid (stairs / boundary) — single tile
                        sprName = 'tiles_312.png';
                    }
                }
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

        // ── Pass 1: detect bumps with ORIGINAL ent position (before any resolution)
        var qbBumps = [];
        this._qBlocks.forEach(function(qb) {
            if (!qb._node || !qb._node.active || qb.used) return;
            var ov = Physics.overlap(ent, { x:qb.x, y:qb.y, w:qb.w, h:qb.h });
            if (!ov || ov.oy > ov.ox || ov.ox < ent.w / 4) return;
            if (ent.vy < 0 && ent.y > qb.y) qbBumps.push(qb);                       // from below
            else if (ent.state === 'fall' && ent.vy > 0 && ent.y < qb.y) qbBumps.push(qb);  // from above
        });
        var brickBumps = [];   // from below (big mario)
        var brickBreaksFromAbove = [];   // fast-fall
        this._bricks.forEach(function(b) {
            if (b.removed) return;
            var ov = Physics.overlap(ent, { x:b.x, y:b.y, w:b.w, h:b.h });
            if (!ov || ov.oy > ov.ox || ov.ox < ent.w / 4) return;
            if (ent.state === 'fall' && ent.vy > 0 && ent.y < b.y) brickBreaksFromAbove.push(b);
            else if (ent.vy < 0 && ent.y > b.y && ent.big !== undefined) brickBumps.push(b);
        });

        // ── Pass 2: resolve collisions FIRST (so player bounces off bricks that are about to break)
        this._qBlocks.forEach(function(qb) {
            if (!qb._node || !qb._node.active) return;
            var r = Physics.resolve(ent, { x:qb.x, y:qb.y, w:qb.w, h:qb.h });
            if (r) {
                if (r.bottom) { result.bottom = true; ent.onGround = true; }
                if (r.top)    result.top = true;
                if (r.left)   result.left = true;
                if (r.right)  result.right = true;
            }
        });
        this._bricks.forEach(function(b) {
            if (b.removed) return;
            // fast-fall break: skip resolve so player keeps falling through
            if (brickBreaksFromAbove.indexOf(b) !== -1) return;
            var r = Physics.resolve(ent, { x:b.x, y:b.y, w:b.w, h:b.h });
            if (r) {
                if (r.bottom) { result.bottom = true; ent.onGround = true; }
                if (r.top)    result.top = true;
                if (r.left)   result.left = true;
                if (r.right)  result.right = true;
            }
        });

        // ── Pass 3: apply bumps / breaks (after physics so bounce already happened)
        qbBumps.forEach(function(qb) { qb.bump(game); });
        brickBumps.forEach(function(b) { b.bump(ent, game); });
        brickBreaksFromAbove.forEach(function(b) { b._break(game); });

        // ── One-way platforms: only land from above when falling, AND only if
        //    the entity's bottom was above the platform top last frame (so big
        //    mario walking under a low platform isn't sucked up).
        this._platforms.forEach(function(p) {
            var ov = Physics.overlap(ent, p);
            if (!ov) return;
            if (ent.vy <= 0) return;
            var prevBottom = (ent._prevBottom !== undefined) ? ent._prevBottom : (ent.y + ent.h);
            if (prevBottom > p.y + 0.5) return;   // came from below or inside → don't snap
            ent.y = p.y - ent.h;
            ent.vy = 0;
            ent.onGround = true;
            result.bottom = true;
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
                    if (other.spinKill) other.spinKill();
                    game.addScore(200);
                    self.addScore(200, other.x, other.y - 20);
                }
            });
        });

        // Player ↔ enemy — collect all collisions first, then resolve
        if (!player.dead) {
            var stomps = [];
            var kills = [];        // outright kills (star or fast-fall)
            var hurt = false;
            var killMode = player.starTimer > 0 || player.state === 'fall';
            this._enemies.forEach(function(e) {
                if (e.dead) return;
                var ov = Physics.overlap(player, e);
                if (!ov) return;
                if (killMode) {
                    kills.push(e);
                } else if (player.vy > 0) {
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
            kills.forEach(function(e) {
                if (e.spinKill) e.spinKill();
                game.addScore(200);
                self.addScore(200, e.x, e.y - 20);
            });
            if (stomps.length > 0) {
                player.vy = -350;
                player._stompCooldown = 0.4;   // hurt-immune for a brief moment (no flash)
            } else if (hurt && (player._stompCooldown || 0) <= 0) {
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
                        // star — rainbow invincibility + speed + kill enemies on touch
                        player.starTimer = 10;
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
