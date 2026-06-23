import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

function normalizePasswordHash(value: string) {
  const [scheme, salt, hash] = value.split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    throw new Error("Stored password hash is malformed.");
  }

  return {
    salt,
    hash,
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const { salt, hash } = normalizePasswordHash(storedHash);
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
