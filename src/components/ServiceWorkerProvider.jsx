"use client";

import { useEffect } from "react";

const isSecureContext = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  );
};

export default function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported on this browser.");
      return;
    }

    if (!isSecureContext()) {
      console.warn(
        "Service worker registration skipped: use HTTPS or localhost to enable install prompts."
      );
      return;
    }

    let removedLoadListener = false;
    const register = async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        if (existing) {
          return;
        }

        await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        if (process.env.NODE_ENV !== "production") {
          console.info("Service worker registered for PWA testing.");
        }
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      const onLoad = () => register();
      window.addEventListener("load", onLoad);
      removedLoadListener = true;
      return () => {
        if (removedLoadListener) {
          window.removeEventListener("load", onLoad);
        }
      };
    }
  }, []);

  return null;
}
