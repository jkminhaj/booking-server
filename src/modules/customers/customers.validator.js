import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

export const listCustomersSchema = z.object({ query: paginationQuery });

export const searchCustomersSchema = z.object({
  query: z.object({ q: z.string().min(1, "Search query is required") }),
});

export const getCustomerSchema = z.object({ params: idParam });

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: idParam,
  body: z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const getCustomerAppointmentsSchema = z.object({ params: idParam, query: paginationQuery });
