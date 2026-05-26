// World 1-1 and 1-2 level data
window.LevelData = {
    COLS: 200, ROWS: 14,
    currentLevel: 1,
    flagCol: 172,
    enemies: [],
    mushBlocks: {},
    starBlocks: {},

    setLevel: function(n) {
        this.currentLevel = (n === 2) ? 2 : 1;
        if (this.currentLevel === 1) {
            this.flagCol = 172;
            this.enemies = [
                { type:'goomba', col:22,  row:11 },
                { type:'goomba', col:37,  row:11 },
                { type:'goomba', col:49,  row:11 },
                { type:'goomba', col:54,  row:11 },
                { type:'turtle', col:62,  row:11 },
                { type:'goomba', col:75,  row:11 },
                { type:'goomba', col:76,  row:11 },
                { type:'turtle', col:85,  row:11 },
                { type:'goomba', col:100, row:11 },
                { type:'goomba', col:105, row:11 },
                { type:'goomba', col:106, row:11 },
                { type:'turtle', col:120, row:11 },
                { type:'goomba', col:138, row:11 },
                { type:'goomba', col:155, row:11 },
            ];
            this.mushBlocks = { '15,8':true, '97,8':true };
            this.starBlocks = { '22,4':true };
        } else {
            // Level 2 — different enemy density + harder
            this.flagCol = 172;
            this.enemies = [
                { type:'goomba', col:18,  row:11 },
                { type:'goomba', col:25,  row:11 },
                { type:'turtle', col:32,  row:11 },
                { type:'goomba', col:42,  row:11 },
                { type:'goomba', col:43,  row:11 },
                { type:'turtle', col:55,  row:11 },
                { type:'turtle', col:68,  row:11 },
                { type:'goomba', col:82,  row:11 },
                { type:'goomba', col:83,  row:11 },
                { type:'goomba', col:84,  row:11 },
                { type:'turtle', col:96,  row:11 },
                { type:'turtle', col:108, row:11 },
                { type:'goomba', col:115, row:11 },
                { type:'goomba', col:116, row:11 },
                { type:'goomba', col:130, row:11 },
                { type:'turtle', col:140, row:11 },
                { type:'goomba', col:150, row:11 },
                { type:'turtle', col:162, row:11 },
            ];
            this.mushBlocks = { '15,8':true, '79,8':true };
            this.starBlocks = { '22,4':true, '116,4':true };
        }
    },

    build: function() {
        var T = CFG.T;
        var map = {};
        function set(c, r, t) { map[c+','+r] = t; }
        function fill(c0, c1, r0, r1, t) {
            for (var c = c0; c <= c1; c++)
                for (var r = r0; r <= r1; r++) set(c, r, t);
        }
        function pipe(c, r0, r1) {
            set(c, r0, T.PIPE_TL); set(c+1, r0, T.PIPE_TR);
            for (var r = r0+1; r <= r1; r++) {
                set(c, r, T.PIPE_BL); set(c+1, r, T.PIPE_BR);
            }
        }
        var W = this.COLS;

        // Ground row 12 + 13 with a gap
        if (this.currentLevel === 1) {
            fill(0, 87, 12, 12, T.GROUND);
            fill(0, 87, 13, 13, T.SOLID);
            fill(92, W-1, 12, 12, T.GROUND);
            fill(92, W-1, 13, 13, T.SOLID);
        } else {
            // level 2 — different gap + extra pit
            fill(0, 60, 12, 12, T.GROUND);
            fill(0, 60, 13, 13, T.SOLID);
            fill(65, 125, 12, 12, T.GROUND);
            fill(65, 125, 13, 13, T.SOLID);
            fill(130, W-1, 12, 12, T.GROUND);
            fill(130, W-1, 13, 13, T.SOLID);
        }
        fill(0, 0, 0, 13, T.SOLID);
        fill(W-1, W-1, 0, 13, T.SOLID);

        if (this.currentLevel === 1) {
            // Group 1
            set(15, 8, T.QUESTION);
            set(20, 8, T.BRICK);
            set(21, 8, T.QUESTION);
            set(22, 8, T.BRICK);
            set(23, 8, T.QUESTION);
            set(24, 8, T.BRICK);
            set(25, 8, T.QUESTION);
            set(22, 4, T.QUESTION);     // high secret
            pipe(28, 10, 12);
            pipe(38, 9, 12);
            pipe(46, 8, 12);
            pipe(57, 9, 12);
            // Group 3
            set(78, 8, T.BRICK);
            set(79, 8, T.QUESTION);
            set(80, 8, T.BRICK);
            set(81, 8, T.BRICK);
            set(82, 8, T.BRICK);
            fill(78, 82, 5, 5, T.BRICK);
            // Group 4
            set(95, 8, T.BRICK);
            set(96, 8, T.BRICK);
            set(97, 8, T.QUESTION);
            set(98, 8, T.BRICK);
            // Stairs
            for (var step = 0; step < 4; step++) {
                for (var r = 12 - step; r <= 12; r++) set(133 + step, r, T.SOLID);
            }
            for (var step2 = 0; step2 < 4; step2++) {
                for (var r2 = 12 - 3 + step2; r2 <= 12; r2++) set(145 + step2, r2, T.SOLID);
            }
            for (var s = 0; s < 8; s++) {
                for (var r3 = 12 - s; r3 <= 12; r3++) set(160 + s, r3, T.SOLID);
            }
        } else {
            // ── Level 2 layout — more pipes, longer brick stretches, harder stairs
            set(15, 8, T.QUESTION);
            fill(18, 23, 8, 8, T.BRICK);
            set(22, 4, T.QUESTION);
            pipe(28, 9, 12);
            pipe(35, 8, 12);
            pipe(42, 8, 12);
            pipe(50, 9, 12);
            // wider brick wall
            fill(75, 84, 8, 8, T.BRICK);
            set(79, 8, T.QUESTION);
            // 2 layer platforms
            fill(75, 84, 5, 5, T.BRICK);
            set(80, 5, T.QUESTION);
            // gap area: cols 90-95 (mid-level brick island)
            fill(95, 100, 9, 9, T.BRICK);
            set(98, 9, T.QUESTION);
            // big brick wall around the second pit (gap)
            fill(105, 120, 8, 8, T.BRICK);
            set(110, 8, T.QUESTION);
            set(115, 8, T.QUESTION);
            // high row
            fill(108, 120, 4, 4, T.BRICK);
            set(116, 4, T.QUESTION);  // star
            // final staircase taller
            for (var ss = 0; ss < 9; ss++) {
                for (var rr = 12 - ss; rr <= 12; rr++) set(155 + ss, rr, T.SOLID);
            }
        }
        return map;
    },
};

// initialize to level 1 by default
window.LevelData.setLevel(1);
