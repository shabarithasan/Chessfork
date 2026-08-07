import { MongoClient, ServerApiVersion, type Collection } from "mongodb";

import { env, mongoDatabaseEnabled } from "@/server/env";
import type { AnalysisRun, Locale, SourceType, SubscriptionTier } from "@/types/platform";

export type MongoChessAccount = {
  id: string;
  linkedAt: Date;
  source: "chesscom" | "lichess";
  username: string;
};

export type MongoOAuthIdentity = {
  provider: "google" | "github";
  providerUserId: string;
  email: string;
  name: string;
};

export type MongoUser = {
  _id: string;
  createdAt: Date;
  displayName: string;
  email: string;
  linkedAccounts: MongoChessAccount[];
  locale: Locale;
  oauthIdentities?: MongoOAuthIdentity[];
  passwordHash: string;
  subscriptionTier: SubscriptionTier;
  updatedAt: Date;
};

export type MongoAnalysisRun = {
  _id: string;
  createdAt: Date;
  ownerId?: string;
  source?: SourceType;
  run: AnalysisRun;
};

const globalForMongo = globalThis as typeof globalThis & {
  __chessforkMongoClient?: MongoClient;
  __chessforkMongoIndexes?: Promise<void>;
};

export function getMongoClient() {
  if (!mongoDatabaseEnabled()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.__chessforkMongoClient) {
    globalForMongo.__chessforkMongoClient = new MongoClient(env.MONGODB_URI, {
      appName: "Chessfork",
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  return globalForMongo.__chessforkMongoClient;
}

export function getMongoUsersCollection(): Collection<MongoUser> {
  return getMongoClient().db(env.MONGODB_DB).collection<MongoUser>("users");
}

export function getMongoAnalysisRunsCollection(): Collection<MongoAnalysisRun> {
  return getMongoClient().db(env.MONGODB_DB).collection<MongoAnalysisRun>("analysisRuns");
}

export async function ensureMongoUserIndexes() {
  if (!globalForMongo.__chessforkMongoIndexes) {
    globalForMongo.__chessforkMongoIndexes = (async () => {
      const users = getMongoUsersCollection();
      await users.createIndex({ email: 1 }, { name: "users_email_unique", unique: true });
      await users.createIndex({ createdAt: -1 }, { name: "users_created_at" });
      await users.createIndex(
        { "oauthIdentities.provider": 1, "oauthIdentities.providerUserId": 1 },
        { name: "users_oauth_identity_unique", unique: true },
      );
    })();
  }

  return globalForMongo.__chessforkMongoIndexes;
}

export async function checkMongoDatabaseHealth() {
  if (!mongoDatabaseEnabled()) return false;

  try {
    await getMongoClient().db(env.MONGODB_DB).command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
