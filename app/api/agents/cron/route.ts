import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runDeterministicAgent } from "@/lib/agentLogic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Scheduled agents require SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: settingsRows, error } = await admin
    .from("agent_settings").select("*").eq("daily_brief_enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let usersProcessed = 0;
  let recommendationsCreated = 0;

  for (const settings of settingsRows || []) {
    const userId = settings.user_id;
    const [p,t,m,g,s] = await Promise.all([
      admin.from("projects").select("*").eq("user_id", userId),
      admin.from("tasks").select("*,projects(name)").eq("user_id", userId),
      admin.from("manuscripts").select("*").eq("user_id", userId),
      admin.from("grants").select("*").eq("user_id", userId),
      admin.from("project_sessions").select("*").eq("user_id", userId),
    ]);

    const recommendations = runDeterministicAgent("all", {
      projects:p.data||[], tasks:t.data||[], manuscripts:m.data||[],
      grants:g.data||[], sessions:s.data||[], settings,
    });

    const { data: run } = await admin.from("agent_runs").insert({
      user_id:userId, agent_type:"scheduled_daily_brief", status:"completed",
      summary:`${recommendations.length} advisory recommendations generated.`,
      details:{count:recommendations.length}, completed_at:new Date().toISOString(),
    }).select("id").single();

    if (recommendations.length) {
      await admin.from("agent_recommendations").insert(recommendations.map(r => ({
        ...r, user_id:userId, agent_run_id:run?.id || null, agent_type:"scheduled_daily_brief",
      })));
    }
    usersProcessed += 1;
    recommendationsCreated += recommendations.length;
  }

  return NextResponse.json({ usersProcessed, recommendationsCreated });
}
