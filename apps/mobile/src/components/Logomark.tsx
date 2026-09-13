import Svg, { Rect } from "react-native-svg";

/** The Ghella Materials mark: ascending stacked-material bars on a
 * foundation line, with a drafting corner-registration mark — the visual
 * vocabulary of a construction blueprint. Kept as real shapes (not a stock
 * icon) so the brand doesn't read as "an icon library glyph in a colored
 * box". */
export function Logomark({ size = 32, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width={100} height={100} rx={rounded ? 14 : 0} fill="#14213D" />
      <Rect x={14} y={76} width={72} height={4} rx={1.5} fill="#E8590C" />
      <Rect x={20} y={54} width={14} height={22} rx={2} fill="#E8590C" />
      <Rect x={43} y={44} width={14} height={32} rx={2} fill="#E8590C" />
      <Rect x={66} y={32} width={14} height={44} rx={2} fill="#E8590C" />
      <Rect x={72} y={16} width={14} height={3} rx={1.5} fill="#E8590C" />
      <Rect x={83} y={16} width={3} height={14} rx={1.5} fill="#E8590C" />
    </Svg>
  );
}
