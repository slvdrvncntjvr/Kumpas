import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AppGate } from "@/components/AppGate";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
// import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";

export const metadata: Metadata = {
  title: "Kumpas — FSL Communicator",
  description:
    "An offline-first Filipino Sign Language communication assistant for public-service and emergency situations.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kumpas",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* process.env.NODE_ENV === "development" ? (
          <DevServiceWorkerCleanup />
        ) : null */}
        <ThemeProvider>
          <FontSizeProvider>
            <LanguageProvider>
              <AppGate>
                <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
                  <AppHeader />
                  <OfflineIndicator />
                  <a
                    href="#main-content"
                    className="sr-only rounded-md bg-bee-yellow px-4 py-3 font-bold text-bee-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
                  >
                    Skip to content
                  </a>
                  <main
                    id="main-content"
                    className="flex-1 px-5 pb-28 pt-7 sm:px-8"
                  >
                    {children}
                  </main>
                  <BottomNav />
                </div>
              </AppGate>
            </LanguageProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
