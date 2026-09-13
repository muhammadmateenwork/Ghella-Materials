// Master brand mark, "Blueprint" identity: ascending stacked-materials bars
// on a foundation line, with a drafting corner-registration mark — the
// visual vocabulary of a construction technical drawing, for a materials
// system built for a construction joint venture (GAJV). Kept as plain
// rects (not an off-the-shelf icon glyph) so it reads as a deliberate,
// ownable mark rather than a generic icon-library pick.

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

// Mark only, transparent background. Used for Android adaptive icon
// foreground and for placing the mark on top of colored surfaces in-app.
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

// Single-color silhouette for Android 13+ themed (monochrome) icons —
// the OS applies its own tint, so this must be flat white.
const monochrome = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${mark("#FFFFFF")}
</svg>
`.trim();

module.exports = { INK, ORANGE, fullMark, barsOnly, solidBackground, monochrome };
