"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, AuthResponse } from "@/lib/api";

export interface UserInfo {
  id: number;
  fullName: string;
  mobileNumber: string;
  role: "FARMER" | "BUYER" | "ADMIN" | "GUEST";
  isRegistered: boolean;
  centreId?: number;
  centreName?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  hasRole: (role: "FARMER" | "BUYER" | "ADMIN") => boolean;
  login: (authData: AuthResponse) => void;
  updateUser: (updated: Partial<UserInfo>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check saved token & user
    const savedToken = localStorage.getItem("agriquene_token");
    const savedUser = localStorage.getItem("agriquene_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        return;
      } catch {
        localStorage.removeItem("agriquene_token");
        localStorage.removeItem("agriquene_user");
      }
    }
  }, []);

  const login = (authData: AuthResponse) => {
    const userInfo: UserInfo = {
      id: authData.user_id,
      fullName: authData.full_name,
      mobileNumber: authData.mobile_number,
      role: authData.role,
      isRegistered: authData.is_registered,
      centreId: authData.centre_id,
      centreName: authData.centre_name,
    };
    setUser(userInfo);
    setToken(authData.access_token);
    localStorage.setItem("agriquene_token", authData.access_token);
    localStorage.setItem("agriquene_user", JSON.stringify(userInfo));
  };

  const updateUser = (updated: Partial<UserInfo>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("agriquene_user", JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("agriquene_token");
    localStorage.removeItem("agriquene_user");
  };

  const hasRole = (requiredRole: "FARMER" | "BUYER" | "ADMIN") => {
    return user?.role === requiredRole;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        hasRole,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
