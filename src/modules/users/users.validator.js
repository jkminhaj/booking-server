import { z } from "zod";
import { idParam, paginationQuery } from "../../validators/common.validators.js";

// OWNER is deliberately excluded — ownership is only created via /api/auth/register.
const assignableRole = z.enum(["ADMIN", "MANAGER", "STAFF", "RECEPTIONIST"]);

export const listUsersSchema = z.object({
  query: paginationQuery.extend({
    role: assignableRole.optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const getUserSchema = z.object({ params: idParam });

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: assignableRole,
    phone: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  params: idParam,
  body: z
    .object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      image: z.string().url().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const updateUserRoleSchema = z.object({
  params: idParam,
  body: z.object({ role: assignableRole }),
});

export const updateUserStatusSchema = z.object({
  params: idParam,
  body: z.object({ isActive: z.boolean() }),
});

export const replaceStaffServicesSchema = z.object({
  params: idParam,
  body: z.object({ serviceIds: z.array(z.string().uuid()) }),
});
