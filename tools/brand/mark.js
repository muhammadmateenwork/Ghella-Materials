// Master brand mark, "Blueprint" identity: ascending stacked-materials bars
// on a foundation line, with a drafting corner-registration mark — the
// visual vocabulary of a construction technical drawing, for a materials
// system built for Ghella Limited. Kept as plain rects (not an
// off-the-shelf icon glyph) so it reads as a deliberate, ownable mark
// rather than a generic icon-library pick.

const INK = "#14213D"; // blueprint navy — badge background, dark surfaces
const ORANGE = "#E8590C"; // construction safety orange — bars + registration mark

const mark = (fill) => `
  <rect x="14" y="76" width="72" height="4" rx="1.5" fill="${fill}"/>
  <rect x="20" y="54" width="14" height="22" rx="2" fill="${fill}"/>
  <rect x="43" y="44" width="14" height="32" rx="2" fill="${fill}"/>
  <rect x="66" y="32" width="14" height="44" rx="2" fill="${fill}"/>
  <rect x="72" y="16" width="14" height="3" rx="1.5" fill="${fill}"/>
  <rect x="83" y="16" width="3" height="14" rx="1.5" fill="${fill}"/>
`;

// Full mark: badge background + mark. Used for app icon, favicon, web logo.
const fullMark = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="14" fill="${INK}"/>
  ${mark(ORANGE)}
</svg>
`.trim();

// Mark only, transparent background, at the glyph's natural proportions —
// for placing on top of colored surfaces the caller controls the framing
// of (a badge, a header, etc).
const barsOnly = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${mark(ORANGE)}
</svg>
`.trim();

// Solid navy square. Used as the Android adaptive icon background layer.
const solidBackground = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="${INK}"/>
</svg>
`.trim();

// Android adaptive icons (foreground layer and 13+ themed/monochrome
// layer) get masked by the OS into a circle/squircle/rounded-square, which
// only guarantees a centered ~61%-diameter "safe zone" stays visible —
// anything outside it, including this glyph's near-corner registration
// mark at the mark()'s natural scale, gets clipped on real devices. This
// scales and re-centers the same glyph so its full bounding box sits
// inside that safe zone instead of touching the canvas edges.
const adaptiveSafeMark = (fill) => `<g transform="translate(20,21.2) scale(0.6)">${mark(fill)}</g>`;

const androidAdaptiveForeground = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${adaptiveSafeMark(ORANGE)}
</svg>
`.trim();

// Single-color silhouette for Android 13+ themed (monochrome) icons —
// the OS applies its own tint, so this must be flat white — masked the
// same way as the adaptive foreground, so it needs the same safe-zone fit.
const monochrome = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${adaptiveSafeMark("#FFFFFF")}
</svg>
`.trim();

module.exports = { INK, ORANGE, fullMark, barsOnly, solidBackground, androidAdaptiveForeground, monochrome };
