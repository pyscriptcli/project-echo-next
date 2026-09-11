import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { demands = [], dateStart = "", dateEnd = "", assetClass = "all" } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY || req.headers.get("x-openai-api-key") || "";
    if (!apiKey) return NextResponse.json({ error: "AI reporting is not configured. Add an OpenAI API key in Echo settings." }, { status: 503 });
    const prompt = `Write a concise executive demand report for ${assetClass} records from ${dateStart || "all time"} to ${dateEnd || "present"}. Use only the supplied JSON. Include: 1) headline, 2) two evidence-based patterns, 3) location/timeline implications, 4) one watch item. Do not invent facts. Keep it under 220 words.\n\n${JSON.stringify(demands)}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: "You are the CRD demand intelligence analyst." }, { role: "user", content: prompt }] }) });
    const body = await response.json();
    if (!response.ok) return NextResponse.json({ error: body?.error?.message || "AI report generation failed." }, { status: 502 });
    return NextResponse.json({ report: body.choices?.[0]?.message?.content || "No report was returned." });
  } catch { return NextResponse.json({ error: "Unable to generate the report." }, { status: 500 }); }
}
