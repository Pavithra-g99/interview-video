"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import { Video, VideoOff, CheckCircle, ShieldCheck } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

type Props = { params: { interviewId: string } };

function InterviewInterface({ params }: Props) {
  const { interviewId } = params;
  const supabase = createClientComponentClient();
  const { getInterviewById } = useInterviews();

  const [interview, setInterview] = useState<Interview>();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true 
      });
      setMediaStream(stream);
      setPermissionError(false);
    } catch (err) {
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
  };

  if (!interview) return <LoaderWithText />;

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border-2 border-indigo-100">
          <ShieldCheck className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ready for your interview?</h1>
          <p className="text-gray-500 mb-6">We need to verify your camera and microphone working correctly before we begin.</p>
          
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6 border-4 border-slate-200">
            {mediaStream ? (
              <video 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover" 
                ref={el => { if (el) el.srcObject = mediaStream; }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                {permissionError ? <VideoOff size={48} className="text-red-400 mb-2" /> : <Video size={48} className="opacity-20 mb-2" />}
                <p className="text-xs opacity-60 px-8 text-center">{permissionError ? "Access Denied. Please check browser settings." : "Camera Preview"}</p>
              </div>
            )}
          </div>

          {!mediaStream ? (
            <button onClick={requestPermissions} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              Enable Camera & Mic
            </button>
          ) : (
            <button onClick={() => setIsVerified(true)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2">
              Looks Good, Start <CheckCircle size={20} />
            </button>
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
