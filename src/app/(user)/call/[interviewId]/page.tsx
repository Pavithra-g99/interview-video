"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import { ShieldCheck, Clock } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";
import { toast } from "sonner"; 

interface PageProps {
  params: {
    interviewId: string;
  };
}

export default function InterviewInterface({ params }: PageProps) {
  const { interviewId } = params;
  const supabase = createClientComponentClient();
  const { getInterviewById } = useInterviews();

  const [interview, setInterview] = useState<Interview | undefined>(undefined);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [interviewNotFound, setInterviewNotFound] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await getInterviewById(interviewId);
        if (response) {
          setInterview(response);
          document.title = response.name;
        } else { setInterviewNotFound(true); }
      } catch (error) { setInterviewNotFound(true); }
    };
    fetchInterview();
  }, [interviewId, getInterviewById]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
    } catch (err) { console.error("Hardware denied"); }
  };

  const startVideoRecording = async (stream: MediaStream, callId: string) => {
    chunksRef.current = [];
    
    // Quality increased to 100kbps because UpCloud has no 50MB limit
    const recorder = new MediaRecorder(stream, { 
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 100000 
    });

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    
    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return;
      
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      
      // We use FormData to send the file to your Node.js server
      const formData = new FormData();
      formData.append("video", blob, `interview-${callId}.webm`);

      try {
        toast.loading("Uploading session to UpCloud...");

        // 1. Upload directly to your UpCloud Server IP
        const uploadRes = await axios.post("http://209.50.59.72:3001/upload", formData);
        const videoUrl = uploadRes.data.url;

        // 2. Save the UpCloud URL back to your database so it shows in dashboard
        await axios.post("/api/save-video-url", { 
          call_id: callId, 
          videoUrl: videoUrl 
        });

        toast.success("Recording saved to UpCloud!");
      } catch (error) {
        console.error("UpCloud upload failed:", error);
        toast.error("Failed to save video to UpCloud.");
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
  };

  if (!interview) {
    return interviewNotFound ? (
      <div className="flex h-screen items-center justify-center font-bold">Invalid URL</div>
    ) : (
      <div className="flex h-screen items-center justify-center"><LoaderWithText /></div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl border-2 border-indigo-100 bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-indigo-600" />
          <h1 className="mb-2 text-2xl font-bold">{interview.name}</h1>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-6">
            <Clock size={14} />
            <span>Expected duration: {interview.time_duration || "15"} mins or less</span>
          </div>
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl border-4 border-slate-200 bg-slate-900 shadow-inner">
            {mediaStream ? (
              <video autoPlay muted playsInline className="h-full w-full object-cover" ref={(el) => { if (el) el.srcObject = mediaStream; }} />
            ) : (
              <div className="flex h-full items-center justify-center text-white italic">Loading Camera...</div>
            )}
          </div>
          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700">Enable Hardware</button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="w-full rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700">Start Interview</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Call 
      interview={interview} 
      videoStream={mediaStream} 
      onStartRecording={(_: HTMLAudioElement | null, id: string) => startVideoRecording(mediaStream!, id)} 
      onStopRecording={() => mediaRecorderRef.current?.stop()} 
    />
  );
}
