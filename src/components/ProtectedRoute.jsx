"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import LoginClient from "../app/auth/login/LoginClient";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    if (!pathname) return "/app";
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-pink-50">
        <p className="text-sm font-semibold text-indigo-500">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginClient redirectTo={redirectTo} />;
  }

  return children;
}
