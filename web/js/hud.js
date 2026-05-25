// HUD: renders score, coins, lives, timer
const HUD = (() => {
  function draw(ctx, player, timer, world = '1-1') {
    // Dark semi-transparent bar
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, C.W, C.HUD_H);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textBaseline = 'top';

    // MARIO / SCORE
    ctx.fillStyle = '#fff';
    ctx.fillText('MARIO', 20, 4);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(String(player.score).padStart(6, '0'), 20, 20);

    // COINS
    ctx.fillStyle = '#fff';
    ctx.fillText('COINS', 180, 4);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('x' + String(player.coins).padStart(2, '0'), 190, 20);

    // WORLD
    ctx.fillStyle = '#fff';
    ctx.fillText('WORLD', 360, 4);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('  ' + world, 360, 20);

    // TIME
    ctx.fillStyle = '#fff';
    ctx.fillText('TIME', 520, 4);
    const t = Math.max(0, Math.ceil(timer));
    ctx.fillStyle = t < 100 ? '#ff4444' : '#ffd700';
    ctx.fillText(String(t).padStart(3, '0'), 530, 20);

    // LIVES (hearts or mario heads)
    ctx.fillStyle = '#fff';
    ctx.fillText('LIVES', 660, 4);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('x ' + player.lives, 665, 20);

    // MUTE indicator
    if (Audio.isMuted()) {
      ctx.fillStyle = '#ff4444';
      ctx.font = '11px monospace';
      ctx.fillText('[M]MUTED', C.W - 80, 4);
    } else {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.fillText('[M]SOUND', C.W - 80, 4);
    }
  }

  function drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, C.HUD_H, C.W, C.GAME_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', C.W / 2, C.H / 2 - 20);
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText('Press P to continue', C.W / 2, C.H / 2 + 20);
    ctx.textAlign = 'left';
  }

  function drawLoading(ctx, progress) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, C.W, C.H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WEB MARIO', C.W / 2, C.H / 2 - 40);
    ctx.fillStyle = '#333';
    ctx.fillRect(C.W / 2 - 150, C.H / 2, 300, 20);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(C.W / 2 - 150, C.H / 2, 300 * progress, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Loading... ' + Math.round(progress * 100) + '%', C.W / 2, C.H / 2 + 40);
    ctx.textAlign = 'left';
  }

  return { draw, drawPause, drawLoading };
})();
