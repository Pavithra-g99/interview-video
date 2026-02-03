"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, ArrowUpRight, CopyCheck } from "lucide-react";
import { ResponseService } from "@/services/responses.service";
import { InterviewerService } from "@/services/interviewers.service";
import axios from "axios";

interface Props {
  name: string | null;
  interviewerId: bigint;
  id: string;
  url: string;
  readableSlug: string;
}

function InterviewCard({ name, interviewerId, id, url, readableSlug }: Props) {
  const [copied, setCopied] = useState(false);
  const [responseCount, setResponseCount] = useState<number | null>(null);
  const [img, setImg] = useState("");

  // Force the absolute URL to fix 'undefined' errors
  const getFullInterviewUrl = () => {
    const origin = "https://interview-video-alpha.vercel.app";
    const slug = readableSlug || url;
    return `${origin}/call/${slug}`;
  };

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(interviewerId);
      setImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interviewerId]);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const responses = await ResponseService.getAllResponses(id);
        setResponseCount(responses.length);
      } catch (error) {
        console.error(error);
      }
    };
    fetchResponses();
  }, [id]);

  const copyToClipboard = () => {
    const fullUrl = getFullInterviewUrl();
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      toast.success("Full link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleJumpToInterview = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    // Opens absolute URL to fix DNS_PROBE_FINISHED_NXDOMAIN
    window.open(getFullInterviewUrl(), "_blank"); 
  };

  return (
    <a href={`/interviews/${id}`}>
      <Card className="relative p-0 mt-4 inline-block cursor-pointer h-60 w-56 ml-1 mr-3 rounded-xl shrink-0 overflow-hidden shadow-md">
        <CardContent>
          <div className="w-full h-40 overflow-hidden bg-indigo-600 flex items-center text-center">
            <CardTitle className="w-full mt-3 mx-2 text-white text-lg">{name}</CardTitle>
          </div>
          <div className="flex flex-row items-center mx-4">
            <div className="w-full overflow-hidden">
              <Image src={img || "/placeholder.png"} alt="Interviewer" width={70} height={70} className="object-cover" />
            </div>
            <div className="text-black text-sm font-semibold mt-2 mr-2 whitespace-nowrap">
              Responses: <span className="font-normal">{responseCount ?? 0}</span>
            </div>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button className="text-xs text-indigo-600 px-1 h-6" variant="secondary" onClick={handleJumpToInterview}>
              <ArrowUpRight size={16} />
            </Button>
            <Button className={`text-xs text-indigo-600 px-1 h-6 ${copied ? "bg-indigo-300 text-white" : ""}`} variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyToClipboard(); }}>
              {copied ? <CopyCheck size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default InterviewCard;
