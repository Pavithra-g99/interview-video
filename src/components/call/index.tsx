"use client";

import { ArrowUpRightSquareIcon, AlarmClockIcon, XCircleIcon, CheckCircleIcon } from "lucide-react";
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
import { TabSwitchWarning, useTabSwitchPrevention } from "./tabSwitchPrevention";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InterviewerService } from "@/services/interviewers.service";

const webClient = new RetellWebClient();

type InterviewProps = {
  interview: Interview;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

type transcriptType = { role: string; content: string; };

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

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream, isStarted]);

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
    webClient.on("update", (update) => {
      if (update.transcript) {
        const roleContents: { [key: string]: string } = {};
        update.transcript.forEach((t: any) => { roleContents[t?.role] = t?.content; });
        setLastInterviewerResponse(roleContents["agent"]);
        setLastUserResponse(roleContents["user"]);
      }
    });
    return () => { webClient.removeAllListeners(); };
  }, [callId, onStartRecording, onStopRecording]);

  useEffect(() => {
    let intervalId: any;
    if (isCalling) intervalId = setInterval(() => setTime(t => t + 1), 10);
    setCurrentTimeDuration(String(Math.floor(time / 100)));
    if (Number(currentTimeDuration) == Number(interviewTimeDuration) * 60) {
      webClient.stopCall();
      setIsEnded(true);
    }
    return () => clearInterval(intervalId);
  }, [isCalling, time, currentTimeDuration, interviewTimeDuration]);

  const startConversation = async () => {
    const data = {
      mins: interview?.time_duration,
      objective: interview?.objective,
      questions: interview?.questions.map((q) => q.question).join(", "),
      name: name || "not provided",
    };
    setLoading(true);
    const oldUserEmails: string[] = (await ResponseService.getAllEmails(interview.id)).map((item) => item.email);
    if (oldUserEmails.includes(email)) {
      setIsOldUser(true);
    } else {
      const res = await axios.post("/api/register-call", { dynamic_data: data, interviewer_id: interview?.interviewer_id });
      if (res.data.registerCallResponse.access_token) {
        setCallId(res.data.registerCallResponse.call_id);
        await createResponse({ interview_id: interview.id, call_id: res.data.registerCallResponse.call_id, email, name });
        await webClient.startCall({ accessToken: res.data.registerCallResponse.access_token });
        setIsStarted(true);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(interview.interviewer_id);
      setInterviewerImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interview.interviewer_id]);

  useEffect(() => {
    if (isEnded) ResponseService.saveResponse({ is_ended: true, tab_switch_count: tabSwitchCount }, callId);
  }, [isEnded, callId, tabSwitchCount]);

  const handleFeedbackSubmit = async (formData: any) => {
    const result = await FeedbackService.submitFeedback({ ...formData, interview_id: interview.id });
    if (result) { setIsFeedbackSubmitted(true); setIsDialogOpen(false); toast.success("Sent!"); }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}
      <div className="bg-white rounded-md md:w-[80%] w-[90%]">
        <Card className="h-[88vh] rounded-lg border-2 border-b-4 border-r-4 border-black text-xl font-bold transition-all md:block dark:border-white ">
          <div className="m-4 h-[15px] rounded-lg border-[1px] border-black overflow-hidden">
            <div className="bg-indigo-600 h-[15px]" style={{ width: isEnded ? "100%" : `${(Number(currentTimeDuration) / (Number(interviewTimeDuration) * 60)) * 100}%` }} />
          </div>
          <CardHeader className="items-center p-1">
            {!isEnded && <CardTitle className="text-lg md:text-xl font-bold mb-2">{interview?.name}</CardTitle>}
            {!isEnded && (
              <div className="flex mt-2 flex-row text-sm font-normal items-center">
                <AlarmClockIcon className="mr-2" style={{ color: interview.theme_color }} size={16} />
                Expected duration: <span className="font-bold ml-1" style={{ color: interview.theme_color }}>{interview.time_duration} mins</span> or less
              </div>
            )}
          </CardHeader>

          {/* PHASE 2: LOGIN FORM (Picture 3) */}
          {!isStarted && !isEnded && !isOldUser && (
            <div className="w-fit min-w-[400px] max-w-[400px] mx-auto mt-2 border border-indigo-200 rounded-md p-6 bg-slate-50 text-center">
              {interview?.logo_url && <Image src={interview.logo_url} alt="Logo" className="h-10 w-auto mx-auto mb-4" width={100} height={100} />}
              <p className="text-sm font-normal mb-4 whitespace-pre-line">{interview?.description}</p>
              <p className="font-bold text-sm mb-4">Ensure volume is up. Grant camera/mic access. Tab switching is recorded.</p>
              <input value={email} className="mb-2 py-2 border-2 rounded-md w-full px-2 text-sm font-normal" placeholder="Email address" onChange={(e) => setEmail(e.target.value)} />
              <input value={name} className="mb-4 py-2 border-2 rounded-md w-full px-2 text-sm font-normal" placeholder="First name" onChange={(e) => setName(e.target.value)} />
              <Button className="w-full h-10 rounded-lg" style={{ backgroundColor: interview.theme_color ?? "#4F46E5", color: "white" }} disabled={Loading || !isValidEmail || !name} onClick={startConversation}>
                {!Loading ? "Start Interview" : <MiniLoader />}
              </Button>
            </div>
          )}

          {/* PHASE 3: INTERVIEW (Picture 4 + Video) */}
          {isStarted && !isEnded && (
            <div className="flex flex-row p-6 grow h-[60vh] gap-4">
              <div className="w-1/2 flex flex-col items-center justify-center border-r-2 border-gray-100">
                <div className="text-lg md:text-xl italic mb-8 px-6 text-center">"{lastInterviewerResponse || "Just checking..."}"</div>
                <Image src={interviewerImg || "/ai-avatar.png"} alt="Interviewer" width={140} height={140} className={`rounded-full object-cover ${activeTurn === "agent" ? "ring-4 ring-indigo-500 ring-offset-4" : "opacity-80"}`} />
                <div className="font-semibold mt-4">Interviewer</div>
              </div>

              <div className="w-1/2 flex flex-col items-center justify-center">
                <div className="text-lg md:text-xl text-indigo-600 font-medium mb-8 px-6 text-center">{lastUserResponse || "Listening..."}</div>
                <div className="relative w-80 h-52 bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-200 shadow-lg">
                  <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-white rounded-full"></span> LIVE RECORDING
                  </div>
                </div>
                <div className="font-semibold mt-4 text-gray-500">You (Candidate)</div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          {isStarted && !isEnded && (
            <div className="flex justify-center mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" className="border-red-600 text-red-600">End Interview <XCircleIcon className="ml-2" size={18} /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Call will end.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600" onClick={() => { webClient.stopCall(); setIsEnded(true); onStopRecording(); }}>Continue</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* COMPLETION SCREEN */}
          {(isEnded || isOldUser) && (
            <div className="flex flex-col items-center justify-center grow text-center px-10 pt-20">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold mb-2">Interview Completed</h2>
              <p className="text-gray-500 mb-8">{isOldUser ? "Already responded." : "Recorded successfully."}</p>
              {!isFeedbackSubmitted && !isOldUser && (
                <Button className="bg-indigo-600" onClick={() => setIsDialogOpen(true)}>Provide Feedback</Button>
              )}
            </div>
          )}
        </Card>
        <a className="flex flex-row justify-center align-middle mt-3" href="https://folo-up.co/" target="_blank">
          <div className="text-center text-md font-semibold mr-2">Powered by <span className="font-bold">Folo<span className="text-indigo-600">Up</span></span></div>
          <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] text-indigo-500" />
        </a>
      </div>
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><AlertDialogContent><FeedbackForm email={email} onSubmit={handleFeedbackSubmit} /></AlertDialogContent></AlertDialog>
    </div>
  );
}

export default Call;
