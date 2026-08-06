"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Project = { id: string; name: string };

const EMPTY = {
  title: "",
  chat_url: "",
  source_type: "ChatGPT session",
  session_type: "Research",
  raw_capture: "",
  summary: "",
  decisions: "",
  evidence: "",
  open_questions: "",
  next_actions: "",
  keywords: "",
};

export default function KnowledgeCapture({
  user,
  projects,
  onSaved,
  initialProjectId = "",
}: {
  user: User;
  projects: Project[];
  onSaved: () => void;
  initialProjectId?: string;
}) {
  const [form, setForm] = useState(EMPTY);
  const [primaryProjectId, setPrimaryProjectId] = useState(initialProjectId);
  const [relatedProjectIds, setRelatedProjectIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [updateProjectMemory, setUpdateProjectMemory] = useState(true);
  const [createTasks, setCreateTasks] = useState(false);

  const relatedOptions = useMemo(
    () => projects.filter(p => p.id !== primaryProjectId),
    [projects, primaryProjectId]
  );

  function toggleRelated(id: string) {
    setRelatedProjectIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function analyze() {
    if (!form.raw_capture.trim()) {
      setMessage("Paste conversation text, your notes, or a concise session recap first.");
      return;
    }
    setWorking(true);
    setMessage("Analyzing the session…");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ raw: form.raw_capture, title: form.title, sourceType: form.source_type }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Analysis failed.");
    } else {
      setForm(current => ({ ...current, ...result }));
      setMessage("Draft memory extracted. Review and edit it before saving.");
    }
    setWorking(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryProjectId) return setMessage("Choose a primary project.");
    setWorking(true);
    setMessage("Saving to project memory…");

    try {
      const { data: session, error } = await supabase.from("project_sessions").insert({
        user_id: user.id,
        project_id: primaryProjectId,
        title: form.title,
        chat_url: form.chat_url || null,
        source_type: form.source_type,
        session_type: form.session_type,
        raw_capture: form.raw_capture || null,
        summary: form.summary || null,
        decisions: form.decisions || null,
        evidence: form.evidence || null,
        open_questions: form.open_questions || null,
        next_actions: form.next_actions || null,
        keywords: form.keywords || null,
        ai_generated: Boolean(form.raw_capture && (form.summary || form.decisions || form.keywords)),
      }).select("id").single();
      if (error) throw error;

      const links = [...new Set([primaryProjectId, ...relatedProjectIds])].map(projectId => ({
        user_id: user.id, session_id: session.id, project_id: projectId,
      }));
      const { error: linkError } = await supabase.from("session_projects").insert(links);
      if (linkError) throw linkError;

      if (updateProjectMemory) {
        const updates: Record<string, string> = {};
        if (form.decisions) updates.last_decision = form.decisions;
        if (form.open_questions) updates.open_questions = form.open_questions;
        if (form.next_actions) updates.next_action = form.next_actions.split(";")[0].trim();
        if (Object.keys(updates).length) {
          const { error: updateError } = await supabase.from("projects").update(updates).eq("id", primaryProjectId);
          if (updateError) throw updateError;
        }
      }

      if (createTasks && form.next_actions) {
        const tasks = form.next_actions.split(";").map(x => x.trim()).filter(Boolean).slice(0, 8).map(title => ({
          user_id: user.id, project_id: primaryProjectId, title, priority: "Medium", workflow_state: "Next",
        }));
        if (tasks.length) {
          const { error: taskError } = await supabase.from("tasks").insert(tasks);
          if (taskError) throw taskError;
        }
      }

      setForm(EMPTY);
      setPrimaryProjectId(initialProjectId);
      setRelatedProjectIds([]);
      setMessage("Session saved. You can safely close the source tab.");
      onSaved();
    } catch (error: any) {
      setMessage(error?.message || "Could not save the session.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="panel knowledge-capture">
      <div className="head">
        <div>
          <p className="eyebrow">Nothing valuable should be lost twice</p>
          <h2>Knowledge Capture</h2>
          <p className="muted">Save a ChatGPT conversation, meeting, analysis, or work session to one or more projects.</p>
        </div>
      </div>

      <form onSubmit={save} className="capture-form">
        <div className="capture-grid">
          <label>Session title
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} required placeholder="e.g., Original AI4SP Digital Twin prototype" />
          </label>
          <label>Source URL
            <input type="url" value={form.chat_url} onChange={e => setForm({...form, chat_url:e.target.value})} placeholder="Paste the ChatGPT conversation URL" />
          </label>
          <label>Primary project
            <select value={primaryProjectId} onChange={e => setPrimaryProjectId(e.target.value)} required>
              <option value="">Choose project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Session type
            <select value={form.session_type} onChange={e => setForm({...form, session_type:e.target.value})}>
              <option>Research</option><option>Manuscript</option><option>Grant</option>
              <option>Analysis</option><option>Software</option><option>Presentation</option>
              <option>Meeting</option><option>Decision</option>
            </select>
          </label>
        </div>

        <label>Also link to related projects
          <div className="project-checks">
            {relatedOptions.map(p => <label className="check-chip" key={p.id}>
              <input type="checkbox" checked={relatedProjectIds.includes(p.id)} onChange={() => toggleRelated(p.id)} />
              {p.name}
            </label>)}
          </div>
        </label>

        <label>Paste session text or your rough notes
          <textarea rows={7} value={form.raw_capture} onChange={e => setForm({...form, raw_capture:e.target.value})}
            placeholder="Paste the important part of the conversation, or write a rough recap. The AI cannot read the private ChatGPT URL itself." />
        </label>

        <div className="capture-actions">
          <button type="button" className="secondary-action" disabled={working} onClick={analyze}>
            {working ? "Working…" : "Extract memory with AI"}
          </button>
          <span className="muted">AI is optional. All extracted fields remain editable.</span>
        </div>

        <div className="capture-grid">
          <label className="wide-field">Summary
            <textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary:e.target.value})} />
          </label>
          <label>Decisions
            <textarea rows={4} value={form.decisions} onChange={e => setForm({...form, decisions:e.target.value})} />
          </label>
          <label>Evidence or files produced
            <textarea rows={4} value={form.evidence} onChange={e => setForm({...form, evidence:e.target.value})} />
          </label>
          <label>Open questions
            <textarea rows={4} value={form.open_questions} onChange={e => setForm({...form, open_questions:e.target.value})} />
          </label>
          <label>Next actions
            <textarea rows={4} value={form.next_actions} onChange={e => setForm({...form, next_actions:e.target.value})} />
          </label>
          <label className="wide-field">Keywords
            <input value={form.keywords} onChange={e => setForm({...form, keywords:e.target.value})} placeholder="GDD; yield prediction; harvest readiness; skinning risk" />
          </label>
        </div>

        <div className="capture-options">
          <label><input type="checkbox" checked={updateProjectMemory} onChange={e => setUpdateProjectMemory(e.target.checked)} /> Update the primary project's latest decision, questions, and next action</label>
          <label><input type="checkbox" checked={createTasks} onChange={e => setCreateTasks(e.target.checked)} /> Create tasks from semicolon-separated next actions</label>
        </div>

        <button type="submit" disabled={working}>Save session to VROS</button>
        {message && <p className="notice">{message}</p>}
      </form>
    </section>
  );
}
