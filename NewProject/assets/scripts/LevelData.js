// World 1-1 level data — ported from HTML version's buildLevel1()
window.LevelData = {
    COLS: 200, ROWS: 14,

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

        // Ground row 12 (surface) + row 13 (fill) with gap at 88-91
        fill(0, 87, 12, 12, T.GROUND);
        fill(0, 87, 13, 13, T.SOLID);
        fill(92, W-1, 12, 12, T.GROUND);
        fill(92, W-1, 13, 13, T.SOLID);
        // Boundary walls
        fill(0, 0, 0, 13, T.SOLID);
        fill(W-1, W-1, 0, 13, T.SOLID);

        // Group 1: col 15-25 (questions + bricks)
        set(15, 8, T.QUESTION);   // mushroom
        set(20, 8, T.BRICK);
        set(21, 8, T.QUESTION);   // coin
        set(22, 8, T.BRICK);
        set(23, 8, T.QUESTION);   // coin
        set(24, 8, T.BRICK);
        set(25, 8, T.QUESTION);   // coin

        // High secret block
        set(22, 4, T.QUESTION);   // star

        // Pipes
        pipe(28, 10, 12);
        pipe(38, 9, 12);
        pipe(46, 8, 12);
        pipe(57, 9, 12);

        // Group 3: col 78-82
        set(78, 8, T.BRICK);
        set(79, 8, T.QUESTION);
        set(80, 8, T.BRICK);
        set(81, 8, T.BRICK);
        set(82, 8, T.BRICK);
        // Raised platform col 78-82 row 5
        fill(78, 82, 5, 5, T.BRICK);

        // Group 4: col 95-98
        set(95, 8, T.BRICK);
        set(96, 8, T.BRICK);
        set(97, 8, T.QUESTION);   // mushroom
        set(98, 8, T.BRICK);

        // Staircase 1 (col 133-136 going up)
        for (var step = 0; step < 4; step++) {
            for (var r = 12 - step; r <= 12; r++) set(133 + step, r, T.SOLID);
        }
        // Staircase 2 (col 145-148 going down)
        for (var step2 = 0; step2 < 4; step2++) {
            for (var r2 = 12 - 3 + step2; r2 <= 12; r2++) set(145 + step2, r2, T.SOLID);
        }
        // Final staircase (col 160-167 going up)
        for (var s = 0; s < 8; s++) {
            for (var r3 = 12 - s; r3 <= 12; r3++) set(160 + s, r3, T.SOLID);
        }

        return map;
    },

    enemies: [
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
    ],

    mushBlocks: { '15,8':true, '97,8':true },
    starBlocks: { '22,4':true },

    flagCol: 172,
};
