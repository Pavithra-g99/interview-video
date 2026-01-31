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

const webClient = new RetellWebClient();

// Fix: Correct the props type to match what the parent is sending
type InterviewProps = {
  interview: Interview;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
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

function Call({ interview, videoStream, onStartRecording, onStopRecording }: InterviewProps) {
  const { createResponse } = useResponses();
  const { tabSwitchCount } = useTabSwitchPrevention();

  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [Loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [callId, setCallId] = useState("");
  const [lastInterviewerResponse, setLastInterviewerResponse] = useState("");
  const [lastUserResponse, setLastUserResponse] = useState("");
  const [activeTurn, setActiveTurn] = useState("");
  const [interviewerImg, setInterviewerImg] = useState("");
  const [interviewTimeDuration, setInterviewTimeDuration] = useState("1");
  const [time, setTime] = useState(0);
  const [currentTimeDuration, setCurrentTimeDuration] = useState("0");

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Sync the video stream to the preview element
  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  /* ================= RETELL EVENTS ================= */
  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      // Start the recording logic defined in the parent
      if (callId) {
        onStartRecording(callId);
      }
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
      setIsEnded(true);
      onStopRecording();
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

    return () => {
      webClient.removeAllListeners();
    };
  }, [callId, onStartRecording, onStopRecording]);

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

      const { call_id, access_token } = registerCallResponse.data.registerCallResponse;
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

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(interview.interviewer_id);
      setInterviewerImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interview.interviewer_id]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}

      <Card className="md:w-[80%] w-[95%] h-[88vh] flex flex-col items-center justify-center border-2 border-black">
        {!isStarted && !isEnded && (
          <div className="p-6 text-center w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{interview.name}</h2>
            <input
              placeholder="Email"
              className="border p-2 w-full mb-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Name"
              className="border p-2 w-full mb-4 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={startConversation} disabled={Loading || !email || !name} className="w-full">
              {Loading ? <MiniLoader /> : "Start Interview"}
            </Button>
          </div>
        )}

        {isStarted && !isEnded && (
          <div className="flex w-full h-full p-4">
            <div className="w-1/2 flex flex-col items-center justify-center p-4 text-center">
              <p className="italic text-lg mb-6">
                &quot;{lastInterviewerResponse || "Listening..."}&quot;
              </p>
              <Image
                src={interviewerImg || "/ai-avatar.png"}
                alt="AI"
                width={140}
                height={140}
                className="rounded-full border-4 border-indigo-500"
              />
              <p className="mt-4 font-bold uppercase text-xs">Interviewer</p>
            </div>

            <div className="w-1/2 flex flex-col items-center justify-center p-4">
              <div className="relative">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-80 h-52 rounded-lg border-4 border-black bg-black object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  REC
                </div>
              </div>
              <p className="mt-4 font-bold uppercase text-xs">You (Candidate)</p>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="flex flex-col items-center justify-center h-full">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold">Interview Completed</h2>
            <p className="text-gray-500">Your recording has been saved successfully.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Call;
