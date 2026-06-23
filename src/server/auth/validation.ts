import { z } from "zod";

export interface FormActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

const localeEnum = z.enum(["en", "es", "fr", "hi", "ru", "ar"]);

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(40, "Keep it under 40 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: passwordSchema,
  locale: localeEnum.default("en"),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(40, "Keep it under 40 characters."),
  locale: localeEnum,
});

export const linkedAccountSchema = z.object({
  source: z.enum(["chesscom", "lichess"]),
  username: z.string().trim().min(2, "Use at least 2 characters.").max(120, "Keep it under 120 characters."),
});
