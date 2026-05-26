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
    var s = n.addComponent(cc.Sprite);
    s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    s.trim = false;
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
    this.starTimer = 0;     // star power-up (rainbow + speed + enemy kill)
    this._stompCooldown = 0;
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
        var useRotated = this.big && !this.dead;
        if (useRotated) {
            // big mario sprites are stored sideways → center anchor + 90° CCW
            // face left achieved by flipping vertically BEFORE rotation (scale-then-rotate order)
            this._node.anchorX = 0.5; this._node.anchorY = 0.5;
            this._node.width  = this.h;
            this._node.height = this.w;
            this._node.angle  = 90;
            this._node.scaleX = 1;
            this._node.scaleY = (this.dir > 0) ? 1 : -1;
            this._node.x = this.x + this.w / 2;
            this._node.y = -(this.y + this.h / 2);
        } else {
            this._node.anchorX = 0; this._node.anchorY = 1;
            this._node.width  = this.w;
            this._node.height = this.h;
            this._node.angle  = 0;
            this._node.scaleY = 1;
            if (this.dir < 0) {
                this._node.scaleX = -1;
                this._node.x = this.x + this.w;
            } else {
                this._node.scaleX = 1;
                this._node.x = this.x;
            }
            this._node.y = -this.y;
        }
        this._anim();
    };
}

function Player_update(dt, keys, level) {
    if (this.dead) {
        // up-bounce then fall: initial vy set negative in die(), gravity pulls back down
        this.vy += CFG.GRAVITY * dt;
        this.y += this.vy * dt;
        return;
    }
    if (this.invTimer > 0) this.invTimer -= dt;
    if (this.starTimer > 0) this.starTimer -= dt;
    if (this._stompCooldown > 0) this._stompCooldown -= dt;

    var run = keys[cc.macro.KEY.shift];
    var starBoost = this.starTimer > 0 ? 1.5 : 1;
    var spd = (run ? CFG.RUN_SPD : CFG.WALK_SPD) * starBoost;
    this._running = run;

    var crouchKey = keys[cc.macro.KEY.s] || keys[cc.macro.KEY.down];

    // big mario shrinks while crouching on ground
    if (this.big) {
        var wantShrunk = crouchKey && this.onGround;
        if (wantShrunk && !this._crouchShrunk) {
            this._crouchShrunk = true;
            var oldH = this.h;
            this.h = 40;
            this.y += oldH - this.h;     // keep feet on ground
        } else if (!wantShrunk && this._crouchShrunk) {
            this._crouchShrunk = false;
            var oldH2 = this.h;
            this.h = 60;
            this.y -= this.h - oldH2;
        }
    }

    // horizontal — disabled while crouching on ground
    var moving = false;
    if (!(crouchKey && this.onGround)) {
        if (keys[cc.macro.KEY.left] || keys[cc.macro.KEY.a]) {
            this.vx = -spd; this.dir = -1; moving = true;
        } else if (keys[cc.macro.KEY.right] || keys[cc.macro.KEY.d]) {
            this.vx = spd;  this.dir =  1; moving = true;
        } else {
            this.vx *= 0.7;
            if (Math.abs(this.vx) < 5) this.vx = 0;
        }
    } else {
        this.vx *= 0.5;
        if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // jump — disabled while crouching
    var wantJump = keys[cc.macro.KEY.up] || keys[cc.macro.KEY.w] || keys[cc.macro.KEY.space];
    if (wantJump && this.onGround && !crouchKey) {
        this.vy = -CFG.JUMP_VY;
        this.onGround = false;
        AudioMgr.playSFX('jump');
    }

    // ground-pound / fast fall: S while in the air
    if (crouchKey && !this.onGround && this.state !== 'fall') {
        this.state = 'fall';
        this.vy = Math.max(this.vy, 500);   // accelerate downward
    }

    // gravity
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;

    // remember previous bottom for one-way platform check
    this._prevBottom = this.y + this.h;

    // move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0) { this.x = 0; this.vx = 0; }

    this.onGround = false;
    level.resolveEntity(this);

    // determine animation state
    if (this.state === 'fall' && (crouchKey || !this.onGround)) {
        // stay in fall: still falling, OR landed but still holding S
    } else if (!this.onGround) {
        this.state = 'jump';
    } else if (crouchKey) {
        this.state = 'crouch';
    } else if (moving) {
        var braking = (this.vx > 0 && this.dir < 0) || (this.vx < 0 && this.dir > 0);
        this.state = braking ? 'skid' : 'walk';
    } else {
        this.state = 'idle';
    }
}

function Player_anim() {
    var A = CFG.ANIM;
    var frames;
    var b = this.big;
    switch (this.state) {
        case 'idle':   frames = b ? A.B_IDLE   : A.S_IDLE;   break;
        case 'walk':   frames = b ? A.B_WALK   : A.S_WALK;   break;
        case 'jump':   frames = b ? A.B_JUMP   : A.S_JUMP;   break;
        case 'skid':   frames = b ? A.B_SKID   : A.S_SKID;   break;
        case 'crouch': frames = b ? A.B_CROUCH : A.S_CROUCH; break;
        case 'fall':   frames = b ? A.B_FALL   : A.S_FALL;   break;
        case 'die':    frames = A.S_DIE; break;
        default:       frames = A.S_IDLE;
    }
    if (frames.length > 1) {
        this.animTimer += 1/60;
        var threshold = (this.state === 'walk' && !this._running) ? 0.75 : 0.3;
        if (this.animTimer >= threshold) { this.animTimer = 0; this.animFrame = (this.animFrame+1) % frames.length; }
    }
    SPR.setSprite(this._spr, frames[this.animFrame % frames.length]);

    // star power-up: rainbow cycling color
    if (this.starTimer > 0) {
        var rainbow = [
            cc.color(255,  60,  60),
            cc.color(255, 180,  40),
            cc.color(255, 255,  60),
            cc.color( 80, 255,  80),
            cc.color( 60, 200, 255),
            cc.color(200,  80, 255),
        ];
        var idx = Math.floor(this.starTimer * 20) % rainbow.length;
        this._node.color = rainbow[idx];
        this._node.opacity = 255;
    } else {
        this._node.color = cc.Color.WHITE;
        // flashing when hurt-invincible
        this._node.opacity = (this.invTimer > 0 && Math.floor(this.invTimer * 10) % 2 === 0) ? 80 : 255;
    }
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
Goomba.prototype.spinKill = function() {
    this.dead = true;
    this._spinKilled = true;
    this.vx = 200; this.vy = -450;     // up-right launch
    this._spin = 720;                   // deg/s
    this._spinAngle = 0;
    this._lifeTimer = 1.5;
    AudioMgr.playSFX('stomp');
};
Goomba.prototype.update = function(dt, level) {
    if (this._spinKilled) {
        this.vy += CFG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this._spinAngle += this._spin * dt;
        this._lifeTimer -= dt;
        if (this._lifeTimer <= 0) { this._node.active = false; this.removed = true; }
        return;
    }
    if (this.dead) {
        this.deadTimer -= dt;
        if (this.deadTimer <= 0) { this._node.active = false; this.removed = true; }
        return;
    }
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    var res = level.resolveEntity(this);
    if ((res.right && this.vx > 0) || (res.left && this.vx < 0)) this.vx = -this.vx;
    this.animTimer += dt;
    if (this.animTimer >= 0.25) { this.animTimer = 0; this.animFrame ^= 1; }
    SPR.setSprite(this._spr, CFG.ANIM.G_WALK[0]);
};
Goomba.prototype.syncNode = function() {
    if (this._spinKilled) {
        this._node.anchorX = 0.5; this._node.anchorY = 0.5;
        this._node.x = this.x + this.w / 2;
        this._node.y = -(this.y + this.h / 2);
        this._node.angle = -this._spinAngle;   // CW for upward right
        this._node.scaleX = 1;
        return;
    }
    if (!this.dead && this.animFrame) {
        this._node.scaleX = -1;
        this._node.x = this.x + this.w;
    } else {
        this._node.scaleX = 1;
        this._node.x = this.x;
    }
    this._node.y = -this.y;
};

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
Turtle.prototype.spinKill = function() {
    this.dead = true;
    this._spinKilled = true;
    this.vx = 200; this.vy = -450;
    this._spin = 720;
    this._spinAngle = 0;
    this._lifeTimer = 1.5;
    AudioMgr.playSFX('stomp');
};
Turtle.prototype.update = function(dt, level) {
    if (this.removed) return;
    if (this._spinKilled) {
        this.vy += CFG.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this._spinAngle += this._spin * dt;
        this._lifeTimer -= dt;
        if (this._lifeTimer <= 0) { this._node.active = false; this.removed = true; }
        return;
    }
    // turtle stays in shell once stomped (no recovery)
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    var res = level.resolveEntity(this);
    if ((res.right && this.vx > 0) || (res.left && this.vx < 0)) this.vx = -this.vx;
    // animate
    if (this.state === 'walk') {
        this.animTimer += dt;
        if (this.animTimer >= 0.2) { this.animTimer = 0; this.animFrame ^= 1; }
        SPR.setSprite(this._spr, CFG.ANIM.T_WALK[this.animFrame]);
    } else if (this.state === 'shell') {
        SPR.setSprite(this._spr, CFG.ANIM.T_SHELL[0]);
        this.animFrame = 0; this.animTimer = 0;
    } else {
        // slide — cycle through T_SLIDE frames (faster cycling for faster vx)
        this.animTimer += dt;
        if (this.animTimer >= 0.05) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % CFG.ANIM.T_SLIDE.length;
        }
        SPR.setSprite(this._spr, CFG.ANIM.T_SLIDE[this.animFrame]);
    }
};
Turtle.prototype.syncNode = function() {
    if (this._spinKilled) {
        this._node.anchorX = 0.5; this._node.anchorY = 0.5;
        this._node.x = this.x + this.w / 2;
        this._node.y = -(this.y + this.h / 2);
        this._node.angle = -this._spinAngle;
        this._node.scaleX = 1;
        this._node.height = this.h;
        return;
    }
    this._node.anchorX = 0; this._node.anchorY = 1;
    this._node.angle = 0;
    if (this.vx > 0) {
        this._node.scaleX = -1;
        this._node.x = this.x + this.w;
    } else {
        this._node.scaleX = 1;
        this._node.x = this.x;
    }
    this._node.y = -this.y;
    this._node.height = this.h;
};

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
    // SFX is played inside spawnItem based on content type
    game.spawnItem(this);
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
    SPR.setSprite(this._spr, 'items_19.png');
}
BrickBlock.prototype._break = function(game) {
    this._node.active = false;
    this.removed = true;
    AudioMgr.playSFX('stomp');
    var lvl = game._level;
    if (lvl) {
        var cx = this.x;
        var cy = this.y;
        lvl._effects.push(new BrickDebris(lvl._worldNode, cx,        cy,        -160, -380));
        lvl._effects.push(new BrickDebris(lvl._worldNode, cx + 16, cy,         160, -380));
        lvl._effects.push(new BrickDebris(lvl._worldNode, cx,        cy + 16, -120, -260));
        lvl._effects.push(new BrickDebris(lvl._worldNode, cx + 16, cy + 16,  120, -260));
    }
};
BrickBlock.prototype.bump = function(player, game) {
    if (player.big || player.state === 'fall') {
        this._break(game);
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

// ─── Coin (pop-out effect from question block) ────────────────────────────
function Coin(parent, wx, wy) {
    this.x = wx; this.y = wy;
    this.startY = wy;
    this.w = 28; this.h = 28;
    this.vy = -500;
    this.phase = 'pop';
    this.life = 0.2;
    this.animTimer = 0; this.animFrame = 0;
    this._node = makeSpriteNode(parent, 'Coin', this.w, this.h);
    this._spr  = this._node.getComponent(cc.Sprite);
    SPR.setSprite(this._spr, CFG.ANIM.COIN[0]);
}
Coin.prototype.update = function(dt) {
    if (this.phase === 'pop') {
        // pop upward, gravity pulls back to origin
        this.vy += CFG.GRAVITY * 2 * dt;
        this.y += this.vy * dt;
        // cycle through items_1/2/3
        this.animTimer += dt;
        if (this.animTimer >= 0.05) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % CFG.ANIM.COIN.length;
            SPR.setSprite(this._spr, CFG.ANIM.COIN[this.animFrame]);
        }
        // returned to (or past) origin → switch to effect phase
        if (this.y >= this.startY) {
            this.y = this.startY;
            this.phase = 'fx';
            this.animTimer = 0;
            this.animFrame = 0;
            SPR.setSprite(this._spr, 'effects_0.png');
        }
    } else {
        // play effects_0..3 once, then disappear
        this.animTimer += dt;
        if (this.animTimer >= 0.05) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame < 4) {
                SPR.setSprite(this._spr, 'effects_' + this.animFrame + '.png');
            } else {
                this._node.active = false; this.removed = true;
            }
        }
    }
};
Coin.prototype.syncNode = function() { setNodePos(this._node, this.x, this.y); };

// ─── BrickDebris (4 pieces flying out when brick breaks) ──────────────────
function BrickDebris(parent, wx, wy, vx, vy) {
    this.x = wx; this.y = wy;
    this.w = 18; this.h = 18;
    this.vx = vx; this.vy = vy;
    this.life = 0.8;
    this._spin = (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 400);
    // build node manually with center anchor (safer than mutating after add)
    var n = new cc.Node('Debris');
    n.anchorX = 0.5; n.anchorY = 0.5;
    n.width = this.w; n.height = this.h;
    var s = n.addComponent(cc.Sprite);
    s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    s.trim = false;
    parent.addChild(n);
    this._node = n;
    this._spr  = s;
    SPR.setSprite(s, 'items_19.png');
}
BrickDebris.prototype.update = function(dt) {
    this.vy += CFG.GRAVITY * dt;
    if (this.vy > CFG.MAX_FALL) this.vy = CFG.MAX_FALL;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this._node.angle = (this._node.angle || 0) + this._spin * dt;
    if (this.life <= 0) { this._node.active = false; this.removed = true; }
};
BrickDebris.prototype.syncNode = function() {
    // center-anchored, so position at center
    this._node.x = this.x + this.w / 2;
    this._node.y = -(this.y + this.h / 2);
};

// Expose entity classes globally so other scripts can reference them
window.Player = Player;
window.Goomba = Goomba;
window.Turtle = Turtle;
window.QuestionBlock = QuestionBlock;
window.BrickBlock = BrickBlock;
window.Mushroom = Mushroom;
window.StarItem = StarItem;
window.ScorePopup = ScorePopup;
window.Coin = Coin;
window.BrickDebris = BrickDebris;
