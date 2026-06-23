"use client";

import { useActionState } from "react";

import { linkChessAccountAction, updateProfileAction } from "@/app/auth/actions";
import { localeNames } from "@/lib/locales";
import { siteConfig } from "@/lib/site";
import type { FormActionState } from "@/server/auth/validation";
import type { LinkedChessAccount, UserAccount } from "@/types/platform";

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
    <p className={`text-sm ${status === "error" ? "text-rose-300" : "text-emerald-300"}`}>
      {message}
    </p>
  );
}

export function ProfileSettingsForm({
  user,
}: {
  user: UserAccount;
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(updateProfileAction, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <label htmlFor="account-display-name" className="block">
        <span className="text-sm font-medium text-slate-200">Display name</span>
        <input
          id="account-display-name"
          name="displayName"
          defaultValue={user.displayName}
          className="mt-3 h-13 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/60"
        />
        <FieldErrors errors={state.errors?.displayName} />
      </label>

      <label htmlFor="account-locale" className="block">
        <span className="text-sm font-medium text-slate-200">Locale</span>
        <select
          id="account-locale"
          name="locale"
          defaultValue={user.locale}
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
        className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving profile..." : "Save profile"}
      </button>
    </form>
  );
}

export function ChessAccountLinkForm({
  source,
  account,
}: {
  source: LinkedChessAccount["source"];
  account?: LinkedChessAccount;
}) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(linkChessAccountAction, initialFormState);

  const label = source === "chesscom" ? "Chess.com" : "Lichess";

  return (
    <form action={action} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
      <input type="hidden" name="source" value={source} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{label}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Save the public username you usually import from so analyze can prefill it for you.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          {account ? "Linked" : "Optional"}
        </span>
      </div>

      <label htmlFor={`${source}-username`} className="block">
        <span className="text-sm font-medium text-slate-200">{label} username</span>
        <input
          id={`${source}-username`}
          name="username"
          defaultValue={account?.username ?? ""}
          placeholder={source === "chesscom" ? "e.g. hikaru" : "e.g. lichess-user"}
          className="mt-3 h-13 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/60"
        />
        <FieldErrors errors={state.errors?.username} />
      </label>

      <ActionMessage status={state.status} message={state.message} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : `Save ${label} username`}
      </button>
    </form>
  );
}
