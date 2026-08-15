import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAccessToken, setOnAuthFailure, refreshAccessToken } from "../api/client";
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from "../api/endpoints";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnAuthFailure(() => setUser(null));

    (async () => {
      const restored = await refreshAccessToken();
      if (restored) {
        try {
          setUser(await getMe());
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const { access_token } = await apiLogin(email, password);
    setAccessToken(access_token);
    setUser(await getMe());
  }

  async function register(email: string, password: string) {
    const { access_token } = await apiRegister(email, password);
    setAccessToken(access_token);
    setUser(await getMe());
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
