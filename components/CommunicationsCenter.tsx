"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function CommunicationsCenter({user,projects}:{user:User;projects:any[]}) {
  const [google,setGoogle]=useState<any>({configured:false,connected:false});
  const [emails,setEmails]=useState<any[]>([]);
  const [watches,setWatches]=useState<any[]>([]);
  const [changes,setChanges]=useState<any[]>([]);
  const [commitments,setCommitments]=useState<any[]>([]);
  const [tab,setTab]=useState<"email"|"proposals"|"commitments">("email");
  const [message,setMessage]=useState("");
  const [working,setWorking]=useState("");
  const [watchForm,setWatchForm]=useState({title:"",source_url:"",project_id:""});

  async function token(){return (await supabase.auth.getSession()).data.session?.access_token||""}

  async function load(){
    const auth=await token();
    const [gStatus,e,w,c,k]=await Promise.all([
      fetch("/api/google/status",{headers:{Authorization:`Bearer ${auth}`}}),
      supabase.from("email_items").select("*,projects(name)").order("received_at",{ascending:false}).limit(100),
      supabase.from("proposal_watches").select("*,projects(name)").order("updated_at",{ascending:false}),
      supabase.from("proposal_changes").select("*").order("detected_at",{ascending:false}).limit(50),
      supabase.from("commitments").select("*,projects(name)").order("created_at",{ascending:false}).limit(100),
    ]);
    const gs=await gStatus.json();if(gStatus.ok)setGoogle(gs);
    setEmails(e.data||[]);setWatches(w.data||[]);setChanges(c.data||[]);setCommitments(k.data||[]);
  }
  useEffect(()=>{load()},[]);

  async function connectGoogle(){
    setWorking("connect-google");setMessage("");
    const r=await fetch("/api/google/connect",{method:"POST",headers:{Authorization:`Bearer ${await token()}`}});
    const x=await r.json();setWorking("");
    if(r.ok)window.location.href=x.url;else setMessage(x.error);
  }
  async function disconnectGoogle(){
    if(!confirm("Disconnect Gmail/Google Docs from AROS? Saved AROS records will remain."))return;
    setWorking("disconnect-google");
    const r=await fetch("/api/google/disconnect",{method:"POST",headers:{Authorization:`Bearer ${await token()}`}});
    const x=await r.json();setWorking("");setMessage(r.ok?"Google account disconnected.":x.error);if(r.ok)load();
  }

  async function syncEmail(){
    setWorking("email");setMessage("Scanning Gmail for Outlook messages forwarded as attachments…");
    const r=await fetch("/api/intake/sync",{method:"POST",headers:{Authorization:`Bearer ${await token()}`}});
    const x=await r.json();setWorking("");
    setMessage(r.ok
      ? `Found ${x.originals} original forwarded message${x.originals===1?"":"s"}; ${x.saved} triaged or refreshed.`
      : x.error);
    if(r.ok)load();
  }

  async function draft(emailId:string){
    setWorking(`draft-${emailId}`);setMessage("");
    const r=await fetch("/api/intake/draft",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await token()}`},body:JSON.stringify({emailId})});
    const x=await r.json();setWorking("");
    setMessage(r.ok?"AROS prepared a response for LSU Outlook. Review it below before using it.":x.error);
    if(r.ok)load();
  }

  async function copyDraft(value:string){
    try{
      await navigator.clipboard.writeText(value);
      setMessage("Draft copied. Paste it into your LSU Outlook reply, review, and send from Outlook.");
    }catch{
      setMessage("Could not use the browser clipboard. Select the draft text and copy it manually.");
    }
  }

  async function addWatch(e:React.FormEvent){
    e.preventDefault();
    const {error}=await supabase.from("proposal_watches").insert({
      user_id:user.id,title:watchForm.title,source_url:watchForm.source_url,
      project_id:watchForm.project_id||null,source_type:"Google Doc"
    });
    if(error)return setMessage(error.message);
    setWatchForm({title:"",source_url:"",project_id:""});load();
  }
  async function checkWatch(id:string){
    setWorking(`watch-${id}`);setMessage("");
    const r=await fetch("/api/proposals/check",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await token()}`},body:JSON.stringify({watchId:id})});
    const x=await r.json();setWorking("");
    setMessage(r.ok?(x.changed?`Meaningful document change detected. ${x.summary||""}`:"No document content change detected."):x.error);
    if(r.ok)load();
  }

  async function saveCommitment(email:any,direction:"Mine"|"Theirs"){
    const description=email.commitment_detected||email.suggested_action||`Follow up on: ${email.subject}`;
    const {error}=await supabase.from("commitments").insert({
      user_id:user.id,project_id:email.project_id||null,source_type:"Email",source_id:email.gmail_message_id,
      description,direction
    });
    setMessage(error?error.message:(direction==="Mine"?"Added to I owe.":"Added to Waiting on others."));
    if(!error)load();
  }

  async function setProject(emailId:string,projectId:string){
    const {error}=await supabase.from("email_items").update({project_id:projectId||null}).eq("id",emailId);
    if(error)setMessage(error.message);else load();
  }

  async function createTask(email:any){
    const title=email.commitment_detected||email.suggested_action||`Follow up: ${email.subject}`;
    const {error}=await supabase.from("tasks").insert({
      user_id:user.id,project_id:email.project_id||null,title,
      priority:email.priority||"Medium",workflow_state:"Next"
    });
    setMessage(error?error.message:"Task created from email.");
  }

  const priorityEmails=useMemo(
    ()=>emails.filter(e=>e.priority==="High"||["Needs reply","Needs action"].includes(e.triage_category)),
    [emails]
  );
  const otherEmails=useMemo(()=>emails.filter(e=>!priorityEmails.some(p=>p.id===e.id)),[emails]);

  return <div className="communications-center">
    <section className="panel comm-header">
      <div>
        <p className="eyebrow">AROS 1.5.1</p>
        <h2>Communications & Collaboration</h2>
        <p className="muted">
          LSU Outlook remains your authoritative mailbox. Outlook forwards selected messages as .eml attachments to Gmail;
          AROS extracts the original message, triages it, and drafts a response for you to send from Outlook.
        </p>
      </div>
    </section>

    <section className="connection-grid">
      <div className="panel service-card forwarding-card">
        <div className="service-status"><span className="connected-dot"/><div>
          <b>LSU Outlook forwarding path</b>
          <small>No LSU mailbox credentials required</small>
        </div></div>
        <span className="badge">Forward as attachment</span>
      </div>
      <div className="panel service-card">
        <div className="service-status"><span className={google.connected?"connected-dot":"status-dot"}/><div>
          <b>Gmail intake + Google Docs</b>
          <small>{google.connected?google.google_email:(!google.configured?"Vercel Google OAuth setup required":"Not connected")}</small>
        </div></div>
        {google.connected
          ? <button className="quiet-button" onClick={disconnectGoogle} disabled={Boolean(working)}>Disconnect</button>
          : <button onClick={connectGoogle} disabled={Boolean(working)||!google.configured}>
              {working==="connect-google"?"Opening Google…":"Connect Google"}
            </button>}
      </div>
    </section>

    <div className="comm-tabs">
      <button className={tab==="email"?"active":""} onClick={()=>setTab("email")}>Email assistant</button>
      <button className={tab==="proposals"?"active":""} onClick={()=>setTab("proposals")}>Proposal watch</button>
      <button className={tab==="commitments"?"active":""} onClick={()=>setTab("commitments")}>Waiting & commitments</button>
    </div>

    {message&&<p className="notice">{message}</p>}

    {tab==="email"&&<>
      <section className="section-title">
        <div><p className="eyebrow">Inbox brief</p><h2>What needs you</h2>
          <p className="muted">AROS scans forwarded .eml attachments from the last 14 days. It does not analyze ordinary personal Gmail messages.</p>
        </div>
        <button onClick={syncEmail} disabled={!google.connected||Boolean(working)}>
          {working==="email"?"Checking intake…":"Check forwarded LSU mail"}
        </button>
      </section>

      <div className="email-list">
        {priorityEmails.map(e=><EmailCard key={e.id} email={e} projects={projects} working={working}
          onDraft={()=>draft(e.id)} onCopy={()=>copyDraft(e.draft_response||"")}
          onProject={(v:string)=>setProject(e.id,v)} onTask={()=>createTask(e)}
          onCommitMine={()=>saveCommitment(e,"Mine")} onCommitTheirs={()=>saveCommitment(e,"Theirs")}/>)}
        {!priorityEmails.length&&<section className="panel muted">
          No priority forwarded mail has been triaged yet. Your existing AROS Test rule can stay narrow while you validate the workflow.
        </section>}
      </div>

      <details className="panel low-mail"><summary>Other triaged mail ({otherEmails.length})</summary>
        <div className="email-list">{otherEmails.map(e=><EmailCard key={e.id} email={e} projects={projects} working={working}
          onDraft={()=>draft(e.id)} onCopy={()=>copyDraft(e.draft_response||"")}
          onProject={(v:string)=>setProject(e.id,v)} onTask={()=>createTask(e)}
          onCommitMine={()=>saveCommitment(e,"Mine")} onCommitTheirs={()=>saveCommitment(e,"Theirs")}/>)}</div>
      </details>
    </>}

    {tab==="proposals"&&<>
      <section className="panel">
        <p className="eyebrow">Collaboration watch</p><h2>Add the Google Docs proposal</h2>
        <form className="proposal-form" onSubmit={addWatch}>
          <input placeholder="Proposal / document title" value={watchForm.title} onChange={e=>setWatchForm({...watchForm,title:e.target.value})} required/>
          <input type="url" placeholder="Google Docs URL" value={watchForm.source_url} onChange={e=>setWatchForm({...watchForm,source_url:e.target.value})} required/>
          <select value={watchForm.project_id} onChange={e=>setWatchForm({...watchForm,project_id:e.target.value})}>
            <option value="">Unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button>Add watch</button>
        </form>
        <p className="muted tiny">
          The same connected Google account is used for Gmail intake and Google Docs. It must already have access to the proposal document.
        </p>
      </section>

      <div className="watch-grid">{watches.map(w=><article className="panel watch-card" key={w.id}>
        <div className="head"><div><span className="badge">{w.source_type}</span><h3>{w.title}</h3></div>
          <button onClick={()=>checkWatch(w.id)} disabled={!google.connected||Boolean(working)}>
            {working===`watch-${w.id}`?"Checking…":"Check now"}
          </button></div>
        <p className="muted">{w.projects?.name||"Unassigned"}</p>
        <p><b>Last checked modification:</b> {w.last_modified_time?new Date(w.last_modified_time).toLocaleString():"Not checked yet"}</p>
        <a href={w.source_url} target="_blank" rel="noreferrer">Open Google Doc ↗</a>
        {changes.filter(c=>c.watch_id===w.id).slice(0,3).map(c=><div className={`change-note ${c.requires_attention?"attention":""}`} key={c.id}>
          <b>{c.requires_attention?"Needs your attention":"Change detected"}</b><small>{new Date(c.detected_at).toLocaleString()}</small>
          <p>{c.summary||"Document changed."}</p>{c.significance&&<p className="muted">{c.significance}</p>}
        </div>)}
      </article>)}</div>
    </>}

    {tab==="commitments"&&<section className="commitment-columns">
      <div className="panel"><div className="head"><h2>I owe</h2><span className="badge">{commitments.filter(c=>c.direction==="Mine"&&c.status==="Open").length}</span></div>
        {commitments.filter(c=>c.direction==="Mine"&&c.status==="Open").map(c=><Commitment key={c.id} c={c}/>)}</div>
      <div className="panel"><div className="head"><h2>Waiting on others</h2><span className="badge">{commitments.filter(c=>c.direction==="Theirs"&&c.status==="Open").length}</span></div>
        {commitments.filter(c=>c.direction==="Theirs"&&c.status==="Open").map(c=><Commitment key={c.id} c={c}/>)}</div>
    </section>}
  </div>
}

function EmailCard({email,projects,working,onDraft,onCopy,onProject,onTask,onCommitMine,onCommitTheirs}:any){
 return <article className={`panel email-card priority-${String(email.priority).toLowerCase()}`}>
   <div className="email-meta">
     <span className="badge">{email.priority}</span><span>{email.triage_category}</span>
     <span>{email.received_at?new Date(email.received_at).toLocaleString():""}</span>
   </div>
   <h3>{email.subject||"(no subject)"}</h3>
   <p className="sender">{email.sender} {email.sender_email&&`<${email.sender_email}>`}</p>
   <p>{email.why_it_matters||email.snippet}</p>
   {email.suggested_action&&<p><b>Suggested action:</b> {email.suggested_action}</p>}
   <div className="email-controls">
     <select value={email.project_id||""} onChange={e=>onProject(e.target.value)}>
       <option value="">Unassigned</option>{projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select>
     <button onClick={onDraft} disabled={Boolean(working)}>
       {working===`draft-${email.id}`?"Drafting…":"Draft response"}
     </button>
     <button className="quiet-button" onClick={onTask}>Create task</button>
     <button className="quiet-button" onClick={onCommitMine}>I owe this</button>
     <button className="quiet-button" onClick={onCommitTheirs}>Waiting on them</button>
   </div>
   {email.draft_response&&<div className="draft-box">
     <b>Draft for LSU Outlook — review before sending</b>
     <textarea readOnly rows={7} value={email.draft_response}/>
     <button onClick={onCopy}>Copy response</button>
   </div>}
 </article>
}
function Commitment({c}:{c:any}){
 return <div className="commitment"><b>{c.description}</b><small>{c.projects?.name||"Unassigned"}{c.due_date?` · ${c.due_date}`:""}</small></div>
}
