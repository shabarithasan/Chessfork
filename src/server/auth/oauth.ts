import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/server/env";

export type OAuthProvider = "google" | "github";

export interface OAuthProfile {
  providerUserId: string;
  email: string;
  displayName: string;
}

export interface OAuthStatePayload {
  provider: OAuthProvider;
  nextPath: string;
  verifier: string;
  iat: number;
  exp: number;
}

export const OAUTH_STATE_COOKIE_NAME = "knightowl_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export function oauthProviderConfigured(provider: OAuthProvider) {
  return provider === "google"
    ? Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
    : Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

function oauthStateSignature(value: string) {
  return createHmac("sha256", env.AUTH_SESSION_SECRET).update(value).digest("base64url");
}

export function createOAuthStateToken(payload: OAuthStatePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${oauthStateSignature(encodedPayload)}`;
}

export function verifyOAuthStateToken(token: string): OAuthStatePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = oauthStateSignature(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OAuthStatePayload;
    if (typeof payload.provider !== "string" || typeof payload.nextPath !== "string" || typeof payload.verifier !== "string") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHmac("sha256", verifier).digest("base64url").replace(/=/g, "");
  return { verifier, challenge };
}

export function buildOAuthAuthorizationUrl(
  provider: OAuthProvider,
  params: { redirectUri: string; state: string; codeChallenge?: string },
) {
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", params.state);
    if (params.codeChallenge) {
      url.searchParams.set("code_challenge", params.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function postForm(url: string, body: Record<string, string>, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...headers,
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed (${response.status}).`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  params: { code: string; redirectUri: string; codeVerifier?: string },
) {
  if (provider === "google") {
    const json = await postForm("https://oauth2.googleapis.com/token", {
      grant_type: "authorization_code",
      code: params.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: params.redirectUri,
      ...(params.codeVerifier ? { code_verifier: params.codeVerifier } : {}),
    });
    const accessToken = json.access_token;
    if (typeof accessToken !== "string") {
      throw new Error("Google token exchange returned no access token.");
    }
    return accessToken;
  }

  const json = await postForm("https://github.com/login/oauth/access_token", {
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const accessToken = json.access_token;
  if (typeof accessToken !== "string") {
    throw new Error("GitHub token exchange returned no access token.");
  }
  return accessToken;
}

async function getJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "Chessfork",
    },
  });

  if (!response.ok) {
    throw new Error(`OAuth profile fetch failed (${response.status}).`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function normalizeOAuthDisplayName(name: unknown, fallback: string) {
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 255) : fallback;
}

export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  if (provider === "google") {
    const userinfo = await getJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken);
    const providerUserId = userinfo.sub;
    const email = userinfo.email;
    if (typeof providerUserId !== "string" || typeof email !== "string") {
      throw new Error("Google profile is missing the subject or email.");
    }

    return {
      providerUserId,
      email: email.toLowerCase(),
      displayName: normalizeOAuthDisplayName(userinfo.name, email.split("@")[0]),
    };
  }

  const user = await getJson("https://api.github.com/user", accessToken);
  const providerUserId = user.id;
  if (typeof providerUserId !== "string" && typeof providerUserId !== "number") {
    throw new Error("GitHub profile is missing the user id.");
  }

  let email: string = "";
  const rawEmail = user.email;
  if (typeof rawEmail === "string") {
    email = rawEmail;
  } else {
    const emails = await getJson("https://api.github.com/user/emails", accessToken);
    const entries = Array.isArray(emails) ? (emails as Record<string, unknown>[]) : [];
    const primaryVerified = entries.find((entry) => entry.primary === true && entry.verified === true);
    const verified = entries.find((entry) => entry.verified === true);
    const candidate = primaryVerified ?? verified ?? entries[0];
    email = typeof candidate?.email === "string" ? candidate.email : "";
  }

  if (!email) {
    throw new Error("GitHub account has no accessible email address.");
  }

  const login = user.login;
  return {
    providerUserId: String(providerUserId),
    email: email.toLowerCase(),
    displayName: normalizeOAuthDisplayName(user.name, typeof login === "string" ? login : email.split("@")[0]),
  };
}
