import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runDeterministicAgent } from "@/lib/agentLogic";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await request.json();
  const agentType = String(body.agentType || "coordinator");
  const userId = auth.user.id;

  const { data: run, error: runError } = await supabase.from("agent_runs").insert({
    user_id: userId,
    agent_type: agentType,
    status: "running",
  }).select("id").single();
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

  try {
    const [p,t,m,g,s,settingsResult] = await Promise.all([
      supabase.from("projects").select("*"),
      supabase.from("tasks").select("*,projects(name)"),
      supabase.from("manuscripts").select("*"),
      supabase.from("grants").select("*"),
      supabase.from("project_sessions").select("*"),
      supabase.from("agent_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const settings = settingsResult.data || {
      user_id: userId,
      stale_project_days: 30,
      deadline_window_days: 21,
      autonomy_mode: "advisory",
      daily_brief_enabled: false,
    };

    if (!settingsResult.data) {
      await supabase.from("agent_settings").insert(settings);
    }

    const recommendations = runDeterministicAgent(agentType, {
      projects: p.data || [], tasks: t.data || [], manuscripts: m.data || [],
      grants: g.data || [], sessions: s.data || [], settings,
    });

    if (recommendations.length) {
      const { error } = await supabase.from("agent_recommendations").insert(
        recommendations.map(r => ({
          ...r,
          user_id: userId,
          agent_run_id: run.id,
          agent_type: agentType,
        }))
      );
      if (error) throw error;
    }

    await supabase.from("agent_runs").update({
      status: "completed",
      summary: `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} generated.`,
      details: { count: recommendations.length },
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return NextResponse.json({ count: recommendations.length });
  } catch (error:any) {
    await supabase.from("agent_runs").update({
      status: "failed",
      summary: error?.message || "Agent failed.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return NextResponse.json({ error: error?.message || "Agent failed." }, { status: 500 });
  }
}
