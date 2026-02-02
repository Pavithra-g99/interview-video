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

// Keep existing UI components (PopupLoader, PopUpMessage) here

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
        if (response) { setInterview(response); document.title = response.name; }
        else { setInterviewNotFound(true); }
      } catch (error) { setInterviewNotFound(true); }
    };
    fetchInterview();
  }, [interviewId, getInterviewById]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
    } catch (err) { console.error("Hardware permission denied"); }
  };

  const startVideoRecording = async (stream: MediaStream, callId: string) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

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

  if (!isVerified) return (
    <div className="p-10 text-center">
      <button onClick={requestPermissions} className="bg-indigo-600 text-white p-4 rounded-xl">Enable Hardware</button>
      {mediaStream && <button onClick={() => setIsVerified(true)} className="ml-4 bg-green-600 text-white p-4 rounded-xl">Hardware Verified</button>}
    </div>
  );

  return (
    <Call 
      interview={interview} 
      videoStream={mediaStream} 
      onStartRecording={(id) => startVideoRecording(mediaStream!, id)} 
      onStopRecording={() => mediaRecorderRef.current?.stop()} 
    />
  );
}
