"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearUserSession, getCurrentUser, setUserSession } from "@/server/auth/session";
import {
  type FormActionState,
  linkedAccountSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
} from "@/server/auth/validation";
import { claimAnalysisRunsForUser } from "@/server/repositories/analysis-repository";
import { authenticateUserAccount, createUserAccount, updateUserAccount, upsertLinkedChessAccount } from "@/server/repositories/user-repository";

function validationErrorState(message: string, errors?: Record<string, string[] | undefined>): FormActionState {
  return {
    status: "error" as const,
    message,
    errors,
  };
}

function resolveNextPath(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function parseGuestMergePayload(formData: FormData) {
  const raw = formData.get("guestMergePayload");

  if (typeof raw !== "string" || !raw.trim()) {
    return { analysisIds: [] as string[] };
  }

  try {
    const parsed = JSON.parse(raw) as { analysisIds?: unknown };
    const analysisIds = Array.isArray(parsed.analysisIds)
      ? parsed.analysisIds.filter((id): id is string => typeof id === "string")
      : [];

    return { analysisIds };
  } catch {
    return { analysisIds: [] as string[] };
  }
}

function withGuestMergeCount(path: string, count: number) {
  if (count <= 0) {
    return path;
  }

  const url = new URL(path, "https://knightowl.local");
  url.searchParams.set("guestMerged", count.toString());
  return `${url.pathname}${url.search}${url.hash}`;
}

async function claimGuestProgress(userId: string, formData: FormData) {
  const payload = parseGuestMergePayload(formData);
  return claimAnalysisRunsForUser(userId, payload.analysisIds);
}

function refreshAccountSurfaces() {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/analyze");
  revalidatePath("/coach");
  revalidatePath("/games");
}

export async function signInAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const validatedFields = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return validationErrorState("Enter your email and password to continue.", validatedFields.error.flatten().fieldErrors);
  }

  const user = await authenticateUserAccount(validatedFields.data);
  if (!user) {
    return validationErrorState("That email and password do not match an account.");
  }

  await setUserSession(user);
  const mergedCount = await claimGuestProgress(user.id, formData);
  refreshAccountSurfaces();
  redirect(withGuestMergeCount(resolveNextPath(formData.get("nextPath"), "/account"), mergedCount));
}

export async function signUpAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const validatedFields = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });

  if (!validatedFields.success) {
    return validationErrorState("Fix the highlighted fields before creating your account.", validatedFields.error.flatten().fieldErrors);
  }

  let user: Awaited<ReturnType<typeof createUserAccount>>;

  try {
    user = await createUserAccount(validatedFields.data);
    await setUserSession(user);
  } catch (error) {
    return validationErrorState(error instanceof Error ? error.message : "Unable to create the account right now.");
  }

  const mergedCount = await claimGuestProgress(user.id, formData);
  refreshAccountSurfaces();
  redirect(withGuestMergeCount(resolveNextPath(formData.get("nextPath"), "/account"), mergedCount));
}

export async function signOutAction(formData: FormData) {
  await clearUserSession();
  refreshAccountSurfaces();
  redirect(resolveNextPath(formData.get("nextPath"), "/"));
}

export async function updateProfileAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return validationErrorState("Your session expired. Sign in again to update the profile.");
  }

  const validatedFields = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
  });

  if (!validatedFields.success) {
    return validationErrorState("Fix the highlighted profile fields first.", validatedFields.error.flatten().fieldErrors);
  }

  try {
    const user = await updateUserAccount(viewer.id, validatedFields.data);
    await setUserSession(user);
  } catch (error) {
    return validationErrorState(error instanceof Error ? error.message : "Unable to save your profile right now.");
  }

  refreshAccountSurfaces();
  return {
    status: "success" as const,
    message: "Profile updated.",
  };
}

export async function linkChessAccountAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return validationErrorState("Your session expired. Sign in again to link an account.");
  }

  const validatedFields = linkedAccountSchema.safeParse({
    source: formData.get("source"),
    username: formData.get("username"),
  });

  if (!validatedFields.success) {
    return validationErrorState("Enter a valid username before saving.", validatedFields.error.flatten().fieldErrors);
  }

  try {
    await upsertLinkedChessAccount(viewer.id, validatedFields.data);
  } catch (error) {
    return validationErrorState(error instanceof Error ? error.message : "Unable to save that linked account right now.");
  }

  refreshAccountSurfaces();
  return {
    status: "success" as const,
    message:
      validatedFields.data.source === "chesscom"
        ? "Chess.com username saved."
        : "Lichess username saved.",
  };
}
