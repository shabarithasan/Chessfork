import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createSignedSessionToken, verifySignedSessionToken } from "@/server/auth/session";
import {
  authenticateUserAccount,
  createUserAccount,
  getAccountProfile,
  updateUserAccount,
  upsertLinkedChessAccount,
} from "@/server/repositories/user-repository";

describe("auth accounts", () => {
  it("creates, authenticates, and enriches a fallback user account", async () => {
    const uniqueEmail = `player-${randomUUID()}@example.com`;
    const created = await createUserAccount({
      displayName: "Tactical Tester",
      email: uniqueEmail,
      password: "Knightowl9",
      locale: "en",
    });

    expect(created.subscriptionTier).toBe("free");

    const authenticated = await authenticateUserAccount({
      email: uniqueEmail,
      password: "Knightowl9",
    });

    expect(authenticated?.id).toBe(created.id);

    const updated = await updateUserAccount(created.id, {
      displayName: "Updated Tester",
      locale: "hi",
    });

    expect(updated.displayName).toBe("Updated Tester");
    expect(updated.locale).toBe("hi");

    await upsertLinkedChessAccount(created.id, {
      source: "chesscom",
      username: "knightowl-public",
    });
    await upsertLinkedChessAccount(created.id, {
      source: "lichess",
      username: "knightowl-study",
    });

    const profile = await getAccountProfile(created.id);

    expect(profile?.user.id).toBe(created.id);
    expect(profile?.linkedAccounts.map((account) => account.source).sort()).toEqual(["chesscom", "lichess"]);
  });

  it("signs and verifies stateless session cookies", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createSignedSessionToken({
      sub: "user-123",
      iat: now,
      exp: now + 60,
    });

    expect(verifySignedSessionToken(token)?.sub).toBe("user-123");
    expect(verifySignedSessionToken(`${token}.tampered`)).toBeNull();
  });
});
