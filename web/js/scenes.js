// ===== SCENE MANAGER =====
class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.current = null;
    this.scenes = {};
  }

  register(name, scene) { this.scenes[name] = scene; scene.manager = this; }

  goto(name, data) {
    if (this.current && this.current.onExit) this.current.onExit();
    this.current = this.scenes[name];
    if (this.current && this.current.onEnter) this.current.onEnter(data);
  }

  update(dt, keys) { if (this.current) this.current.update(dt, keys); }
  draw() { if (this.current) this.current.draw(this.ctx); }
}

// ===== START MENU =====
class StartMenuScene {
  constructor() {
    this.btnHover = -1;
    this.btns = [
      { label: 'START GAME',   x: C.W/2 - 120, y: 240, w: 240, h: 50, action: 'levelselect' },
      { label: 'LEVEL SELECT', x: C.W/2 - 120, y: 310, w: 240, h: 50, action: 'levelselect' },
    ];
    this.t = 0;
  }

  onEnter() {
    Audio.playBGM('bgm2');
    document.addEventListener('mousemove', this._onMouse = e => this._hover(e));
    document.addEventListener('click', this._onClick = e => this._click(e));
  }

  onExit() {
    document.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('click', this._onClick);
  }

  _hover(e) {
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    const scaleX = C.W / rect.width, scaleY = C.H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    this.btnHover = this.btns.findIndex(b =>
      mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
  }

  _click(e) {
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    const scaleX = C.W / rect.width, scaleY = C.H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    for (const btn of this.btns) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        Audio.playSFX('jump');
        this.manager.goto(btn.action);
        return;
      }
    }
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    // Background
    const bg = Loader.getImage('menu_bg.png');
    if (bg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg, 0, 0, C.W, C.H);
    } else {
      const grad = ctx.createLinearGradient(0,0,0,C.H);
      grad.addColorStop(0,'#1a1a5e'); grad.addColorStop(1,'#0a0a2a');
      ctx.fillStyle = grad; ctx.fillRect(0,0,C.W,C.H);
    }

    // Title
    const t0 = Loader.getImage('title_0.png');
    const t1 = Loader.getImage('title_1.png');
    if (t0) ctx.drawImage(t0, C.W/2 - 160, 60, 320, 130);
    else {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 56px "Courier New"';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#c00'; ctx.lineWidth = 4;
      ctx.strokeText('WEB MARIO', C.W/2, 120);
      ctx.fillText('WEB MARIO', C.W/2, 120);
    }
    if (t1) ctx.drawImage(t1, C.W/2 - 70, 130, 140, 90);

    // Animated subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,200,${0.6 + 0.4 * Math.sin(this.t * 2)})`;
    ctx.font = '18px "Courier New"';
    ctx.fillText('~ CS2410 Software Studio ~', C.W/2, 210);

    // Buttons
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i];
      const hover = i === this.btnHover;
      ctx.fillStyle = hover ? '#ffd700' : '#3060c0';
      ctx.strokeStyle = hover ? '#fff' : '#aac0ff';
      ctx.lineWidth = 3;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = hover ? '#000' : '#fff';
      ctx.font = 'bold 20px "Courier New"';
      ctx.fillText(b.label, C.W/2, b.y + 32);
    }

    // Controls hint
    ctx.fillStyle = '#888';
    ctx.font = '13px monospace';
    ctx.fillText('Arrow Keys / WASD to move  |  Space / W to jump  |  M to mute', C.W/2, C.H - 20);
    ctx.textAlign = 'left';
  }
}

// ===== LEVEL SELECT =====
class LevelSelectScene {
  constructor() {
    this.selectedLevel = 0;
    this.levels = [
      { name:'WORLD 1-1', desc:'Classic grassland', world:'1-1' },
    ];
    this.t = 0;
  }

  onEnter() {
    Audio.playBGM('bgm2');
    document.addEventListener('click', this._onClick = e => this._click(e));
    document.addEventListener('keydown', this._onKey = e => this._key(e));
  }

  onExit() {
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('keydown', this._onKey);
  }

  _key(e) {
    if (e.code === 'Enter' || e.code === 'Space') {
      Audio.playSFX('jump');
      this.manager.goto('game', { levelIndex: this.selectedLevel });
    }
    if (e.code === 'Escape') this.manager.goto('menu');
    if (e.code === 'ArrowLeft') this.selectedLevel = Math.max(0, this.selectedLevel - 1);
    if (e.code === 'ArrowRight') this.selectedLevel = Math.min(this.levels.length-1, this.selectedLevel+1);
    e.preventDefault();
  }

  _click(e) {
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    const scaleX = C.W/rect.width, scaleY = C.H/rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    // Click on level card
    for (let i = 0; i < this.levels.length; i++) {
      const lx = C.W/2 - 120 + i * 260, ly = 200;
      if (mx >= lx && mx <= lx+240 && my >= ly && my <= ly+200) {
        if (this.selectedLevel === i) {
          this.manager.goto('game', { levelIndex: i });
        } else {
          this.selectedLevel = i;
        }
        Audio.playSFX('jump');
        return;
      }
    }
    // Start button
    if (mx >= C.W/2-80 && mx <= C.W/2+80 && my >= 430 && my <= 465) {
      Audio.playSFX('jump');
      this.manager.goto('game', { levelIndex: this.selectedLevel });
    }
    // Back button
    if (mx >= 20 && mx <= 100 && my >= 10 && my <= 40) this.manager.goto('menu');
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    const grad = ctx.createLinearGradient(0,0,0,C.H);
    grad.addColorStop(0,'#1a2a5e'); grad.addColorStop(1,'#0a1a3a');
    ctx.fillStyle = grad; ctx.fillRect(0,0,C.W,C.H);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT LEVEL', C.W/2, 80);

    // Level cards
    for (let i = 0; i < this.levels.length; i++) {
      const lv = this.levels[i];
      const lx = C.W/2 - 120 + i * 260, ly = 130;
      const selected = i === this.selectedLevel;
      ctx.fillStyle = selected ? '#2060d0' : '#1a3070';
      ctx.strokeStyle = selected ? '#ffd700' : '#446';
      ctx.lineWidth = selected ? 4 : 2;
      roundRect(ctx, lx, ly, 240, 220, 12); ctx.fill(); ctx.stroke();

      // World icon (cloud + hills)
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(lx+10, ly+10, 220, 120);
      // Hills
      ctx.fillStyle = '#228820';
      ctx.beginPath(); ctx.arc(lx+70, ly+130, 50, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.arc(lx+170, ly+130, 40, 0, Math.PI); ctx.fill();
      // Cloud
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(lx+130, ly+50, 20, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(lx+150, ly+45, 24, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(lx+170, ly+50, 18, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = selected ? '#ffd700' : '#aac0ff';
      ctx.font = 'bold 18px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(lv.name, lx+120, ly+160);
      ctx.fillStyle = '#aaa';
      ctx.font = '13px monospace';
      ctx.fillText(lv.desc, lx+120, ly+185);
      if (selected) {
        ctx.fillStyle = `rgba(255,255,0,${0.5+0.5*Math.sin(this.t*3)})`;
        ctx.font = '13px monospace';
        ctx.fillText('▶ SELECTED ◀', lx+120, ly+205);
      }
    }

    // Start button
    ctx.fillStyle = '#ff8000';
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
    roundRect(ctx, C.W/2-100, 370, 200, 50, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "Courier New"';
    ctx.fillText('START!', C.W/2, 402);

    // Back button
    ctx.fillStyle = '#444'; ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
    roundRect(ctx, 20, 10, 80, 30, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
    ctx.fillText('◀ BACK', 30, 30);

    ctx.textAlign = 'left';
  }
}

// ===== GAME SCENE =====
class GameScene {
  constructor() {
    this.player = null;
    this.level = null;
    this.camX = 0;
    this.paused = false;
    this.timer = C.TIMER;
    this.timerAccum = 0;
    this.state = 'playing'; // 'playing' | 'dying' | 'levelclear' | 'over'
    this.levelClearTimer = 0;
    this.world = '1-1';
    this._keys = {};
  }

  onEnter(data) {
    const d = buildLevel1();
    this.level = new Level(d);
    const ps = d.playerStart;
    this.player = new Player(ps.c * C.TS, ps.r * C.TS);
    this.camX = 0;
    this.paused = false;
    this.timer = C.TIMER;
    this.timerAccum = 0;
    this.state = 'playing';
    this.levelClearTimer = 0;
    Audio.playBGM('bgm1');

    this._keydown = e => { this._keys[e.code] = true; e.preventDefault(); };
    this._keyup   = e => { this._keys[e.code] = false; };
    document.addEventListener('keydown', this._keydown);
    document.addEventListener('keyup',   this._keyup);
  }

  onExit() {
    document.removeEventListener('keydown', this._keydown);
    document.removeEventListener('keyup',   this._keyup);
    Audio.stopBGM();
  }

  update(dt) {
    // Pause toggle
    if (this._keys['KeyP'] || this._keys['Escape']) {
      if (!this._pauseHeld) {
        this.paused = !this.paused;
        this._pauseHeld = true;
      }
    } else {
      this._pauseHeld = false;
    }
    // Mute
    if (this._keys['KeyM'] && !this._muteHeld) {
      Audio.toggleMute();
      this._muteHeld = true;
    } else if (!this._keys['KeyM']) {
      this._muteHeld = false;
    }

    if (this.paused) return;

    if (this.state === 'playing') {
      // Timer
      this.timerAccum += dt;
      if (this.timerAccum >= 1) { this.timerAccum -= 1; this.timer--; }
      if (this.timer <= 0) {
        this.timer = 0;
        this.player.die();
      }

      this.player.update(dt, this._keys, this.level);
      this.level.update(dt, this.player, (pts, x, y) => {
        const ef = new Effect(x, y, 'score');
        ef.scoreVal = pts;
        this.level.effects.push(ef);
      });

      // Level clear
      if (this.player.onFlag) {
        this.state = 'levelclear';
        this.levelClearTimer = 4;
        this.player.score += Math.floor(this.timer) * 50;
        this.timer = 0;
      }

      // Death -> game over / respawn
      if (this.player.dead && this.player.deadTimer <= 0) {
        if (this.player.lives <= 0) {
          this.state = 'over';
          const finalScore = this.player.score;
          setTimeout(() => this.manager.goto('gameover', {
            score: finalScore
          }), 2000);
        } else {
          this.state = 'dying';
          const savedScore = this.player.score;
          const savedLives = this.player.lives;
          setTimeout(() => {
            this.level._init();  // reset level entities
            const ps = this.level.data.playerStart;
            this.player = new Player(ps.c * C.TS, ps.r * C.TS);
            this.player.score = savedScore;
            this.player.lives = savedLives;
            this.player.invincible = true;
            this.player.invincibleTimer = 2.5;
            this.camX = 0;
            this._minCamX = 0;
            this.timer = C.TIMER;
            this.state = 'playing';
            Audio.playBGM('bgm1');
          }, 2500);
        }
      }
    }

    if (this.state === 'levelclear') {
      this.levelClearTimer -= dt;
      this.player.update(dt, {}, this.level);
      if (this.levelClearTimer <= 0) {
        this.manager.goto('levelclear', {
          score: this.player.score,
          lives: this.player.lives
        });
      }
    }

    // Camera: follow player, min 0, max level width - canvas
    const targetCam = this.player.x + this.player.w / 2 - C.W / 2;
    const maxCam = this.level.width - C.W;
    this.camX = Math.max(0, Math.min(maxCam, targetCam));
    // Never scroll left (Mario can't go back)
    this.camX = Math.max(this.camX, this._minCamX || 0);
    if (!this._minCamX) this._minCamX = 0;
    this._minCamX = this.camX;
  }

  draw(ctx) {
    this.level.drawBackground(ctx, this.camX);
    this.level.drawTiles(ctx, this.camX);
    this.level.drawBlocks(ctx, this.camX);
    this.level.drawEntities(ctx, this.camX);
    this.player.draw(ctx, this.camX);
    HUD.draw(ctx, this.player, this.timer, this.world);
    if (this.paused) HUD.drawPause(ctx);

    if (this.state === 'levelclear') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, C.HUD_H, C.W, C.GAME_H);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 40px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('COURSE CLEAR!', C.W/2, C.H/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '22px monospace';
      ctx.fillText('Score: ' + this.player.score, C.W/2, C.H/2 + 25);
      ctx.textAlign = 'left';
    }
    if (this.state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,C.W,C.H);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 48px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', C.W/2, C.H/2);
      ctx.textAlign = 'left';
    }
  }
}

// ===== GAME OVER =====
class GameOverScene {
  constructor() { this.t = 0; this.score = 0; }

  onEnter(data) {
    this.score = data ? data.score : 0;
    this.t = 0;
    Audio.stopBGM();
    Audio.playSFX('gameover');
    document.addEventListener('keydown', this._onKey = e => {
      if (e.code === 'Space' || e.code === 'Enter') this.manager.goto('menu');
      if (e.code === 'KeyR') this.manager.goto('game');
      e.preventDefault();
    });
    document.addEventListener('click', this._onClick = () => this.manager.goto('menu'));
  }

  onExit() {
    document.removeEventListener('keydown', this._onKey);
    document.removeEventListener('click', this._onClick);
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,C.W,C.H);
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 56px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', C.W/2, C.H/2 - 60);
    ctx.fillStyle = '#ffd700';
    ctx.font = '28px monospace';
    ctx.fillText('Score: ' + this.score, C.W/2, C.H/2);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(this.t * 3)})`;
    ctx.font = '20px monospace';
    ctx.fillText('Press SPACE or click to continue', C.W/2, C.H/2 + 60);
    ctx.fillStyle = '#666';
    ctx.font = '16px monospace';
    ctx.fillText('R = Retry', C.W/2, C.H/2 + 100);
    ctx.textAlign = 'left';
  }
}

// ===== LEVEL CLEAR =====
class LevelClearScene {
  constructor() { this.t = 0; this.score = 0; }

  onEnter(data) {
    this.score = data ? data.score : 0;
    this.t = 0;
    document.addEventListener('keydown', this._onKey = e => {
      if (e.code === 'Space' || e.code === 'Enter') this.manager.goto('menu');
      e.preventDefault();
    });
    document.addEventListener('click', this._onClick = () => this.manager.goto('menu'));
  }

  onExit() {
    document.removeEventListener('keydown', this._onKey);
    document.removeEventListener('click', this._onClick);
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    const grad = ctx.createLinearGradient(0,0,0,C.H);
    grad.addColorStop(0,'#1a1a5e'); grad.addColorStop(1,'#0a0a2a');
    ctx.fillStyle = grad; ctx.fillRect(0,0,C.W,C.H);

    // Stars
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + this.t * 0.3;
      const r = 180 + Math.sin(this.t + i) * 20;
      ctx.fillStyle = `rgba(255,255,0,${0.3+0.7*Math.abs(Math.sin(i+this.t*2))})`;
      ctx.beginPath();
      ctx.arc(C.W/2 + Math.cos(angle)*r*0.8, C.H/2 + Math.sin(angle)*r*0.5,
              2+Math.random()*3, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px "Courier New"';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 3;
    ctx.strokeText('YOU WIN!', C.W/2, C.H/2 - 80);
    ctx.fillText('YOU WIN!', C.W/2, C.H/2 - 80);

    ctx.fillStyle = '#fff';
    ctx.font = '28px monospace';
    ctx.fillText('FINAL SCORE: ' + this.score, C.W/2, C.H/2 - 20);

    ctx.fillStyle = `rgba(255,255,180,${0.5+0.5*Math.sin(this.t*2.5)})`;
    ctx.font = '20px monospace';
    ctx.fillText('Press SPACE to return to menu', C.W/2, C.H/2 + 40);
    ctx.textAlign = 'left';
  }
}

// Helper: rounded rectangle path
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
