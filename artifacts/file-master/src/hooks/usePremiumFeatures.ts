/**
 * Premium Features React Hook - Sharing & WhatsApp
 * Manages share link generation, tracking, and WhatsApp integration
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UseShareOptions {
  documentId: string;
  documentName: string;
  onSuccess?: (shareUrl: string) => void;
  onError?: (error: string) => void;
}

export interface ShareResult {
  success: boolean;
  shareToken: string;
  shareUrl: string;
  shareType: string;
  whatsappUrl?: string;
  message?: string;
  expiresIn?: {
    hours: number;
    timestamp: string;
  };
}

export function useShare() {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareResult[]>([]);

  /**
   * Create a secure share link
   */
  const createShare = useCallback(
    async (
      documentId: string,
      options?: { expiryHours?: number; shareType?: string; password?: string }
    ): Promise<ShareResult | null> => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/premium/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            expiryHours: options?.expiryHours || 48,
            shareType: options?.shareType || "link",
            password: options?.password,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create share link");
        }

        const result: ShareResult = await response.json();
        setShares((prev) => [...prev, result]);
        toast.success("Share link created successfully!");
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        toast.error(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Create WhatsApp-optimized share
   */
  const createWhatsAppShare = useCallback(
    async (documentId: string, documentName: string): Promise<ShareResult | null> => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/premium/shares/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, documentName }),
        });

        if (!response.ok) {
          throw new Error("Failed to create WhatsApp share");
        }

        const result: ShareResult = await response.json();
        setShares((prev) => [...prev, result]);
        toast.success("WhatsApp share link created!");
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        toast.error(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Open WhatsApp with prefilled message
   */
  const openWhatsApp = useCallback((whatsappUrl: string) => {
    if (!whatsappUrl) {
      toast.error("No WhatsApp URL available");
      return;
    }
    window.open(whatsappUrl, "_blank");
  }, []);

  /**
   * Copy share link to clipboard
   */
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  }, []);

  /**
   * Revoke a share link
   */
  const revokeShare = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/premium/shares/${token}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke share");
      }

      setShares((prev) => prev.filter((s) => s.shareToken !== token));
      toast.success("Share link revoked");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    shares,
    createShare,
    createWhatsAppShare,
    openWhatsApp,
    copyToClipboard,
    revokeShare,
  };
}

/**
 * Hook for managing document downloads with tracking
 */
export function useSecureDownload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadFromShare = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      // First verify the token
      const verifyResponse = await fetch(`/api/v1/premium/shares/verify/${token}`);

      if (!verifyResponse.ok) {
        throw new Error("Invalid or expired share link");
      }

      const verification = await verifyResponse.json();

      // Then download
      const downloadResponse = await fetch(
        `/api/v1/premium/shares/download/${token}`
      );

      if (!downloadResponse.ok) {
        throw new Error("Download failed");
      }

      // Trigger download
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document";
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Download completed!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, downloadFromShare };
}

/**
 * Hook for managing QR codes
 */
export function useQRCode() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);

  const generateQR = useCallback(async (data: string, size?: number) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/premium/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, size }),
      });

      if (!response.ok) {
        throw new Error("QR generation failed");
      }

      const result = await response.json();
      setQrCode(result.qrCode);
      toast.success("QR code generated!");
      return result.qrCode;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const scanQR = useCallback(async (imageBase64: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/premium/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        throw new Error("QR scan failed");
      }

      const result = await response.json();
      if (result.foundQr) {
        toast.success("QR code scanned!");
        return result.data;
      } else {
        toast.error("No QR code found");
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, qrCode, generateQR, scanQR };
}
