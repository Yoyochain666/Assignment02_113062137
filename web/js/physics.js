// AABB physics helpers
const Physics = (() => {
  // Returns overlap if two rects intersect, else null
  // rect = {x, y, w, h}
  function overlap(a, b) {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) return null;
    return { ox, oy };
  }

  // Returns true if a intersects b
  function intersects(a, b) { return overlap(a, b) !== null; }

  // Push entity out of a solid block. Returns collision sides.
  function resolve(entity, solid) {
    const ov = overlap(entity, solid);
    if (!ov) return {};
    const { ox, oy } = ov;
    const result = {};
    if (ox < oy) {
      // Horizontal collision
      if (entity.x < solid.x) { entity.x -= ox; result.right = true; }
      else                     { entity.x += ox; result.left  = true; }
    } else {
      // Vertical collision
      if (entity.y < solid.y) {
        entity.y -= oy;
        result.bottom = true;
      } else {
        entity.y += oy;
        result.top = true;
      }
    }
    return result;
  }

  // Precise top-collision check: entity falling down, hitting top of solid
  // Returns true if entity's bottom overlaps solid's top slightly
  function isLandingOn(entity, solid) {
    const prevBottom = entity.y + entity.h - entity.vy * 0.016;
    const currBottom = entity.y + entity.h;
    return prevBottom <= solid.y + 2 && currBottom >= solid.y &&
           entity.x + entity.w > solid.x + 2 && entity.x < solid.x + solid.w - 2;
  }

  return { overlap, intersects, resolve };
})();
