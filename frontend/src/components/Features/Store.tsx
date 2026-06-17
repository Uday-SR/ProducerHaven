import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

function AudioTrimmer() {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [audioFile, setAudioFile] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  const handleFileUpload = (e : React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];

    if (!file) return;

    setAudioFile(file);

    const audioUrl = URL.createObjectURL(file);

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#999",
      progressColor: "#2563eb",
      cursorColor: "red",
      height: 120,
      barWidth: 2,
    });

    ws.load(audioUrl);

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      const duration = ws.getDuration();

      setStartTime(0);
      setEndTime(duration);
    });
  };

  const markStart = () => {
    const current = wavesurferRef.current.getCurrentTime();
    setStartTime(current);
  };

  const markEnd = () => {
    const current = wavesurferRef.current.getCurrentTime();
    setEndTime(current);
  };

  const playAudio = () => {
    wavesurferRef.current.playPause();
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

      <div style={{ marginTop: "20px" }}>
        <button onClick={playAudio}>
          Play / Pause
        </button>

        <button onClick={markStart}>
          Set Start
        </button>

        <button onClick={markEnd}>
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
}

export default AudioTrimmer;