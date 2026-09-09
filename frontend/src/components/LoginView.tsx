"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getStoredClickUpToken } from "@/lib/api";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If user previously had a token saved, populate it
    const stored = getStoredClickUpToken();
    if (stored) {
      setTokenInput(stored);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // If user typed a token, verify and save via token-login
      if (token) {
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
          return;
        }
      }

      // If empty, attempt connecting via server environment token
      const envRes = await fetch("/api/auth/login");
      if (envRes.redirected || envRes.ok) {
        window.location.href = "/";
      } else {
        setErrorMessage("Please enter your API token.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to connect. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row select-none">
      {/* Left Column: Deep Navy with minimal "Echo x ClickUp" */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-[#002855] flex items-center justify-center p-8 md:p-12">
        <h1 className="font-serif italic text-3xl md:text-4xl text-white tracking-wide font-normal">
          Echo x ClickUp
        </h1>
      </div>

      {/* Right Column: Dark backdrop with centered white card */}
      <div className="w-full md:w-7/12 lg:w-8/12 bg-[#081320] flex items-center justify-center p-6 md:p-12 relative">
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#C9AB4C 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />

        {/* Minimal White Floating Card */}
        <div className="w-full max-w-md bg-white p-8 md:p-12 shadow-2xl rounded-none relative z-10">
          
          {/* Subheader / Tag */}
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9AB4C] mb-2">
            Click Up Integration
          </div>

          {/* Title */}
          <h2 className="font-serif italic text-3xl text-[#1b1d1e] mb-6">
            Sign In
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="api-token"
                className="block text-xs font-semibold text-gray-700 mb-2"
              >
                API Token *
              </label>
              <input
                id="api-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter your API token"
                className="w-full border border-gray-300 px-3.5 py-3 text-xs text-[#1b1d1e] rounded-none focus:outline-none focus:border-[#003366] transition-colors bg-white font-mono"
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
              className="w-full py-3.5 bg-[#003366] hover:bg-[#002244] active:bg-[#001a33] text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#C9AB4C]" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
