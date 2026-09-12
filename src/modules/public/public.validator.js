import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const slugParam = z.object({ slug: z.string().min(1) });

export const businessOnlySchema = z.object({ params: slugParam });

export const getServicesSchema = z.object({
  params: slugParam,
  query: z.object({ categoryId: z.string().uuid().optional() }),
});

export const getStaffSchema = z.object({
  params: slugParam,
  query: z.object({ serviceId: z.string().uuid().optional() }),
});

export const getAvailabilitySchema = z.object({
  params: slugParam,
  query: z.object({
    serviceId: z.string().uuid(),
    date: dateString,
    staffId: z.string().uuid().optional(),
  }),
});

export const createAppointmentSchema = z.object({
  params: slugParam,
  body: z.object({
    serviceId: z.string().uuid(),
    staffId: z.string().uuid(),
    startAt: z.string().datetime(),
    customer: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    notes: z.string().optional(),
  }),
});
