"use client";
import { supabase } from "@/lib/supabase";

export type MainTab = "dashboard" | "projects" | "manuscripts" | "grants" | "tasks" | "knowledge";

export default function AppShell({
  children,
  email,
  activeTab = "dashboard",
  onTabChange,
}: {
  children: React.ReactNode;
  email?: string | null;
  activeTab?: MainTab;
  onTabChange?: (tab: MainTab) => void;
}) {
  const items: { id: MainTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects" },
    { id: "manuscripts", label: "Manuscripts" },
    { id: "grants", label: "Grants" },
    { id: "tasks", label: "Tasks" },
    { id: "knowledge", label: "Knowledge" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">V</div>
          <div>
            <b>VROS</b>
            <small>Research Operating System</small>
          </div>
        </div>

        <nav>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? "active" : ""}
              onClick={() => onTabChange?.(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <small>{email}</small>
          <button className="dark" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
