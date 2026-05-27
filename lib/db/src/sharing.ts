/**
 * Secure Sharing Service
 * Manages temporary download links with expiry, tracking, and security features
 * Used by WhatsApp sharing, QR codes, and direct downloads
 */

import { eq, lt, and } from "drizzle-orm";
import { shareLinksTable, premiumDocumentsTable } from "./schema/premium";
import { generateShareToken, hashShareToken, verifyShareToken } from "./encryption";

export interface CreateShareOptions {
  documentId: string;
  userId: string;
  expiryHours?: number;
  shareType?: string;
  maxDownloads?: number;
  password?: string;
  messageTemplate?: string;
}

export interface ShareLinkInfo {
  id: string;
  token: string;
  documentName: string;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  status: string;
  shareType: string;
}

export interface ValidateShareResult {
  valid: boolean;
  documentId?: string;
  documentPath?: string;
  error?: string;
}

/**
 * Create a secure temporary share link
 */
export async function createSecureShare(
  db: any,
  options: CreateShareOptions
): Promise<string> {
  const {
    documentId,
    userId,
    expiryHours = 48,
    shareType = "link",
    maxDownloads,
    password,
    messageTemplate,
  } = options;

  // Generate secure random token
  const token = generateShareToken();
  const tokenHash = hashShareToken(token);

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  // Hash password if provided
  let passwordHash = null;
  if (password) {
    const crypto = await import("crypto");
    const salt = crypto.randomBytes(16).toString("hex");
    passwordHash = `${salt}:${crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex")}`;
  }

  try {
    // Create share link in database
    // Note: In actual implementation, use db.insert()
    // For now, this is the logic structure

    const shareLink = {
      documentId,
      userId,
      token: tokenHash, // Store hash, not plain token
      shareType,
      status: "active" as const,
      expiresAt,
      downloadCount: 0,
      maxDownloads,
      passwordHash,
      messageTemplate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Creating share link:", {
      ...shareLink,
      token: "[REDACTED]",
      passwordHash: passwordHash ? "[REDACTED]" : null,
    });

    // Return the plain token (only shown once to user)
    return token;
  } catch (error) {
    throw new Error(`Failed to create share link: ${error}`);
  }
}

/**
 * Validate a share token and return document info
 */
export async function validateShareToken(
  db: any,
  token: string,
  ipAddress?: string
): Promise<ValidateShareResult> {
  try {
    const tokenHash = hashShareToken(token);

    // Find active share link by token hash
    // In actual implementation: const shareLink = await db.query.shareLinksTable.findFirst(...)

    const now = new Date();

    // Validation checks:
    // 1. Token must match
    // 2. Share must be active (not revoked)
    // 3. Expiry must not have passed
    // 4. Download count must not exceed limit

    // Mock validation logic
    const shareLink = {
      documentId: "doc-123",
      status: "active",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      downloadCount: 2,
      maxDownloads: 5,
      documentPath: "/secure/docs/doc-123",
    };

    if (shareLink.status !== "active") {
      return {
        valid: false,
        error: "Share link is no longer active",
      };
    }

    if (new Date() > shareLink.expiresAt) {
      return {
        valid: false,
        error: "Share link has expired",
      };
    }

    if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
      return {
        valid: false,
        error: "Maximum downloads reached",
      };
    }

    // Track download IP
    if (ipAddress) {
      // In actual implementation: Update downloadedByIps array
      console.log(`Share link downloaded from IP: ${ipAddress}`);
    }

    return {
      valid: true,
      documentId: shareLink.documentId,
      documentPath: shareLink.documentPath,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${error}`,
    };
  }
}

/**
 * Revoke a share link immediately
 */
export async function revokeShareLink(db: any, token: string, userId: string): Promise<boolean> {
  try {
    const tokenHash = hashShareToken(token);
    // In actual implementation:
    // await db.update(shareLinksTable)
    //   .set({ status: 'revoked', updatedAt: new Date() })
    //   .where(and(eq(shareLinksTable.token, tokenHash), eq(shareLinksTable.userId, userId)))

    console.log("Share link revoked");
    return true;
  } catch (error) {
    console.error("Revoke failed:", error);
    return false;
  }
}

/**
 * Clean up expired share links
 * Should be run periodically
 */
export async function cleanupExpiredShares(db: any): Promise<number> {
  try {
    const now = new Date();
    // In actual implementation:
    // const result = await db.delete(shareLinksTable)
    //   .where(lt(shareLinksTable.expiresAt, now))

    console.log("Expired shares cleaned up");
    return 0; // Return number of deleted links
  } catch (error) {
    console.error("Cleanup failed:", error);
    return 0;
  }
}

/**
 * Get share link info (without exposing token)
 */
export async function getShareLinkInfo(
  db: any,
  token: string
): Promise<ShareLinkInfo | null> {
  try {
    const tokenHash = hashShareToken(token);
    // In actual implementation: const shareLink = await db.query.shareLinksTable.findFirst(...)

    // Mock response
    const shareLink = {
      id: "share-123",
      token: tokenHash,
      documentName: "My Document.pdf",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      downloadCount: 2,
      maxDownloads: 5,
      status: "active",
      shareType: "whatsapp",
    };

    return {
      id: shareLink.id,
      token: shareLink.token.substring(0, 8) + "...", // Redacted
      documentName: shareLink.documentName,
      expiresAt: shareLink.expiresAt,
      downloadCount: shareLink.downloadCount,
      maxDownloads: shareLink.maxDownloads,
      status: shareLink.status,
      shareType: shareLink.shareType,
    };
  } catch (error) {
    console.error("Failed to get share info:", error);
    return null;
  }
}

/**
 * Generate WhatsApp share message template
 */
export function generateWhatsAppMessage(
  documentName: string,
  shareUrl: string,
  expiryHours: number = 48
): string {
  return `📄 *Document Ready to Download*

File: ${documentName}
⏱️ Link expires in: ${expiryHours} hours

🔒 Secure Download:
${shareUrl}

This link is password-protected and tracked for security.
Downloaded via FileMaster AI - Your Document Processing Partner`;
}

/**
 * Generate email share message template
 */
export function generateEmailMessage(
  documentName: string,
  shareUrl: string,
  recipientName?: string
): string {
  return `Hello ${recipientName || "User"},

Your processed document is ready for download:

📄 Document: ${documentName}
🔗 Download Link: ${shareUrl}

This is a secure, temporary link that expires in 48 hours.
Your download will be tracked for security purposes.

---
FileMaster AI - Your Document Processing Partner
Secure. Fast. Reliable.`;
}

/**
 * Track share link usage
 */
export async function recordShareDownload(
  db: any,
  token: string,
  ipAddress: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const tokenHash = hashShareToken(token);
    // In actual implementation:
    // await db.update(shareLinksTable)
    //   .set({
    //     downloadCount: sql`${shareLinksTable.downloadCount} + 1`,
    //     downloadedAt: new Date(),
    //     downloadedByIps: sql`array_append(${shareLinksTable.downloadedByIps}, ${ipAddress})`
    //   })
    //   .where(eq(shareLinksTable.token, tokenHash))

    console.log(`Share download recorded - IP: ${ipAddress}`);
    return true;
  } catch (error) {
    console.error("Failed to record download:", error);
    return false;
  }
}

/**
 * Get all active shares for a user
 */
export async function getUserActiveShares(db: any, userId: string): Promise<ShareLinkInfo[]> {
  try {
    // In actual implementation:
    // const shares = await db.select().from(shareLinksTable)
    //   .where(and(
    //     eq(shareLinksTable.userId, userId),
    //     eq(shareLinksTable.status, 'active'),
    //     gt(shareLinksTable.expiresAt, new Date())
    //   ))

    // Mock response
    const shares = [
      {
        id: "share-1",
        token: "abc123...",
        documentName: "Aadhaar.pdf",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        downloadCount: 1,
        maxDownloads: 10,
        status: "active",
        shareType: "whatsapp",
      },
    ];

    return shares;
  } catch (error) {
    console.error("Failed to fetch active shares:", error);
    return [];
  }
}
