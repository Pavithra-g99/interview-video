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

  // Hardcoded domain to prevent 'undefined' DNS errors
  const domain = "https://interview-video-alpha.vercel.app";
  const slug = readableSlug || url;
  const fullUrl = `${domain}/call/${slug}`;

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
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    // This forces the browser to use the real domain
    window.open(fullUrl, "_blank");
  };

  return (
    <div className="relative inline-block ml-1 mr-3 mt-4 shrink-0">
      <a href={`/interviews/${id}`}>
        <Card className="h-60 w-56 cursor-pointer overflow-hidden rounded-xl p-0 shadow-md transition-shadow hover:shadow-lg">
          <CardContent className="p-0">
            <div className="flex h-40 w-full items-center bg-indigo-600 text-center">
              <CardTitle className="mx-2 mt-3 w-full text-lg text-white">
                {name}
              </CardTitle>
            </div>
            
            <div className="mx-4 flex flex-row items-center">
              <div className="w-full overflow-hidden">
                <Image 
                  src={img || "/placeholder.png"} 
                  alt="Interviewer" 
                  width={70} 
                  height={70} 
                  className="object-cover" 
                />
              </div>
              <div className="mr-2 mt-2 whitespace-nowrap text-sm font-semibold text-black">
                Responses: <span className="font-normal">{responseCount ?? 0}</span>
              </div>
            </div>

            {/* Absolute positioned action buttons */}
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                className="h-6 px-1 text-xs text-indigo-600"
                variant="secondary"
                onClick={handlePreview}
              >
                <ArrowUpRight size={16} />
              </Button>
              <Button
                className={`h-6 px-1 text-xs text-indigo-600 ${copied ? "bg-indigo-300 text-white" : ""}`}
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard();
                }}
              >
                {copied ? <CopyCheck size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </a>
    </div>
  );
}

export default InterviewCard;
