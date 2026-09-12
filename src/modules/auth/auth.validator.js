import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  body: z.object({
    business: z.object({
      name: z.string().min(2, "Business name is required"),
      email: z.string().email(),
      phone: z.string().optional(),
      timezone: z.string().optional(), // e.g. "Europe/London" — defaults if omitted
    }),
    owner: z.object({
      name: z.string().min(2, "Name is required"),
      email: z.string().email(),
      password,
      phone: z.string().optional(),
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      image: z.string().url().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: password,
  }),
});
