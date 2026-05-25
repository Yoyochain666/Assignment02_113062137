// Audio manager: handles BGM and SFX
const Audio = (() => {
  const BASE = 'assets/audio/';
  let bgmEl = null;
  let muted = false;
  let bgmName = null;

  const SFX_FILES = {
    jump:       'jump.wav',
    coin:       'coin.wav',
    stomp:      'stomp.wav',
    kick:       'kick.wav',
    powerup:    'PowerUp.mp3',
    powerup_appear: 'powerUpAppear.wav',
    die:        'loseOneLife.wav',
    gameover:   'Game Over.mp3',
    gameover2:  'Game Over2.mp3',
    levelclear: 'levelClear.mp3',
    powerdown:  'powerDown.wav',
  };

  const BGM_FILES = {
    bgm1: 'bgm_1.mp3',
    bgm2: 'bgm_2.mp3',
    bgm3: 'bgm_3.mp3',
  };

  function playBGM(name) {
    if (muted) return;
    if (bgmName === name && bgmEl && !bgmEl.paused) return;
    stopBGM();
    const file = BGM_FILES[name];
    if (!file) return;
    bgmEl = new window.Audio(BASE + file);
    bgmEl.loop = true;
    bgmEl.volume = 0.5;
    bgmEl.play().catch(() => {});
    bgmName = name;
  }

  function stopBGM() {
    if (bgmEl) { bgmEl.pause(); bgmEl.currentTime = 0; bgmEl = null; }
    bgmName = null;
  }

  function playSFX(name) {
    if (muted) return;
    const file = SFX_FILES[name];
    if (!file) return;
    const sfx = new window.Audio(BASE + file);
    sfx.volume = 0.7;
    sfx.play().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    if (muted) stopBGM();
    return muted;
  }

  function isMuted() { return muted; }

  return { playBGM, stopBGM, playSFX, toggleMute, isMuted };
})();
