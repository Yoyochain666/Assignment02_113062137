/* Entry point CC component — attached to the Bootstrap node in main.fire.
   Loads all assets, then hands control to Game. */

var Bootstrap = cc.Class({
    name: 'Bootstrap',
    extends: cc.Component,

    onLoad: function() {
        // Find canvas node (parent of Bootstrap node)
        var canvasNode = this.node.parent;

        // Create Game component on its own node
        var gameNode = new cc.Node('GameController');
        var game = gameNode.addComponent(Game);
        canvasNode.addChild(gameNode);

        this._game   = game;
        this._canvas = canvasNode;
        this._loaded = 0;
        this._total  = 0;

        // Show loading text
        var loadNode = new cc.Node('loading');
        loadNode.anchorX = 0.5; loadNode.anchorY = 0.5;
        loadNode.x = 0; loadNode.y = 0;
        var lbl = loadNode.addComponent(cc.Label);
        lbl.string = 'Loading...';
        lbl.fontSize = 28;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        loadNode.color = cc.Color.WHITE;
        canvasNode.addChild(loadNode, 200);
        this._loadLabel = lbl;
        this._loadNode  = loadNode;

        this._loadAssets();
    },

    _loadAssets: function() {
        var self = this;

        var atlases = [
            ['images/mario_small', 'marioS'],
            ['images/mario_big',   'marioB'],
            ['images/Goomba',      'goomba'],
            ['images/Turtle',      'turtle'],
            ['images/items',       'items'],
            ['images/tiles',       'tiles'],
            ['images/effects',     'effects'],
        ];

        var audios = [
            ['audio/bgm_1',           'bgm1'],
            ['audio/bgm_2',           'bgm2'],
            ['audio/jump',            'jump'],
            ['audio/stomp',           'stomp'],
            ['audio/kick',            'kick'],
            ['audio/coin',            'coin'],
            ['audio/powerUpAppear',   'powerUpAppear'],
            ['audio/PowerUp',         'powerUp'],
            ['audio/loseOneLife',     'die'],
            ['audio/Game Over',       'gameover'],
            ['audio/levelClear',      'levelClear'],
            ['audio/powerDown',       'powerDown'],
        ];

        // also load title sprites as sprite frames (they're standalone PNGs, not atlases)
        var uiImages = [
            'images/title_0',
            'images/title_1',
            'images/life',
        ];

        this._total = atlases.length + audios.length + uiImages.length;

        atlases.forEach(function(a) {
            cc.loader.loadRes(a[0], cc.SpriteAtlas, function(err, atlas) {
                if (err) { cc.warn('Atlas load error:', a[0], err); }
                else { SPR.reg(a[1], atlas); }
                self._onLoad();
            });
        });

        audios.forEach(function(a) {
            cc.loader.loadRes(a[0], cc.AudioClip, function(err, clip) {
                if (err) { cc.warn('Audio load error:', a[0], err); }
                else { AudioMgr.reg(a[1], clip); }
                self._onLoad();
            });
        });

        uiImages.forEach(function(path) {
            cc.loader.loadRes(path, cc.SpriteFrame, function(err, frame) {
                if (!err && frame) {
                    // Store as a fake atlas entry keyed by filename
                    var name = path.replace('images/', '');
                    // wrap frame in a minimal object that has getSpriteFrame
                    var fakeAtlas = { getSpriteFrame: function(n) {
                        return (n === name+'.png' || n === name) ? frame : null;
                    }};
                    SPR.reg(path, fakeAtlas);
                }
                self._onLoad();
            });
        });
    },

    _onLoad: function() {
        this._loaded++;
        this._loadLabel.string = 'Loading... ' + this._loaded + '/' + this._total;
        if (this._loaded >= this._total) {
            this._loadNode.active = false;
            this._game.startMenu(this._canvas);
            this.node.destroy();
        }
    },
});
