"use client";

import { Interview } from "@/types/interview";
import { Interviewer } from "@/types/interviewer";
import { Response } from "@/types/response";
import React, { useEffect, useState } from "react";
import { SmileIcon, Info, Video, ExternalLink } from "lucide-react";
import { useInterviewers } from "@/contexts/interviewers.context";
import { PieChart } from "@mui/x-charts/PieChart";
import { CandidateStatus } from "@/lib/enum";
import { convertSecondstoMMSS } from "@/lib/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import DataTable, {
  TableData,
} from "@/components/dashboard/interview/dataTable";
import { ScrollArea } from "@/components/ui/scroll-area";

type SummaryProps = {
  responses: Response[];
  interview: Interview | undefined;
};

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info
            className="h-2 w-2 text-[#4F46E5] inline-block ml-0 align-super font-bold"
            strokeWidth={2.5}
          />
        </TooltipTrigger>
        <TooltipContent className="bg-gray-500 text-white font-normal">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SummaryInfo({ responses, interview }: SummaryProps) {
  const { interviewers } = useInterviewers();
  const [interviewer, setInterviewer] = useState<Interviewer>();
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [completedInterviews, setCompletedInterviews] = useState<number>(0);

  const [sentimentCount, setSentimentCount] = useState({
    positive: 0,
    negative: 0,
    neutral: 0,
  });

  const [tableData, setTableData] = useState<TableData[]>([]);

  const prepareTableData = (responses: Response[]): TableData[] => {
    return responses.map((response) => ({
      call_id: response.call_id,
      name: response.name || "Anonymous",
      overallScore: response.analytics?.overallScore || 0,
      communicationScore: response.analytics?.communication?.score || 0,
      video_url: response.video_url ?? "",
      callSummary:
        response.analytics?.softSkillSummary ||
        response.details?.call_analysis?.call_summary ||
        "No summary available",
    }));
  };

  useEffect(() => {
    if (!interviewers || !interview) return;

    const interviewerObj = interviewers.find(
      (i) => i.id === interview.interviewer_id
    );
    setInterviewer(interviewerObj);
  }, [interviewers, interview]);

  useEffect(() => {
    if (!responses || responses.length === 0) return;

    const sentimentCounter = { positive: 0, negative: 0, neutral: 0 };
    let totalDur = 0;
    let completedCount = 0;

    responses.forEach((response) => {
      const sentiment = response.details?.call_analysis?.user_sentiment;
      if (sentiment === "Positive") sentimentCounter.positive += 1;
      else if (sentiment === "Negative") sentimentCounter.negative += 1;
      else if (sentiment === "Neutral") sentimentCounter.neutral += 1;

      const agentTaskCompletion =
        response.details?.call_analysis?.agent_task_completion_rating;

      if (
        agentTaskCompletion === "Complete" ||
        agentTaskCompletion === "Partial"
      ) {
        completedCount += 1;
      }

      totalDur += response.duration;
    });

    setSentimentCount(sentimentCounter);
    setTotalDuration(totalDur);
    setCompletedInterviews(completedCount);
    setTableData(prepareTableData(responses));
  }, [responses]);

  return (
    <div className="h-screen z-[10] mx-2">
      {responses.length > 0 ? (
        <div className="bg-slate-200 rounded-2xl min-h-[120px] p-2">
          <div className="flex flex-row justify-between items-center mx-2">
            <p className="font-semibold my-2 text-slate-800">Overall Analysis</p>
            <p className="text-sm">
              Interviewer:{" "}
              <span className="font-medium">{interviewer?.name}</span>
            </p>
          </div>

          <p className="my-3 ml-2 text-sm text-slate-600">
            Description:{" "}
            <span className="font-medium">{interview?.description}</span>
          </p>

          <div className="my-2 mt-4 mx-2 p-4 rounded-2xl bg-slate-50 shadow-md border border-slate-100">
            <ScrollArea className="h-[250px]">
              <DataTable data={tableData} interviewId={interview?.id || ""} />
            </ScrollArea>
          </div>

          <div className="flex flex-row gap-4 justify-center mt-4">
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 shadow-md w-full border border-slate-100">
                <div className="flex justify-center gap-1 font-semibold text-[15px] text-slate-700">
                  Average Duration
                  <InfoTooltip content="Average time taken by users" />
                </div>
                <p className="text-2xl font-bold text-indigo-600 text-center mt-2">
                  {convertSecondstoMMSS(totalDuration / responses.length)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 shadow-md w-full border border-slate-100 text-center">
                <div className="flex justify-center gap-1 font-semibold text-[15px] text-slate-700">
                  Completion Rate
                  <InfoTooltip content="Percentage of successful completions" />
                </div>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {Math.round((completedInterviews / responses.length) * 100) || 0}%
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 shadow-md border border-slate-100 min-w-[360px]">
              <div className="flex justify-center gap-2 font-bold mb-4 text-slate-700">
                <SmileIcon size={20} /> Candidate Sentiment
              </div>
              <PieChart
                series={[
                  {
                    data: [
                      { id: 0, value: sentimentCount.positive, label: "Positive", color: "#22c55e" },
                      { id: 1, value: sentimentCount.neutral, label: "Neutral", color: "#eab308" },
                      { id: 2, value: sentimentCount.negative, label: "Negative", color: "#eb4444" },
                    ],
                    innerRadius: 30,
                    paddingAngle: 5,
                    cornerRadius: 5,
                  },
                ]}
                width={340}
                height={150}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center opacity-60">
          <Image src="/no-responses.png" alt="logo" width={200} height={200} />
          <p className="text-center text-sm mt-4 font-medium text-slate-500">
            No interview responses found yet
          </p>
        </div>
      )}
    </div>
  );
}

export default SummaryInfo;
