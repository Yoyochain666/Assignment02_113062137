// Asset loader: loads images and parses plist sprite sheets
const Loader = (() => {
  const images = {};
  const sheets = {}; // parsed plist data: name -> {frames: {frameName: {x,y,w,h,rotated}}}

  function parsePlist(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const rootDict = doc.querySelector('plist > dict');
    const result = { frames: {} };
    const keys = rootDict.children;
    let i = 0;
    while (i < keys.length) {
      const key = keys[i].textContent;
      const val = keys[i + 1];
      if (key === 'frames') {
        const frameKeys = val.children;
        let j = 0;
        while (j < frameKeys.length) {
          const fname = frameKeys[j].textContent;
          const fdata = frameKeys[j + 1];
          const info = {};
          const fkeys = fdata.children;
          for (let k = 0; k < fkeys.length; k += 2) {
            const fkey = fkeys[k].textContent;
            const fval = fkeys[k + 1];
            if (fkey === 'textureRect' || fkey === 'frame') {
              // Format: {{x,y},{w,h}}
              const nums = fval.textContent.match(/\d+/g).map(Number);
              info.x = nums[0]; info.y = nums[1];
              info.w = nums[2]; info.h = nums[3];
            } else if (fkey === 'spriteSize' || fkey === 'sourceSize') {
              const nums = fval.textContent.match(/\d+/g).map(Number);
              info.sw = nums[0]; info.sh = nums[1];
            } else if (fkey === 'textureRotated' || fkey === 'rotated') {
              info.rotated = fval.tagName === 'true';
            } else if (fkey === 'spriteOffset' || fkey === 'offset') {
              const nums = fval.textContent.match(/-?\d+/g).map(Number);
              info.ox = nums[0]; info.oy = nums[1];
            }
          }
          result.frames[fname] = info;
          j += 2;
        }
      }
      i += 2;
    }
    return result;
  }

  function loadImage(path) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => { console.warn('Failed to load:', path); res(null); };
      img.src = path;
    });
  }

  function loadText(path) {
    return fetch(path).then(r => r.text()).catch(() => null);
  }

  async function loadAll(basePath, onProgress) {
    const entries = Object.entries(C.SHEETS);
    let loaded = 0;
    for (const [key, def] of entries) {
      const imgPath = basePath + def.img;
      const plistPath = basePath + def.plist;
      const [img, xml] = await Promise.all([loadImage(imgPath), loadText(plistPath)]);
      images[key] = img;
      if (xml) sheets[key] = parsePlist(xml);
      loaded++;
      if (onProgress) onProgress(loaded / entries.length);
    }
    // Load standalone images
    const standaloneImages = [
      'menu_bg.png','title_0.png','title_1.png',
      'button_blue.png','button_orange.png',
      'life.png','timer.png','world.png','flag.png',
      'smoke.png','pause.png','arrow.png',
    ];
    for (const name of standaloneImages) {
      images[name] = await loadImage(basePath + name);
    }
  }

  function getImage(key) { return images[key]; }
  function getSheet(key) { return sheets[key]; }
  function getFrame(sheetKey, frameName) {
    const sheet = sheets[sheetKey];
    if (!sheet) return null;
    return sheet.frames[frameName] || null;
  }

  // Find which sheet contains a given frame name
  function findFrame(frameName) {
    for (const [key, sheet] of Object.entries(sheets)) {
      if (sheet.frames[frameName]) return { key, frame: sheet.frames[frameName] };
    }
    return null;
  }

  return { loadAll, getImage, getSheet, getFrame, findFrame };
})();
