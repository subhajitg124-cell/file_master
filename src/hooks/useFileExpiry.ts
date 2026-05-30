// artifacts/file-nova/src/hooks/useFileExpiry.ts
// DROP THIS FILE INTO: artifacts/file-nova/src/hooks/useFileExpiry.ts

import { useState, useEffect, useCallback } from "react";

export interface FileExpiryEntry {
  fileId: string;
  fileName: string;
  expiresAt: number; // Unix timestamp in ms
  downloadUrl: string;
}

const EXPIRY_DURATION_MS = 60 * 60 * 1000; // 1 hour (matches backend cleanup)
const STORAGE_KEY = "filenova_expiry_entries";

function loadEntries(): FileExpiryEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: FileExpiryEntry[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useFileExpiry() {
  const [entries, setEntries] = useState<FileExpiryEntry[]>(loadEntries);
  const [now, setNow] = useState(Date.now());

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-remove expired entries
  useEffect(() => {
    const alive = entries.filter((e) => e.expiresAt > now);
    if (alive.length !== entries.length) {
      setEntries(alive);
      saveEntries(alive);
    }
  }, [now, entries]);

  const registerFile = useCallback(
    (fileId: string, fileName: string, downloadUrl: string) => {
      const entry: FileExpiryEntry = {
        fileId,
        fileName,
        downloadUrl,
        expiresAt: Date.now() + EXPIRY_DURATION_MS,
      };
      setEntries((prev) => {
        const updated = [
          ...prev.filter((e) => e.fileId !== fileId),
          entry,
        ];
        saveEntries(updated);
        return updated;
      });
    },
    []
  );

  const removeFile = useCallback((fileId: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.fileId !== fileId);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const getTimeLeft = useCallback(
    (entry: FileExpiryEntry) => {
      const ms = Math.max(0, entry.expiresAt - now);
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const isUrgent = ms < 5 * 60 * 1000; // last 5 minutes
      return { hours, minutes, seconds, ms, isUrgent };
    },
    [now]
  );

  return { entries, registerFile, removeFile, getTimeLeft };
}