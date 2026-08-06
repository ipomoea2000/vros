export type AgentRecord = {
  project_id?: string | null;
  title: string;
  rationale: string;
  priority: "High" | "Medium" | "Low";
  proposed_action: Record<string, unknown>;
};

type Portfolio = {
  projects: any[];
  tasks: any[];
  manuscripts: any[];
  grants: any[];
  sessions: any[];
  settings: {
    stale_project_days?: number;
    deadline_window_days?: number;
  };
};

const DAY = 86_400_000;

function ageDays(value?: string | null) {
  if (!value) return 9999;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY));
}

function daysUntil(value?: string | null) {
  if (!value) return 9999;
  return Math.ceil((new Date(`${value}T12:00:00`).getTime() - Date.now()) / DAY);
}

export function runDeterministicAgent(agentType: string, data: Portfolio): AgentRecord[] {
  const staleDays = data.settings.stale_project_days || 30;
  const deadlineWindow = data.settings.deadline_window_days || 21;
  const recs: AgentRecord[] = [];

  if (agentType === "stale_projects" || agentType === "all") {
    for (const p of data.projects.filter(p => ["Active","Planning","Waiting"].includes(p.status))) {
      const age = ageDays(p.updated_at);
      if (age >= staleDays) {
        recs.push({
          project_id: p.id,
          title: `Resume or consciously pause ${p.name}`,
          rationale: `No project update has been recorded for ${age} days.`,
          priority: age >= staleDays * 2 ? "High" : "Medium",
          proposed_action: {
            type: "create_task",
            title: `Review status and next action for ${p.name}`,
            project_id: p.id,
            priority: age >= staleDays * 2 ? "High" : "Medium",
          },
        });
      }
    }
  }

  if (agentType === "deadline_watch" || agentType === "all") {
    for (const t of data.tasks.filter(t => !t.completed && t.due_date)) {
      const d = daysUntil(t.due_date);
      if (d < 0) {
        recs.push({
          project_id: t.project_id,
          title: `Overdue: ${t.title}`,
          rationale: `This task was due ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago.`,
          priority: "High",
          proposed_action: { type: "none" },
        });
      } else if (d <= deadlineWindow) {
        recs.push({
          project_id: t.project_id,
          title: `Upcoming task: ${t.title}`,
          rationale: `Due in ${d} day${d === 1 ? "" : "s"}.`,
          priority: d <= 7 ? "High" : "Medium",
          proposed_action: { type: "none" },
        });
      }
    }
    for (const g of data.grants.filter(g => g.deadline && !["Submitted","Awarded","Not funded"].includes(g.status))) {
      const d = daysUntil(g.deadline);
      if (d <= deadlineWindow) {
        recs.push({
          project_id: g.project_id,
          title: `Grant deadline approaching: ${g.title}`,
          rationale: d < 0 ? `Deadline passed ${Math.abs(d)} days ago; update its status.`
            : `Deadline is in ${d} day${d === 1 ? "" : "s"}.`,
          priority: d <= 10 ? "High" : "Medium",
          proposed_action: {
            type: "create_task",
            title: g.next_action || `Review and advance ${g.title}`,
            project_id: g.project_id,
            priority: d <= 10 ? "High" : "Medium",
          },
        });
      }
    }
  }

  if (agentType === "memory_auditor" || agentType === "all") {
    const sessionCounts = new Map<string, number>();
    for (const s of data.sessions) {
      if (s.project_id) sessionCounts.set(s.project_id, (sessionCounts.get(s.project_id) || 0) + 1);
    }
    for (const p of data.projects.filter(p => p.status === "Active")) {
      if (!p.next_action?.trim()) {
        recs.push({
          project_id: p.id,
          title: `Define the next action for ${p.name}`,
          rationale: "The project is active but has no immediate next action.",
          priority: "High",
          proposed_action: {
            type: "update_project_next_action",
            project_id: p.id,
            value: "Review the project workspace and define one concrete next action.",
          },
        });
      }
      if (!p.last_decision?.trim() && !(sessionCounts.get(p.id) || 0)) {
        recs.push({
          project_id: p.id,
          title: `Capture project memory for ${p.name}`,
          rationale: "No saved session or latest decision is available, making the project harder to resume.",
          priority: "Medium",
          proposed_action: {
            type: "create_task",
            title: `Capture the latest conversation or decision for ${p.name}`,
            project_id: p.id,
            priority: "Medium",
          },
        });
      }
    }
  }

  if (agentType === "manuscript_readiness" || agentType === "all") {
    for (const m of data.manuscripts.filter(m => !["Published","Submitted"].includes(m.status))) {
      if (!m.next_action?.trim()) {
        recs.push({
          project_id: m.project_id,
          title: `Set a next action for manuscript: ${m.title}`,
          rationale: `The manuscript is marked ${m.status} but has no next action.`,
          priority: m.status === "Revision" ? "High" : "Medium",
          proposed_action: {
            type: "create_task",
            title: `Define the next manuscript step for ${m.title}`,
            project_id: m.project_id,
            priority: m.status === "Revision" ? "High" : "Medium",
          },
        });
      }
      if (!m.project_id) {
        recs.push({
          project_id: null,
          title: `Assign manuscript to a project: ${m.title}`,
          rationale: "Unlinked manuscripts are difficult to retrieve through project memory.",
          priority: "Low",
          proposed_action: { type: "none" },
        });
      }
    }
  }

  if (agentType === "coordinator" || agentType === "all") {
    const open = data.tasks.filter(t => !t.completed);
    const ranked = [...open].sort((a,b) => {
      const score = (t:any) =>
        (t.workflow_state === "This Week" ? 0 : t.priority === "High" ? 1 : t.workflow_state === "Next" ? 2 : 3);
      return score(a) - score(b);
    }).slice(0, 3);
    for (const t of ranked) {
      recs.push({
        project_id: t.project_id,
        title: `Recommended focus: ${t.title}`,
        rationale: `${t.projects?.name || "Unassigned"} · ${t.workflow_state || t.priority || "Next"}.`,
        priority: t.priority === "High" ? "High" : "Medium",
        proposed_action: { type: "none" },
      });
    }
  }

  const seen = new Set<string>();
  return recs.filter(r => {
    const key = `${r.project_id || "none"}|${r.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}
