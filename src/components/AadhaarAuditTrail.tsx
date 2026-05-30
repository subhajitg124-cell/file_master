// artifacts/file-nova/src/components/AadhaarAuditTrail.tsx
// DROP THIS FILE INTO: artifacts/file-nova/src/components/AadhaarAuditTrail.tsx

import { useState, useEffect } from "react";

interface AuditEntry {
  id: string;
  fileName: string;
  maskedAt: string; // ISO string
  lastFourDigits: string; // e.g. "4321"
  status: "success" | "failed";
  fileSize: string;
}

const AUDIT_KEY = "filenova_aadhaar_audit";

export function saveAuditEntry(entry: Omit<AuditEntry, "id" | "maskedAt">) {
  const existing: AuditEntry[] = JSON.parse(
    localStorage.getItem(AUDIT_KEY) || "[]"
  );
  const newEntry: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    maskedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...existing].slice(0, 50); // keep last 50
  localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
}

function loadAuditEntries(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AadhaarAuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    if (open) setEntries(loadAuditEntries());
  }, [open]);

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.status === filter);

  const clearAll = () => {
    if (confirm("Clear all Aadhaar masking history?")) {
      localStorage.removeItem(AUDIT_KEY);
      setEntries([]);
    }
  };

  return (
    <>
      {/* Trigger button - place this wherever you show the Aadhaar tool */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#1e293b",
          border: "1px solid #334155",
          color: "#94a3b8",
          padding: "8px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        🔒 View Masking History
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 16,
              width: "100%",
              maxWidth: 620,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#f1f5f9",
                    fontWeight: 600,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  🔒 Aadhaar Masking Audit Trail
                </div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                  All masking operations are logged locally on your device
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>

            {/* Filters */}
            <div
              style={{
                padding: "10px 20px",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {(["all", "success", "failed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 99,
                    border: "1px solid",
                    borderColor: filter === f ? "#3b82f6" : "#1e293b",
                    background: filter === f ? "#1d4ed8" : "transparent",
                    color: filter === f ? "#fff" : "#64748b",
                    cursor: "pointer",
                    fontSize: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
              <span style={{ flex: 1 }} />
              {entries.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  🗑 Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#334155",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontSize: 14 }}>No masking operations yet</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#1e293b" }}>
                    Mask an Aadhaar document to see it here
                  </div>
                </div>
              ) : (
                filtered.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #0f172a",
                      background: i % 2 === 0 ? "#0f172a" : "#111827",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Status dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          entry.status === "success" ? "#22c55e" : "#ef4444",
                        flexShrink: 0,
                      }}
                    />

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.fileName}
                      </div>
                      <div
                        style={{
                          color: "#475569",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Masked: XXXX-XXXX-{entry.lastFourDigits} &nbsp;·&nbsp;{" "}
                        {entry.fileSize}
                      </div>
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        color: "#334155",
                        fontSize: 11,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(entry.maskedAt)}
                    </div>

                    {/* Status badge */}
                    <div
                      style={{
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontSize: 11,
                        background:
                          entry.status === "success" ? "#14532d" : "#450a0a",
                        color:
                          entry.status === "success" ? "#4ade80" : "#f87171",
                        flexShrink: 0,
                      }}
                    >
                      {entry.status}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "10px 20px",
                borderTop: "1px solid #1e293b",
                color: "#1e293b",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🔐 Stored locally only. No raw Aadhaar numbers are ever saved.
            </div>
          </div>
        </div>
      )}
    </>
  );
}