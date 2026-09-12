"use client";

import React from "react";
import { StaffLayout } from "./StaffLayout";

export function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayout>{children}</StaffLayout>;
}
