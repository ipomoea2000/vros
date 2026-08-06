"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Portfolio = {
  version: string;
  projects: any[];
  manuscripts: any[];
  grants: any[];
  tasks: any[];
  notes: any[];
};

export default function PortfolioImport({ user, onImported }: { user: User; onImported: () => void }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function preview() {
    setMessage("Loading reconstructed portfolio…");
    const response = await fetch("/arthur-vros-portfolio.json");
    const data = await response.json();
    setPortfolio(data);
    setMessage("");
  }

  async function importPortfolio() {
    if (!portfolio) return;
    setWorking(true);
    setMessage("Importing projects…");

    try {
      const { data: existingProjects, error: existingError } = await supabase
        .from("projects").select("id,name");
      if (existingError) throw existingError;

      const byName = new Map((existingProjects || []).map((p: any) => [p.name.toLowerCase(), p.id]));
      const projectIds = new Map<string, string>();

      for (const project of portfolio.projects) {
        const existingId = byName.get(project.name.toLowerCase());
        if (existingId) {
          projectIds.set(project.ref, existingId);
          continue;
        }
        const { data, error } = await supabase.from("projects").insert({
          user_id: user.id,
          name: project.name,
          area: project.area,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          summary: project.summary,
          next_action: project.next_action,
        }).select("id").single();
        if (error) throw error;
        projectIds.set(project.ref, data.id);
      }

      setMessage("Importing manuscripts, grants, tasks, and project notes…");

      const { data: existingManuscripts } = await supabase.from("manuscripts").select("title");
      const manuscriptTitles = new Set((existingManuscripts || []).map((x: any) => x.title.toLowerCase()));
      for (const item of portfolio.manuscripts) {
        if (manuscriptTitles.has(item.title.toLowerCase())) continue;
        const { error } = await supabase.from("manuscripts").insert({
          user_id: user.id,
          project_id: projectIds.get(item.project_ref) || null,
          title: item.title, journal: item.journal, status: item.status,
          next_action: item.next_action, doi: item.doi || null,
        });
        if (error) throw error;
      }

      const { data: existingGrants } = await supabase.from("grants").select("title");
      const grantTitles = new Set((existingGrants || []).map((x: any) => x.title.toLowerCase()));
      for (const item of portfolio.grants) {
        if (grantTitles.has(item.title.toLowerCase())) continue;
        const { error } = await supabase.from("grants").insert({
          user_id: user.id,
          project_id: projectIds.get(item.project_ref) || null,
          title: item.title, agency: item.agency, status: item.status,
          next_action: item.next_action,
        });
        if (error) throw error;
      }

      const { data: existingTasks } = await supabase.from("tasks").select("title");
      const taskTitles = new Set((existingTasks || []).map((x: any) => x.title.toLowerCase()));
      for (const item of portfolio.tasks) {
        if (taskTitles.has(item.title.toLowerCase())) continue;
        const { error } = await supabase.from("tasks").insert({
          user_id: user.id,
          project_id: projectIds.get(item.project_ref) || null,
          title: item.title, priority: item.priority,
        });
        if (error) throw error;
      }

      const { data: existingNotes } = await supabase.from("project_notes").select("body");
      const noteBodies = new Set((existingNotes || []).map((x: any) => x.body.toLowerCase()));
      for (const item of portfolio.notes) {
        if (noteBodies.has(item.body.toLowerCase())) continue;
        const projectId = projectIds.get(item.project_ref);
        if (!projectId) continue;
        const { error } = await supabase.from("project_notes").insert({
          user_id: user.id, project_id: projectId, body: item.body,
        });
        if (error) throw error;
      }

      setMessage("Portfolio imported. Existing records with matching names were left unchanged.");
      onImported();
    } catch (error: any) {
      setMessage(error?.message || "Import failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="panel import-panel">
      <div>
        <p className="eyebrow">One-time portfolio reconstruction</p>
        <h2>Populate VROS from our prior work</h2>
        <p className="muted">
          Preview and import the major research projects, manuscripts, grants, tasks, and project notes reconstructed from our work together.
          Matching project and record titles will be skipped to reduce duplicates.
        </p>
      </div>

      {!portfolio ? (
        <button onClick={preview}>Preview portfolio</button>
      ) : (
        <>
          <div className="import-counts">
            <span><b>{portfolio.projects.length}</b> projects</span>
            <span><b>{portfolio.manuscripts.length}</b> manuscripts</span>
            <span><b>{portfolio.grants.length}</b> grants</span>
            <span><b>{portfolio.tasks.length}</b> tasks</span>
            <span><b>{portfolio.notes.length}</b> notes</span>
          </div>
          <details>
            <summary>Review project names before importing</summary>
            <div className="preview-list">
              {portfolio.projects.map(project => <span key={project.ref}>{project.name}</span>)}
            </div>
          </details>
          <button disabled={working} onClick={importPortfolio}>
            {working ? "Importing…" : "Import into my VROS account"}
          </button>
        </>
      )}
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
