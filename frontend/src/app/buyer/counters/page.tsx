"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuyerCountersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff/counters");
  }, [router]);
  return null;
}
