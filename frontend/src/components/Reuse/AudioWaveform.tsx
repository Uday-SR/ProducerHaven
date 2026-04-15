import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import Play from "../icons/Play";
import Pause from "../icons/Pause";

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
      height: 100,
      width: 400,
      barWidth: 1,
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
    <div className="p-4 flex">

      <button
        onClick={togglePlay}
        className="right-5 px-4"
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>

      <div ref={waveformRef} className="w-full"/>

    </div>
  );
}