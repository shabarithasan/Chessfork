import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/server/env";
import { findUserById } from "@/server/repositories/user-repository";
import type { UserAccount } from "@/types/platform";

const SESSION_COOKIE_NAME = "knightowl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  sub: string;
  exp: number;
  iat: number;
}

function getSessionSecret() {
  return env.AUTH_SESSION_SECRET;
}

function sessionSignature(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSignedSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sessionSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedSessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sessionSignature(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function setUserSession(user: Pick<UserAccount, "id">) {
  const cookieStore = await cookies();
  const now = Math.floor(Date.now() / 1000);
  cookieStore.set(SESSION_COOKIE_NAME, createSignedSessionToken({
    sub: user.id,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  }), sessionCookieOptions());
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = verifySignedSessionToken(token);
  if (!payload) {
    return null;
  }

  return findUserById(payload.sub);
}
