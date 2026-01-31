"use client";

import { Interview } from "@/types/interview";
import { Response } from "@/types/response";
import React from "react";
import { ExternalLink, Download, Video } from "lucide-react";

// Matches the structure passed by the parent page
type SummaryInfoProps = {
  response: Response;
  interview?: Interview;
};

const SummaryInfo = ({ response, interview }: SummaryInfoProps) => {
  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-slate-900">{response.name || "Anonymous"}</h2>
        <p className="text-slate-500">{response.email}</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Existing Audio Section */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold uppercase text-slate-400">
            Interview Recording
          </h3>
          <div className="flex items-center gap-4">
            <audio src={response.audio_url} controls className="w-full h-10" />
            <a 
              href={response.audio_url} 
              download 
              className="p-2 border rounded-full hover:bg-slate-100 transition-colors"
            >
              <Download size={18} />
            </a>
          </div>
        </div>

        {/* Simplified Video Link Section */}
        {response.video_url && (
          <div className="flex flex-col gap-1 mt-2">
            <h3 className="text-sm font-bold uppercase text-indigo-400 flex items-center gap-2">
              <Video size={16} /> Video Recording URL
            </h3>
            <div className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 break-all">
              <ExternalLink size={14} className="shrink-0" />
              <a 
                href={response.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                {response.video_url}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Default export required to fix build error
export default SummaryInfo;
