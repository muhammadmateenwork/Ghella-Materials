/** How a quantity should read wherever it's shown — "5", "10 bundles",
 * "~14 bundles", "3+ rolls" — built from the raw count plus the item's
 * optional unit/approximate flag, so every screen formats it the same way
 * instead of re-deriving this string in each component. */
export function formatQuantity(
  quantity: number,
  unit?: string | null,
  isApproximate?: boolean
): string {
  // Rounded to 2 decimal places before display — quantities now support
  // fractions, and subtracting reservations with plain JS floats can
  // otherwise surface artifacts like 1.5000000000000002.
  const rounded = Math.round(quantity * 100) / 100;
  const unitSuffix = unit ? ` ${unit}` : "";
  const count = isApproximate ? `${rounded}+` : `${rounded}`;
  return `${count}${unitSuffix}`;
}
