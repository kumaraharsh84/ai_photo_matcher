"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type User = { id: string; name: string; email: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string) {
  return email
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "")
    .replace(/\s+/g, "")
    .replace(/＠/g, "@")
    .trim()
    .toLowerCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async function refreshUser() {
    const token = localStorage.getItem("photo_finder_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const currentUser = await apiFetch<User>("/auth/me");
      setUser(currentUser);
    } catch {
      localStorage.removeItem("photo_finder_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const persistToken = useCallback(async function persistToken(path: string, body: object) {
    const data = await apiFetch<{ access_token: string }>(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
    localStorage.setItem("photo_finder_token", data.access_token);
    await refreshUser();
    router.push("/photographer/dashboard");
  }, [refreshUser, router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: (email: string, password: string) =>
        persistToken("/auth/login", { email: normalizeEmail(email), password }),
      register: (name: string, email: string, password: string) =>
        persistToken("/auth/register", { name: name.trim(), email: normalizeEmail(email), password }),
      logout: () => {
        localStorage.removeItem("photo_finder_token");
        setUser(null);
        router.push("/photographer/login");
      },
      refreshUser
    }),
    [user, loading, persistToken, refreshUser, router]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
