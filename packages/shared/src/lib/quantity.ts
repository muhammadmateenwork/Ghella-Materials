/** How a quantity should read wherever it's shown — "5", "10 bundles",
 * "~14 bundles", "3+ rolls" — built from the raw count plus the item's
 * optional unit/approximate flag, so every screen formats it the same way
 * instead of re-deriving this string in each component. */
export function formatQuantity(
  quantity: number,
  unit?: string | null,
  isApproximate?: boolean
): string {
  const unitSuffix = unit ? ` ${unit}` : "";
  const count = isApproximate ? `${quantity}+` : `${quantity}`;
  return `${count}${unitSuffix}`;
}
