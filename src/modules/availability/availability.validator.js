import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getAvailabilitySchema = z.object({
  query: z.object({
    serviceId: z.string().uuid(),
    date: dateString,
    staffId: z.string().uuid().optional(),
  }),
});

export const getStaffAvailabilitySchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
  query: z.object({ serviceId: z.string().uuid(), date: dateString }),
});

export const getServiceAvailabilitySchema = z.object({
  params: z.object({ serviceId: z.string().uuid() }),
  query: z.object({ date: dateString, staffId: z.string().uuid().optional() }),
});
