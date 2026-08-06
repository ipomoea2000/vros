"use client";
import { useEffect,useMemo,useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import AppShell from "./AppShell";
type P={id:string;name:string;area:string;status:string;progress:number;summary:string|null;next_action:string|null;deadline:string|null;priority:string|null};
type T={id:string;title:string;priority:string;due_date:string|null;completed:boolean;project_id:string|null;projects?:{name:string}|null};
type M={id:string;title:string;journal:string|null;status:string;next_action:string|null;project_id:string|null;projects?:{name:string}|null};
type G={id:string;title:string;agency:string|null;status:string;deadline:string|null;next_action:string|null;project_id:string|null};
export default function HomeClient({user}:{user:User}){
 const [projects,setProjects]=useState<P[]>([]),[tasks,setTasks]=useState<T[]>([]),[mans,setMans]=useState<M[]>([]),[grants,setGrants]=useState<G[]>([]);
 const [q,setQ]=useState(""),[busy,setBusy]=useState(true),[quick,setQuick]=useState("");
 async function load(){setBusy(true); const [p,t,m,g]=await Promise.all([
  supabase.from("projects").select("*").order("updated_at",{ascending:false}),
  supabase.from("tasks").select("*,projects(name)").order("completed").order("due_date"),
  supabase.from("manuscripts").select("*,projects(name)").order("updated_at",{ascending:false}),
  supabase.from("grants").select("*").order("deadline",{ascending:true})
 ]); setProjects((p.data as P[])||[]);setTasks((t.data as T[])||[]);setMans((m.data as M[])||[]);setGrants((g.data as G[])||[]);setBusy(false)}
 useEffect(()=>{load()},[]);
 async function addQuick(){if(!quick.trim())return;await supabase.from("tasks").insert({user_id:user.id,title:quick.trim(),priority:"Medium"});setQuick("");load()}
 async function toggle(t:T){await supabase.from("tasks").update({completed:!t.completed}).eq("id",t.id);load()}
 const open=tasks.filter(x=>!x.completed), active=projects.filter(x=>x.status==="Active"), high=open.filter(x=>x.priority==="High");
 const mq=(s:string)=>s.toLowerCase().includes(q.toLowerCase());
 const fp=projects.filter(x=>mq([x.name,x.area,x.status,x.next_action,x.summary].join(" ")));
 const fm=mans.filter(x=>mq([x.title,x.journal,x.status,x.next_action].join(" ")));
 const fg=grants.filter(x=>mq([x.title,x.agency,x.status,x.next_action].join(" ")));
 return <AppShell email={user.email}><header className="top"><div><p className="eyebrow">Arthur Villordon Research Portfolio</p><h1>Research headquarters</h1></div><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search everything…"/></header>
 {busy?<section className="panel">Loading VROS…</section>:<>
 <section className="metrics"><article className="panel hero"><p className="eyebrow">Today</p><h2>Reduce the noise. Move the most important work.</h2><p>{high.length} high-priority tasks across {active.length} active projects.</p></article>
 <Metric n={active.length} l="active projects"/><Metric n={open.length} l="open tasks"/><Metric n={mans.length} l="manuscripts"/><Metric n={grants.length} l="grants"/></section>
 <section className="quick panel"><input value={quick} onChange={e=>setQuick(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addQuick()}} placeholder="Capture a task before you forget it…"/><button onClick={addQuick}>Add task</button></section>
 <section className="two"><div className="panel"><div className="head"><h2>Top priorities</h2><span className="badge">{open.length} open</span></div><div className="stack">{open.slice(0,8).map(t=><label className="task" key={t.id}><input type="checkbox" checked={t.completed} onChange={()=>toggle(t)}/><span><b>{t.title}</b><small>{t.projects?.name||"Unassigned"} · {t.priority}{t.due_date?` · ${t.due_date}`:""}</small></span></label>)}</div></div>
 <div className="panel" id="projects"><div className="head"><h2>Projects</h2></div><div className="project-grid">{fp.map(p=><a className="project" key={p.id} href={`/projects/${p.id}`}><span className="badge">{p.status}</span><h3>{p.name}</h3><p>{p.next_action||p.summary||"No next action set."}</p><div className="progress"><span style={{width:`${p.progress}%`}}/></div><small>{p.progress}% · {p.area}</small></a>)}</div></div></section>
 <section className="two"><div className="panel" id="manuscripts"><div className="head"><h2>Manuscript pipeline</h2></div><table><thead><tr><th>Title</th><th>Status</th><th>Next</th></tr></thead><tbody>{fm.map(m=><tr key={m.id}><td><b>{m.title}</b><small>{m.journal||"Journal TBD"}</small></td><td><span className="badge">{m.status}</span></td><td>{m.next_action||"—"}</td></tr>)}</tbody></table></div>
 <div className="panel" id="grants"><div className="head"><h2>Grant pipeline</h2></div><table><thead><tr><th>Proposal</th><th>Status</th><th>Deadline</th></tr></thead><tbody>{fg.map(g=><tr key={g.id}><td><b>{g.title}</b><small>{g.agency||"Agency TBD"}</small></td><td><span className="badge">{g.status}</span></td><td>{g.deadline||"—"}</td></tr>)}</tbody></table></div></section>
 </>}</AppShell>
}
function Metric({n,l}:{n:number;l:string}){return <article className="panel metric"><b>{n}</b><span>{l}</span></article>}
