// The pack's own bitmap font (assets/font.png), drawn as CSS masks so text can
// be any colour and keeps the game's single-pixel drop shadow.
//
//   setFontMeta(await (await fetch('./assets/font.json')).json())
//   setText(element, 'Singleplayer')
//
// Each glyph is an <i> whose background is the current colour and whose mask is
// the glyph cell, which is how Minecraft itself tints its font.

let font = null;
let baseScale = 2;

export function setFontMeta(meta) {
  font = meta;
}

export function hasFont() {
  return Boolean(font);
}

export function setBaseScale(scale) {
  baseScale = Math.max(1, Math.min(4, Math.round(scale)));
}

export function textScale() {
  return baseScale;
}

/** Advance width of one character in font pixels. */
export function charAdvance(code) {
  if (!font) return 6;
  return font.advances[code] ?? 5;
}

/** Pixel width a string will occupy at the current scale. */
export function measureText(text) {
  let total = 0;
  for (const ch of String(text)) total += charAdvance(ch.codePointAt(0)) + 1;
  return total * baseScale;
}

function styleGlyph(el, code, scale) {
  const advance = charAdvance(code);
  el.style.width = `${advance * scale}px`;
  el.style.height = `${font.cell * scale}px`;
  const size = `${font.width * scale}px ${font.height * scale}px`;
  el.style.maskSize = size;
  el.style.webkitMaskSize = size;
  const col = (code % 16) * font.cell;
  const row = Math.floor(code / 16) * font.cell;
  const position = `${-col * scale}px ${-row * scale}px`;
  el.style.maskPosition = position;
  el.style.webkitMaskPosition = position;
  // Minecraft leaves one empty pixel between glyphs.
  el.style.marginRight = `${scale}px`;
  el.dataset.code = code;
}

function makeGlyph(code, scale) {
  const el = document.createElement('i');
  el.className = 'mc-glyph';
  styleGlyph(el, code, scale);
  return el;
}

/**
 * Replace an element's content with bitmap text. Existing glyph nodes are
 * reused, so calling this every frame for the debug overlay stays cheap.
 */
export function setText(target, text, options = {}) {
  const value = String(text ?? '');
  if (!font) {
    target.textContent = value;
    return target;
  }
  const scale = options.scale ?? baseScale;
  const codes = [...value].map((ch) => ch.codePointAt(0));
  // Drop anything that is not one of our glyph nodes - including the plain-text
  // fallback written before the font finished loading, which would otherwise
  // sit behind the glyphs and double every label.
  for (const node of [...target.childNodes]) {
    if (node.nodeType !== 1 || !node.classList.contains('mc-glyph')) node.remove();
  }
  const children = [...target.children];
  const shadow = options.shadow === false ? 'none' : `drop-shadow(${scale}px ${scale}px 0 #3f3f3f)`;
  target.style.filter = shadow;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    let glyph = children[i];
    if (!glyph) {
      glyph = makeGlyph(code, scale);
      target.appendChild(glyph);
    } else if (glyph.dataset.code !== String(code) || glyph.dataset.scale !== String(scale)) {
      styleGlyph(glyph, code, scale);
    }
    if (glyph.dataset.scale !== String(scale)) {
      styleGlyph(glyph, code, scale);
      glyph.dataset.scale = scale;
    }
  }
  for (let i = codes.length; i < children.length; i++) children[i].remove();
  return target;
}

/** Build a fresh text element (for lists, chat lines and tooltips). */
export function textElement(text, options = {}) {
  const el = document.createElement('span');
  el.className = 'mc-text';
  setText(el, text, options);
  return el;
}

/** Colour helper: Minecraft's §-codes, or a plain CSS colour. */
export function colorize(target, color) {
  target.style.color = color;
  return target;
}
