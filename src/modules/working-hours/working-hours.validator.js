import { z } from "zod";
import { idParam } from "../../validators/common.validators.js";

const dayOfWeek = z.coerce.number().int().min(0).max(6);
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected 24-hour HH:mm");

export const getStaffWorkingHoursSchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
});

export const createWorkingHoursSchema = z.object({
  body: z
    .object({
      staffId: z.string().uuid().optional(), // omit for the business-level default schedule
      dayOfWeek,
      startTime: timeString,
      endTime: timeString,
    })
    .refine((d) => d.startTime < d.endTime, { message: "startTime must be before endTime", path: ["endTime"] }),
});

export const updateWorkingHoursSchema = z.object({
  params: idParam,
  body: z
    .object({ startTime: timeString.optional(), endTime: timeString.optional() })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const getWorkingHoursSchema = z.object({ params: idParam });

export const replaceStaffWeekSchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
  body: z.object({
    days: z
      .array(
        z
          .object({ dayOfWeek, startTime: timeString, endTime: timeString })
          .refine((d) => d.startTime < d.endTime, {
            message: "startTime must be before endTime",
            path: ["endTime"],
          })
      )
      .max(7, "A week has at most 7 days"),
  }),
});
