import { z } from "zod";

// A fixed set of conditions shown as a picker instead of free text, so
// reports and filters aren't fighting inconsistent phrasing ("Good" vs
// "good" vs "Good condition"). Not a hard enum in the schema below — an
// item saved before this list existed can carry any string, and the
// picker UI is responsible for keeping that value selectable rather than
// silently discarding it when the item is next edited.
export const ITEM_CONDITIONS = ["New", "Good", "Fair", "Used", "Damaged"] as const;

// minReservedQuantity: when editing an item that already has active
// reservations against it, the quantity can't drop below what's already
// committed (the database enforces this too — see
// items_enforce_quantity_floor in 0012 — this just gives a friendlier,
// inline error instead of a failed save). Defaults to 0 for new items.
export function itemFormSchema(minReservedQuantity = 0) {
  return z.object({
    name: z.string().trim().min(1, "Material name is required"),
    identification_number: z.string().trim().min(1, "Identification number is required"),
    quantity: z.coerce
      .number()
      .min(0, "Quantity cannot be negative")
      .min(minReservedQuantity, `Can't go below ${minReservedQuantity} — that's already reserved`),
    // What's being counted (e.g. "bundles", "rolls", "bags") — shown next to
    // the number instead of a bare integer. Optional; blank just shows the
    // number on its own.
    unit: z.string().trim().max(30, "Keep it short").optional().or(z.literal("")),
    // When true, the count displays as an estimate ("~14 bundles") rather
    // than an exact figure — for stock that's genuinely hard to count
    // precisely (a pallet of cement bags, a bin of fittings, etc).
    is_approximate: z.coerce.boolean().optional(),
    condition: z.string().trim().optional().or(z.literal("")),
    location_id: z.string().uuid("Select a location"),
    notes: z.string().trim().optional().or(z.literal("")),
  });
}
export type ItemFormInput = z.infer<ReturnType<typeof itemFormSchema>>;

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Location name is required"),
  parent_location_id: z.string().uuid().nullable().optional(),
});
export type LocationFormInput = z.infer<typeof locationFormSchema>;
