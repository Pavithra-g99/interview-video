"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { RetellWebClient } from "retell-client-js-sdk";
import axios from "axios";
import { CheckCircleIcon } from "lucide-react";

const webClient = new RetellWebClient();

type CallProps = {
  interview: any;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

function Call({ interview, videoStream, onStartRecording, onStopRecording }: CallProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [callId, setCallId] = useState("");
  const [transcript, setTranscript] = useState({ agent: "", user: "" });
  
  // FIX: Explicitly defining videoPreviewRef to resolve the build error
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Connect stream to the preview box
  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Sync Retell Events
  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      if (callId) onStartRecording(callId);
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
      setIsEnded(true);
      onStopRecording();
    });

    webClient.on("update", (update) => {
      if (update.transcript) {
        const last = update.transcript[update.transcript.length - 1];
        if (last.role === "agent") setTranscript(prev => ({ ...prev, agent: last.content }));
        if (last.role === "user") setTranscript(prev => ({ ...prev, user: last.content }));
      }
    });

    return () => webClient.removeAllListeners();
  }, [callId, onStartRecording, onStopRecording]);

  const startInterview = async () => {
    try {
      const res = await axios.post("/api/register-call", { interviewer_id: interview.interviewer_id });
      const { access_token, call_id } = res.data.registerCallResponse;
      setCallId(call_id);
      await webClient.startCall({ accessToken: access_token });
    } catch (err) {
      console.error("Failed to start call", err);
    }
  };

  // FIX: Ensure a valid JSX element is returned to resolve the component error
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-4xl w-full p-8 shadow-2xl bg-white rounded-3xl border-2 border-black">
        {isEnded ? (
          <div className="flex flex-col items-center justify-center py-10">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold">Interview Completed</h2>
            <p className="text-gray-500">Your response has been recorded.</p>
          </div>
        ) : !isCalling ? (
          <div className="text-center py-10">
            <h2 className="text-3xl font-black mb-6 uppercase">Final Step</h2>
            <Button onClick={startInterview} className="px-12 py-6 text-xl bg-black text-white rounded-full">
              Begin Voice Interview
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 text-center border-2 border-dashed">
              <p className="text-slate-400 text-sm mb-4 tracking-widest uppercase">Interviewer</p>
              <p className="font-medium text-lg italic leading-relaxed">
                &quot;{transcript.agent || "Connecting..."}&quot;
              </p>
            </div>
            <div className="relative group">
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover rounded-2xl border-4 border-black shadow-lg" 
                style={{ transform: "scaleX(-1)" }} 
              />
              <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                <span className="h-2 w-2 bg-white rounded-full"></span> LIVE RECORDING
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Call;
