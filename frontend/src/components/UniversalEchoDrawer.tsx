"use client";

import React, { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock, ExternalLink, Maximize2, Minimize2, Plus, Send, Sparkles, Square, User, X } from "lucide-react";
import { askEcho } from "@/lib/api";
import type { ArchivedMeeting } from "@/types/meeting";
import type { AskEchoResponse } from "@/lib/ask-echo/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  response?: AskEchoResponse;
}

interface UniversalEchoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: ArchivedMeeting[];
  onOpenSource?: (page: string, recordId: string, url?: string) => void;
}

const STARTER: Message = { role: "assistant", content: "Hi — I’m Echo. What would you like to get done today?", timestamp: "Just now" };
const STORAGE_KEY = "echo_ask_conversation";

export function UniversalEchoDrawer({ isOpen, onClose, onOpenSource }: UniversalEchoDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([STARTER]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [userName, setUserName] = useState("");
  const [openSources, setOpenSources] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try { const stored = sessionStorage.getItem(STORAGE_KEY); if (stored) setMessages(JSON.parse(stored)); } catch {}
  }, []);
  useEffect(() => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {} }, [messages]);
  useEffect(() => { if (!isOpen) return; fetch("/api/auth/me").then((response) => response.json()).then((data) => setUserName(data.user?.username || "")).catch(() => {}); }, [isOpen]);
  useEffect(() => { const key = (event: KeyboardEvent) => event.key === "Escape" && isOpen && onClose(); window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [isOpen, onClose]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" }); }, [messages, isThinking]);

  const quickPrompts = ["What needs my attention today?", "Show me my open tasks", "What changed this week?", "Give me my daily brief"];

  const send = async (suggestion?: string) => {
    const question = (suggestion || input).trim();
    if (!question || isThinking) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextMessages = [...messages, { role: "user" as const, content: question, timestamp }];
    setMessages(nextMessages); setInput(""); setIsThinking(true); setShowSuggestions(false);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const conversation = nextMessages.slice(1, -1).map(({ role, content }) => ({ role, content }));
      const response = await askEcho(question, conversation, controller.signal);
      setMessages((current) => [...current, { role: "assistant", content: response.answer, response, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch (error) {
      const content = error instanceof DOMException && error.name === "AbortError" ? "Stopped." : error instanceof Error ? error.message : "I couldn’t answer that. Please try again.";
      setMessages((current) => [...current, { role: "assistant", content, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setIsThinking(false); abortRef.current = null; }
  };

  const reset = () => { abortRef.current?.abort(); setMessages([STARTER]); setInput(""); setShowSuggestions(true); sessionStorage.removeItem(STORAGE_KEY); };
  const renderInline = (message: Message, text: string, lineKey: string) => {
    const citations = message.response?.citations || [];
    return text.split(/(\[\d+\])/g).map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (!match) return <React.Fragment key={index}>{part}</React.Fragment>;
      const number = Number(match[1]);
      const citation = citations.find((item) => item.marker === `[${number}]`) || citations[number - 1];
      const source = citation ? message.response?.sources.find((item) => item.sourceId === citation.sourceId) : message.response?.sources[number - 1];
      return <button key={`${lineKey}-${index}`} type="button" aria-label={`Open source ${number}`} disabled={!source} onClick={() => source && onOpenSource?.(source.page || "meetings", source.meetingId, source.url)} className="align-super mx-0.5 text-[10px] font-semibold text-[#003366] underline decoration-[#C9A84C] underline-offset-2 disabled:cursor-default">[{number}]</button>;
    });
  };
  const renderAnswer = (message: Message) => message.content.split("\n").map((line, index) => {
    const cleaned = line.replace(/\*\*/g, "").trim();
    if (!cleaned) return <div key={index} className="h-2" />;
    const isBullet = /^[-•]\s/.test(cleaned);
    const content = isBullet ? cleaned.replace(/^[-•]\s*/, "") : cleaned;
    return <div key={index} className={`${isBullet ? "flex gap-2 pl-1" : ""} ${/^(your |today|summary|open items|next steps|deadlines|decisions)/i.test(content) ? "font-medium text-[#003366]" : ""}`}>{isBullet && <span className="text-[#C9A84C]">•</span>}<span>{renderInline(message, content, String(index))}</span></div>;
  });
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <button aria-label="Close Ask Echo" onClick={onClose} className="fixed inset-0 bg-[#003366]/30 backdrop-blur-[2px]" />
      <section aria-label="Ask Echo" className={`relative h-full bg-[#FFFCFB] border-l border-[#C9A84C] shadow-2xl flex flex-col transition-[width] duration-300 ${expanded ? "w-full" : "w-full max-w-xl"}`}>
        <header className="min-h-20 px-5 bg-[#003366] text-[#FFFCFB] flex items-center justify-between border-b border-[#C9A84C]">
          <div className="flex items-center gap-3">
            <img src="/prime-philippines-sidebar-logo.png" alt="PRIME Philippines" className="h-8 w-auto max-w-32 object-contain" />
            <div className="border-l border-[#C9A84C] pl-3"><h2 className="font-serif italic text-xl">Ask Echo</h2><p className="text-xs font-normal text-[#FFFCFB]/70">{userName ? `Here for you, ${userName}` : "Your work, made clearer"}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={reset} aria-label="New conversation" className="p-2 hover:bg-[#174778]"><Plus size={17} /></button>
            <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Close full view" : "Open full view"} className="p-2 hover:bg-[#174778]">{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 hover:bg-[#174778]"><X size={18} /></button>
          </div>
        </header>

        {showSuggestions && <div className="border-b border-[#C9A84C]/40 px-5 py-4 bg-[#FFFCFB]">
          <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} className="w-full flex justify-between text-[10px] font-medium tracking-[0.2em] uppercase text-[#003366]"><span className="flex items-center gap-2"><BookOpen size={13} /> Try asking</span>{showSuggestions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)} disabled={isThinking} className="text-left text-xs text-[#181D1E] border border-[#003366]/20 px-3 py-2 hover:border-[#C9A84C] bg-[#FFFCFB]">{prompt}</button>)}</div>
        </div>}

        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FFFCFB]">
          {messages.map((message, index) => <div key={`${index}-${message.timestamp}`} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 flex items-center justify-center shrink-0 ${message.role === "assistant" ? "bg-[#003366] text-[#C9A84C]" : "border border-[#003366] text-[#003366]"}`}>{message.role === "assistant" ? <Sparkles size={13} /> : <User size={13} />}</div>
            <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${message.role === "assistant" ? "border border-[#003366]/15 text-[#181D1E]" : "bg-[#003366] text-[#FFFCFB]"}`}>
              <div className="space-y-1">{message.role === "assistant" ? renderAnswer(message) : message.content}</div>
              {message.response?.sources?.length ? <div className="mt-4 border-t border-[#C9A84C]/40 pt-3"><button type="button" onClick={() => setOpenSources((current) => ({ ...current, [index]: !current[index] }))} className="flex w-full items-center justify-between text-left text-[10px] font-medium tracking-[0.2em] uppercase text-[#003366]"><span>Sources · {message.response.sources.length}</span><span className="text-xs normal-case tracking-normal">{openSources[index] ? "Hide" : "Show"}</span></button>{openSources[index] && <div className="mt-3 space-y-2">{message.response.sources.map((source, sourceIndex) => <button key={source.sourceId} type="button" onClick={() => onOpenSource?.(source.page || "meetings", source.meetingId, source.url)} className="block w-full text-left border-l-2 border-[#C9A84C] pl-3 py-2 hover:bg-[#003366]/5"><span className="flex items-center justify-between gap-2 text-xs font-medium text-[#003366]"><span><span className="mr-2 text-[10px] text-[#C9A84C]">[{sourceIndex + 1}]</span>{source.meetingTitle}</span><ExternalLink size={11} /></span><span className="block text-[10px] uppercase tracking-wide text-[#003366]/55">{source.page || "workspace"}{source.meetingDate ? ` · ${source.meetingDate}` : ""}{source.topic ? ` · ${source.topic}` : ""}</span><span className="block mt-1 text-xs text-[#181D1E]/80">{source.excerpt}</span></button>)}</div>}</div> : null}
              {message.response?.followUps?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.response.followUps.map((followUp) => <button key={followUp} type="button" onClick={() => send(followUp)} className="border border-[#003366]/25 px-2 py-1 text-[11px] text-[#003366] hover:border-[#C9A84C]">{followUp}</button>)}</div> : null}
              <div className={`text-[9px] mt-2 flex items-center gap-1 ${message.role === "user" ? "justify-end text-[#FFFCFB]/60" : "text-[#181D1E]/45"}`}><Clock size={10} />{message.timestamp}</div>
            </div>
          </div>)}
          {isThinking && <div className="flex gap-3"><div className="w-7 h-7 bg-[#003366] text-[#C9A84C] flex items-center justify-center"><Sparkles size={13} /></div><div className="border border-[#003366]/15 p-3 text-sm text-[#181D1E]/60">Looking through your meetings…</div></div>}
          <div ref={messagesEndRef} />
        </div>

        <footer className="p-4 bg-[#FFFCFB] border-t border-[#C9A84C]/50">
          <div className="mb-2 text-[10px] font-medium tracking-[0.18em] uppercase text-[#003366]/70">Echo uses the work you’re allowed to access</div>
          <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end border border-[#003366]/35 focus-within:border-[#003366]">
            <textarea aria-label="Message Ask Echo" rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask about your tasks, daily log, meetings, or deadlines…" disabled={isThinking} className="min-h-11 max-h-32 flex-1 resize-y bg-[#FFFCFB] px-3 py-3 text-sm text-[#181D1E] outline-none" />
            {isThinking ? <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop response" className="m-1.5 p-2 text-[#003366]"><Square size={15} /></button> : <button type="submit" disabled={!input.trim()} aria-label="Send message" className="m-1.5 p-2 text-[#003366] disabled:opacity-30"><Send size={16} /></button>}
          </form>
          <p className="mt-2 text-center text-[10px] text-[#181D1E]/50">Echo matches “me” and “my” to your signed-in profile.</p>
        </footer>
      </section>
    </div>
  );
}
