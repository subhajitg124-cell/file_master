import crypto from "node:crypto";

/**
 * Hashes a plain text password using PBKDF2 with a random salt.
 * @param password Plain text password
 * @returns Combined salt and hash string
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored PBKDF2 hash.
 * @param password Plain text password to check
 * @param storedHash Hashed password string containing salt
 * @returns boolean indicating if password is valid
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === testHash;
  } catch (err) {
    return false;
  }
}
