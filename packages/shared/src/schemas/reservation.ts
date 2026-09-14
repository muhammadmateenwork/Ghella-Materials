import { z } from "zod";

export function reservationFormSchema(maxQuantity: number) {
  return z.object({
    quantity: z.coerce
      .number()
      .min(0.01, "Enter a quantity greater than 0")
      .max(maxQuantity, `Only ${maxQuantity} available`),
    contact_info: z.string().trim().min(1, "Contact info is required"),
  });
}
export type ReservationFormInput = z.infer<ReturnType<typeof reservationFormSchema>>;
