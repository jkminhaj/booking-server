import { z } from "zod";

/** Route param shape shared by every "/:id" route across modules. */
export const idParam = z.object({ id: z.string().uuid("Invalid id") });

/** Query shape shared by every list endpoint that supports pagination. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
