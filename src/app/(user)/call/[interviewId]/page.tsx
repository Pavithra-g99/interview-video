"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import {
  ArrowUpRightSquareIcon,
  Video,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

type Props = { params: { interviewId: string } };

function PopupLoader() {
  return (
    <div className="absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white md:w-[80%]">
      <div className="h-[88vh] items-center justify-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all dark:border-white">
        <div className="relative flex h-full flex-col items-center justify-center">
          <LoaderWithText />
        </div>
      </div>
      <a className="mt-3 flex flex-row justify-center align-middle" href="https://folo-up.co/" target="_blank" rel="noopener noreferrer">
        <div className="mr-2 text-center text-md font-semibold">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] scale-100 rotate-0 text-indigo-500 transition-all dark:scale-0 dark:-rotate-90" />
      </a>
    </div>
  );
}

function PopUpMessage({ title, description, image }: { title: string; description: string; image: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white md:w-[80%]">
      <div className="h-[88vh] content-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all dark:border-white">
        <div className="my-auto flex flex-col items-center justify-center px-6 text-center">
          <Image src={image} alt="Graphic" width={200} height={200} className="mb-4" />
          <h1 className="mb-2 text-md font-medium">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function InterviewInterface({ params }: Props) {
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
      const { data } = await supabase.storage.from("interview-videos").upload(fileName, blob, { contentType: 'video/webm' });
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
        await axios.post("/api/save-video-url", { call_id: callId, videoUrl: publicUrl });
      }
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
  };

  // BUILD FIX: Explicitly handle undefined to satisfy TypeScript
  if (!interview) {
    return interviewNotFound ? <PopUpMessage title="Invalid URL" description="Check URL" image="/invalid-url.png" /> : <PopupLoader />;
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl border-2 border-indigo-100 bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-indigo-600" />
          <h1 className="mb-6 text-2xl font-bold">Hardware Check</h1>
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl border-4 border-slate-200 bg-slate-900 shadow-inner">
            {mediaStream ? (
              <video autoPlay muted playsInline className="h-full w-full object-cover" ref={(el) => { if (el) el.srcObject = mediaStream; }} />
            ) : (
              <div className="flex h-full items-center justify-center text-white italic">Preview Loading...</div>
            )}
          </div>
          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 transition-all">Enable Hardware</button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="w-full rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 transition-all">Start Interview</button>
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
      onStopRecording={() => mediaRecorderRef.current?.stop()} 
    />
  );
}

export default InterviewInterface;
