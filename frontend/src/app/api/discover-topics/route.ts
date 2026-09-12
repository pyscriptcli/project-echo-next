import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || process.env.DEEPSEEK_API_KEY || "";
  if (!apiKey) return NextResponse.json({ error: "AI configuration is required." }, { status: 401 });
  try {
    const { transcript, existingTopics, query } = await req.json();
    if (!transcript?.trim()) return NextResponse.json({ topics: [] });
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", response_format: { type: "json_object" }, messages: [
        { role: "system", content: "Find meeting topics that may be missing from the current minutes. Return JSON only: {\"topics\":[{\"topic\":string,\"quote\":string,\"confidence\":\"High\"|\"Medium\"|\"Low\"}]}" },
        { role: "user", content: `Requested focus: ${query || "all important topics"}\nAlready captured: ${(existingTopics || []).join(", ") || "none"}\nTranscript:\n${transcript}` },
      ] }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Topic discovery failed");
    const parsed = JSON.parse(String(data.choices?.[0]?.message?.content || "{}"));
    return NextResponse.json({ topics: Array.isArray(parsed.topics) ? parsed.topics : [] });
  } catch (error) {
    console.error("[Topics] discovery failed", error);
    return NextResponse.json({ error: "Unable to discover more topics right now." }, { status: 502 });
  }
}
