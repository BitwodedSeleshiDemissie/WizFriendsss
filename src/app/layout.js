import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ServiceWorkerProvider from "../components/ServiceWorkerProvider";
import PWAInstallPrompt from "../components/PWAInstallPrompt";

export const metadata = {
  title: {
    default: "MyProject",
    template: "%s | MyProject",
  },
  description:
    "Install the MyProject PWA to stay connected on mobile with offline-first access.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MyProject",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ServiceWorkerProvider />
          <PWAInstallPrompt />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}