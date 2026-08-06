"use client";

import { useMemo, useState } from "react";

export default function ConversationLibrary({ sessions }: { sessions: any[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");

  const types = useMemo(() => ["All", ...Array.from(new Set(sessions.map(s => s.session_type || "Research")))], [sessions]);
  const filtered = sessions.filter(s => {
    const matchesType = type === "All" || (s.session_type || "Research") === type;
    const haystack = [s.title,s.summary,s.decisions,s.next_actions,s.keywords,s.project?.name].join(" ").toLowerCase();
    return matchesType && haystack.includes(query.toLowerCase());
  });

  return (
    <section className="panel conversation-library">
      <div className="head">
        <div><p className="eyebrow">Research continuity</p><h2>Conversation Library</h2></div>
        <span className="badge">{sessions.length} saved</span>
      </div>
      <div className="library-tools">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations, decisions, or keywords…" />
        <select value={type} onChange={e => setType(e.target.value)}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="library-list">
        {filtered.map(s => <article className="library-item" key={s.id}>
          <div className="library-meta">
            <span className="badge">{s.session_type || "Research"}</span>
            <span>{s.session_date}</span>
            {s.project?.name && <span>{s.project.name}</span>}
          </div>
          <h3>{s.title}</h3>
          {s.summary && <p>{s.summary}</p>}
          {s.decisions && <p><b>Decision:</b> {s.decisions}</p>}
          {s.next_actions && <p><b>Next:</b> {s.next_actions}</p>}
          {s.keywords && <p className="keywords">{s.keywords}</p>}
          {s.chat_url && <a href={s.chat_url} target="_blank" rel="noreferrer">Open original conversation ↗</a>}
        </article>)}
        {!filtered.length && <p className="muted">No saved sessions match this search.</p>}
      </div>
    </section>
  );
}
