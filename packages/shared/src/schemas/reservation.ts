import { z } from "zod";

export function reservationFormSchema(maxQuantity: number) {
  return z.object({
    quantity: z.coerce
      .number()
      .int()
      .min(1, "Enter at least 1")
      .max(maxQuantity, `Only ${maxQuantity} available`),
    contact_info: z.string().trim().min(1, "Contact info is required"),
  });
}
export type ReservationFormInput = z.infer<ReturnType<typeof reservationFormSchema>>;
