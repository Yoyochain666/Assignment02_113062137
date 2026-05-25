// AABB collision helpers (screen coords: y increases downward)
window.Physics = {
    overlap: function(a, b) {
        var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox <= 0 || oy <= 0) return null;
        return { ox: ox, oy: oy };
    },

    // returns { top, bottom, left, right } booleans
    resolve: function(entity, solid) {
        var ov = this.overlap(entity, solid);
        if (!ov) return null;
        var res = { top:false, bottom:false, left:false, right:false };
        if (ov.ox < ov.oy) {
            // horizontal
            if (entity.x < solid.x) { entity.x -= ov.ox; res.right = true; }
            else                     { entity.x += ov.ox; res.left  = true; }
        } else {
            // vertical
            if (entity.y < solid.y) { entity.y -= ov.oy; entity.vy = 0; res.bottom = true; }
            else                    { entity.y += ov.oy; if (entity.vy < 0) entity.vy = 0; res.top = true; }
        }
        return res;
    },
};
