import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

export const listCategoriesSchema = z.object({
  query: paginationQuery.extend({ isActive: z.coerce.boolean().optional() }),
});
export const getCategorySchema = z.object({ params: idParam });
export const createCategorySchema = z.object({
  body: z.object({ name: z.string().min(1), description: z.string().optional() }),
});
export const updateCategorySchema = z.object({
  params: idParam,
  body: z
    .object({ name: z.string().min(1).optional(), description: z.string().optional() })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});
export const updateCategoryStatusSchema = z.object({
  params: idParam,
  body: z.object({ isActive: z.boolean() }),
});
