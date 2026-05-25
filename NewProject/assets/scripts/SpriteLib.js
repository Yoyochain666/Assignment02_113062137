// Sprite atlas registry — populated during asset loading
window.SPR = {
    _atlases: {},

    reg: function(name, atlas) {
        this._atlases[name] = atlas;
    },

    getFrame: function(frameName) {
        for (var key in this._atlases) {
            var f = this._atlases[key].getSpriteFrame(frameName);
            if (f) return f;
        }
        cc.warn('SpriteLib: frame not found:', frameName);
        return null;
    },

    setSprite: function(spriteComp, frameName) {
        var f = this.getFrame(frameName);
        if (f) spriteComp.spriteFrame = f;
    },
};
