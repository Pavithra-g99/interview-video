"use client";

import React from "react";
import { DownloadIcon, VideoIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryInfoProps {
  response: any; // Ensure this object contains the video_url from Supabase
}

function SummaryInfo({ response }: SummaryInfoProps) {
  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-slate-900">{response.name || "Anonymous"}</h2>
        <p className="text-slate-500">{response.email}</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Audio Recording Section (Matches your screenshot) */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Interview Audio
          </h3>
          <div className="flex items-center gap-4">
            <audio src={response.audio_url} controls className="w-full h-10" />
            <a 
              href={response.audio_url} 
              download 
              className="p-2 border rounded-full hover:bg-slate-100 transition-colors"
            >
              <DownloadIcon size={18} />
            </a>
          </div>
        </div>

        {/* NEW: Video Recording Section */}
        {response.video_url && (
          <div className="flex flex-col gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">
              Interview Video
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700">
                <VideoIcon size={20} />
                <span className="text-sm font-medium">Video interview recording is ready</span>
              </div>
              <Button 
                asChild
                className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
              >
                <a 
                  href={response.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Full Video <ExternalLinkIcon size={16} />
                </a>
              </Button>
            </div>
            <p className="text-[10px] text-indigo-400 break-all">
              Source: {response.video_url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryInfo;
