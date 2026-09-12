import { z } from "zod";
import { idParam } from "../../validators/common.validators.js";

export const listBlockedTimesSchema = z.object({
  query: z.object({
    staffId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const getStaffBlockedTimesSchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
});

export const getBlockedTimeSchema = z.object({ params: idParam });

export const createBlockedTimeSchema = z.object({
  body: z
    .object({
      staffId: z.string().uuid().optional(), // omit for a business-wide block
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string().optional(),
    })
    .refine((d) => new Date(d.startAt) < new Date(d.endAt), {
      message: "startAt must be before endAt",
      path: ["endAt"],
    }),
});

export const updateBlockedTimeSchema = z.object({
  params: idParam,
  body: z
    .object({
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      reason: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});
