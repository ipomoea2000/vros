"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ProjectMemory({user, project, sessions, relations, onSaved}:{user:User;project:any;sessions:any[];relations:any[];onSaved:()=>void}){
 const [editing,setEditing]=useState(false); const [asking,setAsking]=useState(false); const [resume,setResume]=useState(project.resume_summary||"");
 const [memory,setMemory]=useState({purpose:project.purpose||"",hypothesis:project.hypothesis||"",last_decision:project.last_decision||"",open_questions:project.open_questions||"",blockers:project.blockers||""});
 async function save(){const {error}=await supabase.from("projects").update({...memory,resume_summary:resume}).eq("id",project.id);if(error)return alert(error.message);setEditing(false);onSaved()}
 async function generate(){setAsking(true);const {data}=await supabase.auth.getSession();const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token}`},body:JSON.stringify({question:'Generate a Project Resume brief with these headings: Purpose, Current state, Last major decision, Evidence available, Open questions, Current bottlenecks, Related work, and Recommended next action.',context:{project,sessions,relations}})});const result=await response.json();setResume(result.answer||result.error||'No response.');setAsking(false)}
 return <section className="panel memory-panel"><div className="head"><div><p className="eyebrow">Research memory engine</p><h2>Project Resume</h2></div><div className="inline-actions"><button className="secondary" onClick={()=>setEditing(!editing)}>{editing?'Cancel':'Edit memory'}</button><button onClick={generate} disabled={asking}>{asking?'Generating…':'Generate resume'}</button></div></div>
 {editing?<div className="memory-form">{Object.entries(memory).map(([key,value])=><label key={key}>{label(key)}<textarea rows={3} value={value} onChange={e=>setMemory({...memory,[key]:e.target.value})}/></label>)}<label>Resume summary<textarea rows={8} value={resume} onChange={e=>setResume(e.target.value)}/></label><button onClick={save}>Save project memory</button></div>:<>
 <div className="memory-grid"><Memory title="Purpose" body={project.purpose||project.summary}/><Memory title="Scientific hypothesis" body={project.hypothesis}/><Memory title="Last major decision" body={project.last_decision}/><Memory title="Open questions" body={project.open_questions}/><Memory title="Bottlenecks" body={project.blockers}/><Memory title="Immediate next action" body={project.next_action}/></div>
 {resume&&<div className="resume-brief"><h3>Resume brief</h3><div>{resume}</div></div>}</>}
 </section>
}
function Memory({title,body}:{title:string;body?:string|null}){return <article className="memory-box"><h3>{title}</h3><p>{body||'Not recorded yet.'}</p></article>}
function label(k:string){return ({purpose:'Purpose',hypothesis:'Scientific hypothesis',last_decision:'Last major decision',open_questions:'Open questions',blockers:'Current bottlenecks'} as any)[k]||k}
