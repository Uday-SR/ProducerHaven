import React, { useState, useEffect } from "react";
import { PitchDetector } from "pitchy";

export default function Tuner() {
  const [note, setNote] = useState<string | null>(null);
  const [detune, setDetune] = useState<number | null>(null);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;

    const runPitchDetection = async () => {
      stream = await navigator.mediaDevices.getUserMedia( {
        audio: {
            noiseSuppression: true, // reduces background noise
            echoCancellation: true, // useful if using speakers
            autoGainControl: true,  // keeps volume consistent
        },
      });
      audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      const input = new Float32Array(detector.inputLength);

      const update = () => {
        analyser.getFloatTimeDomainData(input);
        const [pitch, clarity] = detector.findPitch(input, audioContext!.sampleRate);

        if (clarity > 0.9) {
          const { name, cents } = getNoteInfo(pitch);
          setNote(name);
          setDetune(cents);
        }

        requestAnimationFrame(update);
      };

      update();
    };

    runPitchDetection();

    return () => {
      if (audioContext) audioContext.close();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const angle = detune ? Math.max(-50, Math.min(50, detune)) : 0;

  return (
    <div className="text-center">
      <h2>Tuner</h2>
      <h3>{note ? `Note: ${note}` : "Listening..."}</h3>

      <div style={{ position: "relative", width: "200px", height: "100px", margin: "auto" }}>
        {/* Base meter line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "2px",
            background: "#aaa",
          }}
        ></div>

        {/* Needle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "2px",
            height: "50px",
            background: detune && Math.abs(detune) < 5 ? "green" : "red",
            transform: `rotate(${angle}deg) translateY(-50%)`,
            transformOrigin: "bottom center",
            transition: "transform 0.5s ease-out",
          }}
        ></div>
      </div>

      <p>{detune ? `${detune.toFixed(1)} cents` : ""}</p>
    </div>
  );
}

// Convert frequency to note name + cents offset
function getNoteInfo(frequency: number) {
  const A4 = 440;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteNumber = 12 * (Math.log(frequency / A4) / Math.log(2)) + 69;
  const nearestNote = Math.round(noteNumber);
  const cents = (noteNumber - nearestNote) * 100;
  const name = noteNames[(nearestNote + 12) % 12];
  return { name, cents };
}
