"use client";

import { useEffect, useState } from "react";

const isStandaloneMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  return window.navigator.standalone === true;
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isStandaloneMode()) {
      return;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 max-w-xs rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-indigo-50 p-2 text-indigo-500">📲</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Install HomeConnect</p>
          <p className="mt-1 text-xs text-gray-600">
            Add this app to your device for faster access and offline support.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              Install
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
