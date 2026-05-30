// artifacts/file-nova/src/components/FileExpiryBar.tsx
// DROP THIS FILE INTO: artifacts/file-nova/src/components/FileExpiryBar.tsx

import { useState } from "react";
import { useFileExpiry } from "../hooks/useFileExpiry";

export function FileExpiryBar() {
  const { entries, removeFile, getTimeLeft } = useFileExpiry();
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0f172a",
        borderTop: "1px solid #1e293b",
        fontFamily: "'DM Mono', monospace, sans-serif",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid #1e293b",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 1 }}>
          ⏱ PROCESSED FILES &nbsp;
          <span
            style={{
              background: "#3b82f6",
              color: "#fff",
              borderRadius: 99,
              padding: "1px 7px",
              fontSize: 11,
            }}
          >
            {entries.length}
          </span>
        </span>
        <span style={{ color: "#475569", fontSize: 11 }}>
          {collapsed ? "▲ show" : "▼ hide"}
        </span>
      </div>

      {/* File rows */}
      {!collapsed && (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {entries.map((entry) => {
            const t = getTimeLeft(entry);
            const pct = Math.round(
              ((entry.expiresAt - Date.now()) / (60 * 60 * 1000)) * 100
            );
            const barColor = t.isUrgent ? "#ef4444" : "#22c55e";

            return (
              <div
                key={entry.fileId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                {/* File icon */}
                <span style={{ fontSize: 16 }}>📄</span>

                {/* Name + progress bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.fileName}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      height: 3,
                      background: "#1e293b",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(0, pct)}%`,
                        background: barColor,
                        borderRadius: 99,
                        transition: "width 1s linear",
                      }}
                    />
                  </div>
                </div>

                {/* Countdown */}
                <div
                  style={{
                    color: t.isUrgent ? "#ef4444" : "#64748b",
                    fontSize: 12,
                    minWidth: 70,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.isUrgent && (
                    <span style={{ marginRight: 4 }}>⚠️</span>
                  )}
                  {String(t.hours).padStart(2, "0")}:
                  {String(t.minutes).padStart(2, "0")}:
                  {String(t.seconds).padStart(2, "0")}
                </div>

                {/* Download button */}
                <a
                  href={entry.downloadUrl}
                  download={entry.fileName}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  ⬇ Download
                </a>

                {/* Dismiss */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(entry.fileId);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}