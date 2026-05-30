// artifacts/file-nova/src/components/OfflineBanner.tsx
// DROP THIS FILE INTO: artifacts/file-nova/src/components/OfflineBanner.tsx

import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Detect service worker update
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);

  // Show "back online" toast when reconnected
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowOnlineToast(true);
      const t = setTimeout(() => {
        setShowOnlineToast(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  const reloadForUpdate = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Offline warning bar */}
      {!isOnline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: "#78350f",
            borderBottom: "1px solid #92400e",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "sans-serif",
          }}
        >
          <span style={{ fontSize: 16 }}>📡</span>
          <div style={{ flex: 1 }}>
            <span style={{ color: "#fef3c7", fontSize: 13, fontWeight: 600 }}>
              You're offline
            </span>
            <span
              style={{ color: "#d97706", fontSize: 12, marginLeft: 8 }}
            >
              The app is still usable — file uploads will resume when reconnected.
            </span>
          </div>
          <div
            style={{
              background: "#92400e",
              color: "#fbbf24",
              padding: "2px 10px",
              borderRadius: 99,
              fontSize: 11,
            }}
          >
            OFFLINE MODE
          </div>
        </div>
      )}

      {/* Back online toast */}
      {showOnlineToast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 99999,
            background: "#14532d",
            border: "1px solid #166534",
            borderRadius: 10,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "slideIn 0.3s ease",
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>
            Back online
          </span>
        </div>
      )}

      {/* Update available banner */}
      {updateAvailable && (
        <div
          style={{
            position: "fixed",
            bottom: 70, // above FileExpiryBar
            right: 16,
            zIndex: 99998,
            background: "#1e3a5f",
            border: "1px solid #1d4ed8",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            maxWidth: 300,
          }}
        >
          <span style={{ fontSize: 20 }}>🚀</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>
              Update available
            </div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
              Reload to get the latest FileNova
            </div>
          </div>
          <button
            onClick={reloadForUpdate}
            style={{
              background: "#1d4ed8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reload
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}