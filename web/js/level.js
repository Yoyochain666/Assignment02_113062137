// Level data and tilemap system
const T = C.T;

// Level 1 - World 1-1 inspired layout
function buildLevel1() {
  const W = 200, H = 14;
  const map = {}; // key: `${col},${row}` -> tile type
  const enemyDefs = [];
  const blockDefs = [];

  function setTile(c, r, t) { map[`${c},${r}`] = t; }
  function ground(c0, c1, r) { for (let c = c0; c <= c1; c++) setTile(c, r, c < 2 || c > W-3 ? T.GROUND : T.GROUND); }
  function fill(c0, c1, r0, r1, t) { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) setTile(c, r, t); }
  function pipe(c, r0, r1) { // 2-wide, top at r0, bottom at r1
    setTile(c,   r0, T.PIPE_TL); setTile(c+1, r0, T.PIPE_TR);
    for (let r = r0+1; r <= r1; r++) {
      setTile(c, r, T.PIPE_BL); setTile(c+1, r, T.PIPE_BR);
    }
  }

  // Ground rows 12-13, gap at 88-91
  ground(0,  87, 12); fill(0,  87, 13, 13, T.SOLID);
  ground(92, W-1, 12); fill(92, W-1, 13, 13, T.SOLID);
  // Boundary walls
  fill(0, 0, 0, 13, T.SOLID); fill(W-1, W-1, 0, 13, T.SOLID);

  // === Floating platforms & question blocks (SMB1-inspired) ===
  // Group 1: col 15-23
  setTile(15, 8, T.QUESTION); blockDefs.push({c:15,r:8,content:'mushroom'});
  setTile(20, 8, T.BRICK);
  setTile(21, 8, T.QUESTION); blockDefs.push({c:21,r:8,content:'coin'});
  setTile(22, 8, T.BRICK);
  setTile(23, 8, T.QUESTION); blockDefs.push({c:23,r:8,content:'coin'});
  setTile(24, 8, T.BRICK);
  setTile(25, 8, T.QUESTION); blockDefs.push({c:25,r:8,content:'coin'});

  // Group 2: col 22 single high block (hidden 1-up secret)
  setTile(22, 4, T.QUESTION); blockDefs.push({c:22,r:4,content:'star'});

  // Pipes
  pipe(28, 10, 12);   // short pipe
  pipe(38, 9, 12);    // medium pipe
  pipe(46, 8, 12);    // tall pipe
  pipe(57, 9, 12);    // medium pipe

  // Group 3: col 78-80
  setTile(78, 8, T.BRICK);
  setTile(79, 8, T.QUESTION); blockDefs.push({c:79,r:8,content:'coin'});
  setTile(80, 8, T.BRICK);
  setTile(81, 8, T.BRICK);
  setTile(82, 8, T.BRICK);

  // Raised platform col 78-82 row 5
  fill(78, 82, 5, 5, T.BRICK);

  // Group 4: col 95-102
  setTile(95, 8, T.BRICK);
  setTile(96, 8, T.BRICK);
  setTile(97, 8, T.QUESTION); blockDefs.push({c:97,r:8,content:'mushroom'});
  setTile(98, 8, T.BRICK);

  // Staircase near end (col 133-141)
  for (let step = 0; step < 4; step++) {
    fill(133+step, 133+step, 12-step, 12, T.SOLID);
  }
  for (let step = 0; step < 4; step++) {
    fill(145+step, 145+step, 12-3+step, 12, T.SOLID);
  }

  // Final staircase (col 160-168)
  for (let s = 0; s < 8; s++) {
    fill(160+s, 160+s, 12-s, 12, T.SOLID);
  }

  // Enemies
  enemyDefs.push({type:'goomba', c:22, r:11});
  enemyDefs.push({type:'goomba', c:37, r:11});
  enemyDefs.push({type:'goomba', c:49, r:11});
  enemyDefs.push({type:'goomba', c:54, r:11});
  enemyDefs.push({type:'turtle', c:62, r:11});
  enemyDefs.push({type:'goomba', c:75, r:11});
  enemyDefs.push({type:'goomba', c:76, r:11});
  enemyDefs.push({type:'turtle', c:85, r:11});
  enemyDefs.push({type:'goomba', c:100, r:11});
  enemyDefs.push({type:'goomba', c:105, r:11});
  enemyDefs.push({type:'goomba', c:106, r:11});
  enemyDefs.push({type:'turtle', c:120, r:11});
  enemyDefs.push({type:'goomba', c:138, r:11});
  enemyDefs.push({type:'goomba', c:155, r:11});

  return { map, W, H, enemyDefs, blockDefs,
    playerStart: { c:3, r:11 },
    flagCol: 172 };
}

// ===== LEVEL CLASS =====
class Level {
  constructor(data) {
    this.data = data;
    this.W = data.W; this.H = data.H;
    this.map = data.map;
    this.width  = data.W * C.TS;
    this.height = data.H * C.TS;

    this.questionBlocks = [];
    this.brickBlocks = [];
    this.enemies = [];
    this.items = [];
    this.effects = [];
    this.flag = null;

    this._init();
  }

  _init() {
    const d = this.data;
    // Clear existing entities on respawn
    this.questionBlocks = [];
    this.brickBlocks = [];
    this.enemies = [];
    this.items = [];
    this.effects = [];
    this.flag = null;
    // Question blocks and brick blocks are separate entities
    for (const bd of d.blockDefs) {
      const blk = new QuestionBlock(bd.c * C.TS, bd.r * C.TS, bd.content);
      this.questionBlocks.push(blk);
    }
    // Bricks defined in map
    for (const [key, type] of Object.entries(this.map)) {
      if (type === T.BRICK) {
        const [c, r] = key.split(',').map(Number);
        this.brickBlocks.push(new BrickBlock(c * C.TS, r * C.TS));
      }
    }
    // Enemies
    for (const ed of d.enemyDefs) {
      const x = ed.c * C.TS, y = ed.r * C.TS;
      const e = ed.type === 'goomba' ? new Goomba(x, y) : new Turtle(x, y);
      this.enemies.push(e);
    }
    // Flag
    this.flag = new Flag(d.flagCol * C.TS, 3 * C.TS);
    this.flagCol = d.flagCol;
  }

  getTile(c, r) {
    if (c < 0 || c >= this.W || r < 0 || r >= this.H) return T.SOLID;
    return this.map[`${c},${r}`] || T.EMPTY;
  }

  isSolid(c, r) {
    const t = this.getTile(c, r);
    if (t === T.EMPTY) return false;
    if (t === T.QUESTION || t === T.USED_Q) return false; // handled separately
    if (t === T.BRICK) return false; // handled separately
    return true; // GROUND, SOLID, PIPE_*
  }

  // Find all solid tiles an entity's rect overlaps with
  _getOverlappingTiles(rect) {
    const c0 = Math.floor(rect.x / C.TS);
    const c1 = Math.floor((rect.x + rect.w - 1) / C.TS);
    const r0 = Math.floor(rect.y / C.TS);
    const r1 = Math.floor((rect.y + rect.h - 1) / C.TS);
    const tiles = [];
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      if (this.isSolid(c, r))
        tiles.push({ x: c * C.TS, y: r * C.TS, w: C.TS, h: C.TS });
    }
    return tiles;
  }

  // Resolve entity collisions with solid tiles + question blocks + brick blocks
  // onWall: callback(side) for wall bounces (enemies)
  resolveCollisions(entity, onWall) {
    // Tilemap
    const tiles = this._getOverlappingTiles(entity.rect);
    for (const tile of tiles) {
      const sides = Physics.resolve(entity, tile);
      if (sides.bottom) { entity.vy = 0; entity.grounded = true; }
      if (sides.top)    { entity.vy = Math.max(entity.vy, 0); }
      if ((sides.left || sides.right) && onWall) {
        if (sides.left) onWall('left');
        if (sides.right) onWall('right');
      }
    }
    // Question blocks and bricks are also solid from all sides
    for (const blk of [...this.questionBlocks, ...this.brickBlocks]) {
      if (!blk.active) continue;
      const sides = Physics.resolve(entity, blk.rect);
      if (sides.bottom) { entity.vy = 0; entity.grounded = true; }
      if (sides.top)    { entity.vy = Math.max(entity.vy, 0); }
      if ((sides.left || sides.right) && onWall) {
        if (sides.left) onWall('left');
        if (sides.right) onWall('right');
      }
    }
  }

  // Check if player hit a block from below (jumping up into it)
  checkBlockHits(player) {
    if (player.vy >= 0) return; // only when moving up
    const px = player.x, py = player.y, pw = player.w;
    // Question blocks
    for (const blk of this.questionBlocks) {
      if (!blk.active || blk.used) continue;
      if (px + pw > blk.x + 2 && px < blk.x + blk.w - 2 &&
          py <= blk.y + blk.h && py + player.h >= blk.y) {
        if (Math.abs(py - (blk.y + blk.h)) < 16) {
          blk.hit(player, this);
          player.vy = Math.abs(player.vy) * 0.3;
        }
      }
    }
    // Brick blocks
    for (const blk of this.brickBlocks) {
      if (!blk.active) continue;
      if (px + pw > blk.x + 2 && px < blk.x + blk.w - 2 &&
          py <= blk.y + blk.h && py + player.h >= blk.y) {
        if (Math.abs(py - (blk.y + blk.h)) < 16) {
          blk.hit(player, this);
          player.vy = Math.abs(player.vy) * 0.3;
        }
      }
    }
  }

  checkEnemyInteractions(player, scoreCallback) {
    if (player.dead || player.growing) return;
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.dead) continue;
      if (!Physics.intersects(player.rect, enemy.rect)) continue;
      // Stomped? Player falling onto enemy top
      const pBottom = player.y + player.h;
      const eMid = enemy.y + enemy.h / 2;
      if (player.vy > 0 && pBottom < eMid + 10) {
        const pts = enemy.stomp();
        if (pts > 0) {
          player.score += pts;
          scoreCallback && scoreCallback(pts, enemy.x + enemy.w/2, enemy.y);
          player.vy = -350; // bounce
        }
      } else {
        // Player hit by enemy side
        if (player.invincible) {
          // Player is invincible - kills enemy
          enemy.stomp && enemy.stomp();
        } else {
          player.hurt();
        }
      }
    }
  }

  checkItemInteractions(player) {
    for (const item of this.items) {
      if (!item.active || item.collected) continue;
      if (Physics.intersects(player.rect, item.rect)) {
        item.collect(player);
      }
    }
  }

  checkFlagInteraction(player) {
    if (!this.flag || player.onFlag || player.dead) return false;
    const flagRect = { x: this.flag.poleX - 4, y: this.flag.flagY, w: 12, h: C.TS * 9 };
    if (Physics.intersects(player.rect, flagRect)) {
      player.onFlag = true;
      player.vx = 0; player.vy = 0;
      player.flagVy = 50;
      Audio.stopBGM();
      Audio.playSFX('levelclear');
      return true;
    }
    return false;
  }

  spawnItem(item) { this.items.push(item); }

  addEffect(x, y, type) {
    this.effects.push(new Effect(x, y, type));
  }

  update(dt, player, scoreCallback) {
    for (const blk of this.questionBlocks) blk.update(dt);
    for (const blk of this.brickBlocks)    blk.update(dt);
    for (const e of this.enemies) e.update(dt, this);
    for (const item of this.items) item.update(dt, this);
    for (const ef of this.effects) ef.update(dt);
    this.enemies = this.enemies.filter(e => e.active);
    this.items   = this.items.filter(i => i.active);
    this.effects = this.effects.filter(ef => ef.active);
    this.checkEnemyInteractions(player, scoreCallback);
    this.checkItemInteractions(player);
    this.checkBlockHits(player);
    this.checkFlagInteraction(player);
  }

  // Draw background sky + decorations
  drawBackground(ctx, camX) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, C.HUD_H, 0, C.H);
    grad.addColorStop(0, '#5c94fc');
    grad.addColorStop(1, '#3060b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, C.HUD_H, C.W, C.GAME_H);
    // Clouds (simple decorative)
    this._drawClouds(ctx, camX);
  }

  _drawClouds(ctx, camX) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const cloudPos = [
      {x:200,y:60},{x:500,y:80},{x:800,y:50},{x:1100,y:70},
      {x:1400,y:60},{x:1700,y:75},{x:2000,y:55},{x:2400,y:65},
      {x:2800,y:70},{x:3200,y:55},{x:3800,y:65},{x:4200,y:60},
    ];
    for (const cp of cloudPos) {
      const sx = cp.x - camX;
      if (sx < -200 || sx > C.W + 100) continue;
      const cy = cp.y + C.HUD_H;
      ctx.beginPath();
      ctx.arc(sx, cy, 20, 0, Math.PI * 2);
      ctx.arc(sx + 25, cy - 5, 25, 0, Math.PI * 2);
      ctx.arc(sx + 50, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTiles(ctx, camX) {
    const c0 = Math.max(0, Math.floor(camX / C.TS) - 1);
    const c1 = Math.min(this.W - 1, Math.ceil((camX + C.W) / C.TS) + 1);
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < this.H; r++) {
        const t = this.getTile(c, r);
        if (t === T.EMPTY || t === T.QUESTION || t === T.BRICK) continue;
        const sx = c * C.TS - camX;
        const sy = r * C.TS + C.HUD_H;
        this._drawTile(ctx, t, sx, sy);
      }
    }
  }

  _drawTile(ctx, type, sx, sy) {
    const W = C.TS, H = C.TS;
    switch (type) {
      case T.GROUND:
        if (!SS.drawFit(ctx, 'tiles_9.png', sx, sy, W, H)) {
          ctx.fillStyle = '#228820'; ctx.fillRect(sx, sy, W, H);
        }
        break;
      case T.SOLID:
        if (!SS.drawFit(ctx, 'tiles_2.png', sx, sy, W, H)) {
          ctx.fillStyle = '#8b6914'; ctx.fillRect(sx, sy, W, H);
        }
        break;
      case T.PIPE_TL:
        ctx.fillStyle = C.PIPE_COLOR_DARK;
        ctx.fillRect(sx, sy, W, H);
        ctx.fillStyle = C.PIPE_COLOR_MID;
        ctx.fillRect(sx+2, sy+2, W-6, H-2);
        ctx.fillStyle = C.PIPE_COLOR_LITE;
        ctx.fillRect(sx+3, sy+3, 4, H-5);
        break;
      case T.PIPE_TR:
        ctx.fillStyle = C.PIPE_COLOR_DARK;
        ctx.fillRect(sx, sy, W, H);
        ctx.fillStyle = C.PIPE_COLOR_MID;
        ctx.fillRect(sx+4, sy+2, W-6, H-2);
        ctx.fillStyle = C.PIPE_COLOR_LITE;
        ctx.fillRect(sx+5, sy+3, 4, H-5);
        break;
      case T.PIPE_BL:
        ctx.fillStyle = C.PIPE_COLOR_DARK;
        ctx.fillRect(sx, sy, W, H);
        ctx.fillStyle = C.PIPE_COLOR_MID;
        ctx.fillRect(sx+2, sy, W-6, H);
        ctx.fillStyle = C.PIPE_COLOR_LITE;
        ctx.fillRect(sx+3, sy, 4, H);
        break;
      case T.PIPE_BR:
        ctx.fillStyle = C.PIPE_COLOR_DARK;
        ctx.fillRect(sx, sy, W, H);
        ctx.fillStyle = C.PIPE_COLOR_MID;
        ctx.fillRect(sx+4, sy, W-6, H);
        break;
      default:
        ctx.fillStyle = '#555';
        ctx.fillRect(sx, sy, W, H);
    }
  }

  drawBlocks(ctx, camX) {
    for (const blk of this.questionBlocks) blk.draw(ctx, camX);
    for (const blk of this.brickBlocks)    blk.draw(ctx, camX);
  }

  drawEntities(ctx, camX) {
    for (const e of this.enemies) e.draw(ctx, camX);
    for (const item of this.items) item.draw(ctx, camX);
    for (const ef of this.effects) ef.draw(ctx, camX);
    if (this.flag) this.flag.draw(ctx, camX);
  }
}
