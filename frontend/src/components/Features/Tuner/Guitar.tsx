import { useState, useEffect } from "react";
import { PitchDetector } from "pitchy";

export default function Guitar() {
    const [note, setNote] = useState<string | null>(null);
    const [detune, setDetune] = useState<number | null>(null);
    const guitarStrings = ["E2", "A2", "D3", "G3", "B3", "E4"];
    const [targetString, setTargetString] = useState<string | null>(null);

    useEffect(() => {
        let audioContext: AudioContext | null = null;
        let stream: MediaStream | null = null;

        const runPitchDetection = async () => {
            stream = await navigator.mediaDevices.getUserMedia({
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

    const getNoteInfo = (frequency: number) => {
        if (frequency === 0) return { name: null, cents: null };    
        const A4 = 440;
        const semitonesFromA4 = 12 * Math.log2(frequency / A4);
        const roundedSemitones = Math.round(semitonesFromA4);
        const noteIndex = (roundedSemitones + 57) % 12; 
        const octave = 4 + Math.floor((roundedSemitones + 57) / 12);
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const name = noteNames[noteIndex] + octave;
        const cents = Math.floor((semitonesFromA4 - roundedSemitones) * 100);
        return { name, cents };
    }   
    const angle = detune ? Math.max(-50, Math.min(50, detune)) : 0;

    return (    
        <div style={{ textAlign: "center", marginTop: "40px" }}>
            <h2>Guitar Tuner</h2>
            <div>
                <label htmlFor="string-select">Select Target String: </label>   
                <select
                    id="string-select"
                    value={targetString || ""}  
                    onChange={(e) => setTargetString(e.target.value || null)}
                >
                    <option value="">--Choose a string--</option>   
                    {guitarStrings.map((string) => (
                        <option key={string} value={string}>{string}</option>
                    ))}
                </select>       
            </div>
            <h3>{note ? `Detected Note: ${note}` : "Listening..."}</h3>        
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
                        transition: "transform 0.1s ease-out",
                    }}
                ></div>
            </div>  
            <p>{detune ? `${detune.toFixed(1)} cents` : ""}</p>
            {targetString && note && (
                <p> 
                    {note === targetString
                        ? "🎉 Perfectly in tune!"
                        : `Tune to ${targetString} for best results.`}      
                </p>
            )}      
        </div>    
    ); 
}       

