"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuyerLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff/login");
  }, [router]);
  return null;
}
