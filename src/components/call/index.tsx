"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { RetellWebClient } from "retell-client-js-sdk";
import axios from "axios";

const webClient = new RetellWebClient();

type CallProps = {
  interview: any;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

function Call({ interview, videoStream, onStartRecording, onStopRecording }: CallProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [callId, setCallId] = useState("");
  const [transcript, setTranscript] = useState({ agent: "", user: "" });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fixed: Connect stream to the preview box
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Synchronize Retell with Recording
  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      if (callId) onStartRecording(callId);
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
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
    const res = await axios.post("/api/register-call", { interviewer_id: interview.interviewer_id });
    const { access_token, call_id } = res.data.registerCallResponse;
    setCallId(call_id);
    await webClient.startCall({ accessToken: access_token });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-4xl w-full p-8 shadow-2xl bg-white rounded-3xl border-2 border-black">
        {!isCalling ? (
          <div className="text-center py-10">
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tight">Final Step</h2>
            <Button onClick={startInterview} className="px-12 py-6 text-xl bg-black text-white rounded-full hover:scale-105 transition-transform">
              Begin Voice Interview
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8 h-[400px]">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-sm mb-4">INTERVIEWER</p>
              <p className="font-medium text-lg leading-relaxed italic">&quot;{transcript.agent || "Connecting..."}&quot;</p>
            </div>
            <div className="relative group">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-2xl border-4 border-black shadow-lg" style={{ transform: "scaleX(-1)" }} />
              <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-2">
                <span className="h-2 w-2 bg-white rounded-full"></span> LIVE RECORDING
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white font-bold text-xs uppercase drop-shadow-md">You (Candidate)</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Call;
