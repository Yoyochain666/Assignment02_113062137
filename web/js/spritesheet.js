// SpriteSheet renderer: draws a named sprite from a parsed plist sheet
const SS = (() => {
  // Draw a sprite by frame name, auto-detecting which sheet it belongs to
  // x, y = top-left of bounding box in canvas coords
  // scaleX = 1 or -1 for horizontal flip
  function draw(ctx, frameName, x, y, scaleX = 1, scaleY = 1, drawScale = C.SCALE) {
    const found = Loader.findFrame(frameName);
    if (!found) return;
    const { key, frame } = found;
    const img = Loader.getImage(key);
    if (!img) return;

    const { x: sx, y: sy, w, h, rotated, ox = 0, oy = 0 } = frame;
    const dw = w * drawScale;
    const dh = h * drawScale;

    ctx.save();
    ctx.translate(x + dw / 2, y + dh / 2);
    if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
    ctx.imageSmoothingEnabled = false;

    if (rotated) {
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, sx, sy, w, h, -dh / 2, -dw / 2, dh, dw);
    } else {
      ctx.drawImage(img, sx, sy, w, h, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  }

  // Draw with explicit width/height override (for tiles fitting exact tile size)
  function drawFit(ctx, frameName, x, y, dw, dh, flipX = false) {
    const found = Loader.findFrame(frameName);
    if (!found) return false;
    const { key, frame } = found;
    const img = Loader.getImage(key);
    if (!img) return false;
    const { x: sx, y: sy, w, h, rotated } = frame;
    ctx.save();
    if (flipX) {
      ctx.translate(x + dw, y);
      ctx.scale(-1, 1);
      x = 0;
    }
    ctx.imageSmoothingEnabled = false;
    if (rotated) {
      ctx.save();
      ctx.translate(flipX ? dw / 2 : x + dw / 2, y + dh / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, sx, sy, w, h, -dh / 2, -dw / 2, dh, dw);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, w, h, flipX ? 0 : x, y, dw, dh);
    }
    ctx.restore();
    return true;
  }

  // Get natural size of a frame (unscaled)
  function getSize(frameName) {
    const found = Loader.findFrame(frameName);
    if (!found) return { w: 16, h: 16 };
    const { frame } = found;
    return { w: frame.w, h: frame.h };
  }

  return { draw, drawFit, getSize };
})();
