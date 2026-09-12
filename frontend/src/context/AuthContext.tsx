"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, AuthResponse } from "@/lib/api";
import { DEMO_PRESETS } from "@/lib/constants";

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
  switchRoleQuick: (role: "FARMER" | "BUYER" | "ADMIN") => Promise<void>;
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

  const switchRoleQuick = async (role: "FARMER" | "BUYER" | "ADMIN") => {
    try {
      let authData: AuthResponse | null = null;
      if (role === "FARMER") {
        authData = await api.unifiedLogin({
          identifier: DEMO_PRESETS.farmer.mobile,
          password: "farmer123",
        });
      } else if (role === "BUYER") {
        authData = await api.unifiedLogin({
          identifier: DEMO_PRESETS.buyer.empId,
          password: "buyer123",
        });
      } else if (role === "ADMIN") {
        authData = await api.unifiedLogin({
          identifier: DEMO_PRESETS.admin.identifier,
          password: "admin123",
        });
      }
      if (authData) {
        login(authData);
        return;
      }
    } catch (e) {
      console.warn("Backend dynamic login failed, using fallback dev credentials", e);
    }

    // Fallback: set dev token if backend is unreachable
    const devToken = role === "ADMIN" ? "dev-admin-token" : role === "BUYER" ? "dev-buyer-token" : "dev-farmer-token";
    if (role === "FARMER") {
      const u: UserInfo = {
        id: 1,
        fullName: DEMO_PRESETS.farmer.name,
        mobileNumber: DEMO_PRESETS.farmer.mobile,
        role: "FARMER",
        isRegistered: true,
      };
      setUser(u);
      setToken(devToken);
      localStorage.setItem("agriquene_token", devToken);
      localStorage.setItem("agriquene_user", JSON.stringify(u));
    } else if (role === "BUYER") {
      const u: UserInfo = {
        id: 2,
        fullName: DEMO_PRESETS.buyer.name,
        mobileNumber: DEMO_PRESETS.buyer.identifier,
        role: "BUYER",
        isRegistered: true,
        centreId: 1,
        centreName: "Agri Procurement Centre – Ghaziabad Mandi",
      };
      setUser(u);
      setToken(devToken);
      localStorage.setItem("agriquene_token", devToken);
      localStorage.setItem("agriquene_user", JSON.stringify(u));
    } else if (role === "ADMIN") {
      const u: UserInfo = {
        id: 3,
        fullName: DEMO_PRESETS.admin.name,
        mobileNumber: "9800000001",
        role: "ADMIN",
        isRegistered: true,
      };
      setUser(u);
      setToken(devToken);
      localStorage.setItem("agriquene_token", devToken);
      localStorage.setItem("agriquene_user", JSON.stringify(u));
    }
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
        switchRoleQuick,
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
