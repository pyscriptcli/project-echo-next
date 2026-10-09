"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { MosaicBrand } from "@/components/MosaicBrand";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isTokenSubmitting, setIsTokenSubmitting] = useState(false);
  const [isTokenFormOpen, setIsTokenFormOpen] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("auth_error");
    if (!error) return;

    const messages: Record<string, string> = {
      missing_client_id: "ClickUp sign in is not configured yet. Please contact your administrator.",
      missing_credentials: "ClickUp sign in is not configured yet. Please contact your administrator.",
      token_exchange_failed: "ClickUp could not complete sign in. Please try again.",
      access_denied: "Sign in was cancelled. You can try again whenever you’re ready.",
      company_email_required: "Use your authorized work account to sign in.",
      no_access_token: "ClickUp did not return an access token. Please try again.",
    };
    setErrorMessage(messages[error] || "Sign in could not be completed. Please try again.");
  }, []);

  const handleOAuthClick = () => {
    setErrorMessage(null);
    setIsRedirecting(true);
    window.location.href = "/api/auth/login";
  };

  const handleTokenSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = apiToken.trim();
    if (!token) {
      setErrorMessage("Enter your ClickUp personal API token to continue.");
      return;
    }

    setErrorMessage(null);
    setIsTokenSubmitting(true);
    try {
      const response = await fetch("/api/auth/token-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ClickUp sign in failed. Check your token and try again.");
      }
      setApiToken("");
      onLoginSuccess?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign in could not be completed. Please try again.");
    } finally {
      setIsTokenSubmitting(false);
    }
  };

  const busy = isRedirecting || isTokenSubmitting;

  return (
    <main className="grid min-h-screen w-full select-none bg-[#FFFCFB] md:grid-cols-[minmax(340px,43%)_1fr]">
      <section className="flex min-h-[44svh] flex-col justify-between border-b-2 border-[#C9A84C] bg-[#003366] p-6 text-[#FFFCFB] sm:p-8 md:min-h-screen md:border-b-0 md:border-r-2 md:p-12 xl:p-[clamp(48px,5vw,72px)]">
        <MosaicBrand size="large" className="text-[#FFFCFB]" />

        <div className="my-auto max-w-[500px] py-12 md:py-16">
          <p className="mb-4 text-[9px] font-semibold uppercase leading-7 tracking-[0.26em] text-[#C9A84C]">
            Team workspace
          </p>
          <h1 className="max-w-[500px] font-serif text-[clamp(42px,5.6vw,68px)] font-light italic leading-[0.98] tracking-[-0.02em] text-[#FFFCFB]">
            Everything
            <br />
            in one place.
          </h1>
          <p className="mt-5 max-w-[430px] text-[13px] leading-7 text-[#FFFCFB]/80">
            Your team’s tools, together.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 text-[9px] tracking-[0.12em] text-[#FFFCFB]/75">
          <span>MOSAIC</span>
          <span className="text-[#C9A84C]">WORK, CONNECTED</span>
        </div>
      </section>

      <section aria-label="Sign in" className="flex min-h-[56svh] items-center justify-center px-6 py-12 sm:px-12 md:min-h-screen md:px-[clamp(48px,9vw,144px)] md:py-16">
        <div className="w-full max-w-[410px]">
          <p className="mb-3 text-[9px] font-semibold uppercase leading-7 tracking-[0.26em] text-[#003366]">
            Sign in
          </p>
          <h2 className="font-serif text-[38px] font-light italic leading-[1.05] text-[#003366]">
            Welcome.
          </h2>
          <p className="mb-7 mt-2 text-xs leading-6 text-[#181D1E]/75">
            Continue with ClickUp.
          </p>

          {errorMessage && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 border-l-2 border-red-600 bg-red-50 p-3 text-xs leading-5 text-red-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOAuthClick}
            disabled={busy}
            className="flex min-h-[54px] w-full items-center justify-between gap-4 border border-[#003366] bg-[#003366] px-[17px] text-left text-[#FFFCFB] transition-colors hover:border-[#C9A84C] hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex items-center gap-3 text-xs font-semibold">
              <span aria-hidden="true" className="grid h-[23px] w-[23px] shrink-0 place-items-center bg-[#FFFCFB]">
                <svg viewBox="0 0 100 100" fill="none" className="h-[18px] w-[18px]">
                  <path d="M20 54L34 42L50 56L66 42L80 54L50 28L20 54Z" fill="#003366" />
                  <path d="M20 66C30 76 70 76 80 66L88 74C72 88 28 88 12 74L20 66Z" fill="#C9A84C" />
                </svg>
              </span>
              {isRedirecting ? "Connecting your ClickUp account…" : "Continue with ClickUp"}
            </span>
            {isRedirecting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={17} />}
          </button>

          <div className="my-5 flex items-center gap-3 text-[9px] uppercase tracking-[0.12em] text-[#181D1E]/65">
            <span className="h-px flex-1 bg-[#003366]/20" />
            <span>or</span>
            <span className="h-px flex-1 bg-[#003366]/20" />
          </div>

          <button
            type="button"
            aria-expanded={isTokenFormOpen}
            onClick={() => setIsTokenFormOpen((open) => !open)}
            className="border-b border-[#C9A84C] pb-1 text-left text-[11px] font-semibold leading-6 text-[#003366] hover:text-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C9A84C]"
          >
            {isTokenFormOpen ? "Hide personal API token sign in" : "Connect with a personal API token"}
          </button>

          {isTokenFormOpen && (
            <form onSubmit={handleTokenSubmit} className="mt-4">
              <label htmlFor="clickup-token" className="mb-2 block text-[10px] font-semibold text-[#003366]">
                ClickUp personal API token
              </label>
              <input
                id="clickup-token"
                type="password"
                autoComplete="off"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                placeholder="Enter your personal token"
                disabled={busy}
                className="h-[45px] w-full border border-[#003366]/35 bg-[#FFFCFB] px-3 text-xs text-[#181D1E] outline-none placeholder:text-[#181D1E]/50 focus:border-[#003366] focus:ring-1 focus:ring-[#C9A84C] disabled:opacity-60"
              />
              <p className="mb-3 mt-2 text-[10px] leading-5 text-[#181D1E]/65">
                Your token is verified with ClickUp and kept in a secure session cookie.
              </p>
              <button
                type="submit"
                disabled={busy || !apiToken.trim()}
                className="min-h-[43px] border border-[#003366] bg-[#FFFCFB] px-4 text-[10px] font-semibold text-[#003366] transition-colors hover:bg-[#003366] hover:text-[#FFFCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTokenSubmitting ? <span className="inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Signing in…</span> : "Sign in with token"}
              </button>
            </form>
          )}

          <p className="mt-7 max-w-[360px] text-[9px] leading-[1.7] text-[#181D1E]/65">
            Your ClickUp account determines which workspace information you can access.
          </p>
        </div>
      </section>
    </main>
  );
}
