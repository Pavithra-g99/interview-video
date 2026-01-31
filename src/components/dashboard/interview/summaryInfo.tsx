"use client";

import React from "react";
import { DownloadIcon, VideoIcon, ExternalLinkIcon } from "lucide-react";

// This component represents the view shown in image_c9bfc2.png
function ResponseDetails({ response }: { response: any }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Existing Name and Email section */}
      <div className="flex flex-col">
        <h2 className="text-xl font-bold">{response.name}</h2>
        <p className="text-slate-500">{response.email}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Audio Section (Matching your current dashboard) */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold uppercase text-slate-400">
            Interview Recording
          </h3>
          <div className="flex items-center gap-4">
            <audio src={response.audio_url} controls className="w-full h-10" />
            <a href={response.audio_url} download className="p-2 border rounded-full hover:bg-slate-100">
              <DownloadIcon size={18} />
            </a>
          </div>
        </div>

        {/* NEW: Video URL Section */}
        {response.video_url && (
          <div className="flex flex-col gap-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100 mt-2">
            <h3 className="text-sm font-bold uppercase text-indigo-400">
              Video Interview
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700">
                <VideoIcon size={20} />
                <span className="text-sm font-semibold">Recording successfully saved</span>
              </div>
              <a 
                href={response.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                View Full Video <ExternalLinkIcon size={16} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
