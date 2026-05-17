import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setSentryUser } from "@/lib/sentry";

export type ClinicRole =
  | "owner"
  | "admin"           // Legacy — kept for backwards compat
  | "senior_admin"
  | "junior_admin"
  | "manager"
  | "provider"
  | "front_desk";

export interface ClinicMembership {
  clinic_id: string;
  role: ClinicRole;
  clinic: { id: string; name: string; slug: string; currency: string; timezone: string };
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  memberships: ClinicMembership[];
  activeClinic: ClinicMembership | null;
  setActiveClinicId: (id: string) => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_CLINIC_KEY = "clinicpro:active_clinic";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<ClinicMembership[]>([]);
  const [activeClinicId, setActiveClinicIdState] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CLINIC_KEY) : null
  );

  const loadMemberships = async (userId: string) => {
    const { data, error } = await supabase
      .from("clinic_members")
      .select("clinic_id, role, clinics(id, name, slug, currency, timezone)")
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to load memberships", error);
      setMemberships([]);
      return;
    }
    const mapped: ClinicMembership[] = (data ?? [])
      .filter((row) => row.clinics)
      .map((row) => ({
        clinic_id: row.clinic_id,
        role: row.role as ClinicRole,
        clinic: row.clinics as ClinicMembership["clinic"],
      }));
    setMemberships(mapped);
    if (mapped.length > 0) {
      const stored = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CLINIC_KEY) : null;
      const valid = mapped.find((m) => m.clinic_id === stored);
      if (!valid) {
        setActiveClinicIdState(mapped[0].clinic_id);
        if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CLINIC_KEY, mapped[0].clinic_id);
      } else {
        setActiveClinicIdState(valid.clinic_id);
      }
    }
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Defer DB call to avoid deadlock
        setTimeout(() => loadMemberships(newSession.user.id), 0);
      } else {
        setMemberships([]);
      }
    });

    // THEN check current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        loadMemberships(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const setActiveClinicId = (id: string) => {
    setActiveClinicIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CLINIC_KEY, id);
  };

  const activeClinic = memberships.find((m) => m.clinic_id === activeClinicId) ?? memberships[0] ?? null;

  useEffect(() => {
    setSentryUser(session?.user?.id ?? null, activeClinic?.clinic_id ?? null);
  }, [session?.user?.id, activeClinic?.clinic_id]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    memberships,
    activeClinic,
    setActiveClinicId,
    refreshMemberships: async () => {
      if (session?.user) await loadMemberships(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_CLINIC_KEY);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
