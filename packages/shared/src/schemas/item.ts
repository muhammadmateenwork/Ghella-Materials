import { z } from "zod";

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, "Material name is required"),
  identification_number: z.string().trim().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
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
export type ItemFormInput = z.infer<typeof itemFormSchema>;

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Location name is required"),
  parent_location_id: z.string().uuid().nullable().optional(),
});
export type LocationFormInput = z.infer<typeof locationFormSchema>;
