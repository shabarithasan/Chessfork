import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/server/auth/validation.ts";
  let code = await readFile(file, "utf8");
  code = code.replace(
    `export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(40, "Keep it under 40 characters."),
  locale: localeEnum,
});`,
    `export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(40, "Keep it under 40 characters."),
  locale: localeEnum,
  coachPersona: z.string().optional(),
});`
  );
  await writeFile(file, code);
  
  const actionFile = "src/app/auth/actions.ts";
  let actionCode = await readFile(actionFile, "utf8");
  actionCode = actionCode.replace(
    `  const validatedFields = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
  });`,
    `  const validatedFields = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
    coachPersona: formData.get("coachPersona"),
  });`
  );
  await writeFile(actionFile, actionCode);
  
  const formFile = "src/components/account/account-forms.tsx";
  let formCode = await readFile(formFile, "utf8");
  const formTarget = `      <ActionMessage status={state.status} message={state.message} />`;
  const formReplace = `      <label htmlFor="account-coach-persona" className="block">
        <span className="text-sm font-medium text-slate-200">AI Coach Persona</span>
        <select
          id="account-coach-persona"
          name="coachPersona"
          defaultValue={user.coachPersona || "default"}
          className="mt-3 h-13 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/60"
        >
          <option value="default">Default (Professional)</option>
          <option value="hikaru">Hikaru (Fast & Energetic)</option>
          <option value="magnus">Magnus (Pragmatic & Calm)</option>
          <option value="levy">GothamChess (Dramatic & Loud)</option>
          <option value="tal">Tal (Bloodthirsty Attacker)</option>
        </select>
      </label>

      <ActionMessage status={state.status} message={state.message} />`;
  formCode = formCode.replace(formTarget, formReplace);
  await writeFile(formFile, formCode);
}
run();
