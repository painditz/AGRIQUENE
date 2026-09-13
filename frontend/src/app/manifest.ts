import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGRIQUENE - Smart Procurement Queue & AI ETA System",
    short_name: "AGRIQUENE",
    description:
      "Official Indian Agricultural Procurement Queue Management & AI Waiting-Time Forecasting System for Smart India Hackathon 2026. Know your turn before you reach the centre.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#0B2545",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
