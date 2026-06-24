import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Configuracoes = Tables<"configuracoes">;

export const configQuery = {
  queryKey: ["configuracoes"] as const,
  queryFn: async (): Promise<Configuracoes> => {
    const { data, error } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
};

export function useConfig() {
  const { data } = useQuery(configQuery);
  return data;
}

export async function prefetchConfig(qc: QueryClient) {
  await qc.prefetchQuery(configQuery);
}

// ------------- Theme (light/dark) -------------
type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial: Theme =
      stored ??
      (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

// ------------- Auth user + roles -------------
type AuthUser = { id: string; email: string | null; roles: string[] } | null;
const AuthCtx = createContext<{ user: AuthUser; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async (uid: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      return (data ?? []).map((r) => r.role as string);
    };

    const sync = async (sessionUser: { id: string; email: string | null } | null) => {
      if (!sessionUser) {
        if (mounted) setUser(null);
        return;
      }
      // defer the supabase query so we don't block the auth callback
      setTimeout(async () => {
        const roles = await loadRoles(sessionUser.id);
        if (mounted) setUser({ id: sessionUser.id, email: sessionUser.email, roles });
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });

    supabase.auth.getSession().then(({ data }) => {
      void sync(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? null } : null);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
export const isStaff = (u: AuthUser) => !!u && u.roles.length > 0;
export const hasRole = (u: AuthUser, role: string) => !!u && u.roles.includes(role);
