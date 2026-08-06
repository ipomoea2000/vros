"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import AppShell, { MainTab } from "./AppShell";

type Project = {
  id: string; name: string; area: string; status: string; progress: number;
  summary: string | null; next_action: string | null; deadline: string | null;
  priority: string | null;
};
type Task = {
  id: string; title: string; priority: string; due_date: string | null;
  completed: boolean; project_id: string | null; projects?: { name: string } | null;
};
type Manuscript = {
  id: string; title: string; journal: string | null; status: string;
  next_action: string | null; project_id: string | null; projects?: { name: string } | null;
};
type Grant = {
  id: string; title: string; agency: string | null; status: string;
  deadline: string | null; next_action: string | null; project_id: string | null;
  projects?: { name: string } | null;
};

export default function HomeClient({ user }: { user: User }) {
  const [tab, setTab] = useState<MainTab>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);

  const [quickTask, setQuickTask] = useState("");
  const [projectForm, setProjectForm] = useState({ name: "", area: "", status: "Active", next_action: "" });
  const [taskForm, setTaskForm] = useState({ title: "", project_id: "", priority: "Medium", due_date: "" });
  const [manuscriptForm, setManuscriptForm] = useState({ title: "", journal: "", status: "Drafting", project_id: "", next_action: "" });
  const [grantForm, setGrantForm] = useState({ title: "", agency: "", status: "Planning", project_id: "", deadline: "", next_action: "" });

  async function load() {
    setBusy(true);
    const [p, t, m, g] = await Promise.all([
      supabase.from("projects").select("*").order("updated_at", { ascending: false }),
      supabase.from("tasks").select("*,projects(name)").order("completed").order("due_date"),
      supabase.from("manuscripts").select("*,projects(name)").order("updated_at", { ascending: false }),
      supabase.from("grants").select("*,projects(name)").order("deadline", { ascending: true }),
    ]);
    setProjects((p.data as Project[]) || []);
    setTasks((t.data as Task[]) || []);
    setManuscripts((m.data as Manuscript[]) || []);
    setGrants((g.data as Grant[]) || []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  async function addQuickTask() {
    if (!quickTask.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: quickTask.trim(), priority: "Medium"
    });
    if (error) return alert(error.message);
    setQuickTask("");
    load();
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: projectForm.name,
      area: projectForm.area || "General",
      status: projectForm.status,
      next_action: projectForm.next_action || null,
      progress: 10,
    });
    if (error) return alert(error.message);
    setProjectForm({ name: "", area: "", status: "Active", next_action: "" });
    load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: taskForm.title,
      project_id: taskForm.project_id || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
    });
    if (error) return alert(error.message);
    setTaskForm({ title: "", project_id: "", priority: "Medium", due_date: "" });
    load();
  }

  async function addManuscript(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("manuscripts").insert({
      user_id: user.id,
      title: manuscriptForm.title,
      journal: manuscriptForm.journal || null,
      status: manuscriptForm.status,
      project_id: manuscriptForm.project_id || null,
      next_action: manuscriptForm.next_action || null,
    });
    if (error) return alert(error.message);
    setManuscriptForm({ title: "", journal: "", status: "Drafting", project_id: "", next_action: "" });
    load();
  }

  async function addGrant(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("grants").insert({
      user_id: user.id,
      title: grantForm.title,
      agency: grantForm.agency || null,
      status: grantForm.status,
      project_id: grantForm.project_id || null,
      deadline: grantForm.deadline || null,
      next_action: grantForm.next_action || null,
    });
    if (error) return alert(error.message);
    setGrantForm({ title: "", agency: "", status: "Planning", project_id: "", deadline: "", next_action: "" });
    load();
  }

  async function toggleTask(task: Task) {
    const { error } = await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
    if (error) return alert(error.message);
    load();
  }

  const q = search.toLowerCase();
  const contains = (...values: (string | null | undefined)[]) => values.join(" ").toLowerCase().includes(q);
  const filteredProjects = projects.filter(p => contains(p.name, p.area, p.status, p.summary, p.next_action));
  const filteredTasks = tasks.filter(t => contains(t.title, t.priority, t.projects?.name));
  const filteredManuscripts = manuscripts.filter(m => contains(m.title, m.journal, m.status, m.next_action, m.projects?.name));
  const filteredGrants = grants.filter(g => contains(g.title, g.agency, g.status, g.next_action, g.projects?.name));

  const openTasks = tasks.filter(t => !t.completed);
  const activeProjects = projects.filter(p => p.status === "Active");
  const highPriority = openTasks.filter(t => t.priority === "High");

  return (
    <AppShell email={user.email} activeTab={tab} onTabChange={setTab}>
      <header className="top">
        <div>
          <p className="eyebrow">Arthur Villordon Research Portfolio</p>
          <h1>{tab === "dashboard" ? "Research headquarters" : capitalize(tab)}</h1>
        </div>
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this section…" />
      </header>

      {busy ? <section className="panel">Loading VROS…</section> : null}

      {!busy && tab === "dashboard" && (
        <>
          <section className="metrics">
            <article className="panel hero">
              <p className="eyebrow">Today</p>
              <h2>Reduce the noise. Move the most important work.</h2>
              <p>{highPriority.length} high-priority tasks across {activeProjects.length} active projects.</p>
            </article>
            <Metric n={activeProjects.length} l="active projects" />
            <Metric n={openTasks.length} l="open tasks" />
            <Metric n={manuscripts.length} l="manuscripts" />
            <Metric n={grants.length} l="grants" />
          </section>

          <section className="quick panel">
            <input value={quickTask} onChange={e => setQuickTask(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addQuickTask(); }}
              placeholder="Capture a task before you forget it…" />
            <button onClick={addQuickTask}>Add task</button>
          </section>

          <section className="two">
            <div className="panel">
              <div className="head"><h2>Top priorities</h2><span className="badge">{openTasks.length} open</span></div>
              <div className="stack">
                {openTasks.slice(0, 8).map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}
                {!openTasks.length && <p className="muted">No open tasks yet.</p>}
              </div>
            </div>
            <div className="panel">
              <div className="head"><h2>Active projects</h2><button onClick={() => setTab("projects")}>Open projects</button></div>
              <div className="project-grid">
                {activeProjects.slice(0, 8).map(project => <ProjectCard key={project.id} project={project} />)}
                {!activeProjects.length && <p className="muted">No projects yet. Open Projects to add your first one.</p>}
              </div>
            </div>
          </section>
        </>
      )}

      {!busy && tab === "projects" && (
        <>
          <form className="form-bar" onSubmit={addProject}>
            <input placeholder="Project name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} required />
            <input placeholder="Area" value={projectForm.area} onChange={e => setProjectForm({ ...projectForm, area: e.target.value })} />
            <select value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}>
              <option>Active</option><option>Planning</option><option>Paused</option><option>Complete</option>
            </select>
            <input placeholder="Next action" value={projectForm.next_action} onChange={e => setProjectForm({ ...projectForm, next_action: e.target.value })} />
            <button>Add project</button>
          </form>
          <div className="project-list">
            {filteredProjects.map(project => <ProjectCard key={project.id} project={project} wide />)}
            {!filteredProjects.length && <section className="panel muted">No projects found.</section>}
          </div>
        </>
      )}

      {!busy && tab === "tasks" && (
        <>
          <form className="form-bar" onSubmit={addTask}>
            <input placeholder="Task" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
            <select value={taskForm.project_id} onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}>
              <option value="">Unassigned</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
            <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            <button>Add task</button>
          </form>
          <section className="panel stack">
            {filteredTasks.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}
            {!filteredTasks.length && <p className="muted">No tasks found.</p>}
          </section>
        </>
      )}

      {!busy && tab === "manuscripts" && (
        <>
          <form className="form-bar manuscripts-form" onSubmit={addManuscript}>
            <input placeholder="Manuscript title" value={manuscriptForm.title} onChange={e => setManuscriptForm({ ...manuscriptForm, title: e.target.value })} required />
            <input placeholder="Journal" value={manuscriptForm.journal} onChange={e => setManuscriptForm({ ...manuscriptForm, journal: e.target.value })} />
            <select value={manuscriptForm.status} onChange={e => setManuscriptForm({ ...manuscriptForm, status: e.target.value })}>
              <option>Planning</option><option>Drafting</option><option>Revision</option><option>Submitted</option><option>Published</option>
            </select>
            <select value={manuscriptForm.project_id} onChange={e => setManuscriptForm({ ...manuscriptForm, project_id: e.target.value })}>
              <option value="">Unassigned</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Next action" value={manuscriptForm.next_action} onChange={e => setManuscriptForm({ ...manuscriptForm, next_action: e.target.value })} />
            <button>Add manuscript</button>
          </form>
          <TableWrap>
            <table><thead><tr><th>Manuscript</th><th>Project</th><th>Journal</th><th>Status</th><th>Next action</th></tr></thead>
              <tbody>{filteredManuscripts.map(m => <tr key={m.id}><td><strong>{m.title}</strong></td><td>{m.projects?.name || "—"}</td><td>{m.journal || "—"}</td><td><span className="badge">{m.status}</span></td><td>{m.next_action || "—"}</td></tr>)}</tbody>
            </table>
            {!filteredManuscripts.length && <p className="muted">No manuscripts found.</p>}
          </TableWrap>
        </>
      )}

      {!busy && tab === "grants" && (
        <>
          <form className="form-bar grants-form" onSubmit={addGrant}>
            <input placeholder="Proposal title" value={grantForm.title} onChange={e => setGrantForm({ ...grantForm, title: e.target.value })} required />
            <input placeholder="Agency" value={grantForm.agency} onChange={e => setGrantForm({ ...grantForm, agency: e.target.value })} />
            <select value={grantForm.status} onChange={e => setGrantForm({ ...grantForm, status: e.target.value })}>
              <option>Planning</option><option>Drafting</option><option>Internal review</option><option>Submitted</option><option>Awarded</option><option>Not funded</option>
            </select>
            <select value={grantForm.project_id} onChange={e => setGrantForm({ ...grantForm, project_id: e.target.value })}>
              <option value="">Unassigned</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={grantForm.deadline} onChange={e => setGrantForm({ ...grantForm, deadline: e.target.value })} />
            <input placeholder="Next action" value={grantForm.next_action} onChange={e => setGrantForm({ ...grantForm, next_action: e.target.value })} />
            <button>Add grant</button>
          </form>
          <TableWrap>
            <table><thead><tr><th>Proposal</th><th>Project</th><th>Agency</th><th>Status</th><th>Deadline</th><th>Next action</th></tr></thead>
              <tbody>{filteredGrants.map(g => <tr key={g.id}><td><strong>{g.title}</strong></td><td>{g.projects?.name || "—"}</td><td>{g.agency || "—"}</td><td><span className="badge">{g.status}</span></td><td>{g.deadline || "—"}</td><td>{g.next_action || "—"}</td></tr>)}</tbody>
            </table>
            {!filteredGrants.length && <p className="muted">No grants found.</p>}
          </TableWrap>
        </>
      )}
    </AppShell>
  );
}

function capitalize(value: string) { return value[0].toUpperCase() + value.slice(1); }
function Metric({ n, l }: { n: number; l: string }) { return <article className="panel metric"><b>{n}</b><span>{l}</span></article>; }
function ProjectCard({ project, wide = false }: { project: Project; wide?: boolean }) {
  return <a href={`/projects/${project.id}`} className={wide ? "project wide" : "project"}>
    <span className="badge">{project.status}</span><h3>{project.name}</h3>
    <p>{project.next_action || project.summary || "No next action set."}</p>
    <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
    <small>{project.progress}% · {project.area}</small>
  </a>;
}
function TaskRow({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  return <label className={task.completed ? "task done" : "task"}>
    <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
    <span><b>{task.title}</b><small>{task.projects?.name || "Unassigned"} · {task.priority}{task.due_date ? ` · ${task.due_date}` : ""}</small></span>
  </label>;
}
function TableWrap({ children }: { children: React.ReactNode }) { return <section className="panel table-wrap">{children}</section>; }
