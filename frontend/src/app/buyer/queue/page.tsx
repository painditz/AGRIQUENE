"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuyerQueueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff/queue");
  }, [router]);
  return null;
}
