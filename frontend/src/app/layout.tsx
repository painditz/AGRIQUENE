import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { QueueSocketProvider } from "@/context/QueueSocketContext";
import { ToastProvider } from "@/context/ToastContext";
import { TricolorStripe } from "@/components/gov/TricolorStripe";
import { UtilityBar } from "@/components/gov/UtilityBar";
import { GovernmentHeader } from "@/components/gov/GovernmentHeader";
import { MainNavigation } from "@/components/gov/MainNavigation";
import { Footer } from "@/components/gov/Footer";
import { DemoBar } from "@/components/gov/DemoBar";

export const metadata: Metadata = {
  title: "AGRIQUENE - Smart Procurement Queue & AI ETA System | Government of India",
  description:
    "Official Indian Agricultural Procurement Queue Management & AI Waiting-Time Forecasting System for Smart India Hackathon 2026. Know your turn before you reach the centre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 antialiased">
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <QueueSocketProvider>
                {/* Official Indian Government Portal Visual Hierarchy */}
                <TricolorStripe />
                <UtilityBar />
                <GovernmentHeader />
                <MainNavigation />
                <DemoBar />

                {/* Main App Content Viewport */}
                <div className="flex-1">{children}</div>

                <Footer />
              </QueueSocketProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
