// Main entry point - game initialization and loop
(async () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Show loading screen
  let loadProgress = 0;
  const loadingId = requestAnimationFrame(function loop() {
    HUD.drawLoading(ctx, loadProgress);
    if (loadProgress < 1) requestAnimationFrame(loop);
  });

  // Load all assets
  await Loader.loadAll('assets/images/', p => { loadProgress = p; });
  loadProgress = 1;
  cancelAnimationFrame(loadingId);

  // Build scene manager
  const sm = new SceneManager(canvas);
  sm.register('menu', new StartMenuScene());
  sm.register('levelselect', new LevelSelectScene());
  sm.register('game', new GameScene());
  sm.register('gameover', new GameOverScene());
  sm.register('levelclear', new LevelClearScene());
  sm.goto('menu');

  // Game loop
  let last = performance.now();
  function gameLoop(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap at 50ms
    last = now;
    ctx.clearRect(0, 0, C.W, C.H);
    sm.update(dt, {});
    sm.draw();
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
})();
