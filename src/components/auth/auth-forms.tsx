"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { signInAction, signUpAction } from "@/app/auth/actions";
import { buildGuestUpgradePayloadValue } from "@/lib/guestSession";
import { localeNames } from "@/lib/locales";
import { siteConfig } from "@/lib/site";
import type { FormActionState } from "@/server/auth/validation";
import type { Locale } from "@/types/platform";

const initialFormState: FormActionState = {
  status: "idle",
};

type OAuthProvider = "google" | "github";

const oauthButtonBaseClass =
  "flex h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-slate-300 transition";

function oauthHref(provider: OAuthProvider, nextPath: string) {
  return `/api/auth/oauth/${provider}?next=${encodeURIComponent(nextPath)}`;
}

function OAuthButton({ provider, enabled, nextPath }: { provider: OAuthProvider; enabled: boolean; nextPath: string }) {
  const label = provider === "google" ? "Continue with Google" : "Continue with GitHub";
  const icon = provider === "google" ? <GoogleIcon /> : <GitHubIcon />;

  if (!enabled) {
    return (
      <span
        title="Social sign-in is not configured yet"
        className={`${oauthButtonBaseClass} cursor-not-allowed opacity-45`}
        aria-disabled="true"
      >
        {icon}
        {label}
      </span>
    );
  }

  return (
    <a href={oauthHref(provider, nextPath)} className={`${oauthButtonBaseClass} hover:border-white/20 hover:bg-white/10`}>
      {icon}
      {label}
    </a>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-sm text-rose-400">{errors[0]}</p>;
}

function ActionMessage({
  status,
  message,
}: {
  status?: "idle" | "success" | "error";
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        status === "error"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {message}
    </div>
  );
}

function GuestMergeInput() {
  const [payload, setPayload] = useState("");

  useEffect(() => {
    window.queueMicrotask(() => {
      setPayload(buildGuestUpgradePayloadValue());
    });
  }, []);

  return <input type="hidden" name="guestMergePayload" value={payload} />;
}

function PasswordField({
  id,
  name,
  placeholder,
  errors,
}: {
  id: string;
  name: string;
  placeholder: string;
  errors?: string[];
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-500" />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete="current-password"
          className="h-[52px] w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/8 focus:ring-2 focus:ring-amber-400/15"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
        </button>
      </div>
      <FieldErrors errors={errors} />
    </div>
  );
}

function IconTextField({
  id,
  name,
  placeholder,
  type = "text",
  errors,
  icon,
  autoComplete,
}: {
  id: string;
  name: string;
  placeholder: string;
  type?: string;
  errors?: string[];
  icon: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-[52px] w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/8 focus:ring-2 focus:ring-amber-400/15"
        />
      </div>
      <FieldErrors errors={errors} />
    </div>
  );
}

/* ── Google logo inline SVG ──────────────────────────── */
function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ── GitHub logo inline SVG ──────────────────────────── */
function GitHubIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function SignInForm({
  nextPath = "/account",
  oauthProviders,
}: {
  nextPath?: string;
  oauthProviders?: Partial<Record<OAuthProvider, boolean>>;
  tone?: "dark" | "glass";
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(signInAction, initialFormState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="nextPath" value={nextPath} />
      <GuestMergeInput />

      <IconTextField
        id="signin-email"
        name="email"
        type="email"
        placeholder="Enter your email"
        errors={state.errors?.email}
        icon={<Mail className="size-[18px]" />}
        autoComplete="email"
      />

      <PasswordField
        id="signin-password"
        name="password"
        placeholder="Enter your password"
        errors={state.errors?.password}
      />

      {/* ── Remember me / Forgot password row ── */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            defaultChecked
            className="size-4 rounded border-amber-400/40 bg-amber-400/20 text-amber-400 accent-amber-400"
          />
          Remember me
        </label>
        <button type="button" className="text-sm font-medium text-amber-400 transition hover:text-amber-300">
          Forgot password?
        </button>
      </div>

      <ActionMessage status={state.status} message={state.message} />

      {/* ── Sign In button ── */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_8px_32px_rgba(251,191,36,.25)] transition hover:shadow-[0_12px_40px_rgba(251,191,36,.35)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing you in..." : "Sign In"}
      </button>

      {/* ── OR divider ── */}
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium text-slate-500">OR</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* ── OAuth buttons ── */}
      <OAuthButton provider="google" enabled={oauthProviders?.google ?? true} nextPath={nextPath} />

      <OAuthButton provider="github" enabled={oauthProviders?.github ?? true} nextPath={nextPath} />
    </form>
  );
}

export function SignUpForm({
  nextPath = "/account",
  locale = siteConfig.defaultLocale,
  oauthProviders,
}: {
  nextPath?: string;
  locale?: Locale;
  oauthProviders?: Partial<Record<OAuthProvider, boolean>>;
  tone?: "dark" | "glass";
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="nextPath" value={nextPath} />
      <GuestMergeInput />

      <IconTextField
        id="signup-display-name"
        name="displayName"
        placeholder="Display name"
        errors={state.errors?.displayName}
        icon={<User className="size-[18px]" />}
      />

      <IconTextField
        id="signup-email"
        name="email"
        type="email"
        placeholder="Enter your email"
        errors={state.errors?.email}
        icon={<Mail className="size-[18px]" />}
        autoComplete="email"
      />

      <PasswordField
        id="signup-password"
        name="password"
        placeholder="At least 8 characters"
        errors={state.errors?.password}
      />

      <label htmlFor="signup-locale" className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Locale</span>
        <select
          id="signup-locale"
          name="locale"
          defaultValue={locale}
          className="mt-2 h-[52px] w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-400/40 focus:bg-white/8 focus:ring-2 focus:ring-amber-400/15"
        >
          {siteConfig.locales.map((entry) => (
            <option key={entry} value={entry}>
              {localeNames[entry]}
            </option>
          ))}
        </select>
        <FieldErrors errors={state.errors?.locale} />
      </label>

      <ActionMessage status={state.status} message={state.message} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_8px_32px_rgba(251,191,36,.25)] transition hover:shadow-[0_12px_40px_rgba(251,191,36,.35)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create Account"}
      </button>

      {/* ── OR divider ── */}
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium text-slate-500">OR</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* ── OAuth buttons ── */}
      <OAuthButton provider="google" enabled={oauthProviders?.google ?? true} nextPath={nextPath} />

      <OAuthButton provider="github" enabled={oauthProviders?.github ?? true} nextPath={nextPath} />
    </form>
  );
}
