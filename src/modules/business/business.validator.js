import { z } from "zod";

export const updateBusinessSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      timezone: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const updateBusinessStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
});
