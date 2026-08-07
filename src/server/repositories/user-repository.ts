import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/server/db/client";
import { chessAccounts, identities, subscriptions, userCredentials, users } from "@/server/db/schema";
import { databaseEnabled } from "@/server/env";
import { mongoDatabaseEnabled } from "@/server/env";
import { ensureMongoUserIndexes, getMongoUsersCollection, type MongoOAuthIdentity, type MongoUser } from "@/server/mongodb/client";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import type { OAuthProvider } from "@/server/auth/oauth";
import type { AccountProfile, LinkedChessAccount, Locale, SubscriptionTier, UserAccount } from "@/types/platform";

const globalForUserFallback = globalThis as typeof globalThis & {
  __knightowlUsers?: Map<string, UserAccount>;
  __knightowlUserEmailIndex?: Map<string, string>;
  __knightowlUserCredentials?: Map<string, string>;
  __knightowlUserChessAccounts?: Map<string, LinkedChessAccount>;
  __knightowlOAuthIdentities?: Map<string, string>;
};

function getUserStore() {
  if (!globalForUserFallback.__knightowlUsers) {
    globalForUserFallback.__knightowlUsers = new Map();
  }

  return globalForUserFallback.__knightowlUsers;
}

function getUserEmailIndex() {
  if (!globalForUserFallback.__knightowlUserEmailIndex) {
    globalForUserFallback.__knightowlUserEmailIndex = new Map();
  }

  return globalForUserFallback.__knightowlUserEmailIndex;
}

function getCredentialStore() {
  if (!globalForUserFallback.__knightowlUserCredentials) {
    globalForUserFallback.__knightowlUserCredentials = new Map();
  }

  return globalForUserFallback.__knightowlUserCredentials;
}

function getChessAccountStore() {
  if (!globalForUserFallback.__knightowlUserChessAccounts) {
    globalForUserFallback.__knightowlUserChessAccounts = new Map();
  }

  return globalForUserFallback.__knightowlUserChessAccounts;
}

function getOAuthIdentityStore() {
  if (!globalForUserFallback.__knightowlOAuthIdentities) {
    globalForUserFallback.__knightowlOAuthIdentities = new Map();
  }

  return globalForUserFallback.__knightowlOAuthIdentities;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isLinkedChessSource(source: string): source is LinkedChessAccount["source"] {
  return source === "chesscom" || source === "lichess";
}

function makeLinkedAccountKey(userId: string, source: LinkedChessAccount["source"]) {
  return `${userId}:${source}`;
}

function toUserAccount(row: {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  createdAt: Date | string;
  subscriptionTier?: SubscriptionTier | null;
}): UserAccount {
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    displayName: row.displayName,
    locale: (row.locale || "en") as Locale,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    subscriptionTier: row.subscriptionTier ?? "free",
  };
}

function toMongoUserAccount(user: MongoUser): UserAccount {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
    subscriptionTier: user.subscriptionTier,
  };
}

function getFallbackLinkedAccounts(userId: string): LinkedChessAccount[] {
  return [...getChessAccountStore().entries()]
    .filter(([key]) => key.startsWith(`${userId}:`))
    .map(([, account]) => account)
    .sort((left, right) => left.source.localeCompare(right.source));
}

async function createFallbackUser(input: {
  displayName: string;
  email: string;
  password: string;
  locale: Locale;
}) {
  const email = normalizeEmail(input.email);
  const emailIndex = getUserEmailIndex();
  if (emailIndex.has(email)) {
    throw new Error("An account with that email already exists.");
  }

  const user: UserAccount = {
    id: randomUUID(),
    email,
    displayName: input.displayName.trim(),
    locale: input.locale,
    createdAt: new Date().toISOString(),
    subscriptionTier: "free",
  };

  getUserStore().set(user.id, user);
  emailIndex.set(email, user.id);
  getCredentialStore().set(user.id, await hashPassword(input.password));

  return user;
}

async function authenticateFallbackUser(email: string, password: string) {
  const userId = getUserEmailIndex().get(normalizeEmail(email));
  if (!userId) {
    return null;
  }

  const user = getUserStore().get(userId);
  const passwordHash = getCredentialStore().get(userId);
  if (!user || !passwordHash) {
    return null;
  }

  return (await verifyPassword(password, passwordHash)) ? user : null;
}

function makeOAuthIdentityKey(provider: OAuthProvider, providerUserId: string) {
  return `${provider}:${providerUserId}`;
}

async function findOrCreateFallbackOAuthUser(input: { provider: OAuthProvider; providerUserId: string; email: string; displayName: string }) {
  const identityKey = makeOAuthIdentityKey(input.provider, input.providerUserId);
  const identityStore = getOAuthIdentityStore();

  const identityUserId = identityStore.get(identityKey);
  if (identityUserId) {
    const existing = getUserStore().get(identityUserId);
    if (existing) {
      return existing;
    }
  }

  const email = normalizeEmail(input.email);
  const emailUserId = getUserEmailIndex().get(email);
  if (emailUserId) {
    const existing = getUserStore().get(emailUserId);
    if (existing) {
      identityStore.set(identityKey, existing.id);
      return existing;
    }
  }

  const user: UserAccount = {
    id: randomUUID(),
    email,
    displayName: input.displayName.trim(),
    locale: "en",
    createdAt: new Date().toISOString(),
    subscriptionTier: "free",
  };

  getUserStore().set(user.id, user);
  getUserEmailIndex().set(email, user.id);
  identityStore.set(identityKey, user.id);
  return user;
}

async function updateFallbackUser(userId: string, updates: { displayName: string; locale: Locale }) {
  const current = getUserStore().get(userId);
  if (!current) {
    throw new Error("Account not found.");
  }

  const updated = {
    ...current,
    displayName: updates.displayName.trim(),
    locale: updates.locale,
  } satisfies UserAccount;

  getUserStore().set(userId, updated);
  return updated;
}

async function upsertFallbackChessAccount(userId: string, params: { source: LinkedChessAccount["source"]; username: string }) {
  const key = makeLinkedAccountKey(userId, params.source);
  const linkedAccount: LinkedChessAccount = {
    id: key,
    source: params.source,
    username: params.username.trim(),
    linkedAt: new Date().toISOString(),
  };

  getChessAccountStore().set(key, linkedAccount);
  return linkedAccount;
}

async function createDatabaseUser(input: {
  displayName: string;
  email: string;
  password: string;
  locale: Locale;
}) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      throw new Error("An account with that email already exists.");
    }

    const createdUsers = await tx
      .insert(users)
      .values({
        email,
        displayName: input.displayName.trim(),
        locale: input.locale,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        locale: users.locale,
        createdAt: users.createdAt,
      });
    const createdUser = createdUsers[0];

    await tx.insert(identities).values({
      userId: createdUser.id,
      provider: "password",
      providerUserId: email,
    });

    await tx.insert(userCredentials).values({
      userId: createdUser.id,
      passwordHash,
    });

    await tx.insert(subscriptions).values({
      userId: createdUser.id,
      tier: "free",
      status: "active",
    });

    return toUserAccount({
      ...createdUser,
      subscriptionTier: "free",
    });
  });
}

async function findOrCreateDatabaseOAuthUser(input: { provider: OAuthProvider; providerUserId: string; email: string; displayName: string }) {
  const db = getDb();
  const email = normalizeEmail(input.email);

  return db.transaction(async (tx) => {
    const identityRows = await tx
      .select({ userId: identities.userId })
      .from(identities)
      .where(and(eq(identities.provider, input.provider), eq(identities.providerUserId, input.providerUserId)))
      .limit(1);

    let userId = identityRows[0]?.userId;
    if (!userId) {
      const emailRows = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (emailRows[0]) {
        await tx.insert(identities).values({
          userId: emailRows[0].id,
          provider: input.provider,
          providerUserId: input.providerUserId,
        });
        userId = emailRows[0].id;
      }
    }

    if (!userId) {
      const createdUsers = await tx
        .insert(users)
        .values({ email, displayName: input.displayName.trim(), locale: "en" })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          locale: users.locale,
          createdAt: users.createdAt,
        });
      userId = createdUsers[0].id;

      await tx.insert(identities).values({
        userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
      });
      await tx.insert(subscriptions).values({
        userId,
        tier: "free",
        status: "active",
      });
    }

    const rows = await tx
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        locale: users.locale,
        createdAt: users.createdAt,
        subscriptionTier: subscriptions.tier,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new Error("Account not found.");
    }

    return toUserAccount(row);
  });
}

async function createMongoUser(input: {
  displayName: string;
  email: string;
  password: string;
  locale: Locale;
}) {
  await ensureMongoUserIndexes();
  const now = new Date();
  const user: MongoUser = {
    _id: randomUUID(),
    email: normalizeEmail(input.email),
    displayName: input.displayName.trim(),
    locale: input.locale,
    passwordHash: await hashPassword(input.password),
    subscriptionTier: "free",
    linkedAccounts: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await getMongoUsersCollection().insertOne(user);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      throw new Error("An account with that email already exists.");
    }
    throw error;
  }

  return toMongoUserAccount(user);
}

async function findOrCreateMongoOAuthUser(input: { provider: OAuthProvider; providerUserId: string; email: string; displayName: string }) {
  await ensureMongoUserIndexes();
  const users = getMongoUsersCollection();
  const email = normalizeEmail(input.email);

  const byIdentity = await users.findOne({
    "oauthIdentities.provider": input.provider,
    "oauthIdentities.providerUserId": input.providerUserId,
  });
  if (byIdentity) {
    return toMongoUserAccount(byIdentity);
  }

  const identity: MongoOAuthIdentity = {
    provider: input.provider,
    providerUserId: input.providerUserId,
    email,
    name: input.displayName.trim(),
  };

  const byEmail = await users.findOne({ email });
  if (byEmail) {
    const alreadyLinked = (byEmail.oauthIdentities ?? []).some(
      (entry) => entry.provider === input.provider && entry.providerUserId === input.providerUserId,
    );
    if (!alreadyLinked) {
      await users.updateOne(
        { _id: byEmail._id },
        { $push: { oauthIdentities: identity }, $set: { updatedAt: new Date() } },
      );
    }
    return toMongoUserAccount(byEmail);
  }

  const now = new Date();
  const user: MongoUser = {
    _id: randomUUID(),
    email,
    displayName: identity.name,
    locale: "en",
    passwordHash: "",
    subscriptionTier: "free",
    linkedAccounts: [],
    oauthIdentities: [identity],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await users.insertOne(user);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      const winner = await users.findOne({
        "oauthIdentities.provider": input.provider,
        "oauthIdentities.providerUserId": input.providerUserId,
      });
      if (winner) {
        return toMongoUserAccount(winner);
      }
    }
    throw error;
  }

  return toMongoUserAccount(user);
}

async function authenticateMongoUser(email: string, password: string) {
  const user = await getMongoUsersCollection().findOne({ email: normalizeEmail(email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return toMongoUserAccount(user);
}

async function findMongoUserById(userId: string) {
  const user = await getMongoUsersCollection().findOne({ _id: userId });
  return user ? toMongoUserAccount(user) : null;
}

async function updateMongoUser(userId: string, updates: { displayName: string; locale: Locale }) {
  const users = getMongoUsersCollection();
  const result = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { displayName: updates.displayName.trim(), locale: updates.locale, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new Error("Account not found.");
  return toMongoUserAccount(result);
}

async function listMongoChessAccounts(userId: string): Promise<LinkedChessAccount[]> {
  const user = await getMongoUsersCollection().findOne({ _id: userId }, { projection: { linkedAccounts: 1 } });
  return (user?.linkedAccounts ?? [])
    .map((account) => ({ id: account.id, source: account.source, username: account.username, linkedAt: account.linkedAt.toISOString() }))
    .sort((left, right) => left.source.localeCompare(right.source));
}

async function upsertMongoChessAccount(userId: string, params: { source: LinkedChessAccount["source"]; username: string }) {
  const users = getMongoUsersCollection();
  const user = await users.findOne({ _id: userId }, { projection: { linkedAccounts: 1 } });
  if (!user) throw new Error("Account not found.");

  const existing = user.linkedAccounts.find((account) => account.source === params.source);
  const linkedAccount: MongoUser["linkedAccounts"][number] = existing
    ? { ...existing, username: params.username.trim() }
    : { id: randomUUID(), source: params.source, username: params.username.trim(), linkedAt: new Date() };
  const linkedAccounts = existing
    ? user.linkedAccounts.map((account) => (account.source === params.source ? linkedAccount : account))
    : [...user.linkedAccounts, linkedAccount];
  await users.updateOne({ _id: userId }, { $set: { linkedAccounts, updatedAt: new Date() } });
  return { id: linkedAccount.id, source: linkedAccount.source, username: linkedAccount.username, linkedAt: linkedAccount.linkedAt.toISOString() } satisfies LinkedChessAccount;
}

async function authenticateDatabaseUser(email: string, password: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      locale: users.locale,
      createdAt: users.createdAt,
      passwordHash: userCredentials.passwordHash,
      subscriptionTier: subscriptions.tier,
    })
    .from(users)
    .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  const row = rows[0];
  if (!row?.passwordHash) {
    return null;
  }

  if (!(await verifyPassword(password, row.passwordHash))) {
    return null;
  }

  return toUserAccount(row);
}

async function findDatabaseUserById(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      locale: users.locale,
      createdAt: users.createdAt,
      subscriptionTier: subscriptions.tier,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  return row ? toUserAccount(row) : null;
}

async function listDatabaseChessAccounts(userId: string): Promise<LinkedChessAccount[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: chessAccounts.id,
      source: chessAccounts.source,
      username: chessAccounts.username,
    })
    .from(chessAccounts)
    .where(eq(chessAccounts.userId, userId));

  const linkedAccounts: LinkedChessAccount[] = [];
  for (const row of rows) {
    if (!isLinkedChessSource(row.source)) {
      continue;
    }

    linkedAccounts.push({
      id: row.id,
      source: row.source,
      username: row.username,
      linkedAt: new Date().toISOString(),
    });
  }

  return linkedAccounts.sort((left, right) => left.source.localeCompare(right.source));
}

async function updateDatabaseUser(userId: string, updates: { displayName: string; locale: Locale }) {
  const db = getDb();
  const rows = await db
    .update(users)
    .set({
      displayName: updates.displayName.trim(),
      locale: updates.locale,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      locale: users.locale,
      createdAt: users.createdAt,
    });

  if (!rows[0]) {
    throw new Error("Account not found.");
  }

  const tierRows = await db.select({ tier: subscriptions.tier }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return toUserAccount({
    ...rows[0],
    subscriptionTier: tierRows[0]?.tier ?? "free",
  });
}

async function upsertDatabaseChessAccount(userId: string, params: { source: LinkedChessAccount["source"]; username: string }) {
  const db = getDb();
  const rows = await db
    .insert(chessAccounts)
    .values({
      userId,
      source: params.source,
      username: params.username.trim(),
    })
    .onConflictDoUpdate({
      target: [chessAccounts.userId, chessAccounts.source],
      set: {
        username: params.username.trim(),
      },
    })
    .returning({
      id: chessAccounts.id,
      source: chessAccounts.source,
      username: chessAccounts.username,
    });

  const row = rows[0];
  return {
    id: row.id,
    source: row.source as LinkedChessAccount["source"],
    username: row.username,
    linkedAt: new Date().toISOString(),
  } satisfies LinkedChessAccount;
}

export async function createUserAccount(input: {
  displayName: string;
  email: string;
  password: string;
  locale: Locale;
}) {
  if (mongoDatabaseEnabled()) {
    try {
      return await createMongoUser(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) throw error;
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return createFallbackUser(input);
    }
  }

  if (!databaseEnabled()) {
    return createFallbackUser(input);
  }

  try {
    return await createDatabaseUser(input);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw error;
    }

    console.warn("User database unavailable, falling back to memory:", error);
    return createFallbackUser(input);
  }
}

export async function findOrCreateOAuthUser(input: { provider: OAuthProvider; providerUserId: string; email: string; displayName: string }) {
  if (mongoDatabaseEnabled()) {
    try {
      return await findOrCreateMongoOAuthUser(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) throw error;
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return findOrCreateFallbackOAuthUser(input);
    }
  }

  if (!databaseEnabled()) {
    return findOrCreateFallbackOAuthUser(input);
  }

  try {
    return await findOrCreateDatabaseOAuthUser(input);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Account not found")) {
      throw error;
    }

    console.warn("User database unavailable, falling back to memory:", error);
    return findOrCreateFallbackOAuthUser(input);
  }
}

export async function authenticateUserAccount(input: { email: string; password: string }) {
  if (mongoDatabaseEnabled()) {
    try {
      return await authenticateMongoUser(input.email, input.password);
    } catch (error) {
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return authenticateFallbackUser(input.email, input.password);
    }
  }

  if (!databaseEnabled()) {
    return authenticateFallbackUser(input.email, input.password);
  }

  try {
    return await authenticateDatabaseUser(input.email, input.password);
  } catch (error) {
    console.warn("User database unavailable, falling back to memory:", error);
    return authenticateFallbackUser(input.email, input.password);
  }
}

export async function findUserById(userId: string) {
  if (mongoDatabaseEnabled()) {
    try {
      return await findMongoUserById(userId);
    } catch (error) {
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return getUserStore().get(userId) ?? null;
    }
  }

  if (!databaseEnabled()) {
    return getUserStore().get(userId) ?? null;
  }

  try {
    return await findDatabaseUserById(userId);
  } catch (error) {
    console.warn("User database unavailable, falling back to memory:", error);
    return getUserStore().get(userId) ?? null;
  }
}

export async function updateUserAccount(userId: string, updates: { displayName: string; locale: Locale }) {
  if (mongoDatabaseEnabled()) {
    try {
      return await updateMongoUser(userId, updates);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Account not found")) throw error;
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return updateFallbackUser(userId, updates);
    }
  }

  if (!databaseEnabled()) {
    return updateFallbackUser(userId, updates);
  }

  try {
    return await updateDatabaseUser(userId, updates);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Account not found")) {
      throw error;
    }

    console.warn("User database unavailable, falling back to memory:", error);
    return updateFallbackUser(userId, updates);
  }
}

export async function listLinkedChessAccounts(userId: string): Promise<LinkedChessAccount[]> {
  if (mongoDatabaseEnabled()) {
    try {
      return await listMongoChessAccounts(userId);
    } catch (error) {
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return getFallbackLinkedAccounts(userId);
    }
  }

  if (!databaseEnabled()) {
    return getFallbackLinkedAccounts(userId);
  }

  try {
    return await listDatabaseChessAccounts(userId);
  } catch (error) {
    console.warn("User database unavailable, falling back to memory:", error);
    return getFallbackLinkedAccounts(userId);
  }
}

export async function upsertLinkedChessAccount(userId: string, params: { source: LinkedChessAccount["source"]; username: string }) {
  if (mongoDatabaseEnabled()) {
    try {
      return await upsertMongoChessAccount(userId, params);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Account not found")) throw error;
      console.warn("MongoDB user database unavailable, falling back to memory:", error);
      return upsertFallbackChessAccount(userId, params);
    }
  }

  if (!databaseEnabled()) {
    return upsertFallbackChessAccount(userId, params);
  }

  try {
    return await upsertDatabaseChessAccount(userId, params);
  } catch (error) {
    console.warn("User database unavailable, falling back to memory:", error);
    return upsertFallbackChessAccount(userId, params);
  }
}

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  return {
    user,
    linkedAccounts: await listLinkedChessAccounts(userId),
  };
}
