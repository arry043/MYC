import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { InstallAppPopup } from "@/components/pwa/install-app-popup";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { UpdateNotice } from "@/components/pwa/update-notice";
import { MotionProvider } from "@/components/shared/motion";
import { Toaster } from "@/components/ui/toast";
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME, APP_THEME_COLOR } from "@/lib/app";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_FULL_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: APP_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PwaProvider>
          <MotionProvider>
            <Toaster>
              {children}
              <InstallAppPopup />
              <UpdateNotice />
            </Toaster>
          </MotionProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
