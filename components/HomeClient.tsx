"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AppShell, { MainTab } from "./AppShell";
import KnowledgeCapture from "./KnowledgeCapture";
import ConversationLibrary from "./ConversationLibrary";
import PortfolioImport from "./PortfolioImport";
import AskVROS from "./AskVROS";
import InboxPanel from "./InboxPanel";

type Project = {
  id: string; name: string; area: string; status: string; progress: number;
  summary: string | null; next_action: string | null; deadline: string | null;
  priority: string | null; updated_at?: string | null; last_decision?: string | null;
};
type Task = {
  id: string; title: string; priority: string; due_date: string | null;
  completed: boolean; project_id: string | null; workflow_state?: string | null;
  projects?: { name: string } | null;
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

const validTabs: MainTab[] = ["dashboard","projects","manuscripts","grants","tasks","knowledge"];

export default function HomeClient({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") as MainTab | null;
  const [tab, setTab] = useState<MainTab>(initialView && validTabs.includes(initialView) ? initialView : "dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [quickTask, setQuickTask] = useState("");

  const [projectForm, setProjectForm] = useState({ name:"", area:"", status:"Active", next_action:"" });
  const [taskForm, setTaskForm] = useState({ title:"", project_id:"", priority:"Medium", due_date:"" });
  const [manuscriptForm, setManuscriptForm] = useState({ title:"", journal:"", status:"Drafting", project_id:"", next_action:"" });
  const [grantForm, setGrantForm] = useState({ title:"", agency:"", status:"Planning", project_id:"", deadline:"", next_action:"" });

  async function load() {
    setBusy(true);
    const [p,t,m,g,s,i] = await Promise.all([
      supabase.from("projects").select("*").order("updated_at",{ascending:false}),
      supabase.from("tasks").select("*,projects(name)").order("completed").order("due_date"),
      supabase.from("manuscripts").select("*,projects(name)").order("updated_at",{ascending:false}),
      supabase.from("grants").select("*,projects(name)").order("deadline",{ascending:true}),
      supabase.from("project_sessions").select("*,project:project_id(name)").order("session_date",{ascending:false}),
      supabase.from("inbox_items").select("*").order("created_at",{ascending:false}),
    ]);
    setProjects((p.data as Project[]) || []);
    setTasks((t.data as Task[]) || []);
    setManuscripts((m.data as Manuscript[]) || []);
    setGrants((g.data as Grant[]) || []);
    setSessions(s.data || []);
    setInbox(i.data || []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const view = searchParams.get("view") as MainTab | null;
    if (view && validTabs.includes(view)) setTab(view);
  }, [searchParams]);

  async function addQuickTask() {
    if (!quickTask.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      user_id:user.id, title:quickTask.trim(), priority:"Medium", workflow_state:"Next"
    });
    if (error) return alert(error.message);
    setQuickTask(""); load();
  }
  async function addProject(e:React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("projects").insert({
      user_id:user.id, name:projectForm.name, area:projectForm.area || "General",
      status:projectForm.status, next_action:projectForm.next_action || null, progress:10
    });
    if (error) return alert(error.message);
    setProjectForm({name:"",area:"",status:"Active",next_action:""}); load();
  }
  async function addTask(e:React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("tasks").insert({
      user_id:user.id, title:taskForm.title, project_id:taskForm.project_id || null,
      priority:taskForm.priority, due_date:taskForm.due_date || null, workflow_state:"Next"
    });
    if (error) return alert(error.message);
    setTaskForm({title:"",project_id:"",priority:"Medium",due_date:""}); load();
  }
  async function addManuscript(e:React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("manuscripts").insert({
      user_id:user.id, title:manuscriptForm.title, journal:manuscriptForm.journal || null,
      status:manuscriptForm.status, project_id:manuscriptForm.project_id || null,
      next_action:manuscriptForm.next_action || null
    });
    if (error) return alert(error.message);
    setManuscriptForm({title:"",journal:"",status:"Drafting",project_id:"",next_action:""}); load();
  }
  async function addGrant(e:React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("grants").insert({
      user_id:user.id, title:grantForm.title, agency:grantForm.agency || null,
      status:grantForm.status, project_id:grantForm.project_id || null,
      deadline:grantForm.deadline || null, next_action:grantForm.next_action || null
    });
    if (error) return alert(error.message);
    setGrantForm({title:"",agency:"",status:"Planning",project_id:"",deadline:"",next_action:""}); load();
  }
  async function toggleTask(task:Task) {
    const { error } = await supabase.from("tasks").update({completed:!task.completed}).eq("id",task.id);
    if (error) return alert(error.message);
    load();
  }

  const q = search.toLowerCase();
  const contains = (...v:(string|null|undefined)[]) => v.join(" ").toLowerCase().includes(q);
  const filteredProjects = projects.filter(p=>contains(p.name,p.area,p.status,p.summary,p.next_action));
  const filteredTasks = tasks.filter(t=>contains(t.title,t.priority,t.workflow_state,t.projects?.name));
  const filteredManuscripts = manuscripts.filter(m=>contains(m.title,m.journal,m.status,m.next_action,m.projects?.name));
  const filteredGrants = grants.filter(g=>contains(g.title,g.agency,g.status,g.next_action,g.projects?.name));
  const openTasks = tasks.filter(t=>!t.completed);
  const activeProjects = projects.filter(p=>p.status==="Active");
  const recentProjects = [...activeProjects].sort((a,b)=>
    new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  ).slice(0,6);

  const todayPlan = useMemo(() => {
    const rank = (t:Task) =>
      (t.workflow_state==="This Week"?0:t.priority==="High"?1:t.workflow_state==="Next"?2:3);
    return [...openTasks].sort((a,b)=>rank(a)-rank(b)).slice(0,3);
  }, [openTasks]);

  return (
    <AppShell email={user.email} activeTab={tab} onTabChange={setTab}>
      <header className="top calm-top">
        <div>
          <p className="eyebrow">Arthur Villordon Research Portfolio</p>
          <h1>{tab==="dashboard" ? greeting() : labelFor(tab)}</h1>
          {tab==="dashboard" && <p className="muted">Continue where you left off.</p>}
        </div>
        <input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search VROS…" />
      </header>

      {busy && <section className="panel">Loading your research memory…</section>}

      {!busy && tab==="dashboard" && (
        <>
          <section className="continue-layout">
            <div className="panel day-card">
              <p className="eyebrow">Continue my day</p>
              <h2>Three useful next moves</h2>
              <div className="day-list">
                {todayPlan.map((task,index)=><label className="day-item" key={task.id}>
                  <span className="day-number">{index+1}</span>
                  <input type="checkbox" checked={task.completed} onChange={()=>toggleTask(task)} />
                  <span><b>{task.title}</b><small>{task.projects?.name || "Unassigned"} · {task.workflow_state || task.priority}</small></span>
                </label>)}
                {!todayPlan.length && <p className="muted">No open tasks. Capture the next thing worth doing.</p>}
              </div>
              <form className="quick-capture" onSubmit={e=>{e.preventDefault();addQuickTask();}}>
                <input value={quickTask} onChange={e=>setQuickTask(e.target.value)} placeholder="Capture one next action…" />
                <button type="submit">Add</button>
              </form>
            </div>

            <div className="panel focus-card">
              <p className="eyebrow">At a glance</p>
              <div className="focus-stats">
                <button onClick={()=>setTab("projects")}><b>{activeProjects.length}</b><span>active projects</span></button>
                <button onClick={()=>setTab("tasks")}><b>{openTasks.length}</b><span>open tasks</span></button>
                <button onClick={()=>setTab("manuscripts")}><b>{manuscripts.length}</b><span>manuscripts</span></button>
                <button onClick={()=>setTab("knowledge")}><b>{sessions.length}</b><span>saved sessions</span></button>
              </div>
            </div>
          </section>

          <section className="section-block">
            <div className="section-title">
              <div><p className="eyebrow">Resume</p><h2>Recently active projects</h2></div>
              <button className="quiet-button" onClick={()=>setTab("projects")}>View all projects</button>
            </div>
            <div className="resume-grid">
              {recentProjects.map(project=><a className="resume-card" href={`/projects/${project.id}`} key={project.id}>
                <div className="resume-top"><span className="status-dot"/><span>{project.status}</span><small>{relativeDate(project.updated_at)}</small></div>
                <h3>{project.name}</h3>
                <p>{project.next_action || "Open the project and set the next action."}</p>
                {project.last_decision && <small className="decision-line">Last decision: {project.last_decision}</small>}
                <span className="resume-link">Resume project →</span>
              </a>)}
            </div>
          </section>

          {!projects.length && <PortfolioImport user={user} onImported={load}/>}
          <section className="section-block compact-ai"><AskVROS context={{projects,tasks,manuscripts,grants,sessions}}/></section>
        </>
      )}

      {!busy && tab==="projects" && (
        <>
          <section className="section-intro">
            <div><p className="eyebrow">Your portfolio</p><h2>Choose a project to resume</h2></div>
          </section>
          <form className="form-bar" onSubmit={addProject}>
            <input placeholder="New project name" value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})} required />
            <input placeholder="Area" value={projectForm.area} onChange={e=>setProjectForm({...projectForm,area:e.target.value})}/>
            <select value={projectForm.status} onChange={e=>setProjectForm({...projectForm,status:e.target.value})}>
              <option>Active</option><option>Planning</option><option>Waiting</option><option>Paused</option><option>Complete</option>
            </select>
            <input placeholder="Immediate next action" value={projectForm.next_action} onChange={e=>setProjectForm({...projectForm,next_action:e.target.value})}/>
            <button>Add project</button>
          </form>
          <div className="resume-grid project-directory">
            {filteredProjects.map(project=><a className="resume-card" href={`/projects/${project.id}`} key={project.id}>
              <div className="resume-top"><span className="status-dot"/><span>{project.status}</span><small>{project.area}</small></div>
              <h3>{project.name}</h3><p>{project.next_action || project.summary || "No next action set."}</p>
              <div className="progress"><span style={{width:`${project.progress}%`}}/></div>
              <span className="resume-link">Open workspace →</span>
            </a>)}
          </div>
        </>
      )}

      {!busy && tab==="tasks" && (
        <>
          <form className="form-bar" onSubmit={addTask}>
            <input placeholder="Task" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} required />
            <select value={taskForm.project_id} onChange={e=>setTaskForm({...taskForm,project_id:e.target.value})}>
              <option value="">Unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
            <input type="date" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm,due_date:e.target.value})}/>
            <button>Add task</button>
          </form>
          <section className="panel task-list">
            {filteredTasks.map(task=><label className={task.completed?"task done":"task"} key={task.id}>
              <input type="checkbox" checked={task.completed} onChange={()=>toggleTask(task)}/>
              <span><b>{task.title}</b><small>{task.projects?.name || "Unassigned"} · {task.workflow_state || task.priority}{task.due_date?` · ${task.due_date}`:""}</small></span>
            </label>)}
          </section>
        </>
      )}

      {!busy && tab==="knowledge" && (
        <>
          <KnowledgeCapture user={user} projects={projects} onSaved={load}/>
          <ConversationLibrary sessions={sessions}/>
          <InboxPanel user={user} items={inbox} projects={projects} onChanged={load}/>
        </>
      )}

      {!busy && tab==="manuscripts" && (
        <>
          <form className="form-bar manuscripts-form" onSubmit={addManuscript}>
            <input placeholder="Manuscript title" value={manuscriptForm.title} onChange={e=>setManuscriptForm({...manuscriptForm,title:e.target.value})} required />
            <input placeholder="Journal" value={manuscriptForm.journal} onChange={e=>setManuscriptForm({...manuscriptForm,journal:e.target.value})}/>
            <select value={manuscriptForm.status} onChange={e=>setManuscriptForm({...manuscriptForm,status:e.target.value})}>
              <option>Planning</option><option>Drafting</option><option>Revision</option><option>Submitted</option><option>Published</option>
            </select>
            <select value={manuscriptForm.project_id} onChange={e=>setManuscriptForm({...manuscriptForm,project_id:e.target.value})}>
              <option value="">Unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Next action" value={manuscriptForm.next_action} onChange={e=>setManuscriptForm({...manuscriptForm,next_action:e.target.value})}/>
            <button>Add</button>
          </form>
          <TableWrap><table><thead><tr><th>Manuscript</th><th>Project</th><th>Status</th><th>Next action</th></tr></thead>
            <tbody>{filteredManuscripts.map(m=><tr key={m.id}><td><b>{m.title}</b><small>{m.journal || "Journal TBD"}</small></td><td>{m.projects?.name || "—"}</td><td><span className="badge">{m.status}</span></td><td>{m.next_action || "—"}</td></tr>)}</tbody>
          </table></TableWrap>
        </>
      )}

      {!busy && tab==="grants" && (
        <>
          <form className="form-bar grants-form" onSubmit={addGrant}>
            <input placeholder="Proposal title" value={grantForm.title} onChange={e=>setGrantForm({...grantForm,title:e.target.value})} required />
            <input placeholder="Agency" value={grantForm.agency} onChange={e=>setGrantForm({...grantForm,agency:e.target.value})}/>
            <select value={grantForm.status} onChange={e=>setGrantForm({...grantForm,status:e.target.value})}>
              <option>Planning</option><option>Drafting</option><option>Internal review</option><option>Submitted</option><option>Awarded</option>
            </select>
            <select value={grantForm.project_id} onChange={e=>setGrantForm({...grantForm,project_id:e.target.value})}>
              <option value="">Unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={grantForm.deadline} onChange={e=>setGrantForm({...grantForm,deadline:e.target.value})}/>
            <input placeholder="Next action" value={grantForm.next_action} onChange={e=>setGrantForm({...grantForm,next_action:e.target.value})}/>
            <button>Add</button>
          </form>
          <TableWrap><table><thead><tr><th>Proposal</th><th>Project</th><th>Status</th><th>Deadline</th><th>Next action</th></tr></thead>
            <tbody>{filteredGrants.map(g=><tr key={g.id}><td><b>{g.title}</b><small>{g.agency || "Agency TBD"}</small></td><td>{g.projects?.name || "—"}</td><td><span className="badge">{g.status}</span></td><td>{g.deadline || "—"}</td><td>{g.next_action || "—"}</td></tr>)}</tbody>
          </table></TableWrap>
        </>
      )}
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  return `${h<12?"Good morning":h<18?"Good afternoon":"Good evening"}, Arthur`;
}
function labelFor(tab:MainTab) {
  return ({projects:"Projects",tasks:"Tasks",knowledge:"Capture & Memory",manuscripts:"Manuscripts",grants:"Grants",dashboard:"Home"})[tab];
}
function relativeDate(value?:string|null) {
  if (!value) return "No activity recorded";
  const days = Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000));
  return days===0?"Updated today":days===1?"Updated yesterday":`Updated ${days} days ago`;
}
function TableWrap({children}:{children:React.ReactNode}) { return <section className="panel table-wrap">{children}</section>; }
