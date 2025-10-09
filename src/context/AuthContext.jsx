"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase user state once globally
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Ensure the middleware can recognise authenticated users
    const syncAuthCookie = async () => {
      if (!user) {
        if (typeof document !== "undefined") {
          document.cookie = "authToken=; path=/; max-age=0";
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        if (typeof document !== "undefined") {
          document.cookie = `authToken=${token}; path=/; max-age=3600; sameSite=lax`;
        }
      } catch (error) {
        console.error("Failed to sync auth cookie", error);
      }
    };

    syncAuthCookie();
  }, [user, loading]);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    if (typeof document !== "undefined") {
      document.cookie = "authToken=; path=/; max-age=0";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
