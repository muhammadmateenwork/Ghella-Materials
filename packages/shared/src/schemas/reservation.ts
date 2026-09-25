import { z } from "zod";

// allowDecimal should be false whenever the item's own quantity is a whole
// number — e.g. you can reserve 2 of 10 crates, but not 2.5, whereas an
// item stocked as 34.5 meters of cable can be reserved in fractional
// amounts too. Defaults to true so existing callers (and items that are
// already fractional) are unaffected.
export function reservationFormSchema(maxQuantity: number, allowDecimal = true) {
  return z.object({
    quantity: z.coerce
      .number()
      .min(allowDecimal ? 0.01 : 1, allowDecimal ? "Enter a quantity greater than 0" : "Enter a whole number of at least 1")
      .max(maxQuantity, `Only ${maxQuantity} available`)
      .refine((value) => allowDecimal || Number.isInteger(value), "This material can't be split into fractions — enter a whole number"),
    contact_info: z.string().trim().min(1, "Contact info is required"),
    // Optional message to the material's owner — pick-up arrangements,
    // drop-off, who it's being assigned to, etc.
    comments: z.string().trim().max(1000, "Keep comments under 1000 characters").optional().or(z.literal("")),
  });
}
export type ReservationFormInput = z.infer<ReturnType<typeof reservationFormSchema>>;
