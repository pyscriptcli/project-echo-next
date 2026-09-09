import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  clearAuthCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  clearAuthCookies(res);
  return res;
}
