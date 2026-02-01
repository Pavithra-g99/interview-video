"use client";

import { Interview } from "@/types/interview";
import { Interviewer } from "@/types/interviewer";
import { Response } from "@/types/response";
import React, { useEffect, useState } from "react";
import { SmileIcon, Info } from "lucide-react";
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

  const [candidateStatusCount, setCandidateStatusCount] = useState({
    [CandidateStatus.NO_STATUS]: 0,
    [CandidateStatus.NOT_SELECTED]: 0,
    [CandidateStatus.POTENTIAL]: 0,
    [CandidateStatus.SELECTED]: 0,
  });

  const [tableData, setTableData] = useState<TableData[]>([]);

  /**
   * Prepare table data
   * IMPORTANT: video_url is intentionally passed
   * so DataTable can show Video icon / modal / player
   */
  const prepareTableData = (responses: Response[]): TableData[] => {
    return responses.map((response) => ({
      call_id: response.call_id,
      name: response.name || "Anonymous",
      overallScore: response.analytics?.overallScore || 0,
      communicationScore: response.analytics?.communication?.score || 0,
      video_url: response.video_url ?? "", // ✅ FINAL & SAFE
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

    const statusCounter = {
      [CandidateStatus.NO_STATUS]: 0,
      [CandidateStatus.NOT_SELECTED]: 0,
      [CandidateStatus.POTENTIAL]: 0,
      [CandidateStatus.SELECTED]: 0,
    };

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

      if (
        Object.values(CandidateStatus).includes(
          response.candidate_status as CandidateStatus
        )
      ) {
        statusCounter[response.candidate_status as CandidateStatus]++;
      }
    });

    setSentimentCount(sentimentCounter);
    setTotalDuration(totalDur);
    setCompletedInterviews(completedCount);
    setCandidateStatusCount(statusCounter);
    setTableData(prepareTableData(responses));
  }, [responses]);

  return (
    <div className="h-screen z-[10] mx-2">
      {responses.length > 0 ? (
        <div className="bg-slate-200 rounded-2xl min-h-[120px] p-2">
          <div className="flex flex-row justify-between items-center mx-2">
            <p className="font-semibold my-2">Overall Analysis</p>
            <p className="text-sm">
              Interviewer used:{" "}
              <span className="font-medium">{interviewer?.name}</span>
            </p>
          </div>

          <p className="my-3 ml-2 text-sm">
            Interview Description:{" "}
            <span className="font-medium">{interview?.description}</span>
          </p>

          <div className="my-2 mt-4 mx-2 p-4 rounded-2xl bg-slate-50 shadow-md">
            <ScrollArea className="h-[250px]">
              <DataTable data={tableData} interviewId={interview?.id || ""} />
            </ScrollArea>
          </div>

          <div className="flex flex-row gap-2 justify-center">
            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 shadow-md max-w-[400px]">
                <div className="flex justify-center gap-1 font-semibold text-[15px]">
                  Average Duration
                  <InfoTooltip content="Average time users took" />
                </div>
                <p className="text-2xl font-semibold text-indigo-600 text-center mt-2">
                  {convertSecondstoMMSS(totalDuration / responses.length)}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 shadow-md max-w-[360px] text-center">
                <div className="flex justify-center gap-1 font-semibold text-[15px]">
                  Interview Completion Rate
                  <InfoTooltip content="Percentage of interviews completed" />
                </div>
                <p className="text-2xl font-semibold text-indigo-600 mt-2">
                  {Math.round(
                    (completedInterviews / responses.length) * 10000
                  ) / 100}
                  %
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 shadow-md max-w-[360px]">
              <div className="flex justify-center gap-2 font-bold mb-3">
                <SmileIcon /> Candidate Sentiment
              </div>
              <PieChart
                series={[
                  {
                    data: [
                      {
                        id: 0,
                        value: sentimentCount.positive,
                        label: `Positive (${sentimentCount.positive})`,
                        color: "#22c55e",
                      },
                      {
                        id: 1,
                        value: sentimentCount.neutral,
                        label: `Neutral (${sentimentCount.neutral})`,
                        color: "#eab308",
                      },
                      {
                        id: 2,
                        value: sentimentCount.negative,
                        label: `Negative (${sentimentCount.negative})`,
                        color: "#eb4444",
                      },
                    ],
                  },
                ]}
                width={360}
                height={120}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-[85%] h-[60%] flex flex-col items-center justify-center">
          <Image src="/no-responses.png" alt="logo" width={270} height={270} />
          <p className="text-center text-sm">
            Please share with your intended respondents
          </p>
        </div>
      )}
    </div>
  );
}

export default SummaryInfo;
