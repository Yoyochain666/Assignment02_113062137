// ===== BASE ENTITY =====
class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
    this.active = true;
  }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// ===== PLAYER =====
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 28, 30); // small mario hitbox
    this.state = 'small'; // 'small' | 'big'
    this.animState = 'idle';
    this.frame = 0;
    this.animTimer = 0;
    this.facing = 1; // 1=right -1=left
    this.lives = C.LIVES;
    this.score = 0;
    this.coins = 0;
    this.dead = false;
    this.deadTimer = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.growing = false;
    this.growTimer = 0;
    this.startX = x; this.startY = y;
    this.onFlag = false;
    this.flagVy = 0;
  }

  get isBig() { return this.state === 'big'; }

  setSmall() {
    this.state = 'small';
    this.w = 28; this.h = 30;
    this.y += 32;
  }

  setBig() {
    this.state = 'big';
    this.w = 28; this.h = 58;
    this.y -= 28;
    if (this.y < 0) this.y = 0;
  }

  respawn() {
    this.x = this.startX; this.y = this.startY;
    this.vx = 0; this.vy = 0;
    this.dead = false; this.deadTimer = 0;
    this.invincible = true; this.invincibleTimer = 3.0;
    this.growing = false;
    if (this.isBig) { this.state = 'small'; this.w = 28; this.h = 30; }
  }

  hurt() {
    if (this.invincible || this.dead) return false;
    if (this.isBig) {
      this.setSmall();
      this.invincible = true; this.invincibleTimer = 2.5;
      Audio.playSFX('powerdown');
      return false;
    }
    this.die();
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.vy = -500;
    this.vx = 0;
    this.deadTimer = 3.0;
    this.lives--;
    Audio.stopBGM();
    Audio.playSFX('die');
  }

  update(dt, keys, level) {
    if (this.dead) {
      this.deadTimer -= dt;
      this.y += this.vy * dt;
      this.vy += C.GRAVITY * dt;
      return;
    }
    if (this.growing) {
      this.growTimer -= dt;
      if (this.growTimer <= 0) { this.growing = false; this.setBig(); }
      return;
    }
    if (this.onFlag) {
      this.flagVy += 500 * dt;
      this.y += this.flagVy * dt;
      return;
    }
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Horizontal input
    const run = keys['ShiftLeft'] || keys['ShiftRight'];
    const spd = run ? C.RUN_SPD : C.WALK_SPD;
    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const jumpK = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];

    if (left)  { this.vx = Math.max(this.vx - 1200 * dt, -spd); this.facing = -1; }
    else if (right) { this.vx = Math.min(this.vx + 1200 * dt,  spd); this.facing =  1; }
    else {
      // Friction
      const friction = this.grounded ? 1200 : 400;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - friction * dt);
      else             this.vx = Math.min(0, this.vx + friction * dt);
    }

    // Jump
    if (jumpK && this.grounded && !this._jumpHeld) {
      this.vy = C.JUMP_VY;
      this.grounded = false;
      this._jumpHeld = true;
      Audio.playSFX('jump');
    }
    if (!jumpK) this._jumpHeld = false;
    // Variable jump height
    if (this._jumpHeld && this.vy < -200 && !jumpK) this.vy = -200;

    // Gravity
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);

    // Move and collide
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.grounded = false;

    level.resolveCollisions(this);

    // World bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Fell into pit
    if (this.y > level.height * C.TS + 100) this.die();
  }

  getAnimFrame() {
    const pfx = this.isBig ? 'B_' : 'S_';
    let frames;
    if (this.dead) frames = C.ANIM[pfx + 'DIE'];
    else if (!this.grounded) frames = C.ANIM[pfx + 'JUMP'];
    else if (Math.abs(this.vx) > 10) {
      // Skid: moving but decelerating opposite direction
      if ((this.vx > 0 && this.facing < 0) || (this.vx < 0 && this.facing > 0))
        frames = C.ANIM[pfx + 'SKID'];
      else frames = C.ANIM[pfx + 'WALK'];
    }
    else frames = C.ANIM[pfx + 'IDLE'];

    this.animTimer += 0.1;
    if (this.animTimer >= frames.length) this.animTimer = 0;
    return frames[Math.floor(this.animTimer)];
  }

  draw(ctx, camX) {
    if (!this.active) return;
    if (this.dead && this.deadTimer <= 0) return;
    if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) return;

    const sx = this.x - camX;
    const frameName = this.getAnimFrame();
    const size = SS.getSize(frameName);
    const dw = size.w * C.SCALE;
    const dh = size.h * C.SCALE;
    // Draw centered on hitbox
    const drawX = sx + (this.w - dw) / 2;
    const drawY = this.y + C.HUD_H + (this.h - dh);

    SS.draw(ctx, frameName, drawX, drawY, this.facing, 1);
  }
}

// ===== GOOMBA =====
class Goomba extends Entity {
  constructor(x, y) {
    super(x, y, 30, 30);
    this.vx = -80;
    this.dead = false;
    this.deadTimer = 0;
    this.animTimer = 0;
  }

  update(dt, level) {
    if (!this.active) return;
    if (this.dead) {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.active = false;
      return;
    }
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    level.resolveCollisions(this, (side) => {
      if (side === 'left' || side === 'right') this.vx = -this.vx;
    });
    // Turn at edges
    if (!this._wasGrounded && this.grounded) {
      // check if about to walk off edge
    }
    this._wasGrounded = this.grounded;
  }

  stomp() {
    this.dead = true;
    this.deadTimer = 0.5;
    this.vy = 0; this.vx = 0;
    Audio.playSFX('stomp');
    return 100;
  }

  draw(ctx, camX) {
    if (!this.active) return;
    const sx = this.x - camX;
    const frames = this.dead ? C.ANIM.G_DEAD : C.ANIM.G_WALK;
    this.animTimer += 0.08;
    if (this.animTimer >= frames.length) this.animTimer = 0;
    const fname = frames[Math.floor(this.animTimer)];
    SS.drawFit(ctx, fname, sx, this.y + C.HUD_H, this.w, this.h);
  }
}

// ===== TURTLE =====
class Turtle extends Entity {
  constructor(x, y) {
    super(x, y, 28, 34);
    this.vx = -70;
    this.state = 'walk'; // 'walk' | 'shell' | 'slide'
    this.deadTimer = 0;
    this.animTimer = 0;
    this.shellKickTimer = 0; // brief pause after being stopped
  }

  update(dt, level) {
    if (!this.active) return;
    if (this.state === 'shell' && this.shellKickTimer > 0) {
      this.shellKickTimer -= dt;
      if (this.shellKickTimer <= 0 && this.vx === 0) {
        // Resting shell - can be kicked
      }
    }
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    level.resolveCollisions(this, (side) => {
      if (side === 'left' || side === 'right') this.vx = -this.vx;
    });
  }

  stomp() {
    if (this.state === 'walk') {
      this.state = 'shell';
      this.vx = 0;
      this.shellKickTimer = 0.5;
      this.h = 22;
      Audio.playSFX('stomp');
      return 100;
    } else if (this.state === 'shell' && this.vx === 0) {
      // Kick the shell
      this.vx = 300;
      this.state = 'slide';
      Audio.playSFX('kick');
      return 200;
    }
    return 0;
  }

  draw(ctx, camX) {
    if (!this.active) return;
    const sx = this.x - camX;
    let frames;
    const flipX = this.vx > 0;
    if (this.state === 'walk') {
      frames = C.ANIM.T_WALK;
      this.animTimer += 0.06;
    } else {
      frames = C.ANIM.T_SHELL;
      this.animTimer += 0.05;
    }
    if (this.animTimer >= frames.length) this.animTimer = 0;
    const fname = frames[Math.floor(this.animTimer)];
    SS.drawFit(ctx, fname, sx, this.y + C.HUD_H, this.w, this.h, flipX);
  }
}

// ===== QUESTION BLOCK =====
class QuestionBlock extends Entity {
  constructor(x, y, content = 'mushroom') {
    super(x, y, C.TS, C.TS);
    this.content = content; // 'mushroom' | 'coin' | 'star'
    this.used = false;
    this.animTimer = 0;
    this.bumpTimer = 0;
    this.bumpDir = 1;
    this.bumpY = 0;
  }

  hit(player, level) {
    if (this.used) return;
    this.used = true;
    this.bumpTimer = 0.25;
    Audio.playSFX('powerup_appear');

    if (this.content === 'coin') {
      player.score += 200;
      player.coins++;
      Audio.playSFX('coin');
      // Spawn coin effect
      level.addEffect(this.x + C.TS / 2, this.y - 8, 'coin');
    } else if (this.content === 'mushroom') {
      if (player.isBig) {
        // Give fire flower instead? For simplicity give coin
        player.score += 200; player.coins++;
        Audio.playSFX('coin');
      } else {
        level.spawnItem(new Mushroom(this.x, this.y - C.TS));
      }
    } else if (this.content === 'star') {
      level.spawnItem(new StarItem(this.x, this.y - C.TS));
    }
  }

  update(dt) {
    this.animTimer += 0.08;
    if (this.animTimer >= 4) this.animTimer = 0;
    if (this.bumpTimer > 0) {
      this.bumpTimer -= dt;
      this.bumpY = Math.sin(this.bumpTimer * Math.PI / 0.25) * 8;
    } else {
      this.bumpY = 0;
    }
  }

  draw(ctx, camX) {
    const sx = this.x - camX;
    const dy = this.y + C.HUD_H - this.bumpY;
    const frames = this.used ? C.ANIM.Q_USED : C.ANIM.Q_BLOCK;
    const fname = frames[Math.floor(this.animTimer) % frames.length];
    SS.drawFit(ctx, fname, sx, dy, C.TS, C.TS);
  }
}

// ===== BRICK BLOCK =====
class BrickBlock extends Entity {
  constructor(x, y) {
    super(x, y, C.TS, C.TS);
    this.broken = false;
    this.bumpTimer = 0;
    this.bumpY = 0;
  }

  hit(player, level) {
    if (player.isBig) {
      this.broken = true;
      this.active = false;
      Audio.playSFX('kick');
      player.score += 50;
      // Spawn debris particles
      level.addEffect(this.x, this.y, 'brick');
    } else {
      this.bumpTimer = 0.2;
      Audio.playSFX('kick');
    }
  }

  update(dt) {
    if (this.bumpTimer > 0) {
      this.bumpTimer -= dt;
      this.bumpY = Math.sin(this.bumpTimer * Math.PI / 0.2) * 6;
    } else {
      this.bumpY = 0;
    }
  }

  draw(ctx, camX) {
    if (!this.active) return;
    const sx = this.x - camX;
    const dy = this.y + C.HUD_H - this.bumpY;
    if (!SS.drawFit(ctx, 'tiles_6.png', sx, dy, C.TS, C.TS)) {
      ctx.fillStyle = '#c84000';
      ctx.fillRect(sx, dy, C.TS, C.TS);
    }
  }
}

// ===== MUSHROOM ITEM =====
class Mushroom extends Entity {
  constructor(x, y) {
    super(x, y, 28, 28);
    this.vx = 80;
    this.active = true;
    this.collected = false;
  }

  update(dt, level) {
    if (this.collected) return;
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    level.resolveCollisions(this, (side) => {
      if (side === 'left' || side === 'right') this.vx = -this.vx;
    });
  }

  draw(ctx, camX) {
    if (this.collected) return;
    const sx = this.x - camX;
    SS.drawFit(ctx, 'items_46', sx, this.y + C.HUD_H, this.w, this.h);
  }

  collect(player) {
    this.collected = true;
    this.active = false;
    player.score += 1000;
    if (!player.isBig) {
      player.growing = true;
      player.growTimer = 0.5;
    }
    Audio.playSFX('powerup');
  }
}

// ===== STAR ITEM =====
class StarItem extends Entity {
  constructor(x, y) {
    super(x, y, 28, 28);
    this.vx = 80;
    this.vy = -300;
    this.animTimer = 0;
    this.collected = false;
  }

  update(dt, level) {
    if (this.collected) return;
    this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    level.resolveCollisions(this, (side) => {
      if (side === 'left' || side === 'right') this.vx = -this.vx;
      if (side === 'bottom') this.vy = -350; // bounce
    });
    this.animTimer += 0.1;
  }

  draw(ctx, camX) {
    if (this.collected) return;
    const sx = this.x - camX;
    const frames = C.ANIM.STAR;
    const fname = frames[Math.floor(this.animTimer) % frames.length];
    SS.drawFit(ctx, fname, sx, this.y + C.HUD_H, this.w, this.h);
  }

  collect(player) {
    this.collected = true;
    this.active = false;
    player.score += 1000;
    player.invincible = true;
    player.invincibleTimer = 10;
    Audio.playSFX('powerup');
  }
}

// ===== VISUAL EFFECT =====
class Effect {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.timer = 0;
    this.life = type === 'coin' ? 0.6 : 0.5;
    this.active = true;
    this.vy = type === 'coin' ? -200 : -100;
    this.animTimer = 0;
  }

  update(dt) {
    this.timer += dt;
    this.y += this.vy * dt;
    this.vy += 400 * dt;
    this.animTimer += 0.15;
    if (this.timer >= this.life) this.active = false;
  }

  draw(ctx, camX) {
    if (!this.active) return;
    const sx = this.x - camX;
    const alpha = 1 - this.timer / this.life;
    ctx.globalAlpha = alpha;
    if (this.type === 'coin') {
      const frames = C.ANIM.COIN;
      const fname = frames[Math.floor(this.animTimer) % frames.length];
      SS.draw(ctx, fname, sx - 8, this.y + C.HUD_H - 8, 1, 1, 1.5);
    } else if (this.type === 'brick') {
      ctx.fillStyle = '#c84000';
      ctx.fillRect(sx - 4, this.y + C.HUD_H, 8, 8);
      ctx.fillRect(sx + 4, this.y + C.HUD_H - 8, 8, 8);
    } else if (this.type === 'score') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.scoreVal || '100', sx, this.y + C.HUD_H);
    }
    ctx.globalAlpha = 1;
  }
}

// ===== FLAG =====
class Flag extends Entity {
  constructor(x, y) {
    super(x, y, 8, C.TS * 8);
    this.poleX = x;
    this.flagY = y;
    this.slideTimer = 0;
    this.slid = false;
  }

  draw(ctx, camX) {
    const sx = this.poleX - camX;
    // Flagpole
    ctx.fillStyle = '#888';
    ctx.fillRect(sx, this.flagY + C.HUD_H, 4, C.TS * 9);
    // Pole top ball
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(sx + 2, this.flagY + C.HUD_H - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Flag image
    const flagImg = Loader.getImage('flag.png');
    if (flagImg) {
      const flagH = Math.min(Math.floor((this.slideTimer / 1.5) * C.TS * 6), C.TS * 6);
      ctx.drawImage(flagImg, 0, 0, flagImg.naturalWidth, 64, sx + 4, this.flagY + C.HUD_H + flagH, 20, 20);
    } else {
      ctx.fillStyle = '#00aa00';
      ctx.fillRect(sx + 4, this.flagY + C.HUD_H + 8, 20, 16);
    }
  }
}
