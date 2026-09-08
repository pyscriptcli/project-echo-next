import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const headerKey = req.headers.get("x-api-key") || req.headers.get("x-deepseek-api-key");
    const apiKey = headerKey || process.env.DEEPSEEK_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API Key is required. Please configure your key in settings." }, { status: 401 });
    }

    const { transcript, user_topics, notes, instruction } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: "Source content cannot be empty." }, { status: 400 });
    }

    const systemPrompt = `You are an elite corporate meeting intelligence engine.
Generate highly professional, structured Minutes of the Meeting (MoM) in strict valid JSON format.
Extract all key discussion points, evidence quotes, action items, target delivery dates, and responsible owners.

Output strict JSON only, matching this schema:
{
  "matched_items": [
    {
      "topic_title": "Clear concise topic title",
      "discussion_point": "Detailed explanation of discussions, conclusions, and arguments",
      "evidence_quote": "Direct quote from source text or transcript e.g. [00:00] ...",
      "action_plan": "Actionable next step, or 'None'",
      "indicative_delivery_date": "Target delivery date or 'TBD'",
      "person_in_charge": "Full name of owner, or 'Unassigned'",
      "confidence": "High"
    }
  ],
  "recommended_missed_points": [
    {
      "topic": "Important topic not yet captured",
      "quote": "Context quote"
    }
  ],
  "other_discussions": "Comprehensive summary of announcements, non-action items, peripheral topics, and general context."
}`;

    const userContent = `
${instruction ? `Special Instruction: ${instruction}\n` : ""}
Topics of Interest:
${user_topics || "General Meeting Agenda"}

Additional Meeting Notes:
${notes || "None"}

Source Content:
${transcript}`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `AI error (${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let cleanedJson = content.trim();
    if (cleanedJson.includes("```json")) {
      cleanedJson = cleanedJson.split("```json")[1].split("```")[0].trim();
    } else if (cleanedJson.includes("```")) {
      cleanedJson = cleanedJson.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(cleanedJson);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error generating minutes:", error);
    const msg = error?.message || String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}