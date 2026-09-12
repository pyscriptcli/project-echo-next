import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const COOKIE_TOKEN_NAME = "echo_clickup_token";
export const COOKIE_USER_NAME = "echo_user_profile";

export interface ClickUpUserProfile {
  id: number | string;
  username: string;
  email: string;
  color?: string;
  profilePicture?: string | null;
  initials?: string;
  workspaceName?: string;
}

export interface AuthSession {
  authenticated: boolean;
  token?: string;
  user?: ClickUpUserProfile | null;
}

export function cleanEnv(val?: string): string {
  if (!val) return "";
  let v = val.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function getOAuthCredentials() {
  const clientId = cleanEnv(
    process.env.CLICKUP_CLIENT_ID ||
    process.env.CLICKUP_CLIENTID ||
    process.env.CLICKUP_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CLICKUP_CLIENT_ID ||
    process.env.CLIENT_ID
  );

  const clientSecret = cleanEnv(
    process.env.CLICKUP_CLIENT_SECRET ||
    process.env.CLICKUP_CLIENTSECRET ||
    process.env.CLICKUP_OAUTH_CLIENT_SECRET ||
    process.env.CLIENT_SECRET
  );

  const redirectUri = cleanEnv(
    process.env.CLICKUP_REDIRECT_URI ||
    process.env.CLICKUP_REDIRECT_URL
  );

  return { clientId, clientSecret, redirectUri };
}

export function getWorkspaceApiToken(): string {
  // 1. Direct standard checks
  const candidates = [
    process.env.CLICKUP_API_TOKEN,
    process.env.CLICKUP_TOKEN,
    process.env.CLICKUP_API_KEY,
    process.env.CLICKUP_KEY,
    process.env.CLICK_UP_API_TOKEN,
    process.env.CLICK_UP_TOKEN,
    process.env.CLICK_UP_API_KEY,
    process.env.NEXT_PUBLIC_CLICKUP_API_TOKEN,
    process.env.NEXT_PUBLIC_CLICKUP_TOKEN,
  ];

  for (const c of candidates) {
    if (c && cleanEnv(c)) return cleanEnv(c);
  }

  // 2. Any env var that starts with "pk_" (ClickUp's unique token prefix)
  for (const val of Object.values(process.env)) {
    if (typeof val === "string" && cleanEnv(val).startsWith("pk_")) {
      return cleanEnv(val);
    }
  }

  // 3. Any env var with CLICKUP and TOKEN/KEY in name
  for (const [k, val] of Object.entries(process.env)) {
    const u = k.toUpperCase();
    if (
      u.includes("CLICKUP") &&
      (u.includes("TOKEN") || u.includes("KEY") || u.includes("SECRET") || u.includes("API"))
    ) {
      if (val && cleanEnv(val)) return cleanEnv(val);
    }
  }

  return "";
}

export async function isAllowedClickUpSignIn(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = normalizedEmail.split("@").pop() || "";
  if (!normalizedEmail.includes("@") || !emailDomain) return false;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
  let domains = ["primephilippines.com"];
  if (url && key) {
    try {
      const { data } = await createClient(url, key).from("echo_forms_config").select("config").eq("id", "global").maybeSingle();
      if (Array.isArray(data?.config?.allowedSignInDomains) && data.config.allowedSignInDomains.length > 0) domains = data.config.allowedSignInDomains;
    } catch (error) {
      console.error("[ClickUp Auth] Could not read sign-in domain policy:", error);
    }
  }
  return domains.some((domain: unknown) => {
    const normalizedDomain = String(domain).trim().toLowerCase().replace(/^@/, "");
    return normalizedDomain && (emailDomain === normalizedDomain || emailDomain.endsWith(`.${normalizedDomain}`));
  });
}

/**
 * Read the ClickUp token from cookies (synchronously from NextRequest or async via next/headers)
 */
export function getTokenFromRequest(req: NextRequest): string {
  return req.cookies.get(COOKIE_TOKEN_NAME)?.value || "";
}

/**
 * Read the cached ClickUp user profile from NextRequest cookies
 */
export function getUserFromRequest(req: NextRequest): ClickUpUserProfile | null {
  const userCookie = req.cookies.get(COOKIE_USER_NAME)?.value;
  if (!userCookie) return null;
  try {
    return JSON.parse(userCookie) as ClickUpUserProfile;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to get current session from next/headers
 */
export async function getServerSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_TOKEN_NAME)?.value;
  if (!token) {
    return { authenticated: false, user: null };
  }

  const userCookie = cookieStore.get(COOKIE_USER_NAME)?.value;
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie) as ClickUpUserProfile;
      return { authenticated: true, token, user };
    } catch {
      // ignore parse error, fallback to token-only
    }
  }

  return { authenticated: true, token, user: null };
}

/**
 * Set session cookies on a NextResponse
 */
export function setAuthCookies(
  res: NextResponse,
  token: string,
  user?: ClickUpUserProfile
) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  res.cookies.set({
    name: COOKIE_TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (user) {
    res.cookies.set({
      name: COOKIE_USER_NAME,
      value: JSON.stringify(user),
      httpOnly: false, // readable by client-side if needed
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }
}

/**
 * Clear session cookies on a NextResponse
 */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_TOKEN_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.cookies.set({
    name: COOKIE_USER_NAME,
    value: "",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
