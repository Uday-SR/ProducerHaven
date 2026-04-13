import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import data from "./instruments.json"

const NOTE_NAMES = "C C# D D# E F F# G G# A A# B".split(" ");

// Instruments
const instruments = data;

// Convert freq → note number
const freqToNumber = (f: number) => 69 + 12 * Math.log2(f / 440);

// Note name
const noteName = (n: number) =>
    NOTE_NAMES[n % 12] + Math.round(n / 12 - 1);

export default function Tuner() {
    const [frequency, setFrequency] = useState<number | null>(null);
    const [detune, setDetune] = useState<number | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [targetString, setTargetString] = useState<string | null>(null);
    const [instrument, setInstrument] =
        useState<keyof typeof instruments>("guitar");

    useEffect(() => {
        let audioContext: AudioContext;
        let analyser: AnalyserNode;
        let data: Uint8Array<ArrayBuffer>;

        const start = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 32768;

            const source =
                audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            data = new Uint8Array(analyser.frequencyBinCount);

            const update = () => {
                analyser.getByteFrequencyData(data);

                const HZ_PER_BIN =
                    audioContext.sampleRate / analyser.fftSize;

                // Dynamic frequency range based on instrument
                const values = Object.values(
                    instruments[instrument].notes
                );
                const minFreq = Math.min(...values);
                const maxFreq = Math.max(...values);

                const lo = Math.floor(minFreq / HZ_PER_BIN - 8);
                const hi = Math.ceil(maxFreq / HZ_PER_BIN + 8);

                const slice = data.subarray(lo, hi);
                const maxVal = Math.max(...slice);
                const index = slice.indexOf(maxVal);

                if (maxVal > 120) {
                    const freq = (index + lo) * HZ_PER_BIN;

                    setFrequency(freq);

                    // Note detection
                    const n = Math.round(freqToNumber(freq));
                    setNote(noteName(n));

                    // Find closest string
                    let closest = "";
                    let minDiff = Infinity;

                    for (const [key, val] of Object.entries(
                        instruments[instrument].notes
                    )) {
                        const diff = Math.abs(freq - val);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closest = key;
                        }
                    }

                    setTargetString(closest);

                    const targetFreq =
                        instruments[instrument].notes[
                            closest as keyof typeof instruments[typeof instrument]["notes"]
                        ];

                    const cents =
                        1200 * Math.log2(freq / targetFreq);

                    setDetune(cents);
                } else {
                    setFrequency(null);
                    setDetune(null);
                }

                requestAnimationFrame(update);
            };

            update();
        };

        start();
    }, [instrument]);

    // Needle angle
    const angle =
        detune !== null
            ? Math.max(-50, Math.min(50, detune))
            : 0;

    return (
        <div className="items-center p-5"
            
        >
            <h2>Pro Tuner</h2>

            {/* Instrument Selector */}
            <select
                value={instrument}
                className="bg-blue-900 text-white border border-amber-300 rounded-lg px-3 py-2"
                onChange={(e) =>
                    setInstrument(
                        e.target.value as keyof typeof instruments
                    )
                }
            >
                {Object.entries(instruments).map(([k, v]) => (
                    <option key={k} value={k} className="bg-blue-900 border-amber-300">
                        {v.name}
                    </option>
                ))}
            </select>

            <h3>
                {frequency
                    ? `${Math.round(frequency)} Hz (${note})`
                    : "Listening..."}
            </h3>

            {/* Needle */}
            <div
                style={{
                    position: "relative",
                    width: "260px",
                    height: "150px",
                    margin: "40px auto",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        height: "130px",
                        borderTopLeftRadius: "300px",
                        borderTopRightRadius: "300px",
                        border: "6px solid #334155",
                        borderBottom: "none",
                    }}
                />

                <motion.div
                    animate={{ rotate: angle }}
                    transition={{ type: "spring", stiffness: 120 }}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        width: "3px",
                        height: "120px",
                        background:
                            detune !== null &&
                            Math.abs(detune) < 5
                                ? "lime"
                                : "red",
                        transformOrigin: "bottom center",
                        borderTopWidth: "70px",
                        borderTopLeftRadius: "500px",
                        borderTopRightRadius: "500px",
                    }}
                />
            </div>

            {/* Strings */}
            <div className="flex gap-2.5 justify-center">
                {Object.keys(instruments[instrument].notes).map((s) => (
                    <div
                        key={s}
                        style={{
                            padding: "10px",
                            borderRadius: "8px",
                            background:
                                s === targetString
                                    ? "limegreen"
                                    : "#1e293b",
                        }}
                    >
                        {s}
                    </div>
                ))}
            </div>

            {/* Feedback */}
            <p>
                {detune !== null &&
                    (Math.abs(detune) < 5
                        ? "Perfectly in tune!"
                        : detune > 0
                        ? `Sharp (+${detune.toFixed(1)} cents)`
                        : `Flat (${detune.toFixed(1)} cents)`)}
            </p>
        </div>
    );
}