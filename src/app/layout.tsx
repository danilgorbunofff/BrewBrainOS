import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DeleteConfirmProvider } from "@/components/DeleteConfirmProvider";
import { GloveModeProvider, GloveModeScript } from "@/components/GloveModeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

const fontHeading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ea580c",
};

export const metadata: Metadata = {
  title: "BrewBrain OS",
  description: "The digital floor-assistant for craft breweries.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontHeading.variable} h-full antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <GloveModeScript />
        <GloveModeProvider>
          <ThemeProvider>
            <DeleteConfirmProvider>
              <WebVitalsReporter />
              {children}
              <Toaster position="top-center" />
            </DeleteConfirmProvider>
          </ThemeProvider>
        </GloveModeProvider>
      </body>
    </html>
  );
}

