import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "student";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ session, loading: false });
    });
    supabase.auth.getSession().then(({ data: d }) => setState({ session: d.session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRoles() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["roles", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid!);
      if (error) throw error;
      return data.map((r) => r.role as AppRole);
    },
  });
  const roles = q.data ?? [];
  return {
    roles,
    loading: q.isLoading,
    isAdmin: roles.includes("admin"),
    isTeacher: roles.includes("teacher"),
    isStaff: roles.includes("admin") || roles.includes("teacher"),
  };
}

export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid!).single();
      if (error) throw error;
      return data;
    },
  });
}

export async function checkStaff(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: ok } = await supabase.rpc("is_staff", { _user_id: data.user.id });
  return !!ok;
}

export async function checkAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return !!ok;
}
