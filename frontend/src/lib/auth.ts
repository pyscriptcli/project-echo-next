import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const COOKIE_TOKEN_NAME = "echo_clickup_token";
export const COOKIE_USER_NAME = "echo_user_profile";

export interface ClickUpUserProfile {
  id: number | string;
  username: string;
  email: string;
  color?: string;
  profilePicture?: string | null;
  initials?: string;
}

export interface AuthSession {
  authenticated: boolean;
  token?: string;
  user?: ClickUpUserProfile | null;
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
