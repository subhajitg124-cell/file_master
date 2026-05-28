import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

type AdminCreds = { username: string; passwordHash: string } | null;
type Settings = { standaloneMode: boolean; editingEnabled: boolean };

const CRED_KEY = "filenova-admin";
const SETTINGS_KEY = "filenova-settings";
const SESSION_KEY = "filenova-admin-session";
const DEFAULT_ADMIN_USERNAME = "subhajitghosh";
const DEFAULT_ADMIN_PASSWORD = "Subhajit@56";

const defaultSettings: Settings = { standaloneMode: false, editingEnabled: true };

const AdminContext = createContext<{
  creds: AdminCreds;
  settings: Settings;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setCredentials: (username: string, password: string) => void;
  setSettings: (s: Partial<Settings>) => void;
} | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const hash = (s: string) => {
    try {
      return btoa(unescape(encodeURIComponent(s)));
    } catch (e) {
      return s;
    }
  };

  const defaultCreds: AdminCreds = {
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: hash(DEFAULT_ADMIN_PASSWORD),
  };

  const [creds, setCreds] = useState<AdminCreds>(() => {
    try {
      const raw = localStorage.getItem(CRED_KEY);
      return raw ? JSON.parse(raw) : defaultCreds;
    } catch (e) {
      return defaultCreds;
    }
  });

  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  });

  // ── Session persistence via sessionStorage ─────────────────────────────────
  // Survives page refresh within the same browser tab/session.
  // Clears automatically when the browser tab is closed.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (creds) localStorage.setItem(CRED_KEY, JSON.stringify(creds));
      else localStorage.removeItem(CRED_KEY);
    } catch (e) {}
  }, [creds]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  const login = (username: string, password: string): boolean => {
    if (!creds) return false;
    if (creds.username === username && creds.passwordHash === hash(password)) {
      setIsAuthenticated(true);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    toast.success("Logged out of admin panel");
  };

  const setCredentials = (username: string, password: string) => {
    const payload: AdminCreds = { username, passwordHash: hash(password) };
    setCreds(payload);
  };

  const setSettings = (s: Partial<Settings>) =>
    setSettingsState((prev) => ({ ...prev, ...s }));

  return (
    <AdminContext.Provider
      value={{ creds, settings, isAuthenticated, login, logout, setCredentials, setSettings }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export default AdminProvider;
