"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AppShell from "./AppShell";
import ProjectMemory from "./ProjectMemory";
import KnowledgeCapture from "./KnowledgeCapture";
import ConversationLibrary from "./ConversationLibrary";

export default function ProjectWorkspace({user,id}:{user:User;id:string}) {
  const [p,setP]=useState<any>(null),[tasks,setTasks]=useState<any[]>([]),[mans,setMans]=useState<any[]>([]),
    [grants,setGrants]=useState<any[]>([]),[notes,setNotes]=useState<any[]>([]),[resources,setResources]=useState<any[]>([]),
    [sessions,setSessions]=useState<any[]>([]),[relations,setRelations]=useState<any[]>([]),[allProjects,setAllProjects]=useState<any[]>([]);
  const [note,setNote]=useState(""),[task,setTask]=useState(""),[taskState,setTaskState]=useState("Next");
  const [showCapture,setShowCapture]=useState(false),[showDetails,setShowDetails]=useState(false);

  async function load() {
    const [a,b,c,d,e,f,g,h,i]=await Promise.all([
      supabase.from("projects").select("*").eq("id",id).single(),
      supabase.from("tasks").select("*").eq("project_id",id).order("completed").order("due_date"),
      supabase.from("manuscripts").select("*").eq("project_id",id),
      supabase.from("grants").select("*").eq("project_id",id),
      supabase.from("project_notes").select("*").eq("project_id",id).order("created_at",{ascending:false}),
      supabase.from("resources").select("*").eq("project_id",id).order("created_at",{ascending:false}),
      supabase.from("project_sessions").select("*").eq("project_id",id).order("session_date",{ascending:false}),
      supabase.from("project_relations").select("*,target:target_project_id(name),source:source_project_id(name)").or(`source_project_id.eq.${id},target_project_id.eq.${id}`),
      supabase.from("projects").select("id,name").order("name")
    ]);
    setP(a.data);setTasks(b.data||[]);setMans(c.data||[]);setGrants(d.data||[]);setNotes(e.data||[]);
    setResources(f.data||[]);setSessions(g.data||[]);setRelations(h.data||[]);setAllProjects(i.data||[]);
  }
  useEffect(()=>{load()},[id]);

  async function addNote() {
    if(!note.trim())return;
    await supabase.from("project_notes").insert({user_id:user.id,project_id:id,body:note.trim()});
    setNote("");load();
  }
  async function addTask() {
    if(!task.trim())return;
    await supabase.from("tasks").insert({user_id:user.id,project_id:id,title:task.trim(),priority:"Medium",workflow_state:taskState});
    setTask("");load();
  }
  async function toggleTask(t:any) {
    await supabase.from("tasks").update({completed:!t.completed}).eq("id",t.id);
    load();
  }

  if(!p) return <AppShell email={user.email}><section className="panel">Loading project…</section></AppShell>;
  const latest = sessions[0];

  return <AppShell email={user.email} activeTab="projects">
    <header className="top project-top">
      <div>
        <p className="eyebrow">{p.area}</p>
        <h1>{p.name}</h1>
        <p className="muted">{p.summary}</p>
      </div>
      <div className="project-actions">
        <button className="quiet-button" onClick={()=>setShowCapture(!showCapture)}>+ Capture session</button>
        <a className="buttonlink" href="/">Home</a>
      </div>
    </header>

    <section className="project-resume panel">
      <div className="resume-primary">
        <p className="eyebrow">Resume project</p>
        <h2>{p.next_action || "Set the next concrete action."}</h2>
        <div className="resume-facts">
          <span><b>Status</b>{p.status}</span>
          <span><b>Priority</b>{p.priority || "Medium"}</span>
          <span><b>Progress</b>{p.progress}%</span>
          <span><b>Last updated</b>{new Date(p.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="resume-memory">
        <h3>Latest decision</h3>
        <p>{p.last_decision || latest?.decisions || "No major decision recorded yet."}</p>
        {latest?.chat_url && <a href={latest.chat_url} target="_blank" rel="noreferrer">Open latest conversation ↗</a>}
      </div>
    </section>

    {showCapture && <KnowledgeCapture user={user} projects={allProjects} initialProjectId={id} onSaved={()=>{load();setShowCapture(false)}}/>}

    <section className="project-core">
      <div className="panel">
        <div className="head"><h2>Next actions</h2><span className="badge">{tasks.filter(t=>!t.completed).length} open</span></div>
        <div className="task-capture">
          <input value={task} onChange={e=>setTask(e.target.value)} placeholder="Add one next action"/>
          <select value={taskState} onChange={e=>setTaskState(e.target.value)}><option>Next</option><option>This Week</option><option>Waiting</option><option>Someday</option></select>
          <button onClick={addTask}>Add</button>
        </div>
        {tasks.slice(0,10).map(t=><label className={t.completed?"task done":"task"} key={t.id}>
          <input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t)}/>
          <span><b>{t.title}</b><small>{t.workflow_state || "Next"} · {t.priority}</small></span>
        </label>)}
      </div>

      <div className="panel">
        <div className="head"><h2>Recent memory</h2><span className="badge">{sessions.length} sessions</span></div>
        {sessions.slice(0,4).map(s=><article className="memory-snippet" key={s.id}>
          <div><b>{s.title}</b><small>{s.session_date}</small></div>
          <p>{s.summary || s.decisions || "Saved session"}</p>
          {s.chat_url && <a href={s.chat_url} target="_blank" rel="noreferrer">Open conversation ↗</a>}
        </article>)}
        {!sessions.length && <p className="muted">No saved conversations yet.</p>}
      </div>

      <div className="panel">
        <h2>Quick note</h2>
        <div className="quick"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Decision, idea, or reminder"/><button onClick={addNote}>Save</button></div>
        {notes.slice(0,4).map(n=><div className="note" key={n.id}>{n.body}<small>{new Date(n.created_at).toLocaleString()}</small></div>)}
      </div>

      <div className="panel">
        <h2>Linked work</h2>
        <p><b>{mans.length}</b> manuscripts · <b>{grants.length}</b> grants · <b>{resources.length}</b> resources</p>
        {mans.slice(0,3).map(m=><p key={m.id}>• {m.title} <span className="muted">({m.status})</span></p>)}
        {grants.slice(0,3).map(g=><p key={g.id}>• {g.title} <span className="muted">({g.status})</span></p>)}
      </div>
    </section>

    <button className="details-toggle" onClick={()=>setShowDetails(!showDetails)}>
      {showDetails ? "Hide full project record" : "Show full project record"}
    </button>

    {showDetails && <>
      <ProjectMemory user={user} project={p} sessions={sessions} relations={relations} onSaved={load}/>
      <ConversationLibrary sessions={sessions.map(s=>({...s,project:{name:p.name}}))}/>
      <section className="workspace-grid">
        <div className="panel"><h2>Resources and links</h2>{resources.length?resources.map(r=><p key={r.id}>• <a href={r.url||"#"} target="_blank">{r.title}</a> <span className="muted">({r.resource_type})</span></p>):<p className="muted">No resources recorded.</p>}</div>
        <div className="panel"><h2>Project constellation</h2>{relations.length?relations.map(r=><p key={r.id}>• {r.source_project_id===id?r.target?.name:r.source?.name} <span className="muted">({r.relation_type})</span></p>):<p className="muted">No project relationships recorded.</p>}</div>
      </section>
    </>}
  </AppShell>;
}
