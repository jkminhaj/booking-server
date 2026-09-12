import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

export const listStaffServicesSchema = z.object({
  query: paginationQuery.extend({
    staffId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
  }),
});

export const getStaffServiceSchema = z.object({ params: idParam });

export const createStaffServiceSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
    serviceId: z.string().uuid(),
    customPrice: z.coerce.number().nonnegative().optional(),
    customDuration: z.coerce.number().int().positive().optional(),
  }),
});

export const updateStaffServiceSchema = z.object({
  params: idParam,
  body: z
    .object({
      customPrice: z.coerce.number().nonnegative().nullable().optional(),
      customDuration: z.coerce.number().int().positive().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});
