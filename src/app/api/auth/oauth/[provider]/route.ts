import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildOAuthAuthorizationUrl,
  createOAuthStateToken,
  createPkcePair,
  isOAuthProvider,
  oauthProviderConfigured,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/server/auth/oauth";
import { env } from "@/server/env";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", request.url));
  }

  if (!oauthProviderConfigured(provider)) {
    return NextResponse.redirect(new URL("/auth?error=oauth_not_configured", request.url));
  }

  const rawNext = new URL(request.url).searchParams.get("next");
  const nextPath = typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  const pkce = createPkcePair();
  const now = Math.floor(Date.now() / 1000);
  const stateToken = createOAuthStateToken({
    provider,
    nextPath,
    verifier: pkce.verifier,
    iat: now,
    exp: now + OAUTH_STATE_MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, stateToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });

  const authorizationUrl = buildOAuthAuthorizationUrl(provider, {
    redirectUri: `${origin}/api/auth/oauth/callback/${provider}`,
    state: stateToken,
    codeChallenge: pkce.challenge,
  });

  return NextResponse.redirect(authorizationUrl);
}
