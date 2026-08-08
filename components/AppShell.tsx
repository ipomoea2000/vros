"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type MainTab =
  | "dashboard"
  | "projects"
  | "manuscripts"
  | "grants"
  | "tasks"
  | "knowledge"
  | "agents"
  | "communications";

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
  const router = useRouter();
  const items: { id: MainTab; label: string }[] = [
    { id: "dashboard", label: "Home" },
    { id: "projects", label: "Projects" },
    { id: "tasks", label: "Tasks" },
    { id: "knowledge", label: "Capture & Memory" },
    { id: "manuscripts", label: "Manuscripts" },
    { id: "grants", label: "Grants" },
    { id: "agents", label: "AROS Agents" },
    { id: "communications", label: "Communications" },
  ];

  function navigate(tab: MainTab) {
    if (onTabChange) {
      onTabChange(tab);
      window.history.replaceState(null, "", tab === "dashboard" ? "/" : `/?view=${tab}`);
      return;
    }
    router.push(tab === "dashboard" ? "/" : `/?view=${tab}`);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={() => navigate("dashboard")}>
          <div className="logo">V</div>
          <div>
            <b>AROS</b>
            <small>Agentic Research OS</small>
          </div>
        </button>

        <nav>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="capture-side" onClick={() => navigate("knowledge")}>
          + Capture session
        </button>

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
