import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

export const listServicesSchema = z.object({
  query: paginationQuery.extend({
    categoryId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const getServiceSchema = z.object({ params: idParam });

export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().int().positive(),
    bufferMinutes: z.coerce.number().int().min(0).default(0),
    price: z.coerce.number().nonnegative(),
    categoryId: z.string().uuid().optional(),
  }),
});

export const updateServiceSchema = z.object({
  params: idParam,
  body: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      durationMinutes: z.coerce.number().int().positive().optional(),
      bufferMinutes: z.coerce.number().int().min(0).optional(),
      price: z.coerce.number().nonnegative().optional(),
      categoryId: z.string().uuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const updateServiceStatusSchema = z.object({
  params: idParam,
  body: z.object({ isActive: z.boolean() }),
});

export const replaceServiceStaffSchema = z.object({
  params: idParam,
  body: z.object({ staffIds: z.array(z.string().uuid()) }),
});
