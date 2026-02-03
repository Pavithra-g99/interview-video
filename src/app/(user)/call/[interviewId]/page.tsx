"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import { ArrowUpRightSquareIcon, Video, CheckCircle, ShieldCheck, Clock } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

// NEXT.JS FIX: Explicitly type the params
interface PageProps {
  params: {
    interviewId: string;
  };
}

// UI Components for loading/error states
function PopupLoader() {
  return (
    <div className="absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white md:w-[80%] shadow-2xl z-50">
      <div className="h-[88vh] flex flex-col items-center justify-center rounded-lg border-2 border-black font-bold">
        <LoaderWithText />
      </div>
    </div>
  );
}

function PopUpMessage({ title, description, image }: { title: string; description: string; image: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white md:w-[80%] shadow-2xl z-50">
      <div className="h-[88vh] flex flex-col items-center justify-center px-6 text-center border-2 border-black rounded-lg">
        <Image src={image} alt="Status" width={200} height={200} className="mb-4" />
        <h1 className="mb-2 text-md font-medium">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
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
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const startVideoRecording = async (userStream: MediaStream, remoteAudioElement: HTMLAudioElement | null, callId: string) => {
    try {
      chunksRef.current = [];
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      const userAudioTrack = userStream.getAudioTracks()[0];
      if (userAudioTrack) {
        const userAudioSource = audioContext.createMediaStreamSource(new MediaStream([userAudioTrack]));
        userAudioSource.connect(destination);
      }

      if (remoteAudioElement) {
        try {
          const remoteAudioSource = audioContext.createMediaElementSource(remoteAudioElement);
          remoteAudioSource.connect(destination);
          remoteAudioSource.connect(audioContext.destination);
        } catch (e) { console.warn("Remote audio capture failed:", e); }
      }

      const videoTrack = userStream.getVideoTracks()[0];
      const mixedAudioTrack = destination.stream.getAudioTracks()[0];
      const combinedStream = new MediaStream([videoTrack, mixedAudioTrack]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm;codecs=vp8,opus" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const fileName = `interview-${callId}-${Date.now()}.webm`;
        const { data } = await supabase.storage.from("interview-videos").upload(fileName, blob, { contentType: 'video/webm' });
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
          await axios.post("/api/save-video-url", { call_id: callId, videoUrl: publicUrl });
        }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (error) { console.error("Recording start failed:", error); }
  };

  if (!interview) {
    return interviewNotFound ? <PopUpMessage title="Not Found" description="Link expired." image="/invalid-url.png" /> : <PopupLoader />;
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
      // BUILD FIX: Pass the arguments correctly to match the startVideoRecording signature
      onStartRecording={(remoteAudioEl, id) => startVideoRecording(mediaStream!, remoteAudioEl, id)} 
      onStopRecording={() => mediaRecorderRef.current?.stop()} 
    />
  );
}
