// Game-wide constants
window.CFG = {
    W: 1280, H: 720, HUD_H: 72, GAME_H: 648,
    TS: 32, SCALE: 2,
    GRAVITY: 1600,
    JUMP_VY: 580,       // positive = up in CC
    WALK_SPD: 160,
    RUN_SPD: 280,
    MAX_FALL: 580,
    LIVES: 3,
    TIMER: 400,

    T: { EMPTY:0, GROUND:1, BRICK:2, QUESTION:3, USED_Q:4,
         PIPE_TL:5, PIPE_TR:6, PIPE_BL:7, PIPE_BR:8, SOLID:9 },

    // sprite frame names (with .png suffix as stored in plist)
    ANIM: {
        S_IDLE:  ['mario_small_8.png'],
        S_WALK:  ['mario_small_1.png','mario_small_2.png','mario_small_3.png'],
        S_JUMP:  ['mario_small_4.png'],
        S_DIE:   ['mario_small_10.png'],
        S_SKID:  ['mario_small_9.png'],
        S_CROUCH:['mario_small_28.png'],   // (6,0) 0-base
        S_FALL:  ['mario_small_15.png'],   // (2,0) 0-base — ground-pound / fast fall
        B_IDLE:  ['mario_big0.png'],
        B_WALK:  ['mario_big0.png','mario_big1.png'],
        B_JUMP:  ['mario_big2.png'],
        B_SKID:  ['mario_big0.png'],
        B_CROUCH:['mario_big3.png'],
        B_FALL:  ['mario_big4.png'],
        G_WALK: ['Goomba_0.png'],   // single frame, flip horizontally for 2-frame animation
        G_DEAD: ['Goomba_1.png'],
        T_WALK: ['turtle_0.png','turtle_1.png'],
        T_SHELL:['turtle_5.png'],
        T_SLIDE:['turtle_2.png','turtle_3.png','turtle_4.png'],
        Q_ANIM: ['items_10.png','items_11.png','items_12.png','items_13.png'],
        Q_USED: ['items_14.png'],
        MUSH:   ['items_46.png'],
        STAR:   ['items_50.png'],
        COIN:   ['items_1.png','items_2.png','items_3.png'],
    },

    TILE_SPR: {
        1: 'tiles_9.png',
        2: 'tiles_6.png',
        9: 'tiles_2.png',
    },
};
