import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeOAuthCode,
  fetchOAuthProfile,
  isOAuthProvider,
  OAUTH_STATE_COOKIE_NAME,
  verifyOAuthStateToken,
} from "@/server/auth/oauth";
import { setUserSession } from "@/server/auth/session";
import { findOrCreateOAuthUser } from "@/server/repositories/user-repository";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", request.url));
  }

  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

  const failure = (error: string) => NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));

  if (!code || !state || !stateCookie || stateCookie !== state) {
    return failure("oauth_failed");
  }

  const statePayload = verifyOAuthStateToken(state);
  if (!statePayload || statePayload.provider !== provider || statePayload.exp <= Math.floor(Date.now() / 1000)) {
    return failure("oauth_expired");
  }

  let profile;
  try {
    const accessToken = await exchangeOAuthCode(provider, {
      code,
      redirectUri: `${origin}/api/auth/oauth/callback/${provider}`,
      codeVerifier: statePayload.verifier,
    });
    profile = await fetchOAuthProfile(provider, accessToken);
  } catch {
    return failure("oauth_failed");
  }

  let user;
  try {
    user = await findOrCreateOAuthUser({
      provider,
      providerUserId: profile.providerUserId,
      email: profile.email,
      displayName: profile.displayName,
    });
  } catch {
    return failure("oauth_failed");
  }

  await setUserSession(user);
  return NextResponse.redirect(new URL(statePayload.nextPath, request.url));
}
