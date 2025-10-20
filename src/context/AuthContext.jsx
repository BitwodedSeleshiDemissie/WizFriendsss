"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Listen to Supabase session on the client
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Failed to get Supabase session", error);
        }
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Unexpected Supabase session error", error);
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ✅ Keep auth cookie in sync for middleware / server routes
  useEffect(() => {
    if (loading) return;
    if (typeof document === "undefined") return;

    const token = session?.access_token;
    if (!token) {
      document.cookie = "authToken=; path=/; max-age=0";
      return;
    }

    document.cookie = `authToken=${token}; path=/; max-age=3600; sameSite=lax`;
  }, [session, loading]);

  // ✅ Logout handler
  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    if (typeof document !== "undefined") {
      document.cookie = "authToken=; path=/; max-age=0";
    }
  };

  return <AuthContext.Provider value={{ user, session, loading, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
