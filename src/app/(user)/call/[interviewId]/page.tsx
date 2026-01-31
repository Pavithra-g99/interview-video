"use client";

import { useInterviews } from "@/contexts/interviews.context";
import React, { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import Image from "next/image";
import { ArrowUpRightSquareIcon, Video, VideoOff } from "lucide-react";
import { Interview } from "@/types/interview";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";

// Standard Props for Next.js 14
type Props = {
  params: {
    interviewId: string;
  };
};

type PopupProps = {
  title: string;
  description: string;
  image: string;
};

function PopupLoader() {
  return (
    <div className="bg-white rounded-md absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 md:w-[80%] w-[90%]">
      <div className="h-[88vh] justify-center items-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all md:block dark:border-white">
        <div className="relative flex flex-col items-center justify-center h-full">
          <LoaderWithText />
        </div>
      </div>
      <a
        className="flex flex-row justify-center align-middle mt-3"
        href="https://folo-up.co/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="text-center text-md font-semibold mr-2">
          Powered by{" "}
          <span className="font-bold">
            Folo<span className="text-indigo-600">Up</span>
          </span>
        </div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-indigo-500" />
      </a>
    </div>
  );
}

function PopUpMessage({ title, description, image }: PopupProps) {
  return (
    <div className="bg-white rounded-md absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 md:w-[80%] w-[90%]">
      <div className="h-[88vh] content-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all md:block dark:border-white ">
        <div className="flex flex-col items-center justify-center my-auto px-6 text-center">
          <Image
            src={image}
            alt="Graphic"
            width={200}
            height={200}
            className="mb-4"
          />
          <h1 className="text-md font-medium mb-2">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
      <a
        className="flex flex-row justify-center align-middle mt-3"
        href="https://folo-up.co/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="text-center text-md font-semibold mr-2">
          Powered by{" "}
          <span className="font-bold">
            Folo<span className="text-indigo-600">Up</span>
          </span>
        </div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-indigo-500" />
      </a>
    </div>
  );
}

function InterviewInterface({ params }: Props) {
  const { interviewId } = params; // No React.use() needed for Next.js 14
  const supabase = createClientComponentClient();
  
  const [interview, setInterview] = useState<Interview>();
  const [isActive, setIsActive] = useState(true);
  const { getInterviewById } = useInterviews();
  const [interviewNotFound, setInterviewNotFound] = useState(false);
  
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (interview) {
      setIsActive(interview?.is_active === true);
    }
  }, [interview]);

  useEffect(() => {
    const fetchinterview = async () => {
      try {
        const response = await getInterviewById(interviewId);
        if (response) {
          setInterview(response);
          document.title = response.name;
        } else {
          setInterviewNotFound(true);
        }
      } catch (error) {
        console.error(error);
        setInterviewNotFound(true);
      }
    };

    fetchinterview();
  }, [interviewId, getInterviewById]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: true
      });
      setMediaStream(stream);
      setPermissionError(false);
    } catch (err) {
      console.error("Permission access denied:", err);
      setPermissionError(true);
    }
  };

  const startVideoRecording = (stream: MediaStream, currentCallId: string) => {
    chunksRef.current = [];
    
    // Select compatible mime type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
      ? 'video/webm;codecs=vp8,opus' 
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) {
        console.error("No data captured for recording.");
        return;
      }

      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileName = `interview-${currentCallId}-${Date.now()}.webm`;

      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-videos')
        .upload(fileName, blob);

      if (uploadError) {
        console.error("Storage upload error:", uploadError.message);
        return;
      }

      if (uploadData) {
        // 2. Generate and Retrieve the Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('interview-videos')
          .getPublicUrl(fileName);

        // 3. Update Database with the URL
        try {
          await axios.post('/api/save-video-url', { 
            call_id: currentCallId, 
            videoUrl: publicUrl 
          });
        } catch (dbErr) {
          console.error("Failed to link video URL to database:", dbErr);
        }
      }
      chunksRef.current = [];
    };

    // Use 1-second timeslices to ensure data is captured
    recorder.start(1000); 
    mediaRecorderRef.current = recorder;
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div>
      <div className="hidden md:block p-8 mx-auto form-container">
        {!interview ? (
          interviewNotFound ? (
            <PopUpMessage
              title="Invalid URL"
              description="The interview link you're trying to access is invalid."
              image="/invalid-url.png"
            />
          ) : (
            <PopupLoader />
          )
        ) : !isActive ? (
          <PopUpMessage
            title="Interview Is Unavailable"
            description="We are not currently accepting responses."
            image="/closed.png"
          />
        ) : !mediaStream ? (
          <div className="flex flex-col items-center justify-center h-[80vh] border-2 border-dashed rounded-xl bg-gray-50 border-gray-300">
            {permissionError ? (
              <VideoOff size={60} className="text-red-500 mb-4" />
            ) : (
              <Video size={60} className="text-indigo-600 mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
            <p className="text-gray-600 mb-8 max-w-md text-center">
              Grant camera and microphone access to proceed with the recording.
            </p>
            <button 
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all"
              onClick={requestPermissions}
            >
              {permissionError ? "Try Again" : "Enable Camera & Mic"}
            </button>
          </div>
        ) : (
          <Call 
            interview={interview} 
            videoStream={mediaStream}
            onStartRecording={(callId: string) => startVideoRecording(mediaStream, callId)}
            onStopRecording={stopVideoRecording}
          />
        )}
      </div>

      <div className=" md:hidden flex flex-col items-center justify-center my-auto">
        <div className="mt-48 px-3 text-center">
          <p className="text-md font-semibold mb-5">{interview?.name}</p>
          <p className="text-gray-600">Please use a PC to respond to the interview.</p>
        </div>
      </div>
    </div>
  );
}

export default InterviewInterface;
