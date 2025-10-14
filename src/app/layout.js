import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ServiceWorkerProvider from "../components/ServiceWorkerProvider";
import PWAInstallPrompt from "../components/PWAInstallPrompt";

export const metadata = {
  title: {
    default: "WizFriends",
    template: "%s | WizFriends",
  },
  description:
    "Install the WizFriends PWA to stay connected with your community anywhere.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WizFriends",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/wizfriends-icon-180.png",
    icon: [
      { url: "/icons/wizfriends-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/wizfriends-icon-512.png", sizes: "512x512", type: "image/png" },
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
