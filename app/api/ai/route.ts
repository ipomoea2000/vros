import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Ask VROS is not configured yet. Add OPENAI_API_KEY in Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const question = String(body.question || "").slice(0, 3000);
    const context = JSON.stringify(body.context || {}).slice(0, 100000);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      store: false,
      instructions:
        "You are the AI layer inside VROS, Arthur Villordon's research operating system. " +
        "Answer only from the supplied VROS portfolio context. Clearly state when the records do not support an answer. " +
        "Prioritize project resumption: summarize purpose, current status, last known decision, linked work, unresolved issues, and the next concrete action. " +
        "Be concise, practical, and never invent files, deadlines, results, collaborators, or decisions.",
      input: `VROS PORTFOLIO CONTEXT:\n${context}\n\nUSER QUESTION:\n${question}`,
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "AI request failed." }, { status: 500 });
  }
}
