import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import VoiceAssistant from "@/components/VoiceAssistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dishly — Local Kitchens & Restaurants, Delivered",
  description: "Order from local home kitchens and restaurants near you. Pickup, delivery or dine-in. Fresh food from real chefs.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FFF8F0] overflow-x-hidden">
        {children}
        <VoiceAssistant />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1A0A00",
              color: "#FFF8F0",
              borderRadius: "12px",
              border: "1px solid #FF6B00",
            },
            success: { iconTheme: { primary: "#FF6B00", secondary: "#FFF8F0" } },
          }}
        />
      </body>
    </html>
  );
}
