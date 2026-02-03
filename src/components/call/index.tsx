"use client";

// ... (keep all your existing imports)

function Call({
  interview,
  videoStream,
  onStartRecording,
  onStopRecording,
}: InterviewProps) {
  const { createResponse } = useResponses();
  const [lastInterviewerResponse, setLastInterviewerResponse] = useState<string>("");
  const [lastUserResponse, setLastUserResponse] = useState<string>("");
  const [activeTurn, setActiveTurn] = useState<string>("");
  const [Loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isValidEmail, setIsValidEmail] = useState<boolean>(false);
  const [isOldUser, setIsOldUser] = useState<boolean>(false);
  const [callId, setCallId] = useState<string>("");
  const { tabSwitchCount } = useTabSwitchPrevention();
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interviewerImg, setInterviewerImg] = useState("");
  
  // FIX: Initialize with the actual interview duration from the database
  const [interviewTimeDuration, setInterviewTimeDuration] = useState<string>(
    interview?.time_duration || "15"
  );
  const [time, setTime] = useState(0);

  const lastUserResponseRef = useRef<HTMLDivElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync state if interview object changes
  useEffect(() => {
    if (interview?.time_duration) {
      setInterviewTimeDuration(interview.time_duration);
    }
  }, [interview]);

  // ... (keep all your existing useEffects for videoStream, transcription, and SDK listeners)

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}
      <div className="bg-white rounded-md md:w-[80%] w-[90%]">
        <Card className="h-[88vh] rounded-lg border-2 border-b-4 border-r-4 border-black text-xl font-bold transition-all md:block dark:border-white">
          <div className="m-4 h-[15px] rounded-lg border-[1px] border-black overflow-hidden">
            <div
              className="bg-indigo-600 h-[15px] transition-all duration-500"
              style={{
                width: isEnded
                  ? "100%"
                  // Progress bar now uses the correct dynamic duration
                  : `${(time / (Number(interviewTimeDuration) * 60)) * 100}%`,
              }}
            />
          </div>

          <CardHeader className="items-center p-1">
            {!isEnded && (
              <CardTitle className="text-lg md:text-xl font-bold mb-2">
                {interview?.name}
              </CardTitle>
            )}
            {!isEnded && (
              <div className="flex mt-2 flex-row text-sm font-normal items-center">
                <AlarmClockIcon
                  className="mr-2"
                  style={{ color: interview.theme_color }}
                  size={16}
                />
                Expected duration:{" "}
                <span
                  className="font-bold ml-1"
                  style={{ color: interview.theme_color }}
                >
                  {/* Now correctly displays 5, 20, or 60 mins */}
                  {interviewTimeDuration} mins
                </span>{" "}
                or less
              </div>
            )}
          </CardHeader>

          {/* ... (Keep the rest of your JSX exactly as it is) */}
        </Card>
        {/* ... (Keep footer links) */}
      </div>
      {/* ... (Keep feedback dialog) */}
    </div>
  );
}

export default Call;
