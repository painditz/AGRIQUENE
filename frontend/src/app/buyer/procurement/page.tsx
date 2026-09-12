"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuyerProcurementRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      router.replace(`/staff/procurement${search}`);
    } else {
      router.replace("/staff/procurement");
    }
  }, [router]);
  return null;
}
