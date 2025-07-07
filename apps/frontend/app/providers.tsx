'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProvider } from '@auth0/nextjs-auth0/client'

// ユーザー情報型（今後拡張）
type User = {
  id: string;
  nickname: string;
  email: string;
  role: "USER" | "ADMIN";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO: Keycloak連携でユーザー情報取得
  useEffect(() => {
    // 仮実装: ローカルストレージ等からユーザー情報を取得
    setLoading(false);
  }, []);

  const login = () => {
    // TODO: Keycloakログインリダイレクト
    alert("ログイン機能は未実装です");
  };

  const logout = () => {
    // TODO: Keycloakログアウトリダイレクト
    alert("ログアウト機能は未実装です");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            {children}
        </UserProvider>
    )
}
