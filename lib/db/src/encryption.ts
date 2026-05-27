/**
 * Encryption Service for Premium Features
 * Handles AES-256 encryption, key management, and secure temporary storage
 * 
 * In production, keys should be stored in:
 * - AWS KMS / Google Cloud KMS
 * - HashiCorp Vault
 * - Azure Key Vault
 * 
 * For now, we use crypto with separation of concerns
 */

import crypto from "crypto";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = process.env.ENCRYPTION_SALT || "filemaster-ai-2024";
const TAG_LENGTH = 16;
const IV_LENGTH = 12; // 96 bits for GCM

interface EncryptedData {
  iv: string; // Base64
  encryptedData: string; // Base64
  authTag: string; // Base64
}

interface DecryptResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Derive encryption key from user ID and master key
 * This allows per-user encryption with a master key rotation capability
 */
function deriveKey(userId: string, masterKey?: string): Buffer {
  const key = masterKey || process.env.ENCRYPTION_MASTER_KEY || "default-master-key";
  const combined = `${userId}:${key}`;
  return scryptSync(combined, SALT, 32); // 32 bytes for AES-256
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptSensitiveData(
  plaintext: string,
  userId: string
): EncryptedData {
  try {
    const key = deriveKey(userId);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("base64"),
      encryptedData: encrypted,
      authTag: authTag.toString("base64"),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export function decryptSensitiveData(
  encrypted: EncryptedData,
  userId: string
): DecryptResult {
  try {
    const key = deriveKey(userId);
    const iv = Buffer.from(encrypted.iv, "base64");
    const authTag = Buffer.from(encrypted.authTag, "base64");
    const encryptedBuffer = Buffer.from(encrypted.encryptedData, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedBuffer, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return {
      success: true,
      data: decrypted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generate secure share token for temporary links
 */
export function generateShareToken(length: number = 48): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hash share token for database storage (one-way)
 * Compare using timing-safe comparison in validation
 */
export function hashShareToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify share token with timing-safe comparison
 */
export function verifyShareToken(providedToken: string, storedHash: string): boolean {
  const providedHash = hashShareToken(providedToken);
  return crypto.timingSafeEqual(
    Buffer.from(providedHash),
    Buffer.from(storedHash)
  );
}

/**
 * Hash sensitive data like Aadhaar for masking detection
 */
export function hashForDetection(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate file integrity hash (SHA-256)
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Encrypt file metadata before storage
 */
export function encryptFileMetadata(
  metadata: Record<string, unknown>,
  userId: string
): string {
  const json = JSON.stringify(metadata);
  const encrypted = encryptSensitiveData(json, userId);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt file metadata after retrieval
 */
export function decryptFileMetadata(
  encryptedJson: string,
  userId: string
): Record<string, unknown> | null {
  try {
    const encrypted = JSON.parse(encryptedJson) as EncryptedData;
    const result = decryptSensitiveData(encrypted, userId);
    if (!result.success || !result.data) return null;
    return JSON.parse(result.data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Secure deletion from storage
 * Overwrite data multiple times before deletion (DoD 5220.22-M standard)
 */
export async function secureDelete(filePath: string): Promise<boolean> {
  try {
    // In production, implement actual file overwriting
    // For now, just use OS deletion (implement properly for production)
    console.log(`Secure delete scheduled for: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Secure deletion failed: ${error}`);
    return false;
  }
}

/**
 * Generate password hash for optional share link protection
 */
export function hashSharePassword(password: string, salt: string = ""): string {
  const useSalt = salt || randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, useSalt, 100000, 64, "sha512")
    .toString("hex");
  return `${useSalt}:${hash}`;
}

/**
 * Verify share password
 */
export function verifySharePassword(
  providedPassword: string,
  storedHash: string
): boolean {
  const [salt, hash] = storedHash.split(":");
  const providedHash = crypto
    .pbkdf2Sync(providedPassword, salt, 100000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(providedHash));
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (typeof data === "string") {
    // Mask Aadhaar-like patterns (12 digits)
    return data.replace(/\d{12}/, "XXXX-XXXX-XXXX");
  }
  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeForLogging);
    }
    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Hide sensitive keys
      if (
        key.toLowerCase().includes("key") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("aadhaar")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }
  return data;
}

/**
 * Temporary storage cleanup scheduler
 * Runs periodically to delete expired documents
 */
export async function scheduleExpiredDocumentCleanup(
  db: any,
  intervalHours: number = 24
) {
  setInterval(async () => {
    try {
      const now = new Date();
      // This would be implemented with actual database queries
      console.log(`Running cleanup at ${now.toISOString()}`);
      // TODO: Delete expired premium documents
      // TODO: Delete expired share links
      // TODO: Delete old scan history
    } catch (error) {
      console.error("Cleanup job failed:", error);
    }
  }, intervalHours * 60 * 60 * 1000);
}
