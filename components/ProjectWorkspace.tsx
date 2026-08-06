"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import type {User} from "@supabase/supabase-js";
import AppShell from "./AppShell";
export default function ProjectWorkspace({user,id}:{user:User;id:string}){
 const [p,setP]=useState<any>(null),[tasks,setTasks]=useState<any[]>([]),[mans,setMans]=useState<any[]>([]),[grants,setGrants]=useState<any[]>([]),[notes,setNotes]=useState<any[]>([]),[resources,setResources]=useState<any[]>([]);
 const [note,setNote]=useState(""),[task,setTask]=useState("");
 async function load(){const [a,b,c,d,e,f]=await Promise.all([
  supabase.from("projects").select("*").eq("id",id).single(),
  supabase.from("tasks").select("*").eq("project_id",id).order("completed").order("due_date"),
  supabase.from("manuscripts").select("*").eq("project_id",id),
  supabase.from("grants").select("*").eq("project_id",id),
  supabase.from("project_notes").select("*").eq("project_id",id).order("created_at",{ascending:false}),
  supabase.from("resources").select("*").eq("project_id",id).order("created_at",{ascending:false})
 ]);setP(a.data);setTasks(b.data||[]);setMans(c.data||[]);setGrants(d.data||[]);setNotes(e.data||[]);setResources(f.data||[])}
 useEffect(()=>{load()},[id]);
 async function addNote(){if(!note.trim())return;await supabase.from("project_notes").insert({user_id:user.id,project_id:id,body:note.trim()});setNote("");load()}
 async function addTask(){if(!task.trim())return;await supabase.from("tasks").insert({user_id:user.id,project_id:id,title:task.trim(),priority:"Medium"});setTask("");load()}
 if(!p)return <AppShell email={user.email}><section className="panel">Loading project…</section></AppShell>
 return <AppShell email={user.email}><header className="top"><div><p className="eyebrow">{p.area}</p><h1>{p.name}</h1><p className="muted">{p.summary}</p></div><a className="buttonlink" href="/">Back to dashboard</a></header>
 <section className="workspace-hero panel"><div><span className="badge">{p.status}</span><h2>{p.next_action||"No next action set"}</h2><p className="muted">Current priority: {p.priority||"Medium"} · Deadline: {p.deadline||"Not set"}</p></div><div className="ring">{p.progress}%</div></section>
 <section className="workspace-grid">
 <div className="panel"><h2>Tasks</h2><div className="quick"><input value={task} onChange={e=>setTask(e.target.value)} placeholder="Add project task"/><button onClick={addTask}>Add</button></div>{tasks.map(t=><p key={t.id}>• {t.title} <span className="muted">({t.priority})</span></p>)}</div>
 <div className="panel"><h2>Manuscripts</h2>{mans.length?mans.map(m=><p key={m.id}>• <b>{m.title}</b><br/><span className="muted">{m.status} · {m.journal||"Journal TBD"}</span></p>):<p className="muted">None linked yet.</p>}</div>
 <div className="panel"><h2>Grants</h2>{grants.length?grants.map(g=><p key={g.id}>• <b>{g.title}</b><br/><span className="muted">{g.status} · {g.deadline||"No deadline"}</span></p>):<p className="muted">None linked yet.</p>}</div>
 <div className="panel"><h2>Notes</h2><div className="quick"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Capture a decision, idea, or meeting note"/><button onClick={addNote}>Save</button></div>{notes.map(n=><div className="note" key={n.id}>{n.body}<small>{new Date(n.created_at).toLocaleString()}</small></div>)}</div>
 <div className="panel"><h2>Resources</h2>{resources.length?resources.map(r=><p key={r.id}>• <a href={r.url||"#"} target="_blank">{r.title}</a> <span className="muted">({r.resource_type})</span></p>):<p className="muted">Add document, GitHub, Vercel, dataset, and conversation links in the next iteration.</p>}</div>
 <div className="panel"><h2>Project health</h2><p><b>Progress:</b> {p.progress}%</p><p><b>Last updated:</b> {new Date(p.updated_at).toLocaleDateString()}</p><p><b>Immediate next action:</b> {p.next_action||"Not set"}</p></div>
 </section></AppShell>
}
