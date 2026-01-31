"use client";
import { AlarmClockIcon, CheckCircleIcon } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useResponses } from "@/contexts/responses.context";
import Image from "next/image";
import axios from "axios";
import { RetellWebClient } from "retell-client-js-sdk";
import MiniLoader from "../loaders/mini-loader/miniLoader";
import { testEmail } from "@/lib/utils";
import { TabSwitchWarning, useTabSwitchPrevention } from "./tabSwitchPrevention";

const webClient = new RetellWebClient();

type InterviewProps = {
  interview: any;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

function Call({ interview, videoStream, onStartRecording, onStopRecording }: InterviewProps) {
  const { createResponse } = useResponses();
  const { tabSwitchCount } = useTabSwitchPrevention();

  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [Loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [callId, setCallId] = useState("");
  const [transcript, setTranscript] = useState({ agent: "", user: "" });
  
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Connect verified stream to preview
  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Sync Retell with Recording logic
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
      if (update.transcript && update.transcript.length > 0) {
        const last = update.transcript[update.transcript.length - 1];
        if (last.role === "agent") setTranscript(prev => ({ ...prev, agent: last.content }));
        if (last.role === "user") setTranscript(prev => ({ ...prev, user: last.content }));
      }
    });

    return () => { webClient.removeAllListeners(); };
  }, [callId, onStartRecording, onStopRecording]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/register-call", { 
        interviewer_id: interview.interviewer_id,
        dynamic_data: { name, email }
      });
      const { access_token, call_id } = res.data.registerCallResponse;
      setCallId(call_id);
      
      await createResponse({
        interview_id: interview.id,
        call_id,
        email,
        name,
        tab_switch_count: tabSwitchCount
      });

      await webClient.startCall({ accessToken: access_token });
      setIsStarted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      {isStarted && <TabSwitchWarning />}
      <Card className="md:w-[80%] w-[95%] h-[88vh] flex flex-col items-center justify-center border-2 border-black rounded-3xl bg-white shadow-2xl">
        
        {/* STEP 2: DETAILS ENTRY FORM */}
        {!isStarted && !isEnded && (
          <div className="p-8 text-center w-full max-w-md">
            <CardTitle className="text-2xl font-bold mb-2">{interview.name}</CardTitle>
            <div className="flex justify-center text-sm text-gray-500 mb-6 items-center gap-2">
              <AlarmClockIcon size={16} /> Expected duration: {interview.time_duration} mins
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200 text-sm italic">
              Ensure your volume is up and grant camera/microphone access. Tab switching is recorded.
            </div>

            <div className="flex flex-col gap-3">
              <input
                placeholder="Email address"
                className="border-2 p-3 w-full rounded-xl focus:border-indigo-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="First name"
                className="border-2 p-3 w-full rounded-xl focus:border-indigo-500 outline-none transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button 
              onClick={startInterview} 
              disabled={Loading || !testEmail(email) || !name} 
              className="w-full mt-6 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              {Loading ? <MiniLoader /> : "Start Interview"}
            </Button>
          </div>
        )}

        {/* STEP 3: THE INTERVIEW UI */}
        {isStarted && !isEnded && (
          <div className="flex flex-col md:flex-row w-full h-full p-6 gap-6">
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-tighter">Interviewer</p>
              <p className="text-lg font-medium italic text-slate-800 text-center leading-relaxed">
                &quot;{transcript.agent || "Connecting..."}&quot;
              </p>
            </div>

            <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
              <div className="relative w-full aspect-video">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-2xl border-4 border-black bg-black"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                  <span className="h-2 w-2 bg-white rounded-full"></span> LIVE RECORDING
                </div>
              </div>
              <p className="mt-4 font-bold uppercase text-xs text-slate-400">You (Candidate)</p>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="flex flex-col items-center justify-center py-10">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold">Interview Completed</h2>
            <p className="text-gray-500">Your response has been recorded successfully.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Call;
