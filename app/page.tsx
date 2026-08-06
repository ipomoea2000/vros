"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/Auth";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="auth-shell"><section className="auth-card">Loading VROS…</section></main>;
  return user ? <Dashboard user={user} /> : <Auth />;
}
