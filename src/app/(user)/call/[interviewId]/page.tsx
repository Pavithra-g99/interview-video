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
      <a className="mt-3 flex flex-row justify-center align-middle" href="https://folo-up.co/" target="_blank" rel="noopener noreferrer">
        <div className="mr-2 text-center text-md font-semibold">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] scale-100 rotate-0 text-indigo-500 transition-all dark:scale-0 dark:-rotate-90" />
      </a>
    </div>
  );
}

function InterviewInterface({ params }: Props) {
  const { interviewId } = params;
  const supabase = createClientComponentClient();
  const { getInterviewById } = useInterviews();

  const [interview, setInterview] = useState<Interview>();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [interviewNotFound, setInterviewNotFound] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
      setPermissionError(false);
    } catch (err) { setPermissionError(true); }
  };

  const startVideoRecording = async (stream: MediaStream, callId: string) => {
    try {
      chunksRef.current = [];
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();

      // Connect Mic
      const sourceMic = audioCtx.createMediaStreamSource(stream);
      sourceMic.connect(destination);

      // Trigger Tab/Screen Audio Capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      // Patch Tab Audio (AI Voice) into the recording
      if (screenStream.getAudioTracks().length > 0) {
        const sourceTabAudio = audioCtx.createMediaStreamSource(screenStream);
        sourceTabAudio.connect(destination);
      }

      // Stop extra screen share video track
      screenStream.getVideoTracks().forEach(track => track.stop());

      const recordingStream = new MediaStream([
        ...stream.getVideoTracks(), // Real Camera
        ...destination.stream.getAudioTracks() // Mixed Audio (Mic + AI)
      ]);

      const recorder = new MediaRecorder(recordingStream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const fileName = `${callId}-${Date.now()}.webm`;

        const { data, error } = await supabase.storage
          .from("interview-videos")
          .upload(fileName, blob, { contentType: 'video/webm', upsert: true });

        if (data) {
          const { data: { publicUrl } } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
          await axios.post("/api/save-video-url", { call_id: callId, videoUrl: publicUrl });
        }
        if (audioCtx.state !== 'closed') audioCtx.close();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

    } catch (err) { console.error("Capture failed:", err); }
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
          <h1 className="mb-2 text-2xl font-bold">Ready to start?</h1>
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl border-4 border-slate-200 bg-slate-900">
            {mediaStream ? (
              <video autoPlay muted playsInline className="h-full w-full object-cover" ref={(el) => { if (el) el.srcObject = mediaStream; }} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-white italic">Camera Preview</div>
            )}
          </div>
          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-all hover:bg-indigo-700">Enable Camera & Mic</button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white transition-all hover:bg-green-700">Verify Hardware <CheckCircle size={20} /></button>
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

export default InterviewInterface;
