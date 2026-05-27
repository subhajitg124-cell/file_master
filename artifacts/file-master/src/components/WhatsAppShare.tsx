/**
 * WhatsApp Share Component
 * One-click share to WhatsApp with tracking
 */

import React, { useState } from "react";
import { MessageCircle, Copy, X, Loader } from "lucide-react";
import { toast } from "sonner";
import { useShare } from "@/hooks/usePremiumFeatures";

interface WhatsAppShareProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

export function WhatsAppShareDialog({ documentId, documentName, onClose }: WhatsAppShareProps) {
  const { loading, createWhatsAppShare, openWhatsApp, copyToClipboard } = useShare();
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const shareResult = await createWhatsAppShare(documentId, documentName);
    if (shareResult) {
      setResult(shareResult);
    }
  };

  const handleWhatsAppClick = async () => {
    if (result?.whatsappUrl) {
      openWhatsApp(result.whatsappUrl);
      // Track analytics
      console.log("WhatsApp share clicked");
    }
  };

  const handleCopy = async () => {
    if (result?.shareUrl) {
      await copyToClipboard(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">Share on WhatsApp</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-600">
                Share <strong>{documentName}</strong> securely via WhatsApp
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                ✨ Features:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Secure download link (48-hour expiry)</li>
                  <li>Download tracking</li>
                  <li>Mobile-optimized</li>
                </ul>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Generate WhatsApp Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold mb-2">✓ Ready to Share</p>
                <p className="text-xs text-green-700">
                  Expires in 48 hours
                </p>
              </div>

              {/* Message Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Message Preview:</p>
                <div className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.message}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open WhatsApp
                </button>

                <button
                  onClick={handleCopy}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Link Display */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1">Share Link:</p>
                <code className="text-xs text-gray-700 break-all">
                  {result.shareUrl.substring(0, 50)}...
                </code>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setResult(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
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
          onClick={() => setShowDialog(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Share on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 text-green-500" />
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
        onClick={() => setShowDialog(true)}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
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
