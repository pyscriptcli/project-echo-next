"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { getStoredClickUpToken } from "@/lib/api";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredClickUpToken();
    if (stored) {
      setTokenInput(stored);
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("auth_error");
      if (error) {
        if (error === "missing_client_id" || error === "missing_credentials") {
          setErrorMessage("ClickUp OAuth Client ID & Secret were not detected in Vercel. Please verify your environment variables.");
        } else if (error === "token_exchange_failed") {
          setErrorMessage("Failed to exchange code with ClickUp. Please verify your Client Secret.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();

    if (!token) {
      setErrorMessage("Please enter your API token.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

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
        setErrorMessage(data.error || "Invalid API token. Please try again.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to connect. Please try again.");
      setIsLoading(false);
    }
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
          <h2 className="font-serif italic text-3xl text-[#1b1d1e] mb-2">
            Sign In
          </h2>

          {/* Breadcrumb Path */}
          <div className="text-[11px] text-gray-500 font-medium mb-6">
            ClickUp &gt; Settings &gt; Integrations &gt; ClickUp API
          </div>

          {/* Log in with ClickUp Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleOAuthClick}
              disabled={isRedirecting}
              className="w-full py-3 px-4 bg-[#7B68EE] hover:bg-[#6b57ea] text-white font-semibold text-xs tracking-wide transition-all rounded-none flex items-center justify-between cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 bg-white rounded-none flex items-center justify-center p-0.5">
                  <svg viewBox="0 0 100 100" fill="none" className="w-4 h-4">
                    <path d="M20 54L34 42L50 56L66 42L80 54L50 28L20 54Z" fill="#7B68EE" />
                    <path d="M20 66C30 76 70 76 80 66L88 74C72 88 28 88 12 74L20 66Z" fill="#FF005A" />
                  </svg>
                </div>
                <span>
                  {isRedirecting ? "Connecting to ClickUp..." : "Log in with ClickUp"}
                </span>
              </div>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-5">
            <div className="border-t border-gray-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              Or
            </span>
            <div className="border-t border-gray-200 w-full"></div>
          </div>

          {/* API Token Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="api-token"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                API Token *
              </label>
              <input
                id="api-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter your API token"
                className="w-full border border-gray-300 px-3 py-2.5 text-xs text-[#1b1d1e] rounded-none focus:outline-none focus:border-[#C9AB4C] transition-colors bg-white font-mono"
                autoComplete="off"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="text-xs text-red-600 bg-red-50 border-l-2 border-red-500 p-2.5 leading-snug">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#1b1d1e] hover:bg-[#25282a] text-[#FAF9F7] font-bold text-xs uppercase tracking-wider rounded-none border border-[#C9AB4C]/60 hover:border-[#C9AB4C] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#C9AB4C]" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In with Token</span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
