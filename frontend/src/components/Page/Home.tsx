import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

const AudioTrimmer = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  useEffect(() => {
    return () => {
      waveSurferRef.current?.destroy();
    };
  }, []);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !waveformRef.current) return;

    const audioUrl = URL.createObjectURL(file);

    waveSurferRef.current?.destroy();

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#bdbdbd",
      progressColor: "#2563eb",
      cursorColor: "#ef4444",
      height: 120,
      barWidth: 2,
    });

    ws.load(audioUrl);

    ws.on("ready", () => {
      const duration = ws.getDuration();

      setStartTime(0);
      setEndTime(duration);
    });

    waveSurferRef.current = ws;
  };

  const handlePlayPause = () => {
    waveSurferRef.current?.playPause();
  };

  const handleSetStart = () => {
    if (!waveSurferRef.current) return;

    setStartTime(
      waveSurferRef.current.getCurrentTime()
    );
  };

  const handleSetEnd = () => {
    if (!waveSurferRef.current) return;

    setEndTime(
      waveSurferRef.current.getCurrentTime()
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Audio Trimmer</h2>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
      />

      <div
        ref={waveformRef}
        style={{
          marginTop: "20px",
          border: "1px solid #ddd",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <button onClick={handlePlayPause}>
          Play / Pause
        </button>

        <button onClick={handleSetStart}>
          Set Start
        </button>

        <button onClick={handleSetEnd}>
          Set End
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <p>
          Start: {startTime.toFixed(2)} sec
        </p>

        <p>
          End: {endTime.toFixed(2)} sec
        </p>
      </div>
    </div>
  );
};

export default AudioTrimmer;