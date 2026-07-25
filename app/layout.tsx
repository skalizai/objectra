import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { PicklistProvider } from "@/components/providers/picklist-provider";
import { GlobalErrorListener } from "@/components/app-shell/global-error-listener";
import { DEFAULT_PICKLIST_BUNDLE } from "@/lib/data/default-picklists";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Objectra Labs",
    template: "%s — Objectra Labs",
  },
  description:
    "Objectra Labs — track development objects, resources, and delivery across every client project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-page text-text font-sans">
        <GlobalErrorListener />
        <MotionConfig reducedMotion="user">
          <PicklistProvider bundle={DEFAULT_PICKLIST_BUNDLE}>{children}</PicklistProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
