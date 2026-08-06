"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const AGENTS = [
  { id:"coordinator", name:"Research Coordinator", description:"Selects the most useful current focus from open work." },
  { id:"stale_projects", name:"Stale Project Watch", description:"Finds active projects that have gone quiet." },
  { id:"deadline_watch", name:"Deadline Watch", description:"Surfaces overdue and approaching tasks and proposals." },
  { id:"manuscript_readiness", name:"Manuscript Readiness", description:"Finds manuscripts without a defined next step or project link." },
  { id:"memory_auditor", name:"Project Memory Auditor", description:"Finds active projects that lack a next action, decision, or saved session." },
];

export default function AgentCenter({ user, projects }:{ user:User; projects:any[] }) {
  const [recommendations,setRecommendations]=useState<any[]>([]);
  const [runs,setRuns]=useState<any[]>([]);
  const [settings,setSettings]=useState<any>({
    autonomy_mode:"advisory", daily_brief_enabled:false,
    stale_project_days:30, deadline_window_days:21,
  });
  const [working,setWorking]=useState("");
  const [message,setMessage]=useState("");

  async function load() {
    const [r,run,s] = await Promise.all([
      supabase.from("agent_recommendations").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("agent_runs").select("*").order("started_at",{ascending:false}).limit(20),
      supabase.from("agent_settings").select("*").eq("user_id",user.id).maybeSingle(),
    ]);
    setRecommendations(r.data || []);
    setRuns(run.data || []);
    if (s.data) setSettings(s.data);
  }
  useEffect(()=>{load()},[]);

  async function runAgent(agentType:string) {
    setWorking(agentType); setMessage("");
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/agents/run",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session?.access_token}`},
      body:JSON.stringify({agentType}),
    });
    const result = await response.json();
    setMessage(response.ok ? `${result.count} recommendations generated.` : result.error);
    setWorking(""); load();
  }

  async function saveSettings() {
    const { error } = await supabase.from("agent_settings").upsert({
      user_id:user.id,
      autonomy_mode:settings.autonomy_mode,
      daily_brief_enabled:settings.daily_brief_enabled,
      stale_project_days:Number(settings.stale_project_days),
      deadline_window_days:Number(settings.deadline_window_days),
    });
    setMessage(error ? error.message : "Agent settings saved.");
    load();
  }

  async function review(rec:any,status:"approved"|"dismissed") {
    if (status === "approved") {
      const action = rec.proposed_action || {type:"none"};
      if (action.type === "create_task") {
        const { error } = await supabase.from("tasks").insert({
          user_id:user.id,
          project_id:action.project_id || rec.project_id || null,
          title:action.title || rec.title,
          priority:action.priority || rec.priority || "Medium",
          workflow_state:"Next",
        });
        if (error) return setMessage(error.message);
      }
      if (action.type === "update_project_next_action" && action.project_id) {
        const { error } = await supabase.from("projects")
          .update({next_action:action.value}).eq("id",action.project_id);
        if (error) return setMessage(error.message);
      }
    }
    await supabase.from("agent_recommendations").update({
      status, reviewed_at:new Date().toISOString()
    }).eq("id",rec.id);
    load();
  }

  const pending = recommendations.filter(r=>r.status==="pending");
  const projectName = (id:string|null) => projects.find(p=>p.id===id)?.name || "Portfolio-wide";

  return <div className="agent-center">
    <section className="panel agent-intro">
      <div>
        <p className="eyebrow">AROS 1.0</p>
        <h2>Advisory agents with human approval</h2>
        <p className="muted">Agents inspect your VROS records, propose low-risk actions, and wait for your decision.</p>
      </div>
      <button onClick={()=>runAgent("all")} disabled={Boolean(working)}>
        {working==="all"?"Running all agents…":"Run complete portfolio review"}
      </button>
    </section>

    <section className="agent-grid">
      {AGENTS.map(agent=><article className="panel agent-card" key={agent.id}>
        <h3>{agent.name}</h3><p>{agent.description}</p>
        <button className="quiet-button" disabled={Boolean(working)} onClick={()=>runAgent(agent.id)}>
          {working===agent.id?"Running…":"Run now"}
        </button>
      </article>)}
    </section>

    {message && <p className="notice">{message}</p>}

    <section className="agent-layout">
      <div className="panel">
        <div className="head"><h2>Recommendations awaiting review</h2><span className="badge">{pending.length} pending</span></div>
        <div className="recommendation-list">
          {pending.map(rec=><article className={`recommendation priority-${rec.priority.toLowerCase()}`} key={rec.id}>
            <div className="recommendation-meta">
              <span className="badge">{rec.agent_type.replaceAll("_"," ")}</span>
              <span>{projectName(rec.project_id)}</span><span>{rec.priority}</span>
            </div>
            <h3>{rec.title}</h3><p>{rec.rationale}</p>
            <div className="recommendation-actions">
              <button onClick={()=>review(rec,"approved")}>Approve</button>
              <button className="secondary-action" onClick={()=>review(rec,"dismissed")}>Dismiss</button>
            </div>
          </article>)}
          {!pending.length && <p className="muted">No recommendations are waiting. Run an agent when you want a fresh review.</p>}
        </div>
      </div>

      <aside className="panel agent-settings">
        <h2>Agent controls</h2>
        <label>Autonomy
          <select value={settings.autonomy_mode} onChange={e=>setSettings({...settings,autonomy_mode:e.target.value})}>
            <option value="advisory">Advisory only</option>
            <option value="approved_actions">One-click approved actions</option>
          </select>
        </label>
        <label>Stale after days
          <input type="number" min="7" max="365" value={settings.stale_project_days}
            onChange={e=>setSettings({...settings,stale_project_days:e.target.value})}/>
        </label>
        <label>Deadline window
          <input type="number" min="1" max="180" value={settings.deadline_window_days}
            onChange={e=>setSettings({...settings,deadline_window_days:e.target.value})}/>
        </label>
        <label className="check-line">
          <input type="checkbox" checked={settings.daily_brief_enabled}
            onChange={e=>setSettings({...settings,daily_brief_enabled:e.target.checked})}/>
          Enable scheduled daily advisory brief
        </label>
        <button onClick={saveSettings}>Save settings</button>
        <p className="muted tiny">Scheduled briefs also require server-side cron configuration. Manual agents work immediately.</p>
      </aside>
    </section>

    <section className="panel">
      <div className="head"><h2>Agent activity</h2><span className="badge">{runs.length} recent runs</span></div>
      <table><thead><tr><th>Agent</th><th>Status</th><th>Summary</th><th>Run</th></tr></thead>
      <tbody>{runs.map(run=><tr key={run.id}>
        <td>{run.agent_type.replaceAll("_"," ")}</td><td>{run.status}</td>
        <td>{run.summary || "—"}</td><td>{new Date(run.started_at).toLocaleString()}</td>
      </tr>)}</tbody></table>
    </section>
  </div>;
}
