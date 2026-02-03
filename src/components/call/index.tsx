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
import { testEmail } from "@/lib/utils";
import { ResponseService } from "@/services/responses.service";
import { Interview } from "@/types/interview";
import { FeedbackService } from "@/services/feedback.service";
import { FeedbackForm } from "@/components/call/feedbackForm";
import {
  TabSwitchWarning,
  useTabSwitchPrevention,
} from "./tabSwitchPrevention";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { InterviewerService } from "@/services/interviewers.service";

const webClient = new RetellWebClient();

type InterviewProps = {
  interview: Interview;
  videoStream: MediaStream | null;
  onStartRecording: (remoteAudioElement: HTMLAudioElement | null, callId: string) => void;
  onStopRecording: () => void;
};

function Call({
  interview,
  videoStream,
  onStartRecording,
  onStopRecording,
}: InterviewProps) {
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
  
  // DURATION FIX: Correctly pulls the 5, 15, or 60 value from the database
  const [interviewTimeDuration, setInterviewTimeDuration] = useState<string>(
    interview?.time_duration || "15"
  );
  const [time, setTime] = useState(0);

  const lastUserResponseRef = useRef<HTMLDivElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream, isStarted]);

  // Sync duration if the interview object updates
  useEffect(() => {
    if (interview?.time_duration) {
      setInterviewTimeDuration(interview.time_duration);
    }
  }, [interview]);

  useEffect(() => {
    let intervalId: any;
    if (isCalling && isStarted) {
      intervalId = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }

    // Dynamic timer end logic
    if (time > 0 && time >= Number(interviewTimeDuration) * 60) {
      webClient.stopCall();
      setIsEnded(true);
    }

    return () => clearInterval(intervalId);
  }, [isCalling, isStarted, time, interviewTimeDuration]);

  useEffect(() => {
    if (testEmail(email)) setIsValidEmail(true);
  }, [email]);

  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      if (callId) {
        const audioElements = document.querySelectorAll('audio');
        let audioElement: HTMLAudioElement | null = null;
        for (let i = 0; i < audioElements.length; i++) {
          if (audioElements[i].srcObject) {
            audioElement = audioElements[i];
            break;
          }
        }
        onStartRecording(audioElement, callId);
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
        const roleContents: { [key: string]: string } = {};
        update.transcript.forEach((transcript: any) => {
          roleContents[transcript?.role] = transcript?.content;
        });
        setLastInterviewerResponse(roleContents.agent || "");
        setLastUserResponse(roleContents.user || "");
      }
    });

    return () => { webClient.removeAllListeners(); };
  }, [callId, onStartRecording, onStopRecording]);

  const startConversation = async () => {
    setLoading(true);
    const data = {
      mins: interview?.time_duration,
      objective: interview?.objective,
      questions: interview?.questions.map((q) => q.question).join(", "),
      name: name || "not provided",
    };

    try {
      const oldEmails = (await ResponseService.getAllEmails(interview.id)).map(i => i.email);
      if (oldEmails.includes(email)) {
        setIsOldUser(true);
        setLoading(false);
        return;
      }

      const res = await axios.post("/api/register-call", {
        dynamic_data: data,
        interviewer_id: interview?.interviewer_id,
      });
      
      if (res.data.registerCallResponse.access_token) {
        const newCallId = res.data.registerCallResponse.call_id;
        setCallId(newCallId);
        await createResponse({
          interview_id: interview.id,
          call_id: newCallId,
          email,
          name,
        });
        await webClient.startCall({ accessToken: res.data.registerCallResponse.access_token });
        setIsStarted(true);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleFeedbackSubmit = async (formData: any) => {
    const result = await FeedbackService.submitFeedback({ ...formData, interview_id: interview.id });
    if (result) {
      setIsFeedbackSubmitted(true);
      setIsDialogOpen(false);
      toast.success("Thank you for your feedback!");
    }
  };

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(interview.interviewer_id);
      setInterviewerImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interview.interviewer_id]);

  useEffect(() => {
    if (isEnded && callId) {
      ResponseService.saveResponse({ is_ended: true, tab_switch_count: tabSwitchCount }, callId);
    }
  }, [isEnded, callId, tabSwitchCount]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}
      <div className="bg-white rounded-md md:w-[80%] w-[90%]">
        <Card className="h-[88vh] rounded-lg border-2 border-black font-bold transition-all">
          <div className="m-4 h-[15px] rounded-lg border-[1px] border-black overflow-hidden">
            <div
              className="bg-indigo-600 h-[15px] transition-all duration-500"
              style={{
                width: isEnded
                  ? "100%"
                  // Progress bar calculation now dynamic
                  : `${(time / (Number(interviewTimeDuration) * 60)) * 100}%`,
              }}
            />
          </div>

          <CardHeader className="items-center p-1">
            {!isEnded && <CardTitle className="text-lg md:text-xl font-bold mb-2">{interview?.name}</CardTitle>}
            {!isEnded && (
              <div className="flex mt-2 flex-row text-sm font-normal items-center">
                <AlarmClockIcon className="mr-2" style={{ color: interview.theme_color }} size={16} />
                Expected duration: <span className="font-bold ml-1" style={{ color: interview.theme_color }}>
                  {interviewTimeDuration} mins
                </span> or less
              </div>
            )}
          </CardHeader>

          {!isStarted && !isEnded && !isOldUser && (
            <div className="w-fit min-w-[400px] max-w-[400px] mx-auto mt-2 border border-indigo-200 rounded-md p-6 bg-slate-50 text-center">
              {interview?.logo_url && <Image alt="Logo" className="h-10 w-auto mx-auto mb-4" height={100} src={interview.logo_url} width={100} />}
              <p className="text-sm font-normal mb-4 whitespace-pre-line">{interview?.description}</p>
              <div className="flex flex-col gap-3">
                <input className="py-2 border-2 rounded-md w-full px-2 text-sm font-normal" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="py-2 border-2 rounded-md w-full px-2 text-sm font-normal" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button className="w-full mt-6 h-10" disabled={Loading || !isValidEmail || !name} style={{ backgroundColor: interview.theme_color ?? "#4F46E5", color: "white" }} onClick={startConversation}>
                {!Loading ? "Start Interview" : <MiniLoader />}
              </Button>
            </div>
          )}

          {isStarted && !isEnded && (
            <div className="flex flex-row p-6 grow h-[55vh] gap-4">
              <div className="w-1/2 flex flex-col items-center justify-center border-r-2 border-gray-100 font-normal">
                <div className="text-lg italic mb-8 px-6 text-center">&quot;{lastInterviewerResponse || "Hello!"}&quot;</div>
                <Image alt="Interviewer" className={`rounded-full object-cover ${activeTurn === "agent" ? "ring-4 ring-indigo-500" : ""}`} height={120} src={interviewerImg || "/ai-avatar.png"} width={120} />
                <div className="mt-2 text-sm">Interviewer</div>
              </div>
              <div className="w-1/2 flex flex-col items-center justify-center font-normal">
                <div className="text-lg text-indigo-600 font-medium mb-8 px-6 text-center h-[100px] overflow-y-auto">{lastUserResponse || "Listening..."}</div>
                <div className="relative w-80 h-48 bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-200">
                  <video autoPlay muted playsInline className="w-full h-full object-cover" ref={videoPreviewRef} style={{ transform: "scaleX(-1)" }} />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-white rounded-full" /> LIVE
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-400">You (Candidate)</div>
              </div>
            </div>
          )}

          {isStarted && !isEnded && (
            <div className="flex justify-center mt-8">
              <Button className="border-red-600 text-red-600" variant="outline" onClick={() => { webClient.stopCall(); setIsEnded(true); onStopRecording(); }}>
                End Interview <XCircleIcon className="ml-2" size={18} />
              </Button>
            </div>
          )}

          {isEnded && (
            <div className="flex flex-col items-center justify-center grow text-center px-10 pt-20 font-normal">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold mb-2">Interview Completed</h2>
              <p className="text-gray-500 mb-8">Thank you! Your response and video have been recorded.</p>
              {!isFeedbackSubmitted && <Button className="bg-indigo-600" onClick={() => setIsDialogOpen(true)}>Provide Feedback</Button>}
            </div>
          )}
        </Card>
        <a className="flex flex-row justify-center align-middle mt-3" href="https://folo-up.co/" rel="noreferrer" target="_blank">
          <div className="text-center text-md font-semibold mr-2">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
          <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] text-indigo-500" />
        </a>
      </div>
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <FeedbackForm email={email} onSubmit={handleFeedbackSubmit} />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Call;
