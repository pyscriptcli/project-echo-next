"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface RecordingStudioProps {
  onClose: () => void;
  onAudioSecured: (file: File) => void;
}

export function RecordingStudio({ onClose, onAudioSecured }: RecordingStudioProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = "Recording is in progress. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], "recording.wav", { type: "audio/wav" });
      onAudioSecured(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#f4f1ec] rounded-none shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-[#003366]/20">
        <div className="flex-1 border-r border-[#003366]/20 p-6">
          <h2 className="text-xl font-serif text-[#003366] italic mb-2">Meeting notes</h2>
          <p className="text-sm text-gray-500 mb-4">Capture context while the recording is in progress.</p>
          <textarea 
            className="w-full h-64 border border-[#003366]/20 rounded-none p-3 text-sm focus:outline-none focus:border-[#c9ab4c] bg-white"
            placeholder="Key decisions, announcements, or discussion items..."
          />
        </div>
        <div className="w-full md:w-96 p-6 flex flex-col">
          <h2 className="text-xl font-serif text-[#003366] italic mb-2">Microphone input</h2>
          <p className="text-sm text-gray-500 mb-6">Recording controls remain protected until audio is captured.</p>
          <div className="flex-1 flex flex-col justify-center items-center gap-6">
            {!audioUrl ? (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-32 h-32 rounded-none flex items-center justify-center border-4 transition-all ${
                  isRecording 
                    ? "border-red-500 bg-red-50 animate-pulse text-red-500" 
                    : "border-[#003366] bg-white hover:bg-gray-50 text-[#003366]"
                }`}
              >
                {isRecording ? <Square size={40} className="fill-current" /> : <Mic size={48} />}
              </button>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <audio src={audioUrl} controls className="w-full" />
                <div className="flex gap-2 w-full">
                  <button onClick={handleTranscribe} className="bg-[#0c0c0e] text-white font-semibold py-2 px-4 rounded-none w-full border border-[#c9ab4c]">Transcribe</button>
                  <button onClick={() => { setAudioUrl(null); setRecordedBlob(null); }} className="bg-transparent text-gray-700 font-semibold py-2 px-4 rounded-none w-full border border-gray-300">Discard</button>
                </div>
              </div>
            )}
            {!audioUrl && (
              <p className={`font-semibold ${isRecording ? "text-red-500" : "text-gray-500"}`}>
                {isRecording ? "Recording in progress..." : "Click to start recording"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="mt-8 text-gray-500 text-sm hover:text-gray-800 text-center">Close Studio</button>
        </div>
      </div>
    </div>
  );
}

