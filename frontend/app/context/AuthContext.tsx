"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

const STORAGE_USER_KEY = "user";
const STORAGE_TOKEN_KEY = "token";

type AuthUser = {
  _id: string;
  fullName: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = readStoredUser();
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (stored && token) setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback((authUser: AuthUser, token: string) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authUser));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    await axiosInstance.post(ProjectApiList.logout).catch(() => {});
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
