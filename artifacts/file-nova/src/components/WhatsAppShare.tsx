/**
 * WhatsApp Share Component
 * One-click share to WhatsApp with live expiry countdown and download tracking
 */

import React, { useState, useEffect, useCallback } from "react";
import { MessageCircle, Copy, X, Loader, Clock, CheckCircle2, Share2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useShare } from "@/hooks/usePremiumFeatures";

interface WhatsAppShareProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

function useExpiryCountdown(expiresAtIso?: string) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number; expired: boolean } | null>(null);

  useEffect(() => {
    if (!expiresAtIso) return;

    const tick = () => {
      const diff = new Date(expiresAtIso).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
        expired: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtIso]);

  return timeLeft;
}

function ExpiryBadge({ expiresAtIso }: { expiresAtIso: string }) {
  const t = useExpiryCountdown(expiresAtIso);

  if (!t) return null;

  const totalMs = new Date(expiresAtIso).getTime() - Date.now();
  const totalOriginalMs = 48 * 60 * 60 * 1000;
  const pct = Math.max(0, Math.min(100, (totalMs / totalOriginalMs) * 100));

  const color =
    pct > 50 ? "text-emerald-500" : pct > 20 ? "text-amber-500" : "text-destructive";
  const barColor =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive";

  if (t.expired) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
        <Clock className="h-4 w-4 text-destructive" />
        <span className="text-sm font-bold text-destructive">Link expired</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background/70 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Link expires in
        </span>
        <span className={color}>
          {t.h}h {t.m}m {t.s}s
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function WhatsAppShareDialog({ documentId, documentName, onClose }: WhatsAppShareProps) {
  const { loading, createWhatsAppShare, openWhatsApp, copyToClipboard } = useShare();
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [trackingFired, setTrackingFired] = useState(false);

  const handleCreate = async () => {
    const shareResult = await createWhatsAppShare(documentId, documentName);
    if (shareResult) {
      setResult(shareResult);
    }
  };

  const handleWhatsAppClick = useCallback(async () => {
    if (!result?.whatsappUrl) return;

    // Fire download tracking
    if (!trackingFired && result.shareToken) {
      try {
        await fetch(`/api/v1/premium/shares/download/${result.shareToken}`);
        setTrackingFired(true);
      } catch (_) {
        // non-blocking
      }
    }

    openWhatsApp(result.whatsappUrl);
  }, [result, trackingFired, openWhatsApp]);

  const handleCopy = async () => {
    if (result?.shareUrl) {
      await copyToClipboard(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-card border border-border rounded-2xl shadow-premium max-w-md w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Premium share
              </p>
              <h2 className="text-base font-black text-foreground">Share on WhatsApp</h2>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* File name */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                <Share2 className="h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm font-semibold truncate text-foreground">{documentName}</p>
              </div>

              {/* Feature list */}
              <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
                {[
                  "Secure download link (48-hour expiry)",
                  "Download count tracking",
                  "Mobile-optimised for WhatsApp",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {feat}
                  </div>
                ))}
              </div>

              <button
                id="whatsapp-generate-btn"
                onClick={handleCreate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-3 text-sm transition shadow-glow-green"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Generating secure link…
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Generate WhatsApp Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success badge */}
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Secure link ready to share
                </p>
              </div>

              {/* Expiry countdown */}
              {result.expiresIn?.timestamp && (
                <ExpiryBadge expiresAtIso={result.expiresIn.timestamp} />
              )}

              {/* Message preview */}
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Message preview
                </p>
                <div className="text-xs text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto leading-5 font-mono">
                  {result.message}
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                Download activity is tracked. Link auto-expires after 48 hours.
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  id="whatsapp-open-btn"
                  onClick={handleWhatsAppClick}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 text-sm transition shadow-glow-green"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open WhatsApp
                  {trackingFired && (
                    <span className="ml-auto text-[10px] font-normal opacity-70">tracked ✓</span>
                  )}
                </button>

                <button
                  id="whatsapp-copy-btn"
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 hover:bg-muted text-foreground font-bold py-2.5 text-sm transition"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Link display */}
              <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Share URL</p>
                <code className="text-[11px] text-primary break-all">
                  {result.shareUrl}
                </code>
              </div>

              <div className="text-center">
                <button
                  onClick={() => { setResult(null); setTrackingFired(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Create another link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Share Button Component
 */
interface QuickShareButtonProps {
  documentId: string;
  documentName: string;
  variant?: "icon" | "button";
}

export function QuickShareButton({
  documentId,
  documentName,
  variant = "button",
}: QuickShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          id="whatsapp-quick-share-icon"
          onClick={() => setShowDialog(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-emerald-500 transition"
          title="Share on WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        {showDialog && (
          <WhatsAppShareDialog
            documentId={documentId}
            documentName={documentName}
            onClose={() => setShowDialog(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        id="whatsapp-quick-share-btn"
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
      >
        <MessageCircle className="h-4 w-4" />
        Share on WhatsApp
      </button>
      {showDialog && (
        <WhatsAppShareDialog
          documentId={documentId}
          documentName={documentName}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
