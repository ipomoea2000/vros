import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function extractJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last < 0) throw new Error("AI did not return structured JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

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
      return NextResponse.json({ error: "Knowledge Capture AI is not configured. Add OPENAI_API_KEY in Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const raw = String(body.raw || "").slice(0, 60000);
    const title = String(body.title || "").slice(0, 500);
    const sourceType = String(body.sourceType || "ChatGPT session").slice(0, 100);

    if (!raw.trim()) return NextResponse.json({ error: "Paste notes or conversation text to analyze." }, { status: 400 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      store: false,
      instructions:
        "You are VROS Knowledge Capture. Convert the supplied research-session text into a concise, factual project-memory record. " +
        "Do not infer facts not present in the text. Return JSON only, with exactly these string fields: " +
        "summary, decisions, evidence, open_questions, next_actions, keywords. " +
        "Use semicolon-separated phrases for decisions, evidence, open_questions, next_actions, and keywords. " +
        "Summary should be a compact paragraph. If a field is unsupported, return an empty string.",
      input: `SESSION TITLE: ${title}\nSOURCE TYPE: ${sourceType}\n\nCAPTURE TEXT:\n${raw}`,
    });

    const parsed = extractJson(response.output_text);
    return NextResponse.json({
      summary: String(parsed.summary || ""),
      decisions: String(parsed.decisions || ""),
      evidence: String(parsed.evidence || ""),
      open_questions: String(parsed.open_questions || ""),
      next_actions: String(parsed.next_actions || ""),
      keywords: String(parsed.keywords || ""),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Knowledge Capture failed." }, { status: 500 });
  }
}
