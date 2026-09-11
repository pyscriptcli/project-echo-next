"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Sparkles, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  User,
  Clock,
  BookOpen
} from "lucide-react";
import { askEcho } from "@/lib/api";
import { ArchivedMeeting } from "@/types/meeting";

interface Message {
  role: "user" | "echo";
  content: string;
  timestamp: string;
}

interface UniversalEchoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: ArchivedMeeting[];
}

export function UniversalEchoDrawer({
  isOpen,
  onClose,
  meetings
}: UniversalEchoDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "echo",
      content: "Hello Dave. I am your Echo intelligence assistant. You can ask me to summarize recent decisions, find specific action items, or review meeting archives.",
      timestamp: "Just now"
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const quickPrompts = [
    "Summarize key decisions across all recent meetings",
    "What action items are assigned to Dave Policarpio?",
    "List all external client deliverables due this month",
    "Compare internal meeting discussions vs external partners"
  ];

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isThinking) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { role: "user", content: prompt, timestamp: timeStr };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsThinking(true);

    try {
      const contextSummary = meetings.map((m) => ({
        title: m.title,
        date: m.date,
        venue: m.location,
        type: m.meeting_type,
        attendees: [...(m.attendees_prime || []), ...(m.attendees_external || [])],
        summary: m.summary,
        items: m.items.map((i) => ({
          topic: i.topic,
          point: i.discussion_point,
          action: i.action_plan,
          person: i.person_in_charge,
          due: i.target_date
        }))
      }));

      const res = await askEcho(
        contextSummary.flatMap((c) => c.items),
        `MEETING ARCHIVES CONTEXT: ${JSON.stringify(contextSummary)}. USER QUESTION: ${prompt}`,
        undefined,
        `All meetings context: ${JSON.stringify(contextSummary)}`
      );

      const echoReply = res.response || res.result || res.message || "I have analyzed your archives. Let me know if you need deeper details.";
      setMessages((prev) => [
        ...prev,
        {
          role: "echo",
          content: echoReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "echo",
          content: "I encountered an error querying the intelligence repository: " + (err.message || "Please check your network."),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md md:max-w-lg bg-[#FFFCFB] h-full shadow-2xl flex flex-col z-10 border-l border-gray-200 animate-in slide-in-from-right duration-300">
        {/* Header (Clean, no prime / firm-wide subheadings) */}
        <div className="h-16 px-6 bg-[#1b1d1e] text-white flex items-center justify-between border-b border-[#2c2f32]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-[#25282a] border border-[#C9AB4C]/60 flex items-center justify-center text-[#C9AB4C]">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold tracking-wider text-base text-[#FAF9F7]">Ask Echo</span>
                <span className="text-[9px] font-bold tracking-widest text-[#C9AB4C] bg-[#C9AB4C]/10 border border-[#C9AB4C]/30 px-1.5 py-0.5 rounded-none uppercase">
                  AI Assistant
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Meeting Intelligence & Archives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-none hover:bg-[#25282a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Collapsible Suggested Prompts */}
        <div className="border-b border-gray-100 bg-[#FAF9F7] px-5 py-3">
          <button
            type="button"
            onClick={() => setIsPromptsOpen(!isPromptsOpen)}
            className="w-full flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-gray-500 hover:text-[#003366] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-[#C9AB4C]" /> Suggested Queries
            </span>
            {isPromptsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isPromptsOpen && (
            <div className="mt-2.5 grid grid-cols-1 gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isThinking}
                  className="text-left text-xs bg-[#FFFCFB] hover:bg-[#F4F1EC] text-gray-700 hover:text-[#003366] border border-gray-200/80 hover:border-[#C9AB4C] px-3 py-1.5 rounded-none transition-all line-clamp-1 disabled:opacity-50"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FFFCFB]/50">
          {messages.map((msg, index) => {
            const isEcho = msg.role === "echo";
            return (
              <div 
                key={index} 
                className={`flex gap-3 ${isEcho ? "" : "flex-row-reverse"}`}
              >
                <div 
                  className={`w-7 h-7 rounded-none flex items-center justify-center shrink-0 text-xs font-bold ${
                    isEcho 
                      ? "bg-[#1b1d1e] text-[#C9AB4C] border border-[#C9AB4C]/40" 
                      : "bg-[#003366] text-white"
                  }`}
                >
                  {isEcho ? <Sparkles size={13} /> : <User size={13} />}
                </div>

                <div 
                  className={`max-w-[82%] rounded-none p-3 text-xs leading-relaxed shadow-xs ${
                    isEcho 
                      ? "bg-[#FFFCFB] border border-gray-200 text-gray-800" 
                      : "bg-[#003366] text-white"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                  <div 
                    className={`text-[9px] mt-1.5 flex items-center gap-1 ${
                      isEcho ? "text-gray-400" : "text-white/60 justify-end"
                    }`}
                  >
                    <Clock size={10} /> {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-none bg-[#161616] text-[#C9AB4C] border border-[#C9AB4C]/40 flex items-center justify-center shrink-0">
                <Sparkles size={13} />
              </div>
              <div className="bg-[#FFFCFB] border border-gray-200 rounded-none p-3 text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                <Loader2 size={14} className="animate-spin text-[#C9AB4C]" />
                Echo is analyzing meeting archives...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#FFFCFB] border-t border-gray-200">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }} 
            className="relative flex items-center"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask anything about meetings, action items, or decisions..."
              disabled={isThinking}
              className="w-full pl-3 pr-10 py-2.5 text-xs bg-[#FFFCFB] border border-gray-300 rounded-none focus:outline-none focus:border-[#003366] focus:bg-[#FFFCFB] transition-all text-gray-800"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isThinking}
              className="absolute right-2 text-[#003366] hover:text-[#C9AB4C] disabled:opacity-30 p-1.5 transition-colors rounded-none"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="text-[10px] text-gray-400 text-center mt-2">
            Answers are synthesized directly from your archived meeting records.
          </div>
        </div>
      </div>
    </div>
  );
}
