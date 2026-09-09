"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, Lock } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("auth_error");
      if (error) {
        if (error === "missing_client_id" || error === "missing_credentials") {
          setErrorMessage(
            "ClickUp OAuth credentials (CLICKUP_CLIENT_ID & CLICKUP_CLIENT_SECRET) are not configured in your environment."
          );
        } else if (error === "token_exchange_failed") {
          setErrorMessage("Failed to authenticate with ClickUp. Please verify your OAuth App settings.");
        } else if (error === "access_denied") {
          setErrorMessage("Access was denied in ClickUp authorization.");
        } else {
          setErrorMessage(`Authentication error: ${error}`);
        }
      }
    }
  }, []);

  const handleLogin = () => {
    setIsRedirecting(true);
    window.location.href = "/api/auth/login";
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
          <span>OAuth 2.0 Secure Session</span>
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
          <div className="mb-8">
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

          {/* ClickUp Login Button */}
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
                    {/* ClickUp Chevron (Upward Arrow) */}
                    <path
                      d="M20 54L34 42L50 56L66 42L80 54L50 28L20 54Z"
                      fill="#7B68EE"
                    />
                    {/* ClickUp Lower Curve */}
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

            <div className="text-[11px] text-gray-500 text-center leading-relaxed pt-2">
              By logging in, you authorize Echo to synchronize tasks and spaces for your ClickUp account.
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
