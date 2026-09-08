import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const headerKey = req.headers.get("x-api-key") || req.headers.get("x-deepseek-api-key");
    const apiKey = headerKey || process.env.DEEPSEEK_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API Key is required. Please configure your key in settings." }, { status: 401 });
    }

    const { items, prompt, action_type, transcript } = await req.json();

    let instruction = prompt || "";
    if (action_type === "actions") {
      instruction = "Examine every item where action_plan is 'None' or empty, and generate a concrete real estate operational next step. Keep existing good action plans.";
    } else if (action_type === "wording") {
      instruction = "Tighten and polish the discussion points and topic titles to sound like executive corporate summaries for board-level minutes.";
    } else if (action_type === "responsibility") {
      instruction = "Review every item where person_in_charge is 'Unassigned' and suggest logical owners or roles based on context.";
    }

    const systemPrompt = `You are Echo, the intelligent executive meeting assistant and corporate minutes editor.
You have access to:
1. The full meeting transcript.
2. The current structured minutes draft items.

Your capabilities:
1. CONVERSATIONAL Q&A: If the user asks a question about what happened in the meeting (e.g. "What did Dave say?", "Summarize the marketing content discussion", "Who agreed to the deadline?", "Were there any concerns?"), provide an eloquent, insightful, conversational answer based directly on the meeting transcript. For conversational Q&A where no edits to the draft were requested, set "updated_items" to null.
2. MINUTES EDITING: If the user explicitly asks to edit, add, tighten, rephrase, or reassign action items/topics in the minutes draft, update the items and return the complete updated array in "updated_items".

Return strict JSON:
{
  "feedback_message": "Your conversational answer to the user's question, or a brief 1-sentence description of edits made to the minutes",
  "updated_items": [ ... updated array of items if draft edits were requested, or null if this is a Q&A / conversation ... ]
}`;

    const userContent = `User Message / Inquiry:
${instruction}

Meeting Transcript:
${transcript || "No transcript provided; rely on existing draft items."}

Current Minutes Draft Items:
${JSON.stringify(items || [], null, 2)}`;

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
      const err = await response.json();
      throw new Error(err.error?.message || "AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    let cleaned = content.trim();
    if (cleaned.includes("```json")) {
      cleaned = cleaned.split("```json")[1].split("```")[0].trim();
    } else if (cleaned.includes("```")) {
      cleaned = cleaned.split("```")[1].split("```")[0].trim();
    }

    return NextResponse.json(JSON.parse(cleaned));
  } catch (error: any) {
    console.error("Error in ask-echo:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
