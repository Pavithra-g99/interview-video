const startVideoRecording = (stream: MediaStream, callId: string) => {
  chunksRef.current = [];

  // 1. Setup Web Audio Context for mixing
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const destination = audioCtx.createMediaStreamDestination();

  // 2. Add Candidate's Microphone to the mixer
  const sourceMic = audioCtx.createMediaStreamSource(stream);
  sourceMic.connect(destination);

  // 3. Find and add the AI Agent's audio to the mixer
  const agentAudioElement = document.querySelector('audio');
  if (agentAudioElement) {
    // CrossOrigin must be set to anonymous for captureStream to work on remote URLs
    agentAudioElement.crossOrigin = "anonymous"; 
    const sourceAgent = audioCtx.createMediaElementSource(agentAudioElement);
    sourceAgent.connect(destination);
    sourceAgent.connect(audioCtx.destination); // Keep audio audible to the candidate
  }

  // 4. Create the Final Merged Stream (Camera + Mixed Audio)
  const combinedStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...destination.stream.getAudioTracks()
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: "video/webm;codecs=vp8,opus",
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunksRef.current.push(e.data);
  };

  recorder.onstop = async () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const fileName = `interview-${callId}-${Date.now()}.webm`;

    const { data } = await supabase.storage
      .from("interview-videos")
      .upload(fileName, blob);

    if (data) {
      const { data: { publicUrl } } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
      await axios.post("/api/save-video-url", {
        call_id: callId,
        videoUrl: publicUrl,
      });
    }
    audioCtx.close(); // Clean up audio context
  };

  recorder.start(1000);
  mediaRecorderRef.current = recorder;
};
