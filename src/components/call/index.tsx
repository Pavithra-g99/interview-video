"use client";

// ... other imports ...

// FIX: Update this type to include the missing properties being passed from the parent
type InterviewProps = {
  interview: Interview;
  videoStream: MediaStream | null;
  onStartRecording: (callId: string) => void;
  onStopRecording: () => void;
};

// FIX: Update the function signature to destructure these new props
function Call({ 
  interview, 
  videoStream, 
  onStartRecording, 
  onStopRecording 
}: InterviewProps) {
  
  // ... your existing state (isStarted, isEnded, callId, etc.) ...

  /* ================= RETELL EVENTS ================= */
  useEffect(() => {
    webClient.on("call_started", () => {
      setIsCalling(true);
      // Trigger the recording function passed from the parent
      if (callId) {
        onStartRecording(callId);
      }
    });

    webClient.on("call_ended", () => {
      setIsCalling(false);
      setIsEnded(true);
      // Trigger the stop function passed from the parent
      onStopRecording();
    });

    // ... other listeners (agent_talking, update, etc.) ...

    return () => {
      webClient.removeAllListeners();
    };
  }, [callId, onStartRecording, onStopRecording]); // Ensure props are in dependency array

  // ... rest of the component logic and JSX ...
}

export default Call;
