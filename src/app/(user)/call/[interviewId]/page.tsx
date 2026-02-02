"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import { ArrowUpRightSquareIcon, Video, CheckCircle, ShieldCheck } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

type Props = { params: { interviewId: string } };

export default function InterviewInterface({ params }: Props) {
  const { interviewId } = params;
  const supabase = createClientComponentClient();
  const { getInterviewById } = useInterviews();

  const [interview, setInterview] = useState<Interview>();
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setMediaStream(stream);
    } catch (err) { console.error("Permission error", err); }
  };

  const startVideoRecording = async (stream: MediaStream, callId: string) => {
    chunksRef.current = [];
    
    // Clean recording: focus on candidate video and mic
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8,opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const fileName = `interview-${callId}-${Date.now()}.webm`;

      // Upload candidate video to Supabase
      const { data } = await supabase.storage
        .from("interview-videos")
        .upload(fileName, blob, { contentType: 'video/webm' });

      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
        await axios.post("/api/save-video-url", { call_id: callId, videoUrl: publicUrl });
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    mediaStream?.getTracks().forEach((track) => track.stop());
  };

  if (!interview) return interviewNotFound ? <PopUpMessage title="Invalid URL" description="Check URL" image="/invalid-url.png" /> : <PopupLoader />;

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl border-2 border-indigo-100 bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-indigo-600" />
          <h1 className="mb-2 text-2xl font-bold">Ready?</h1>
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl border-4 border-slate-200 bg-slate-900">
            {mediaStream ? (
              <video autoPlay muted playsInline className="h-full w-full object-cover" ref={(el) => { if (el) el.srcObject = mediaStream; }} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-white italic">Camera Preview</div>
            )}
          </div>
          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700">Enable Hardware</button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700">Hardware Verified <CheckCircle size={20} /></button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Call 
      interview={interview} 
      videoStream={mediaStream} 
      onStartRecording={(id) => startVideoRecording(mediaStream!, id)} 
      onStopRecording={stopVideoRecording} 
    />
  );
}

// Utility Components (PopupLoader, PopUpMessage) stay the same...
