"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, AuthResponse } from "@/lib/api";

export interface UserInfo {
  id: number;
  username?: string;
  fullName: string;
  mobileNumber?: string;
  role: "FARMER" | "MANDI_OFFICER" | "BUYER" | "ADMIN" | "GUEST";
  designation?: string;
  isRegistered: boolean;
  centreId?: number;
  centreName?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  hasRole: (role: "FARMER" | "MANDI_OFFICER" | "BUYER" | "ADMIN") => boolean;
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
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Re-hydrate fresh profile directly from backend
        api.getMe().then((me) => {
          const freshUser: UserInfo = {
            id: me.id,
            username: me.username,
            fullName: me.full_name,
            mobileNumber: me.mobile_number,
            role: me.role,
            designation: me.designation,
            isRegistered: me.is_registered,
            centreId: me.centre_id,
            centreName: me.centre_name,
          };
          setUser(freshUser);
          localStorage.setItem("agriquene_user", JSON.stringify(freshUser));
        }).catch(() => {
          // Token invalid or expired
          localStorage.removeItem("agriquene_token");
          localStorage.removeItem("agriquene_user");
          setUser(null);
          setToken(null);
        });
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
      username: authData.username,
      fullName: authData.full_name,
      mobileNumber: authData.mobile_number,
      role: authData.role,
      designation: authData.designation,
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

  const hasRole = (requiredRole: "FARMER" | "MANDI_OFFICER" | "BUYER" | "ADMIN") => {
    if (!user) return false;
    if (requiredRole === "MANDI_OFFICER" || requiredRole === "BUYER") {
      return user.role === "MANDI_OFFICER" || user.role === "BUYER" || user.role === "ADMIN";
    }
    return user.role === requiredRole;
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
