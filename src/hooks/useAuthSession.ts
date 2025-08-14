"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useEffect } from "react";

export function useAuthSession() {
  const { data: session, status } = useSession();
  const { setUser, setLoading } = useAppStore();

  useEffect(() => {
    if (status === "loading") {
      setLoading("auth", true);
    } else {
      setLoading("auth", false);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || "",
          role: session.user.role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        setUser(null);
      }
    }
  }, [session, status, setUser, setLoading]);

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === "loading",
    login,
    logout,
  };
}
