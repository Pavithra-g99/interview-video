"use client";

import {
  ArrowUpRightSquareIcon,
  AlarmClockIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useResponses } from "@/contexts/responses.context";
import Image from "next/image";
import axios from "axios";
import { RetellWebClient } from "retell-client-js-sdk";
import MiniLoader from "../loaders/mini-loader/miniLoader";
import { toast } from "sonner";
import { isLightColor, testEmail } from "@/lib/utils";
import { ResponseService } from "@/services/responses.service";
import { Interview } from "@/types/interview";
import { FeedbackData } from "@/types/response";
import { FeedbackService } from "@/services/feedback.service";
import { FeedbackForm } from "@/components/call/feedbackForm";
import {
  TabSwitchWarning,
  useTabSwitchPrevention,
} from "./tabSwitchPrevention";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InterviewerService } from "@/services/interviewers.service";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const webClient = new RetellWebClient();

type InterviewProps = {
  interview: Interview;
};

type registerCallResponseType = {
  data: {
    registerCallResponse: {
      call_id: string;
      access_token: string;
    };
  };
};

type transcriptType = {
  role: string;
  content: string;
};

function Call({ interview }: InterviewProps) {
  const supabase = createClientComponentClient();
  const { createResponse } = useResponses();
  const { tabSwitchCount } = useTabSwitchPrevention();

  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [Loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isOldUser, setIsOldUser] = useState(false);
  const [callId, setCallId] = useState("");
  const [lastInterviewerResponse, setLastInterviewerResponse] = useState("");
  const [lastUserResponse, setLastUserResponse] = useState("");
  const [activeTurn, setActiveTurn] = useState("");
  const [interviewerImg, setInterviewerImg] = useState("");
  const [interviewTimeDuration, setInterviewTimeDuration] = useState("1");
  const [time, setTime] = useState(0);
  const [currentTimeDuration, setCurrentTimeDuration] = useState("0");

  /* ================= VIDEO RECORDING STATE ================= */
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  /* ================= CAMERA + RECORDING ================= */
  const startCameraAndRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setVideoStream(stream);

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.muted = true;
      videoPreviewRef.current.play();
    }

    startVideoRecording(stream);
  };

  const startVideoRecording = (stream: MediaStream) => {
    videoChunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(videoChunksRef.current, {
        type: "video/webm",
      });

      if (blob.size > 0) await uploadVideo(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    videoStream?.getTracks().forEach((t) => t.stop());
  };

  const uploadVideo = async (blob: Blob) => {
    const filePath = `videos/${callId}-${Date.now()}.webm`;

    const { error } = await supabase.storage
      .from("interview-videos")
      .upload(filePath, blob);

    if (error) {
      console.error("Video upload failed:", error);
      return;
    }

    const { data } = supabase.storage
      .from("interview-videos")
      .getPublicUrl(filePath);

    await fetch("/api/save-video-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call_id: callId,
        videoUrl: data.publicUrl,
      }),
    });
  };

  /* ================= RETELL EVENTS ================= */
  useEffect(() => {
    webClient.on("call_started", async () => {
      setIsCalling(true);
      await startCameraAndRecording();
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
      setIsEnded(true);
      stopVideoRecording();
    });

    webClient.on("agent_start_talking", () => setActiveTurn("agent"));
    webClient.on("agent_stop_talking", () => setActiveTurn("user"));

    webClient.on("update", (update) => {
      if (update.transcript) {
        const transcripts: transcriptType[] = update.transcript;
        transcripts.forEach((t) => {
          if (t.role === "agent") setLastInterviewerResponse(t.content);
          if (t.role === "user") setLastUserResponse(t.content);
        });
      }
    });

    return () => webClient.removeAllListeners();
  }, [callId]);

  /* ================= START INTERVIEW ================= */
  const startConversation = async () => {
    setLoading(true);

    try {
      const registerCallResponse: registerCallResponseType = await axios.post(
        "/api/register-call",
        {
          dynamic_data: {
            mins: interview.time_duration,
            objective: interview.objective,
            questions: interview.questions.map((q) => q.question).join(", "),
            name,
          },
          interviewer_id: interview.interviewer_id,
        }
      );

      const { call_id, access_token } =
        registerCallResponse.data.registerCallResponse;

      setCallId(call_id);

      await webClient.startCall({ accessToken: access_token });

      await createResponse({
        interview_id: interview.id,
        call_id,
        email,
        name,
      });

      setIsStarted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}

      <Card className="md:w-[80%] w-[95%] h-[88vh]">
        {!isStarted && !isEnded && (
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">{interview.name}</h2>
            <input
              placeholder="Email"
              className="border p-2 w-full mb-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Name"
              className="border p-2 w-full mb-4"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={startConversation} disabled={Loading}>
              {Loading ? <MiniLoader /> : "Start Interview"}
            </Button>
          </div>
        )}

        {isStarted && !isEnded && (
          <div className="flex h-full">
            <div className="w-1/2 flex flex-col items-center justify-center">
              <p className="italic text-lg mb-6">
                {lastInterviewerResponse || "Listening..."}
              </p>
              <Image
                src={interviewerImg || "/ai-avatar.png"}
                alt="AI"
                width={140}
                height={140}
                className="rounded-full"
              />
            </div>

            <div className="w-1/2 flex flex-col items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-72 h-48 rounded-lg border bg-black"
                style={{ transform: "scaleX(-1)" }}
              />
              <p className="mt-2 text-xs uppercase">Recording</p>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="flex flex-col items-center justify-center h-full">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold">Interview Completed</h2>
            <p className="text-gray-500">
              Audio & video successfully recorded.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Call;
