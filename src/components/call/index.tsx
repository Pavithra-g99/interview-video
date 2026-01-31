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

type InterviewProps = {
  interview: Interview;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

type transcriptType = {
  role: string;
  content: string;
};

function Call({ interview, videoStream, onStartRecording, onStopRecording }: InterviewProps) {
  const { createResponse } = useResponses();
  const [lastInterviewerResponse, setLastInterviewerResponse] = useState<string>("");
  const [lastUserResponse, setLastUserResponse] = useState<string>("");
  const [activeTurn, setActiveTurn] = useState<string>("");
  const [Loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isValidEmail, setIsValidEmail] = useState<boolean>(false);
  const [isOldUser, setIsOldUser] = useState<boolean>(false);
  const [callId, setCallId] = useState<string>("");
  const { tabSwitchCount } = useTabSwitchPrevention();
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interviewerImg, setInterviewerImg] = useState("");
  const [interviewTimeDuration, setInterviewTimeDuration] = useState<string>("1");
  const [time, setTime] = useState(0);
  const [currentTimeDuration, setCurrentTimeDuration] = useState<string>("0");

  const lastUserResponseRef = useRef<HTMLDivElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Fix: Force playback on metadata load to prevent black screen
  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const handleFeedbackSubmit = async (formData: Omit<FeedbackData, "interview_id">) => {
    try {
      const result = await FeedbackService.submitFeedback({
        ...formData,
        interview_id: interview.id,
      });

      if (result) {
        toast.success("Thank you for your feedback!");
        setIsFeedbackSubmitted(true);
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  useEffect(() => {
    if (lastUserResponseRef.current) {
      lastUserResponseRef.current.scrollTop = lastUserResponseRef.current.scrollHeight;
    }
  }, [lastUserResponse]);

  useEffect(() => {
    let intervalId: any;
    if (isCalling) {
      intervalId = setInterval(() => setTime((prev) => prev + 1), 10);
    }
    setCurrentTimeDuration(String(Math.floor(time / 100)));
    if (Number(currentTimeDuration) === Number(interviewTimeDuration) * 60) {
      webClient.stopCall();
      setIsEnded(true);
    }
    return () => clearInterval(intervalId);
  }, [isCalling, time, currentTimeDuration, interviewTimeDuration]);

  useEffect(() => {
    if (testEmail(email)) setIsValidEmail(true);
  }, [email]);

  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      if (callId) onStartRecording(callId);
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
      setIsEnded(true);
      onStopRecording();
    });

    webClient.on("agent_start_talking", () => setActiveTurn("agent"));
    webClient.on("agent_stop_talking", () => setActiveTurn("user"));

    webClient.on("error", (error) => {
      console.error("Call error:", error);
      webClient.stopCall();
      setIsEnded(true);
      setIsCalling(false);
      onStopRecording();
    });

    webClient.on("update", (update) => {
      if (update.transcript) {
        const transcripts: transcriptType[] = update.transcript;
        const roleContents: { [key: string]: string } = {};
        transcripts.forEach((transcript) => {
          roleContents[transcript?.role] = transcript?.content;
        });
        setLastInterviewerResponse(roleContents.agent);
        setLastUserResponse(roleContents.user);
      }
    });

    return () => {
      webClient.removeAllListeners();
    };
  }, [onStartRecording, onStopRecording, callId]);

  const onEndCallClick = async () => {
    if (isStarted) {
      setLoading(true);
      webClient.stopCall();
      setIsEnded(true);
      setLoading(false);
      onStopRecording();
    } else {
      setIsEnded(true);
    }
  };

  const startConversation = async () => {
    const data = {
      mins: interview?.time_duration,
      objective: interview?.objective,
      questions: interview?.questions.map((q) => q.question).join(", "),
      name: name || "not provided",
    };
    setLoading(true);

    try {
      const oldUserEmails: string[] = (await ResponseService.getAllEmails(interview.id)).map((item) => item.email);
      const OldUser = oldUserEmails.includes(email) || (interview?.respondents && !interview?.respondents.includes(email));

      if (OldUser) {
        setIsOldUser(true);
      } else {
        const registerCallResponse = await axios.post(
          "/api/register-call",
          { dynamic_data: data, interviewer_id: interview?.interviewer_id },
        );
        if (registerCallResponse.data.registerCallResponse.access_token) {
          await webClient.startCall({
            accessToken: registerCallResponse.data.registerCallResponse.access_token,
          });
          setIsCalling(true);
          setIsStarted(true);
          setCallId(registerCallResponse?.data?.registerCallResponse?.call_id);

          await createResponse({
            interview_id: interview.id,
            call_id: registerCallResponse.data.registerCallResponse.call_id,
            email: email,
            name: name,
          });
        }
      }
    } catch (error) {
      console.error("Start error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (interview?.time_duration) setInterviewTimeDuration(interview?.time_duration);
  }, [interview]);

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(interview.interviewer_id);
      setInterviewerImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interview.interviewer_id]);

  useEffect(() => {
    if (isEnded && callId) {
      const updateInterview = async () => {
        await ResponseService.saveResponse({ is_ended: true, tab_switch_count: tabSwitchCount }, callId);
      };
      updateInterview();
    }
  }, [isEnded, callId, tabSwitchCount]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}
      <div className="bg-white rounded-md md:w-[80%] w-[90%]">
        <Card className="h-[88vh] rounded-lg border-2 border-b-4 border-r-4 border-black text-xl font-bold transition-all md:block dark:border-white">
          <div className="flex flex-col h-full">
            {/* Header and Progress section remains the same */}
            <div className="m-4 h-[15px] rounded-lg border-[1px] border-black overflow-hidden">
              <div
                className="bg-indigo-600 h-[15px] transition-all duration-300"
                style={{
                  width: isEnded
                    ? "100%"
                    : `${(Number(currentTimeDuration) / (Number(interviewTimeDuration) * 60)) * 100}%`,
                }}
              />
            </div>
            
            {!isStarted && !isEnded && !isOldUser && (
              <div className="w-fit min-w-[400px] max-w-[400px] mx-auto mt-2 border border-indigo-200 rounded-md p-4 bg-slate-50 text-center">
                <p className="text-sm mb-4">Grant camera access. Tab switching is recorded.</p>
                <div className="flex flex-col gap-3">
                  <input
                    className="py-2 border-2 rounded-md w-full px-2 border-gray-400 text-sm"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="py-2 border-2 rounded-md w-full px-2 border-gray-400 text-sm"
                    placeholder="First name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button 
                  className="h-10 px-6 rounded-lg mt-6"
                  style={{ backgroundColor: interview.theme_color ?? "#4F46E5" }}
                  disabled={Loading || (!isValidEmail || !name)}
                  onClick={startConversation}
                >
                  {!Loading ? "Start Interview" : <MiniLoader />}
                </Button>
              </div>
            )}

            {isStarted && !isEnded && !isOldUser && (
              <div className="flex flex-row p-2 grow h-[60vh]">
                <div className="border-r-2 border-slate-100 w-[50%] flex flex-col items-center justify-center p-4">
                  <div className="text-lg italic text-slate-700 mb-8">&quot;{lastInterviewerResponse || "Connecting..."}&quot;</div>
                  <Image alt="AI" height={140} width={140} className="rounded-full object-cover" src={interviewerImg || "/ai-avatar.png"} />
                </div>

                <div className="w-[50%] flex flex-col items-center justify-center p-4">
                  <div className="text-lg text-indigo-600 mb-8">{lastUserResponse || "Listening..."}</div>
                  <div className="relative w-[280px] h-[180px] bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-200">
                    {videoStream ? (
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover mirror"
                        style={{ transform: "scaleX(-1)" }}
                        onLoadedMetadata={(e) => e.currentTarget.play()} // Critical fix for black screen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">Offline</div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-indigo-600/80 text-[10px] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> REC
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* End calls and Feedback sections remain the same */}
            {(isEnded || isOldUser) && (
              <div className="flex flex-col items-center justify-center grow text-center px-10">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-6" />
                <h2 className="text-2xl font-bold mb-2">Interview Completed</h2>
                <Button className="bg-indigo-600 mt-8" onClick={() => setIsDialogOpen(true)}>Provide Feedback</Button>
                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <AlertDialogContent><FeedbackForm email={email} onSubmit={handleFeedbackSubmit} /></AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Call;
