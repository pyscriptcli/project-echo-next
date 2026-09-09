"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, Lock, Key, CheckCircle, Loader2 } from "lucide-react";
import { getStoredClickUpToken } from "@/lib/api";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
  
  // Direct Token Input state
  const [tokenInput, setTokenInput] = useState("");
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);

  useEffect(() => {
    // 1. Check server environment configuration
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        const isConfigured = Boolean(data.hasClientId || data.hasApiToken);
        setServerConfigured(isConfigured);
        if (data.detectedClickUpEnvKeys) {
          setDetectedKeys(data.detectedClickUpEnvKeys);
        }

        // If server is now configured, clear any old lingering query errors in the address bar
        if (isConfigured && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("auth_error")) {
            window.history.replaceState({}, "", "/");
            setErrorMessage(null);
          }
        }
      })
      .catch(() => {
        setServerConfigured(false);
      });

    // 2. Read query params if any
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("auth_error");
      const detected = params.get("detected");
      if (error) {
        if (error === "missing_client_id" || error === "missing_credentials") {
          setErrorMessage(
            "ClickUp credentials were not found in your Vercel deployment variables."
          );
          setShowTokenForm(true);
        } else if (error === "token_exchange_failed") {
          setErrorMessage("Failed to authenticate with ClickUp. Please verify your OAuth settings or token.");
        } else if (error === "access_denied") {
          setErrorMessage("Access was denied in ClickUp authorization.");
        } else {
          setErrorMessage(`Authentication notice: ${error}`);
        }
      }

      // Check localStorage for previously stored token
      const stored = getStoredClickUpToken();
      if (stored && stored.startsWith("pk_")) {
        setTokenInput(stored);
      }
    }
  }, []);

  const handleLogin = () => {
    setIsRedirecting(true);
    window.location.href = "/api/auth/login";
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setTokenError("Please paste your ClickUp API Token.");
      return;
    }

    setIsSubmittingToken(true);
    setTokenError(null);

    try {
      const res = await fetch("/api/auth/token-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.location.href = "/";
        }
        return;
      } else {
        setTokenError(data.error || "Failed to verify token with ClickUp.");
      }
    } catch (err: any) {
      setTokenError(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmittingToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#1b1d1e] flex flex-col justify-between select-none">
      {/* Top minimal header */}
      <header className="h-16 px-8 border-b border-[#2c2f32]/10 flex items-center justify-between bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-serif italic text-2xl font-semibold tracking-wide text-[#1b1d1e]">
            Echo
          </span>
          <span className="w-1.5 h-1.5 bg-[#C9AB4C]"></span>
          <span className="text-[11px] uppercase tracking-widest text-[#003366] font-bold ml-2 pl-2 border-l border-gray-300">
            ClickUp Executive Portal
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Lock size={13} className="text-[#C9AB4C]" />
          <span>Secure Session</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#2c2f32]/15 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border-t-4 border-t-[#C9AB4C] p-8 md:p-10 relative">
          
          {/* Subtle gold watermark accent */}
          <div className="absolute top-4 right-4 text-[#C9AB4C]/20 pointer-events-none">
            <Sparkles size={28} />
          </div>

          {/* Heading */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#003366]/5 text-[#003366] text-[10px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck size={12} className="text-[#C9AB4C]" />
              Official ClickUp Integration
            </div>
            <h1 className="font-serif italic text-3xl text-[#1b1d1e] leading-tight">
              Executive Sign In
            </h1>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Connect directly with your ClickUp workspace to access live action items, synthesize meeting minutes, and delegate tasks.
            </p>
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="leading-snug">
                <span className="font-bold">Authentication Notice: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Option A: ClickUp One-Click Login Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full h-13 px-6 bg-[#7B68EE] hover:bg-[#6852ea] active:bg-[#5841d8] text-white font-semibold text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-between group disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Official ClickUp SVG Mark */}
                <div className="w-6 h-6 bg-white rounded-none flex items-center justify-center p-0.5 shadow-2xs">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                  >
                    <path
                      d="M20 54L34 42L50 56L66 42L80 54L50 28L20 54Z"
                      fill="#7B68EE"
                    />
                    <path
                      d="M20 66C30 76 70 76 80 66L88 74C72 88 28 88 12 74L20 66Z"
                      fill="#FF005A"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-white">
                  {isRedirecting ? "Connecting to ClickUp..." : "Log in with ClickUp"}
                </span>
              </div>
              <ArrowRight
                size={16}
                className="text-white/80 group-hover:text-white group-hover:translate-x-1 transition-transform"
              />
            </button>

            {/* Direct Token Form Toggle */}
            <div className="pt-2">
              {!showTokenForm ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowTokenForm(true)}
                    className="text-[11px] text-[#003366] hover:text-[#C9AB4C] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Or connect directly with your Personal API Token (pk_...)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTokenSubmit} className="mt-3 p-4 bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#003366] flex items-center gap-1.5">
                      <Key size={12} className="text-[#C9AB4C]" />
                      Personal API Token
                    </label>
                    <span className="text-[10px] text-gray-400">pk_...</span>
                  </div>

                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste pk_88451... here"
                    className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-[#1b1d1e] font-mono rounded-none focus:outline-none focus:border-[#003366]"
                  />

                  {tokenError && (
                    <div className="text-[11px] text-red-600 font-medium">
                      {tokenError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingToken || !tokenInput.trim()}
                    className="w-full py-2 bg-[#1b1d1e] hover:bg-[#25282a] text-[#FAF9F7] font-semibold text-xs tracking-wider uppercase border border-[#C9AB4C]/60 hover:border-[#C9AB4C] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingToken ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-[#C9AB4C]" />
                        <span>Verifying with ClickUp...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={13} className="text-[#C9AB4C]" />
                        <span>Connect Workspace</span>
                      </>
                    )}
                  </button>

                  <div className="text-[10px] text-gray-400 text-center leading-relaxed">
                    Found in your ClickUp Settings &gt; ClickUp API &gt; API Token.
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Feature Badges */}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C9AB4C]"></span>
              <span>Direct Space Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C9AB4C]"></span>
              <span>Live Action Items</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C9AB4C]"></span>
              <span>Executive Minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#C9AB4C]"></span>
              <span>Zero-Storage OAuth</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#2c2f32]/10 flex items-center justify-between px-8 text-[11px] text-gray-400 bg-white/40">
        <div>Echo Executive Intelligence • ClickUp Portal</div>
        <div>Confidential & Proprietary</div>
      </footer>
    </div>
  );
}
