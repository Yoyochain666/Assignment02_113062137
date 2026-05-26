/* Entry point CC component (plugin) — attached to the Bootstrap node in main.fire.
   Plugin status (isPlugin: true in meta) allows class-name reference from .fire. */

var Bootstrap = cc.Class({
    extends: cc.Component,

    onLoad: function () {
        var canvasNode = this.node.parent;

        // Game controller on its own node
        var gameNode = new cc.Node('GameController');
        var game = gameNode.addComponent(Game);
        canvasNode.addChild(gameNode);

        this._game   = game;
        this._canvas = canvasNode;
        this._loaded = 0;
        this._total  = 0;

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

    _loadAssets: function () {
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
        var uiImages = ['images/title_0', 'images/title_1', 'images/life', 'images/menu_bg',
                        'images/mario_big0', 'images/mario_big1', 'images/mario_big2',
                        'images/mario_big3', 'images/mario_big4',
                        'images/timer'];
        var fonts = ['fonts/white_font', 'fonts/yellow_font'];

        this._total = atlases.length + audios.length + uiImages.length + fonts.length;

        atlases.forEach(function (a) {
            cc.loader.loadRes(a[0], cc.SpriteAtlas, function (err, atlas) {
                if (err) { cc.warn('Atlas load error:', a[0], err); }
                else { SPR.reg(a[1], atlas); }
                self._onLoad();
            });
        });
        audios.forEach(function (a) {
            cc.loader.loadRes(a[0], cc.AudioClip, function (err, clip) {
                if (err) { cc.warn('Audio load error:', a[0], err); }
                else { AudioMgr.reg(a[1], clip); }
                self._onLoad();
            });
        });
        uiImages.forEach(function (path) {
            cc.loader.loadRes(path, cc.SpriteFrame, function (err, frame) {
                if (!err && frame) {
                    var name = path.replace('images/', '');
                    SPR.reg(path, { getSpriteFrame: function (n) {
                        return (n === name + '.png' || n === name) ? frame : null;
                    }});
                }
                self._onLoad();
            });
        });
        window.FONTS = window.FONTS || {};
        fonts.forEach(function (path) {
            cc.loader.loadRes(path, cc.Font, function (err, font) {
                if (err) { cc.warn('Font load error:', path, err); }
                else {
                    var name = path.replace('fonts/', '');
                    window.FONTS[name] = font;
                }
                self._onLoad();
            });
        });
    },

    _onLoad: function () {
        this._loaded++;
        this._loadLabel.string = 'Loading... ' + this._loaded + '/' + this._total;
        if (this._loaded >= this._total) {
            // clip items_3 to only show the middle 2 pixels (rotating coin edge)
            var items3 = SPR.getFrame('items_3.png');
            if (items3 && items3.getRect) {
                var r = items3.getRect();
                items3.setRect(cc.rect(r.x + 2, r.y, 2, r.height));
            }
            this._loadNode.active = false;
            this._game.startMenu(this._canvas);
            this.node.destroy();
        }
    },
});
