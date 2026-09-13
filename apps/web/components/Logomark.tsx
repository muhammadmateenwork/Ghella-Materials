/** The Ghella Materials mark: ascending stacked-material bars on a
 * foundation line, with a drafting corner-registration mark — the visual
 * vocabulary of a construction blueprint. Kept as a real component (not a
 * stock icon) so the brand doesn't read as "an icon library glyph in a
 * colored box". */
export function Logomark({ size = 32, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx={rounded ? 14 : 0} fill="#14213D" />
      <rect x="14" y="76" width="72" height="4" rx="1.5" fill="#E8590C" />
      <rect x="20" y="54" width="14" height="22" rx="2" fill="#E8590C" />
      <rect x="43" y="44" width="14" height="32" rx="2" fill="#E8590C" />
      <rect x="66" y="32" width="14" height="44" rx="2" fill="#E8590C" />
      <rect x="72" y="16" width="14" height="3" rx="1.5" fill="#E8590C" />
      <rect x="83" y="16" width="3" height="14" rx="1.5" fill="#E8590C" />
    </svg>
  );
}
