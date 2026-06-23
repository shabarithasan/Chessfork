"use client";

import { useActionState, useEffect, useState } from "react";

import { signInAction, signUpAction } from "@/app/auth/actions";
import { buildGuestUpgradePayloadValue } from "@/lib/guestSession";
import { localeNames } from "@/lib/locales";
import { siteConfig } from "@/lib/site";
import type { FormActionState } from "@/server/auth/validation";
import type { Locale } from "@/types/platform";

const initialFormState: FormActionState = {
  status: "idle",
};

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-sm text-rose-300">{errors[0]}</p>;
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
      className={`rounded-[1.1rem] border px-4 py-3 text-sm ${
        status === "error"
          ? "border-rose-300/20 bg-rose-300/10 text-rose-100"
          : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
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

function TextField({
  id,
  label,
  name,
  placeholder,
  type = "text",
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  defaultValue?: string;
  errors?: string[];
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-3 h-13 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/60"
      />
      <FieldErrors errors={errors} />
    </label>
  );
}

export function SignInForm({
  nextPath = "/account",
}: {
  nextPath?: string;
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(signInAction, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="nextPath" value={nextPath} />
      <GuestMergeInput />
      <TextField
        id="signin-email"
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        errors={state.errors?.email}
      />
      <TextField
        id="signin-password"
        label="Password"
        name="password"
        type="password"
        placeholder="Your password"
        errors={state.errors?.password}
      />
      <ActionMessage status={state.status} message={state.message} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing you in..." : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm({
  nextPath = "/account",
  locale = siteConfig.defaultLocale,
}: {
  nextPath?: string;
  locale?: Locale;
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="nextPath" value={nextPath} />
      <GuestMergeInput />
      <TextField
        id="signup-display-name"
        label="Display name"
        name="displayName"
        placeholder="Chessfork player"
        errors={state.errors?.displayName}
      />
      <TextField
        id="signup-email"
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        errors={state.errors?.email}
      />
      <TextField
        id="signup-password"
        label="Password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        errors={state.errors?.password}
      />
      <label htmlFor="signup-locale" className="block">
        <span className="text-sm font-medium text-slate-200">Locale</span>
        <select
          id="signup-locale"
          name="locale"
          defaultValue={locale}
          className="mt-3 h-13 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/60"
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
        className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
