import { z } from "zod";
import { idParam } from "../../validators/common.validators.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected 24-hour HH:mm");

export const listOverridesSchema = z.object({
  query: z.object({ staffId: z.string().uuid().optional() }),
});

export const getOverridesByDateSchema = z.object({
  params: z.object({ date: dateString }),
  query: z.object({ staffId: z.string().uuid().optional() }),
});

export const getOverrideSchema = z.object({ params: idParam });

export const createOverrideSchema = z.object({
  body: z
    .object({
      staffId: z.string().uuid().optional(), // omit for a business-wide override
      date: dateString,
      isClosed: z.boolean().default(false),
      startTime: timeString.optional(),
      endTime: timeString.optional(),
      reason: z.string().optional(),
    })
    .refine((d) => d.isClosed || (d.startTime && d.endTime), {
      message: "Provide startTime and endTime, or set isClosed to true",
    })
    .refine((d) => !(d.startTime && d.endTime) || d.startTime < d.endTime, {
      message: "startTime must be before endTime",
      path: ["endTime"],
    }),
});

export const updateOverrideSchema = z.object({
  params: idParam,
  body: z
    .object({
      isClosed: z.boolean().optional(),
      startTime: timeString.optional(),
      endTime: timeString.optional(),
      reason: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});
