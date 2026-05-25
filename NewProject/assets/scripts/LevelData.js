// World 1-1 level data
window.LevelData = {
    COLS: 212, ROWS: 14,

    build: function() {
        var T = CFG.T;
        var map = {};
        function set(c, r, t) { map[c+','+r] = t; }
        function row(c0, c1, r, t) { for(var c=c0;c<=c1;c++) set(c,r,t); }

        // Ground layer (row 13)
        row(0,87,13,T.GROUND); row(92,211,13,T.GROUND);
        // Underground (row 12 partial to fill under pipes etc)
        row(0,87,12,T.GROUND); row(92,211,12,T.GROUND);

        // Sky ceiling solid walls at sides
        for(var r=0;r<14;r++){ set(0,r,T.SOLID); set(211,r,T.SOLID); }

        // Solid floor base (row 13 already set above)

        // --- Question blocks at row 8 (single hit) ---
        set(16,8,T.QUESTION); set(20,8,T.QUESTION); set(22,8,T.QUESTION);
        set(20,4,T.QUESTION); // higher up

        // --- Brick blocks ---
        row(18,19,8,T.BRICK); row(21,21,8,T.BRICK);
        row(56,63,8,T.BRICK);

        // --- Question block row 4 ---
        set(78,4,T.QUESTION); set(79,4,T.QUESTION); set(80,4,T.QUESTION);

        // --- Pipe 1 (col 28) ---
        set(28,11,T.PIPE_TL); set(29,11,T.PIPE_TR);
        set(28,12,T.PIPE_BL); set(29,12,T.PIPE_BR);

        // --- Pipe 2 (col 38) ---
        set(38,10,T.PIPE_TL); set(39,10,T.PIPE_TR);
        set(38,11,T.PIPE_BL); set(39,11,T.PIPE_BR);
        set(38,12,T.PIPE_BL); set(39,12,T.PIPE_BR);

        // --- Pipe 3 (col 46) ---
        set(46,9,T.PIPE_TL); set(47,9,T.PIPE_TR);
        for(var r2=10;r2<=12;r2++){ set(46,r2,T.PIPE_BL); set(47,r2,T.PIPE_BR); }

        // --- Pipe 4 (col 57) ---
        set(57,9,T.PIPE_TL); set(58,9,T.PIPE_TR);
        for(var r3=10;r3<=12;r3++){ set(57,r3,T.PIPE_BL); set(58,r3,T.PIPE_BR); }

        // --- Staircase 1 (col 133) ---
        for(var s=0;s<4;s++){
            row(133+s, 133+s, 13-s, T.SOLID);
            for(var r4=14-s;r4<=13;r4++) set(133+s,r4,T.SOLID);
        }
        // --- Staircase 2 going down (col 140) ---
        for(var s2=0;s2<4;s2++){
            var c2=143-s2;
            for(var r5=10+s2;r5<=13;r5++) set(c2,r5,T.SOLID);
        }

        // --- Staircase 3 (col 155) ---
        for(var s3=0;s3<5;s3++){
            var c3=155+s3;
            for(var r6=13-s3;r6<=13;r6++) set(c3,r6,T.SOLID);
        }

        // --- Elevated platform (cols 96-105) ---
        row(96,105,8,T.BRICK);
        row(96,105,7,T.EMPTY);

        // --- Long brick stretch (cols 110-120) ---
        row(110,120,4,T.BRICK);
        set(113,4,T.QUESTION); set(116,4,T.QUESTION);

        return map;
    },

    enemies: [
        { type:'goomba', col:22,  row:12 },
        { type:'goomba', col:36,  row:12 },
        { type:'goomba', col:40,  row:12 },
        { type:'goomba', col:50,  row:12 },
        { type:'goomba', col:60,  row:12 },
        { type:'goomba', col:61,  row:12 },
        { type:'turtle', col:80,  row:12 },
        { type:'goomba', col:97,  row:11 },
        { type:'goomba', col:98,  row:11 },
        { type:'goomba', col:100, row:12 },
        { type:'turtle', col:115, row:12 },
        { type:'goomba', col:120, row:12 },
        { type:'goomba', col:148, row:12 },
        { type:'turtle', col:160, row:12 },
    ],

    // which question blocks give mushroom (others give coin)
    mushBlocks: { '16,8':true, '20,4':true, '78,4':true },
    // star block
    starBlocks: { '22,8':true },

    flagCol: 198,
};
