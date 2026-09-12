import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const statusEnum = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

export const listAppointmentsSchema = z.object({
  query: paginationQuery.extend({
    date: dateString.optional(),
    status: statusEnum.optional(),
    staffId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
  }),
});

export const getAppointmentSchema = z.object({ params: idParam });

export const getByDateSchema = z.object({
  params: z.object({ date: dateString }),
  query: paginationQuery,
});
export const getByStaffSchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
  query: paginationQuery,
});
export const getByCustomerSchema = z.object({
  params: z.object({ customerId: z.string().uuid() }),
  query: paginationQuery,
});

export const createAppointmentSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    staffId: z.string().uuid(),
    serviceId: z.string().uuid(),
    startAt: z.string().datetime(),
    notes: z.string().optional(),
  }),
});

export const updateAppointmentSchema = z.object({
  params: idParam,
  body: z
    .object({
      staffId: z.string().uuid().optional(),
      serviceId: z.string().uuid().optional(),
      startAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const updateStatusSchema = z.object({
  params: idParam,
  body: z.object({ status: statusEnum }),
});

export const cancelAppointmentSchema = z.object({
  params: idParam,
  body: z
    .object({ reason: z.string().optional() })
    .optional()
    .default({}),
});
