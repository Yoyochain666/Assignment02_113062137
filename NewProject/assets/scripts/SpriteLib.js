// Sprite atlas registry — populated during asset loading
window.SPR = {
    _atlases: {},

    reg: function(name, atlas) {
        this._atlases[name] = atlas;
    },

    getFrame: function(frameName) {
        var stripped = frameName.replace(/\.png$/, '');
        for (var key in this._atlases) {
            var atlas = this._atlases[key];
            var f = atlas.getSpriteFrame(frameName);
            if (f) return f;
            f = atlas.getSpriteFrame(stripped);
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
