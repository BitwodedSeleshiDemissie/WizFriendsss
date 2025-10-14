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

const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Ensure the newest SW takes control ASAP when an update ships.
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("Service worker registered for PWA testing.", registration);
    }
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
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

    let pendingLoadListener = null;

    const startRegistration = () => {
      registerServiceWorker();
      window.removeEventListener("load", startRegistration);
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      registerServiceWorker();
    } else {
      pendingLoadListener = startRegistration;
      window.addEventListener("load", pendingLoadListener);
    }

    return () => {
      if (pendingLoadListener) {
        window.removeEventListener("load", pendingLoadListener);
      }
    };
  }, []);

  return null;
}
