"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, X, RefreshCw, CheckCircle2, ExternalLink, Calendar, Users, AlertCircle } from "lucide-react";
import { createClickUpTask, getStoredClickUpToken, getStoredClickUpListId } from "@/lib/api";

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    description?: string;
    meetingTitle?: string;
    meetingDate?: string;
    dueDate?: string;
    priority?: string;
    assigneeName?: string;
  };
  onTaskCreated?: (task: any) => void;
}

export function QuickAddTaskModal({
  isOpen,
  onClose,
  initialData,
  onTaskCreated
}: QuickAddTaskModalProps) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [status, setStatus] = useState("to do");
  const [dueDate, setDueDate] = useState("");
  const [assigneeName, setAssigneeName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTaskName(initialData.name || "");
      setDescription(initialData.description || "");
      setMeetingTitle(initialData.meetingTitle || "");
      setMeetingDate(initialData.meetingDate || "");
      setDueDate(initialData.dueDate || "");
      setPriority(initialData.priority || "normal");
      setAssigneeName(initialData.assigneeName || "");
    }
    setError(null);
    setCreatedUrl(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const token = getStoredClickUpToken();
    const listId = getStoredClickUpListId();

    setLoading(true);
    setError(null);

    try {
      let fullDescription = description.trim();
      if (assigneeName.trim()) {
        fullDescription = `**Person in Charge:** ${assigneeName.trim()}\n\n${fullDescription}`;
      }

      const res = await createClickUpTask({
        name: taskName.trim(),
        description: fullDescription,
        meetingTitle: meetingTitle.trim() || undefined,
        meetingDate: meetingDate.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
      });

      if (res.url) {
        setCreatedUrl(res.url);
      }
      if (onTaskCreated) {
        onTaskCreated(res.task || res);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create task in ClickUp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white border-2 border-[#003366] shadow-2xl p-6 w-full max-w-lg rounded-none animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1b1d1e] flex items-center justify-center text-[#c9ab4c]">
              <CheckSquare size={16} />
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-lg text-[#003366] leading-none">
                Add to ClickUp Tasks
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Convert meeting action item into a tracked ClickUp task
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {createdUrl ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto rounded-none">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="font-serif italic font-bold text-base text-[#003366]">
              Task Created in ClickUp!
            </h4>
            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              The action item has been tagged with <code className="bg-gray-100 px-1 font-bold">echo-meeting</code> and synced.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={createdUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-outline !py-1.5 !px-3.5 !text-xs flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open in ClickUp</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary !py-1.5 !px-4 !text-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 rounded-none">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Task Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                required
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                placeholder="Action item summary..."
                className="w-full border border-gray-300 p-2 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none rounded-none"
              />
            </div>

            {/* Meeting Context */}
            {meetingTitle && (
              <div className="p-2 bg-blue-50/70 border border-blue-100 text-[11px] text-[#003366] flex items-center justify-between">
                <span className="font-semibold truncate max-w-[320px]">
                  🔗 Meeting: {meetingTitle}
                </span>
                {meetingDate && <span className="font-mono text-[10px] text-gray-500">{meetingDate}</span>}
              </div>
            )}

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none rounded-none"
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="normal">🔵 Normal</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none rounded-none"
                >
                  <option value="to do">To Do</option>
                  <option value="in progress">In Progress</option>
                  <option value="in review">In Review</option>
                </select>
              </div>
            </div>

            {/* Target Due Date & In Charge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none rounded-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Person in Charge
                </label>
                <input
                  type="text"
                  value={assigneeName}
                  onChange={e => setAssigneeName(e.target.value)}
                  placeholder="Assignee name..."
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none rounded-none"
                />
              </div>
            </div>

            {/* Description Details */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Context & Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Key arguments, requirements, or deliverables discussed..."
                className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none resize-none rounded-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 italic">
                Direct push to ClickUp API
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline !py-1.5 !px-3.5 !text-xs rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5 shadow-xs rounded-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Pushing to ClickUp...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare size={13} />
                      <span>Push to ClickUp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
