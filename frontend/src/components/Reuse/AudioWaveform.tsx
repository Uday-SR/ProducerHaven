import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  audioUrl: string;
};

export default function AudioWaveform({ audioUrl }: Props) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!waveformRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ccc",
      progressColor: "#6366f1",
      height: 50,
      width: 10,
      barWidth: 3,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    wavesurfer.current?.playPause();
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="p-4 ">
      <div ref={waveformRef} className="w-full"/>

      <button
        onClick={togglePlay}
        className="mt-4 px-4 py-2 bg-black text-white rounded"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}