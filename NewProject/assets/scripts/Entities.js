/* All game entity classes (plain JS objects, not cc.Component).
   Positions use screen coords: x,y = top-left, y increases downward.
   Each entity has a .node (cc.Node) placed inside worldContainer. */

// ─── helpers ──────────────────────────────────────────────────────────────
function makeNode(parent, name, w, h) {
    var n = new cc.Node(name);
    n.anchorX = 0; n.anchorY = 1;      // top-left anchor
    n.width = w; n.height = h;
    parent.addChild(n);
    return n;
}
function makeSpriteNode(parent, name, w, h) {
    var n = makeNode(parent, name, w, h);
    n.addComponent(cc.Sprite);
    return n;
}
function setNodePos(node, wx, wy) {   // world (screen) → CC local
    node.x = wx; node.y = -wy;
}

// ─── Player ───────────────────────────────────────────────────────────────
function Player(parent, startX, startY) {
    this.x = startX; this.y = startY;
    this.w = 28; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.big = false;
    this.dead = false;
    this.invTimer = 0;
    this.dir = 1;  // 1=right, -1=left
    this.animTimer = 0; this.animFrame = 0;
    this.state = 'idle'; // idle|walk|jump|skid|die
    this._node = makeSpriteNode(parent, 'Player', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
    this.update = Player_update;
    this.hurt   = Player_hurt;
    this.die    = Player_die;
    this.grow   = Player_grow;
    this.shrink = Player_shrink;
    this._anim  = Player_anim;
    this.syncNode = function() {
        setNodePos(this._node, this.x, this.y);
        this._node.scaleX = this.dir;
        this._node.height = this.h;
        this._node.width  = this.w;
        this._anim();
    };
}

function Player_update(dt, keys, level) {
    if (this.dead) {
        this.vy -= CFG.GRAVITY * dt;   // CC: up=positive, but our vy is screen-down
        // actually in our physics vy is screen-downward (positive=down)
        // re-check: Physics.resolve uses screen coords, vy positive = down
        // So dead bounce: initial vy set negative in die(), then gravity pulls down
        this.vy += CFG.GRAVITY * dt;
        this.y += this.vy * dt;
        return;
    }
    if (this.invTimer > 0) this.invTimer -= dt;

    var run = keys[cc.macro.KEY.shift];
    var spd = run ? CFG.RUN_SPD : CFG.WALK_SPD;

    // horizontal
    var moving = false;
    if (keys[cc.macro.KEY.left] || keys[cc.macro.KEY.a]) {
        this.vx = -spd; this.dir = -1; moving = true;
    } else if (keys[cc.macro.KEY.right] || keys[cc.macro.KEY.d]) {
        this.vx = spd;  this.dir =  1; moving = true;
    } else {
        this.vx *= 0.7;
        if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // jump
    var wantJump = keys[cc.macro.KEY.up] || keys[cc.macro.KEY.w] || keys[cc.macro.KEY.space];
    if (wantJump && this.onGround) {
        this.vy = -CFG.JUMP_VY;   // negative = upward in screen coords
        this.onGround = false;
        AudioMgr.playSFX('jump');
    }

    // gravity
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;

    // move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // clamp left
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // tile collisions
    this.onGround = false;
    level.resolveEntity(this);

    // determine animation state
    if (!this.onGround) this.state = 'jump';
    else if (moving) {
        var braking = (this.vx > 0 && this.dir < 0) || (this.vx < 0 && this.dir > 0);
        this.state = braking ? 'skid' : 'walk';
    } else this.state = 'idle';
}

function Player_anim() {
    var A = CFG.ANIM;
    var frames;
    var b = this.big;
    switch (this.state) {
        case 'idle':  frames = b ? A.B_IDLE : A.S_IDLE; break;
        case 'walk':  frames = b ? A.B_WALK : A.S_WALK; break;
        case 'jump':  frames = b ? A.B_JUMP : A.S_JUMP; break;
        case 'skid':  frames = b ? A.B_SKID : A.S_SKID; break;
        case 'die':   frames = A.S_DIE; break;
        default:      frames = A.S_IDLE;
    }
    if (frames.length > 1) {
        this.animTimer += 1/60;
        if (this.animTimer >= 0.1) { this.animTimer = 0; this.animFrame = (this.animFrame+1) % frames.length; }
    }
    SPR.setSprite(this._spr, frames[this.animFrame % frames.length]);

    // flashing when invincible
    this._node.opacity = (this.invTimer > 0 && Math.floor(this.invTimer * 10) % 2 === 0) ? 80 : 255;
}

function Player_hurt(game) {
    if (this.invTimer > 0) return;
    if (this.big) {
        this.shrink();
        AudioMgr.playSFX('powerDown');
    } else {
        this.die(game);
    }
}

function Player_die(game) {
    if (this.dead) return;
    this.dead = true;
    this.state = 'die';
    this.vy = -500;
    this.vx = 0;
    AudioMgr.stopBGM();
    AudioMgr.playSFX('die');
    game.onPlayerDead();
}

function Player_grow() {
    if (this.big) return;
    this.big = true;
    this.h = 58;
    this.y -= 28;   // grow upward
    this.w = 28;
}

function Player_shrink() {
    if (!this.big) return;
    this.big = false;
    this.h = 30;
    this.y += 28;
    this.invTimer = 2;
}

// ─── Goomba ───────────────────────────────────────────────────────────────
function Goomba(parent, wx, wy) {
    this.x = wx; this.y = wy;
    this.w = 30; this.h = 30;
    this.vx = -80; this.vy = 0;
    this.dead = false; this.deadTimer = 0;
    this.animTimer = 0; this.animFrame = 0;
    this._node = makeSpriteNode(parent, 'Goomba', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.ANIM.G_WALK[0]);
}
Goomba.prototype.stomp = function() {
    this.dead = true; this.vx = 0; this.vy = 0;
    this.deadTimer = 0.5;
    SPR.setSprite(this._spr, CFG.ANIM.G_DEAD[0]);
    AudioMgr.playSFX('stomp');
};
Goomba.prototype.update = function(dt, level) {
    if (this.dead) {
        this.deadTimer -= dt;
        if (this.deadTimer <= 0) { this._node.active = false; this.removed = true; }
        return;
    }
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    level.resolveEntity(this);
    // animate
    this.animTimer += dt;
    if (this.animTimer >= 0.25) { this.animTimer = 0; this.animFrame ^= 1; }
    SPR.setSprite(this._spr, CFG.ANIM.G_WALK[this.animFrame]);
};
Goomba.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); };

// ─── Turtle ───────────────────────────────────────────────────────────────
function Turtle(parent, wx, wy) {
    this.x = wx; this.y = wy;
    this.w = 28; this.h = 40;
    this.vx = -80; this.vy = 0;
    this.state = 'walk'; // walk|shell|slide
    this.shellTimer = 0;
    this.animTimer = 0; this.animFrame = 0;
    this._node = makeSpriteNode(parent, 'Turtle', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
}
Turtle.prototype.stomp = function() {
    if (this.state === 'walk') {
        this.state = 'shell';
        this.vx = 0;
        this.h = 30; this.y += 10;
        this.shellTimer = 4;
        AudioMgr.playSFX('stomp');
    } else if (this.state === 'shell') {
        // kick
        this.state = 'slide';
        this.vx = 300;
        AudioMgr.playSFX('kick');
    } else {
        this.state = 'shell';
        this.vx = 0;
    }
};
Turtle.prototype.update = function(dt, level) {
    if (this.removed) return;
    if (this.state === 'shell') {
        this.shellTimer -= dt;
        if (this.shellTimer <= 0) { this.state = 'walk'; this.vx = -80; }
    }
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    level.resolveEntity(this);
    // animate
    if (this.state === 'walk') {
        this.animTimer += dt;
        if (this.animTimer >= 0.2) { this.animTimer = 0; this.animFrame ^= 1; }
        SPR.setSprite(this._spr, CFG.ANIM.T_WALK[this.animFrame]);
        this._node.scaleX = (this.vx >= 0) ? 1 : -1;
    } else {
        SPR.setSprite(this._spr, CFG.ANIM.T_SHELL[0]);
    }
};
Turtle.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); this._node.height = this.h; };

// ─── QuestionBlock ────────────────────────────────────────────────────────
function QuestionBlock(parent, col, row, type) {
    var TS = CFG.TS;
    this.x = col * TS; this.y = row * TS;
    this.w = TS; this.h = TS;
    this.col = col; this.row = row;
    this.type = type; // 'mushroom'|'coin'|'star'
    this.used = false;
    this.bumpY = 0; this.bumpDir = -1; this.bumpTimer = 0;
    this.animTimer = 0; this.animFrame = 0;
    this._node = makeSpriteNode(parent, 'QB', TS, TS);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.ANIM.Q_ANIM[0]);
}
QuestionBlock.prototype.bump = function(game) {
    if (this.used) return;
    this.used = true;
    this.bumpTimer = 0.2;
    SPR.setSprite(this._spr, CFG.ANIM.Q_USED[0]);
    game.spawnItem(this);
    AudioMgr.playSFX('powerUpAppear');
};
QuestionBlock.prototype.update = function(dt) {
    if (this.bumpTimer > 0) {
        this.bumpTimer -= dt;
        this.bumpY = this.bumpTimer > 0.1 ? -10 : 0;
    } else { this.bumpY = 0; }
    if (!this.used) {
        this.animTimer += dt;
        if (this.animTimer >= 0.15) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % CFG.ANIM.Q_ANIM.length;
            SPR.setSprite(this._spr, CFG.ANIM.Q_ANIM[this.animFrame]);
        }
    }
};
QuestionBlock.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y + this.bumpY); };

// ─── BrickBlock ───────────────────────────────────────────────────────────
function BrickBlock(parent, col, row) {
    var TS = CFG.TS;
    this.x = col * TS; this.y = row * TS;
    this.w = TS; this.h = TS;
    this.bumpTimer = 0; this.bumpY = 0;
    this._node = makeSpriteNode(parent, 'Brick', TS, TS);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.TILE_SPR[2]);
}
BrickBlock.prototype.bump = function(player, game) {
    if (player.big) {
        this._node.active = false;
        this.removed = true;
        AudioMgr.playSFX('stomp');
    } else {
        this.bumpTimer = 0.2;
    }
};
BrickBlock.prototype.update = function(dt) {
    if (this.bumpTimer > 0) { this.bumpTimer -= dt; this.bumpY = this.bumpTimer > 0.1 ? -8 : 0; }
    else this.bumpY = 0;
};
BrickBlock.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y + this.bumpY); };

// ─── Mushroom ─────────────────────────────────────────────────────────────
function Mushroom(parent, wx, wy) {
    this.x = wx; this.y = wy;
    this.w = 28; this.h = 28;
    this.vx = 80; this.vy = 0;
    this._node = makeSpriteNode(parent, 'Mush', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.ANIM.MUSH[0]);
}
Mushroom.prototype.update = function(dt, level) {
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    level.resolveEntity(this);
};
Mushroom.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); };

// ─── StarItem ─────────────────────────────────────────────────────────────
function StarItem(parent, wx, wy) {
    this.x = wx; this.y = wy;
    this.w = 28; this.h = 28;
    this.vx = 100; this.vy = -300;
    this._node = makeSpriteNode(parent, 'Star', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.ANIM.STAR[0]);
}
StarItem.prototype.update = function(dt, level) {
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (level.resolveEntity(this).bottom) this.vy = -350;
};
StarItem.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); };

// ─── ScorePopup ───────────────────────────────────────────────────────────
function ScorePopup(parent, text, wx, wy) {
    this.x = wx; this.y = wy;
    this.life = 0.8;
    var n = makeNode(parent, 'score', 50, 20);
    var lbl = n.addComponent(cc.Label);
    lbl.string = String(text);
    lbl.fontSize = 18;
    lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    lbl.node.color = cc.Color.YELLOW;
    this._node = n;
}
ScorePopup.prototype.update = function(dt) {
    this.life -= dt; this.y -= 60 * dt;
    this._node.opacity = Math.max(0, this.life / 0.8 * 255);
    if (this.life <= 0) { this._node.active = false; this.removed = true; }
};
ScorePopup.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); };
