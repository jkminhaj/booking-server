import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

const statusEnum = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]);
const methodEnum = z.enum(["CARD", "CASH", "OTHER"]);

export const listPaymentsSchema = z.object({
  query: paginationQuery.extend({ status: statusEnum.optional() }),
});
export const getPaymentSchema = z.object({ params: idParam });
export const getByAppointmentSchema = z.object({ params: z.object({ appointmentId: z.string().uuid() }) });

export const createPaymentSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    method: methodEnum,
    transactionRef: z.string().optional(),
  }),
});

export const updatePaymentSchema = z.object({
  params: idParam,
  body: z
    .object({ status: statusEnum.optional(), transactionRef: z.string().optional() })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const refundPaymentSchema = z.object({
  params: idParam,
  body: z
    .object({ amount: z.coerce.number().positive().optional(), reason: z.string().optional() })
    .optional()
    .default({}),
});

export const createIntentSchema = z.object({
  body: z.object({ appointmentId: z.string().uuid() }),
});
