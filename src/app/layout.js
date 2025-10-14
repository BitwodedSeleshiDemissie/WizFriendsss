import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ServiceWorkerProvider from "../components/ServiceWorkerProvider";

export const metadata = {
  title: {
    default: "MyProject",
    template: "%s | MyProject",
  },
  description:
    "Install the MyProject PWA to stay connected on mobile with offline-first access.",
  manifest: "/manifest.webmanifest",
  themeColor: "#2563eb",
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ServiceWorkerProvider />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
