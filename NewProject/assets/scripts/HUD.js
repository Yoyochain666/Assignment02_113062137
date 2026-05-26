/* HUD — overlay on canvas, only visible during gameplay */

window.HUD = cc.Class({
    extends: cc.Component,

    properties: {
        _container:   null,
        _scoreLabel:  null,
        _coinLabel:   null,
        _livesLabel:  null,
        _timerLabel:  null,
        _worldLabel:  null,
        _muteLabel:   null,
        _msgLabel:    null,
    },

    init: function(canvasNode) {
        var H = CFG.HUD_H;
        var cw = canvasNode.width;
        var ch = canvasNode.height;
        var topY = ch / 2;
        var cy = topY - H / 2;

        // single container so setVisible toggles everything
        var container = new cc.Node('hud');
        container.anchorX = 0; container.anchorY = 0;
        container.x = 0; container.y = 0;
        canvasNode.addChild(container, 100);
        this._container = container;

        var FONTS = window.FONTS || {};
        // yellow_font.fnt is missing chars 0 and 9 — use white_font with tint instead
        var whiteFont  = FONTS.white_font;
        var YELLOW = cc.color(255, 220, 0);

        function makeBmLabel(parent, text, x, y, color, size) {
            var n = new cc.Node();
            n.anchorX = 0; n.anchorY = 0.5;
            n.x = x; n.y = y;
            n.color = color || cc.Color.WHITE;
            var lbl = n.addComponent(cc.Label);
            if (whiteFont) { lbl.font = whiteFont; lbl.useSystemFont = false; }
            lbl.string = text;
            lbl.fontSize = size || 24;
            lbl.lineHeight = size || 24;
            lbl.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
            parent.addChild(n);
            return lbl;
        }
        function makeIcon(parent, frameName, x, y, w, h) {
            var n = new cc.Node();
            n.anchorX = 0; n.anchorY = 0.5;   // left-anchored, vertically centered at y
            n.x = x; n.y = y;
            n.width = w; n.height = h;
            var s = n.addComponent(cc.Sprite);
            s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            s.trim = false;
            var f = SPR.getFrame(frameName);
            if (f) s.spriteFrame = f;
            parent.addChild(n);
            return n;
        }

        var leftPad = 30;
        var sec = (cw - leftPad * 2) / 5;
        var c0 = -cw / 2 + leftPad;
        var c1 = c0 + sec;
        var c2 = c0 + sec * 2;
        var c3 = c0 + sec * 3;
        var c4 = c0 + sec * 4;

        var sz = 72;
        var ic = 24;
        var gap = 6;
        // BMFont draws chars at top of line → shift label down so its visual center matches cy
        var labelY = cy - sz * 0.08;
        var iconY = cy + sz * 0.32;

        // Layout order: WORLD, TIMER, COIN, LIVES, SCORE
        // WORLD — text only
        this._worldLabel = makeBmLabel(container, 'WORLD1', c0, labelY, cc.Color.WHITE, sz);

        // TIME — timer icon (left) + count (right)
        makeIcon(container, 'timer', c1, iconY, ic, ic);
        this._timerLabel = makeBmLabel(container, '400', c1 + ic + gap, labelY, cc.Color.WHITE, sz);

        // COIN — coin icon (left) + count (right)
        makeIcon(container, 'items_1.png', c2, iconY, ic, ic);
        this._coinLabel  = makeBmLabel(container, 'x00', c2 + ic + gap, labelY, YELLOW, sz);

        // LIVES — life icon (left) + count (right)
        makeIcon(container, 'life', c3, iconY, ic, ic);
        this._livesLabel = makeBmLabel(container, 'x3', c3 + ic + gap, labelY, YELLOW, sz);

        // SCORE — number only (yellow tint)
        this._scoreLabel = makeBmLabel(container, '000000', c4, labelY, YELLOW, sz);

        // Mute indicator — aligned to top-right corner of canvas
        var muteNode = new cc.Node('mute');
        muteNode.anchorX = 0.5; muteNode.anchorY = 0.5;
        muteNode.x = cw / 2 - 20;   // 40px from right edge
        muteNode.y = topY - 20;     // 40px from top edge
        muteNode.scale = 0.8;
        this._muteGfx = muteNode.addComponent(cc.Graphics);
        container.addChild(muteNode);
        this._drawMuteIcon(false);

        // Center message (pause / state)
        var msgNode = new cc.Node('msg');
        msgNode.anchorX = 0.5; msgNode.anchorY = 0.5;
        msgNode.x = 0; msgNode.y = 0;
        var msg = msgNode.addComponent(cc.Label);
        if (whiteFont) { msg.font = whiteFont; msg.useSystemFont = false; }
        msg.string = '';
        msg.fontSize = 48;
        msg.lineHeight = 48;
        msg.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        canvasNode.addChild(msgNode, 101);
        this._msgLabel = msg;
    },

    refresh: function(score, coins, lives, time, muted, msg) {
        this._scoreLabel.string = String(score).padStart(6, '0');
        this._coinLabel.string  = 'x' + String(coins).padStart(2, '0');
        this._livesLabel.string = 'x' + lives;
        this._worldLabel.string = 'WORLD1';
        var t = Math.max(0, Math.ceil(time));
        this._timerLabel.string = String(t).padStart(3, '0');
        this._timerLabel.node.color = t < 100 ? cc.color(255, 60, 60) : cc.Color.WHITE;
        if (this._muteGfx) this._drawMuteIcon(muted);
        this._msgLabel.string   = msg || '';
    },

    _drawMuteIcon: function(muted) {
        var g = this._muteGfx;
        g.clear();
        g.fillColor = cc.Color.WHITE;
        // speaker body (small rectangle on the left)
        g.rect(-15, -7, 8, 14);
        g.fill();
        // speaker cone (triangle to the right)
        g.moveTo(-7, 7);
        g.lineTo(10, 16);
        g.lineTo(10, -16);
        g.lineTo(-7, -7);
        g.close();
        g.fill();
        // sound waves OR red slash
        if (muted) {
            g.strokeColor = cc.color(255, 40, 40);
            g.lineWidth = 5;
            g.moveTo(-20, -18);
            g.lineTo(20, 18);
            g.stroke();
        } else {
            g.strokeColor = cc.Color.WHITE;
            g.lineWidth = 3;
            // two small arcs to represent sound
            g.moveTo(14, -6); g.lineTo(18, 0); g.lineTo(14, 6);
            g.stroke();
            g.moveTo(18, -10); g.lineTo(23, 0); g.lineTo(18, 10);
            g.stroke();
        }
    },

    setVisible: function(v) {
        if (this._container) this._container.active = v;
    },
});
