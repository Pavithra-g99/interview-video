"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

export default function InterviewInterface({ params }: { params: { interviewId: string } }) {
  const { interviewId } = params;
  const supabase = createClientComponentClient();
  const { getInterviewById } = useInterviews();
  const [interview, setInterview] = useState<any>();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchInterview = async () => {
      const response = await getInterviewById(interviewId);
      if (response) setInterview(response);
    };
    fetchInterview();
  }, [interviewId, getInterviewById]);

  const requestPermissions = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setMediaStream(stream);
  };

  const startVideoRecording = async (stream: MediaStream, callId: string) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const fileName = `interview-${callId}.webm`;
      const { data } = await supabase.storage.from("interview-videos").upload(fileName, blob);
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
      <button onClick={requestPermissions} className="bg-blue-500 text-white p-2 rounded">Enable Camera</button>
      {mediaStream && <button onClick={() => setIsVerified(true)} className="ml-2 bg-green-500 text-white p-2 rounded">Start</button>}
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
