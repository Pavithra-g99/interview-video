"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Interview } from "@/types/interview";

interface CallInfoProps {
  interview: Interview;
}

// This is the header component for the LIVE call screen
const CallInfo = ({ interview }: CallInfoProps) => {
  return (
    <div className="flex flex-col items-center">
      {/* Displays the dynamic name of the interview (e.g., gttht) */}
      <h1 className="text-2xl font-bold">{interview?.name}</h1>
      
      <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-1">
        <Clock size={14} />
        {/* DURATION FIX: Correctly pulls the time you set (e.g., 5, 20, or 60 mins) */}
        <span>
          Expected duration: {interview?.time_duration || "15"} mins or less
        </span>
      </div>
    </div>
  );
};

export default CallInfo;
