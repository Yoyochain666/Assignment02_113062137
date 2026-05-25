// Audio manager using cc.audioEngine
window.AudioMgr = {
    _clips: {},
    _muted: false,
    _bgmId: -1,

    reg: function(name, clip) {
        this._clips[name] = clip;
    },

    playBGM: function(name) {
        var clip = this._clips[name];
        if (!clip) return;
        cc.audioEngine.stopMusic();
        if (!this._muted) {
            this._bgmId = cc.audioEngine.playMusic(clip, true);
        }
    },

    stopBGM: function() {
        cc.audioEngine.stopMusic();
    },

    playSFX: function(name) {
        if (this._muted) return;
        var clip = this._clips[name];
        if (clip) cc.audioEngine.playEffect(clip, false);
    },

    toggleMute: function() {
        this._muted = !this._muted;
        if (this._muted) {
            cc.audioEngine.setMusicVolume(0);
            cc.audioEngine.setEffectsVolume(0);
        } else {
            cc.audioEngine.setMusicVolume(1);
            cc.audioEngine.setEffectsVolume(1);
        }
        return this._muted;
    },

    isMuted: function() { return this._muted; },
};
