import { CardTitle } from "@/components/ui/card";
import { VideoIcon, ExternalLinkIcon } from "lucide-react";

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  answer: string;
  videoUrl?: string; // New optional prop to store the Supabase link
}

function QuestionAnswerCard({
  questionNumber,
  question,
  answer,
  videoUrl,
}: QuestionCardProps) {
  return (
    <div className="shadow-md mb-4 bg-slate-50 rounded-2xl py-3 px-2 border border-slate-100">
      <div className="flex flex-row items-start">
        <CardTitle className="text-lg min-w-[42px] h-[42px] bg-indigo-200 rounded-full flex items-center justify-center mx-3 shrink-0">
          <p className="my-auto text-center">{questionNumber}</p>
        </CardTitle>
        <div className="flex flex-col p-1 grow overflow-hidden">
          <p className="font-bold text-indigo-900 mb-1">{question}</p>
          <p className="text-gray-700 leading-relaxed mb-3">{answer}</p>

          {/* Video Recording Link Section */}
          {videoUrl && (
            <div className="mt-2 p-3 bg-white border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <VideoIcon size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Video Recording Available
                </span>
              </div>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                View Recording <ExternalLinkIcon size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestionAnswerCard;
