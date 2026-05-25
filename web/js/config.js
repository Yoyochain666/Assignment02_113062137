const C = {
  W: 800, H: 480,
  HUD_H: 48,
  GAME_H: 432,
  SCALE: 2,
  TS: 32,  // tile size in world px (16 * 2)

  GRAVITY: 1800,
  JUMP_VY: -650,
  WALK_SPD: 200,
  RUN_SPD: 300,
  MAX_FALL: 700,

  LIVES: 3,
  TIMER: 400,

  T: { EMPTY:0, GROUND:1, BRICK:2, QUESTION:3, USED_Q:4,
       PIPE_TL:5, PIPE_TR:6, PIPE_BL:7, PIPE_BR:8, SOLID:9 },

  // Sprite sheets used
  SHEETS: {
    MARIO_S: { img:'mario_small.png', plist:'mario_small.plist' },
    MARIO_B: { img:'mario_big.png',   plist:'mario_big.plist'   },
    GOOMBA:  { img:'Goomba.png',      plist:'Goomba.plist'      },
    TURTLE:  { img:'Turtle.png',      plist:'Turtle.plist'      },
    ITEMS:   { img:'items.png',       plist:'items.plist'       },
    TILES:   { img:'tiles.png',       plist:'tiles.plist'       },
    EFFECTS: { img:'effects.png',     plist:'effects.plist'     },
  },

  ANIM: {
    S_IDLE:  ['mario_small_0.png'],
    S_WALK:  ['mario_small_1.png','mario_small_2.png','mario_small_3.png'],
    S_JUMP:  ['mario_small_4.png'],
    S_DIE:   ['mario_small_10.png'],
    S_SKID:  ['mario_small_9.png'],
    B_IDLE:  ['mario_big_0.png'],
    B_WALK:  ['mario_big_1.png','mario_big_2.png','mario_big_3.png'],
    B_JUMP:  ['mario_big_4.png'],
    B_DIE:   ['mario_big_5.png'],
    B_SKID:  ['mario_big_9.png'],
    G_WALK:  ['Goomba_0.png','Goomba_1.png'],
    G_DEAD:  ['Goomba_2.png'],
    T_WALK:  ['turtle_0.png','turtle_1.png'],
    T_SHELL: ['turtle_2.png'],
    Q_BLOCK: ['items_10.png','items_11.png','items_12.png','items_13.png'],
    Q_USED:  ['items_14.png'],
    COIN:    ['items_1.png','items_2.png','items_3.png','items_4.png','items_5.png','items_6.png'],
    MUSH:    ['items_46.png'],
    STAR:    ['items_50.png'],
    EFFECT:  ['effects_0.png','effects_1.png','effects_2.png','effects_3.png'],
  },

  // Tile sprites for tilemap rendering
  TILE_SPR: {
    1: 'tiles_9.png',    // ground surface (green grass)
    2: 'tiles_6.png',    // brick (reddish)
    3: 'items_10.png',   // question block
    4: 'items_14.png',   // used question block
    9: 'tiles_2.png',    // ground fill (brown)
  },

  PIPE_COLOR_DARK: '#1a6b00',
  PIPE_COLOR_MID:  '#28a000',
  PIPE_COLOR_LITE: '#50d020',
};
