"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import { ArrowUpRightSquareIcon, Video, VideoOff, CheckCircle, ShieldCheck } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

type Props = { params: { interviewId: string } };

function PopupLoader() {
  return (
    <div className="bg-white rounded-md absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 md:w-[80%] w-[90%]">
      <div className="h-[88vh] justify-center items-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all md:block dark:border-white">
        <div className="relative flex flex-col items-center justify-center h-full">
          <LoaderWithText />
        </div>
      </div>
      <a className="flex flex-row justify-center align-middle mt-3" href="https://folo-up.co/" target="_blank" rel="noopener noreferrer">
        <div className="text-center text-md font-semibold mr-2">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-indigo-500" />
      </a>
    </div>
  );
}

function PopUpMessage({ title, description, image }: { title: string; description: string; image: string }) {
  return (
    <div className="bg-white rounded-md absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 md:w-[80%] w-[90%]">
      <div className="h-[88vh] content-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all md:block dark:border-white ">
        <div className="flex flex-col items-center justify-center my-auto px-6 text-center">
          <Image src={image} alt="Graphic" width={200} height={200} className="mb-4" />
          <h1 className="text-md font-medium mb-2">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
      <a className="flex flex-row justify-center align-middle mt-3" href="https://folo-up.co/" target="_blank" rel="noopener noreferrer">
        <div className="text-center text-md font-semibold mr-2">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-indigo-500" />
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

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await getInterviewById(interviewId);
        if (response) {
          setInterview(response);
          document.title = response.name;
        } else {
          setInterviewNotFound(true);
        }
      } catch (error) {
        setInterviewNotFound(true);
      }
    };
    fetchInterview();
  }, [interviewId, getInterviewById]);

  // NEW: Updated to capture both Microphone and AI Tab Audio
  const requestPermissions = async () => {
    try {
      // 1. Capture Camera and Microphone
      const userStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true 
      });

      // 2. Capture Tab Audio (Prompt for Tab Share)
      const tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required for getDisplayMedia to work
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // 3. Create Audio Context to merge the two audio sources
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();
      
      // Source 1: Microphone
      const micSource = audioContext.createMediaStreamSource(userStream);
      micSource.connect(dest);

      // Source 2: Tab Audio (AI agent)
      const tabAudioSource = audioContext.createMediaStreamSource(tabStream);
      tabAudioSource.connect(dest);

      // 4. Combine Video from Camera with the Merged Audio
      const combinedStream = new MediaStream([
        ...userStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      setMediaStream(combinedStream);
      setPermissionError(false);

      // Clean up the unused tab video track to avoid showing a redundant preview
      tabStream.getVideoTracks().forEach(track => track.stop());

    } catch (err) {
      console.error("Hardware access denied", err);
      setPermissionError(true);
    }
  };

  const startVideoRecording = (stream: MediaStream, callId: string) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileName = `interview-${callId}-${Date.now()}.webm`;
      const { data } = await supabase.storage.from('interview-videos').upload(fileName, blob);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('interview-videos').getPublicUrl(fileName);
        await axios.post('/api/save-video-url', { call_id: callId, videoUrl: publicUrl });
      }
    };
    recorder.start(1000); 
    mediaRecorderRef.current = recorder;
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  if (!interview) return interviewNotFound ? <PopUpMessage title="Invalid URL" description="Check URL" image="/invalid-url.png" /> : <PopupLoader />;

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border-2 border-indigo-100">
          <ShieldCheck className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ready for your interview?</h1>
          <p className="text-gray-500 mb-6 text-sm">Verify your camera is working before we begin. <b>Note:</b> You will be prompted to share your screen tab to record audio.</p>
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6 border-4 border-slate-200 shadow-inner">
            {mediaStream ? (
              <video autoPlay muted playsInline className="w-full h-full object-cover" ref={el => { if (el) el.srcObject = mediaStream; }} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                {permissionError ? <VideoOff size={48} className="text-red-400 mb-2" /> : <Video size={48} className="opacity-20 mb-2" />}
                <p className="text-xs opacity-60 px-8">{permissionError ? "Access Denied. Check browser settings." : "Camera Preview"}</p>
              </div>
            )}
          </div>
          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">Enable Camera & Mic</button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">Hardware Verified <CheckCircle size={20} /></button>
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
