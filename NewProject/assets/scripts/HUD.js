/* HUD — fixed overlay on canvas (not in worldNode) */

var HUD = cc.Class({
    name: 'HUD',
    extends: cc.Component,

    properties: {
        _bgNode:     null,
        _scoreLabel: null,
        _coinLabel:  null,
        _livesLabel: null,
        _timerLabel: null,
        _worldLabel: null,
        _muteLabel:  null,
        _msgLabel:   null,
    },

    init: function(canvasNode) {
        var H = CFG.HUD_H, W = CFG.W;

        // black bar background
        var bg = new cc.Node('hudbg');
        bg.anchorX = 0; bg.anchorY = 1;
        bg.x = -W/2; bg.y = H/2;
        bg.width = W; bg.height = H;
        bg.color = cc.Color.BLACK;
        var bgSpr = bg.addComponent(cc.Sprite);
        bgSpr.type = cc.Sprite.Type.FILLED;
        canvasNode.addChild(bg);
        this._bgNode = bg;

        var makeLabel = function(parent, text, x, y, size, align) {
            var n = new cc.Node();
            n.anchorX = 0; n.anchorY = 0.5;
            n.x = x; n.y = y;
            var lbl = n.addComponent(cc.Label);
            lbl.string = text;
            lbl.fontSize = size || 16;
            lbl.horizontalAlign = align || cc.Label.HorizontalAlign.LEFT;
            n.color = cc.Color.WHITE;
            parent.addChild(n);
            return lbl;
        };

        // Positions relative to Canvas center
        // HUD bar: top of canvas = y=+240, HUD center y = 240 - HUD_H/2 = 216
        var hudY = H/2 - 8;   // within bg node local space
        // use canvas-space positions (all children of canvasNode, CC center origin)
        var cy = 240 - H/2;   // y in canvas space = 216

        // "MARIO" title + score
        this._scoreLabel  = makeLabel(canvasNode, '000000', -W/2 + 10, cy + 8,  14);
        makeLabel(canvasNode, 'MARIO', -W/2 + 10, cy - 8, 12);

        // COINS
        this._coinLabel   = makeLabel(canvasNode, 'x00', -W/2 + 250, cy + 8, 14);
        makeLabel(canvasNode, 'COINS', -W/2 + 250, cy - 8, 12);

        // WORLD
        this._worldLabel  = makeLabel(canvasNode, '1-1', -W/2 + 390, cy + 8, 14);
        makeLabel(canvasNode, 'WORLD', -W/2 + 390, cy - 8, 12);

        // TIME
        this._timerLabel  = makeLabel(canvasNode, '400', -W/2 + 530, cy + 8, 14);
        makeLabel(canvasNode, 'TIME',  -W/2 + 530, cy - 8, 12);

        // LIVES
        this._livesLabel  = makeLabel(canvasNode, 'x3', -W/2 + 670, cy + 8, 14);
        makeLabel(canvasNode, 'LIVES', -W/2 + 670, cy - 8, 12);

        // Mute indicator
        this._muteLabel   = makeLabel(canvasNode, '', -W/2 + 760, cy, 13);

        // Center message (pause / game state)
        var msgNode = new cc.Node('msg');
        msgNode.anchorX = 0.5; msgNode.anchorY = 0.5;
        msgNode.x = 0; msgNode.y = 0;
        var msg = msgNode.addComponent(cc.Label);
        msg.string = '';
        msg.fontSize = 28;
        msg.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        msgNode.color = cc.Color.WHITE;
        canvasNode.addChild(msgNode);
        this._msgLabel = msg;
    },

    update: function(score, coins, lives, time, muted, msg) {
        this._scoreLabel.string  = String(score).padStart(6, '0');
        this._coinLabel.string   = 'x' + String(coins).padStart(2, '0');
        this._livesLabel.string  = 'x' + lives;
        var t = Math.max(0, Math.ceil(time));
        this._timerLabel.string  = String(t).padStart(3, '0');
        this._timerLabel.node.color = t < 100 ? cc.color(255,50,50) : cc.Color.WHITE;
        this._muteLabel.string   = muted ? 'M' : '';
        this._msgLabel.string    = msg || '';
    },

    setVisible: function(v) {
        this._bgNode.active = v;
    },
});
