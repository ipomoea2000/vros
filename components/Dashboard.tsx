"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Project = {
  id: string;
  name: string;
  area: string;
  status: string;
  progress: number;
  summary: string | null;
  next_action: string | null;
  deadline: string | null;
};

type Task = {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  completed: boolean;
  project_id: string | null;
  projects?: { name: string } | null;
};

type Manuscript = {
  id: string;
  title: string;
  journal: string | null;
  status: string;
  next_action: string | null;
  project_id: string | null;
  projects?: { name: string } | null;
};

export default function Dashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"dashboard" | "projects" | "tasks" | "manuscripts">("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectForm, setProjectForm] = useState({ name: "", area: "", status: "Active", next_action: "" });
  const [taskForm, setTaskForm] = useState({ title: "", project_id: "", priority: "Medium", due_date: "" });
  const [manuscriptForm, setManuscriptForm] = useState({ title: "", journal: "", status: "Drafting", project_id: "", next_action: "" });

  async function load() {
    setLoading(true);
    const [p, t, m] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("tasks").select("*, projects(name)").eq("user_id", user.id).order("completed").order("due_date"),
      supabase.from("manuscripts").select("*, projects(name)").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]);
    if (p.error || t.error || m.error) {
      console.error(p.error || t.error || m.error);
    }
    setProjects((p.data as Project[]) || []);
    setTasks((t.data as Task[]) || []);
    setManuscripts((m.data as Manuscript[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: projectForm.name,
      area: projectForm.area || "General",
      status: projectForm.status,
      next_action: projectForm.next_action,
      progress: 10,
    });
    if (!error) {
      setProjectForm({ name: "", area: "", status: "Active", next_action: "" });
      load();
    } else alert(error.message);
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
    if (!error) {
      setTaskForm({ title: "", project_id: "", priority: "Medium", due_date: "" });
      load();
    } else alert(error.message);
  }

  async function addManuscript(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("manuscripts").insert({
      user_id: user.id,
      title: manuscriptForm.title,
      journal: manuscriptForm.journal,
      status: manuscriptForm.status,
      project_id: manuscriptForm.project_id || null,
      next_action: manuscriptForm.next_action,
    });
    if (!error) {
      setManuscriptForm({ title: "", journal: "", status: "Drafting", project_id: "", next_action: "" });
      load();
    } else alert(error.message);
  }

  async function toggleTask(task: Task) {
    await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id).eq("user_id", user.id);
    load();
  }

  const q = search.toLowerCase();
  const filteredProjects = projects.filter((p) => [p.name, p.area, p.status, p.summary, p.next_action].join(" ").toLowerCase().includes(q));
  const filteredTasks = tasks.filter((t) => [t.title, t.priority, t.projects?.name].join(" ").toLowerCase().includes(q));
  const filteredManuscripts = manuscripts.filter((m) => [m.title, m.journal, m.status, m.next_action, m.projects?.name].join(" ").toLowerCase().includes(q));

  const openTasks = tasks.filter((t) => !t.completed);
  const highPriority = openTasks.filter((t) => t.priority === "High");
  const activeProjects = projects.filter((p) => p.status === "Active");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>VROS</strong>
            <small>Research Operating System</small>
          </div>
        </div>

        <nav>
          {(["dashboard", "projects", "tasks", "manuscripts"] as const).map((name) => (
            <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>
              {name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <small>{user.email}</small>
          <button className="secondary dark" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Arthur Villordon Research Portfolio</p>
            <h1>{tab[0].toUpperCase() + tab.slice(1)}</h1>
          </div>
          <input className="search" placeholder="Search VROS…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </header>

        {loading ? <div className="panel">Loading cloud data…</div> : null}

        {!loading && tab === "dashboard" && (
          <>
            <section className="metrics">
              <article className="hero panel">
                <p className="eyebrow">Current focus</p>
                <h2>Keep the portfolio moving.</h2>
                <p>{highPriority.length} high-priority tasks across {activeProjects.length} active projects.</p>
              </article>
              <Metric value={activeProjects.length} label="active projects" />
              <Metric value={openTasks.length} label="open tasks" />
              <Metric value={manuscripts.length} label="manuscripts" />
            </section>

            <section className="two-col">
              <div className="panel">
                <h2>Priorities</h2>
                <div className="stack">
                  {openTasks.slice(0, 7).map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}
                  {!openTasks.length && <p className="muted">No open tasks.</p>}
                </div>
              </div>
              <div className="panel">
                <h2>Portfolio</h2>
                <div className="project-grid">
                  {activeProjects.slice(0, 8).map((project) => <ProjectCard key={project.id} project={project} />)}
                </div>
              </div>
            </section>
          </>
        )}

        {!loading && tab === "projects" && (
          <>
            <form className="form-bar" onSubmit={addProject}>
              <input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
              <input placeholder="Area" value={projectForm.area} onChange={(e) => setProjectForm({ ...projectForm, area: e.target.value })} />
              <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
                <option>Active</option><option>Planning</option><option>Paused</option><option>Complete</option>
              </select>
              <input placeholder="Next action" value={projectForm.next_action} onChange={(e) => setProjectForm({ ...projectForm, next_action: e.target.value })} />
              <button>Add project</button>
            </form>
            <div className="project-list">
              {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} wide />)}
            </div>
          </>
        )}

        {!loading && tab === "tasks" && (
          <>
            <form className="form-bar" onSubmit={addTask}>
              <input placeholder="Task" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
              <select value={taskForm.project_id} onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}>
                <option value="">Unassigned</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              <button>Add task</button>
            </form>
            <div className="panel stack">
              {filteredTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}
            </div>
          </>
        )}

        {!loading && tab === "manuscripts" && (
          <>
            <form className="form-bar" onSubmit={addManuscript}>
              <input placeholder="Manuscript title" value={manuscriptForm.title} onChange={(e) => setManuscriptForm({ ...manuscriptForm, title: e.target.value })} required />
              <input placeholder="Journal" value={manuscriptForm.journal} onChange={(e) => setManuscriptForm({ ...manuscriptForm, journal: e.target.value })} />
              <select value={manuscriptForm.status} onChange={(e) => setManuscriptForm({ ...manuscriptForm, status: e.target.value })}>
                <option>Planning</option><option>Drafting</option><option>Revision</option><option>Submitted</option><option>Published</option>
              </select>
              <select value={manuscriptForm.project_id} onChange={(e) => setManuscriptForm({ ...manuscriptForm, project_id: e.target.value })}>
                <option value="">Unassigned</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Next action" value={manuscriptForm.next_action} onChange={(e) => setManuscriptForm({ ...manuscriptForm, next_action: e.target.value })} />
              <button>Add manuscript</button>
            </form>
            <div className="panel table-wrap">
              <table>
                <thead><tr><th>Manuscript</th><th>Project</th><th>Journal</th><th>Status</th><th>Next action</th></tr></thead>
                <tbody>{filteredManuscripts.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong></td><td>{m.projects?.name || "—"}</td><td>{m.journal || "—"}</td><td><span className="badge">{m.status}</span></td><td>{m.next_action || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <article className="metric panel"><strong>{value}</strong><span>{label}</span></article>;
}
function ProjectCard({ project, wide = false }: { project: Project; wide?: boolean }) {
  return <article className={wide ? "project-card wide" : "project-card"}>
    <span className="badge">{project.status}</span>
    <h3>{project.name}</h3>
    <p>{project.next_action || project.summary || "No next action set."}</p>
    <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
    <small>{project.progress}% · {project.area}</small>
  </article>;
}
function TaskRow({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  return <label className={task.completed ? "task-row done" : "task-row"}>
    <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
    <span><strong>{task.title}</strong><small>{task.projects?.name || "Unassigned"} · {task.priority}{task.due_date ? ` · ${task.due_date}` : ""}</small></span>
  </label>;
}
