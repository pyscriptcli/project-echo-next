"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("auth_error");
      if (error) {
        if (error === "missing_client_id" || error === "missing_credentials") {
          setErrorMessage("ClickUp OAuth credentials were not detected. Please verify your Vercel environment variables.");
        } else if (error === "token_exchange_failed") {
          setErrorMessage("Failed to authenticate with ClickUp. Please verify your ClickUp App settings.");
        } else if (error === "access_denied") {
          setErrorMessage("Access was denied in ClickUp authorization.");
        } else {
          setErrorMessage(`Authentication notice: ${error}`);
        }
      }
    }
  }, []);

  const handleOAuthClick = () => {
    setIsRedirecting(true);
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row select-none">
      {/* Left Column: App Charcoal (#1b1d1e) with gold border & text */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-[#1b1d1e] border-r-2 border-[#C9AB4C] flex items-center justify-center p-8 md:p-12">
        <div className="flex items-center gap-2">
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#FAF9F7] tracking-wide font-normal">
            Echo x ClickUp
          </h1>
          <span className="w-2 h-2 bg-[#C9AB4C]"></span>
        </div>
      </div>

      {/* Right Column: App Canvas (#FAF9F7) with Centered White Card */}
      <div className="w-full md:w-7/12 lg:w-8/12 bg-[#FAF9F7] flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white p-8 md:p-10 border border-gray-200 border-t-4 border-t-[#C9AB4C] shadow-lg rounded-none">
          
          {/* Subheader / Tag */}
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9AB4C] mb-2">
            Click Up Integration
          </div>

          {/* Title */}
          <h2 className="font-serif italic text-3xl text-[#1b1d1e] mb-3">
            Sign In
          </h2>

          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Connect with your ClickUp workspace to access live action items, tasks, and meeting notes.
          </p>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border-l-2 border-red-500 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Log in with ClickUp Button */}
          <button
            type="button"
            onClick={handleOAuthClick}
            disabled={isRedirecting}
            className="w-full py-3.5 px-5 bg-[#7B68EE] hover:bg-[#6b57ea] active:bg-[#5c47df] text-white font-semibold text-xs tracking-wide transition-all rounded-none flex items-center justify-between cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-white rounded-none flex items-center justify-center p-0.5">
                <svg viewBox="0 0 100 100" fill="none" className="w-4 h-4">
                  <path d="M20 54L34 42L50 56L66 42L80 54L50 28L20 54Z" fill="#7B68EE" />
                  <path d="M20 66C30 76 70 76 80 66L88 74C72 88 28 88 12 74L20 66Z" fill="#FF005A" />
                </svg>
              </div>
              <span className="font-medium text-sm">
                {isRedirecting ? "Connecting to ClickUp..." : "Log in with ClickUp"}
              </span>
            </div>
            {isRedirecting ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <ArrowRight size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
