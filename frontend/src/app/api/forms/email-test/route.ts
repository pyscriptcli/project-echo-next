import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { sendRequestorStatusNotification } from "@/lib/forms/email";

const OWNER_EMAIL = "dave.policarpio@primephilippines.com";

export async function POST(req: NextRequest) {
  try {
    if (!getTokenFromRequest(req)) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
    const user = getUserFromRequest(req);
    const email = String(user?.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ success: false, message: "Your login email is unavailable" }, { status: 400 });
    // Resend's onboarding sender can only deliver to the Resend account email.
    // Keep this test-only recipient separate from the logged-in ClickUp user.
    const recipient = String(process.env.RESEND_TEST_RECIPIENT || email).toLowerCase().trim();
    const body = await req.json().catch(() => ({}));
    const department = String(body.department || "Finance");
    const formType = String(body.formType || "rfp");
    const event = body.event || "submitted";

    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
    let isAdmin = email === OWNER_EMAIL;
    if (!isAdmin && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
      isAdmin = Boolean(data?.config?.admins?.some((admin: any) => admin.active !== false && String(admin.email).toLowerCase().trim() === email));
    }
    if (!isAdmin) return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });

    const host = req.headers.get("host") || "localhost:3000";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")}://${host}`;
    const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    const result = await sendRequestorStatusNotification({
      recipient,
      event,
      department,
      formType,
      values: {
        requestor_first_name: user?.username?.split(" ")[0] || "Admin",
        form_name: "Echo Forms Email Test",
        form_id: "EMAIL-TEST",
        department,
        status_label: event === "approved" ? "Approved" : event === "revision_requested" ? "Revision Requested" : "Submitted",
        request_title: "Resend configuration test",
        amount: "",
        purpose: "This is a test notification from Echo Forms.",
        submitted_at: now,
        status_updated_at: now,
        completed_stage: "",
        approver_name: user?.username || "Echo Forms Admin",
        completed_at: now,
        current_stage: "Email delivery test",
        current_stage_started_at: now,
        status_message: "If you received this message, Resend is configured correctly.",
        next_step_message: "",
        track_status_url: `${appUrl}/?view=forms&tab=track`,
      },
    });
    return NextResponse.json({ ...result, recipient });
  } catch (error: any) {
    console.error("[Email Test] Failed:", error);
    return NextResponse.json({ success: false, message: error.message || "Unable to send test email" }, { status: 500 });
  }
}
