"use client";

import { Interview } from "@/types/interview";
import { Response } from "@/types/response";
import React from "react";
import { ExternalLink, Download, Video } from "lucide-react";

// This structure must match the props passed by your parent page
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

        {/* NEW: Video Link Section */}
        {response.video_url && (
          <div className="flex flex-col gap-1 mt-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <h3 className="text-sm font-bold uppercase text-indigo-400 flex items-center gap-2">
              <Video size={16} /> Video Interview Recording
            </h3>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-xs text-indigo-700 font-medium">Visual recording available</span>
              <a 
                href={response.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all font-medium"
              >
                View Full Video <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-[10px] text-indigo-300 break-all mt-2">
              URL: {response.video_url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryInfo;
