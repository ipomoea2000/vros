"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AskVROS({ context }: { context: unknown }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [working, setWorking] = useState(false);

  const prompts = [
    "Where did I leave the digital twin project?",
    "What are my highest-priority next actions?",
    "Which projects and proposals use the native periderm work?",
    "What manuscripts are closest to completion?",
  ];

  async function ask(text = question) {
    if (!text.trim()) return;
    setQuestion(text);
    setWorking(true);
    setAnswer("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: text, context }),
    });
    const result = await response.json();
    setAnswer(result.answer || result.error || "No response.");
    setWorking(false);
  }

  return (
    <section className="panel ai-panel">
      <div>
        <p className="eyebrow">Portfolio intelligence</p>
        <h2>Ask VROS</h2>
        <p className="muted">Ask where a project stopped, what is next, or how projects and proposals are connected.</p>
      </div>
      <div className="prompt-chips">
        {prompts.map(prompt => <button className="chip" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}
      </div>
      <div className="ask-row">
        <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question about your portfolio…" rows={3} />
        <button disabled={working} onClick={() => ask()}>{working ? "Thinking…" : "Ask"}</button>
      </div>
      {answer && <div className="ai-answer">{answer}</div>}
    </section>
  );
}
