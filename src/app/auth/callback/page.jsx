"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect") || "/discover";

    const finaliseSignIn = async () => {
      if (!supabase) {
        router.replace("/auth/login");
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) {
            console.error("Failed to exchange OAuth code for session", error);
          }
        }
      } catch (error) {
        console.error("Unexpected Supabase auth callback error", error);
      } finally {
        router.replace(redirectTo);
      }
    };

    finaliseSignIn();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <p className="text-sm font-semibold text-indigo-500">Signing you in…</p>
    </div>
  );
}
