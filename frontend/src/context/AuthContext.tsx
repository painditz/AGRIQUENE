"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthResponse } from "@/lib/api";
import { DEMO_PRESETS } from "@/lib/constants";

interface UserInfo {
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
  login: (authData: AuthResponse) => void;
  logout: () => void;
  switchRoleQuick: (role: "FARMER" | "BUYER" | "ADMIN") => void;
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
      } catch {
        localStorage.removeItem("agriquene_token");
        localStorage.removeItem("agriquene_user");
      }
    } else {
      // Default to demo farmer if not logged in for instant evaluation
      const defaultFarmer: UserInfo = {
        id: 1,
        fullName: DEMO_PRESETS.farmer.name,
        mobileNumber: DEMO_PRESETS.farmer.mobile,
        role: "FARMER",
        isRegistered: true,
      };
      setUser(defaultFarmer);
      localStorage.setItem("agriquene_user", JSON.stringify(defaultFarmer));
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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("agriquene_token");
    localStorage.removeItem("agriquene_user");
  };

  const switchRoleQuick = (role: "FARMER" | "BUYER" | "ADMIN") => {
    if (role === "FARMER") {
      const u: UserInfo = {
        id: 1,
        fullName: DEMO_PRESETS.farmer.name,
        mobileNumber: DEMO_PRESETS.farmer.mobile,
        role: "FARMER",
        isRegistered: true,
      };
      setUser(u);
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
      localStorage.setItem("agriquene_user", JSON.stringify(u));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
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
