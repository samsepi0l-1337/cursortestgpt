import { z } from "zod";

const optionalTextField = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

const optionalUrlField = z
  .string()
  .trim()
  .max(2048, "Website URLs must be 2048 characters or fewer.")
  .refine((value) => value.length === 0 || /^https?:\/\//.test(value), {
    message: "Website URLs must start with http:// or https://.",
  })
  .transform((value) => (value.length > 0 ? value : null))
  .nullable();

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z
  .object({
    name: optionalTextField(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm the password."),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: optionalTextField(80),
  bio: optionalTextField(500),
  location: optionalTextField(120),
  website: optionalUrlField,
  phone: optionalTextField(40),
});

export const adminRoleSchema = z.object({
  userId: z.string().trim().min(1, "A user id is required."),
  role: z.enum(["USER", "ADMIN"]),
});
