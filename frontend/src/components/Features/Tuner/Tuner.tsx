import { useCallback, useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

type StringTarget = { id: string; note: string; frequency: number; label: string };
type InstrumentKey = "guitar" | "bass" | "ukulele" | "violin";
type Mode = "auto" | "manual";
type Reading = { frequency: number; clarity: number; cents: number; note: string; target: StringTarget };
type MicState = "idle" | "starting" | "listening" | "error";

const INSTRUMENTS: Record<InstrumentKey, { name: string; description: string; strings: StringTarget[] }> = {
  guitar: { name: "Guitar", description: "6-string · Standard E", strings: [
    { id: "g6", note: "E2", frequency: 82.4069, label: "6 · Low E" },
    { id: "g5", note: "A2", frequency: 110, label: "5 · A" },
    { id: "g4", note: "D3", frequency: 146.8324, label: "4 · D" },
    { id: "g3", note: "G3", frequency: 195.9977, label: "3 · G" },
    { id: "g2", note: "B3", frequency: 246.9417, label: "2 · B" },
    { id: "g1", note: "E4", frequency: 329.6276, label: "1 · High E" },
  ] },
  bass: { name: "Bass", description: "4-string · Standard E", strings: [
    { id: "b4", note: "E1", frequency: 41.2034, label: "4 · Low E" },
    { id: "b3", note: "A1", frequency: 55, label: "3 · A" },
    { id: "b2", note: "D2", frequency: 73.4162, label: "2 · D" },
    { id: "b1", note: "G2", frequency: 97.9989, label: "1 · G" },
  ] },
  ukulele: { name: "Ukulele", description: "4-string · High G", strings: [
    { id: "u4", note: "G4", frequency: 391.9954, label: "4 · G" },
    { id: "u3", note: "C4", frequency: 261.6256, label: "3 · C" },
    { id: "u2", note: "E4", frequency: 329.6276, label: "2 · E" },
    { id: "u1", note: "A4", frequency: 440, label: "1 · A" },
  ] },
  violin: { name: "Violin", description: "4-string · Standard", strings: [
    { id: "v4", note: "G3", frequency: 195.9977, label: "4 · G" },
    { id: "v3", note: "D4", frequency: 293.6648, label: "3 · D" },
    { id: "v2", note: "A4", frequency: 440, label: "2 · A" },
    { id: "v1", note: "E5", frequency: 659.2551, label: "1 · E" },
  ] },
};

const NOTES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const centsBetween = (actual: number, target: number) => 1200 * Math.log2(actual / target);
const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const noteFromFrequency = (hz: number) => { const midi = Math.round(69 + 12 * Math.log2(hz / 440)); return `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`; };
const rms = (samples: Float32Array) => Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
const nearestString = (hz: number, strings: StringTarget[]) => strings.reduce((best, item) =>
  Math.abs(centsBetween(hz, item.frequency)) < Math.abs(centsBetween(hz, best.frequency)) ? item : best, strings[0]);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function Tuner() {
  const [instrument, setInstrument] = useState<InstrumentKey>("guitar");
  const [mode, setMode] = useState<Mode>("auto");
  const [manualId, setManualId] = useState("g6");
  const [autoId, setAutoId] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [mic, setMic] = useState<MicState>("idle");
  const [error, setError] = useState("");
  const [referenceA, setReferenceA] = useState(440);
  const [completed, setCompleted] = useState<string[]>([]);
  const audioRef = useRef<{ context: AudioContext; stream: MediaStream; raf: number; source: MediaStreamAudioSourceNode } | null>(null);
  const runRef = useRef(0);
  const configRef = useRef({ instrument, mode, manualId, referenceA });
  const historyRef = useRef<number[]>([]);
  const candidateRef = useRef({ id: "", since: 0 });
  const autoRef = useRef<string | null>(null);
  const lastSignalRef = useRef(0);
  const lastUiRef = useRef(0);
  const readingRef = useRef<Reading | null>(null);
  const strings = INSTRUMENTS[instrument].strings;
  const targetId = mode === "manual" ? manualId : autoId;
  const target = strings.find(s => s.id === targetId) ?? null;

  const clearReading = useCallback(() => {
    historyRef.current = [];
    candidateRef.current = { id: "", since: 0 };
    autoRef.current = null;
    readingRef.current = null;
    setAutoId(null);
    setReading(null);
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    const active = audioRef.current;
    audioRef.current = null;
    if (active) {
      cancelAnimationFrame(active.raf);
      active.source.disconnect();
      active.stream.getTracks().forEach(track => track.stop());
      void active.context.close().catch(() => {});
    }
    setMic("idle");
    clearReading();
  }, [clearReading]);

  useEffect(() => { configRef.current = { instrument, mode, manualId, referenceA }; clearReading(); }, [instrument, mode, manualId, referenceA, clearReading]);
  useEffect(() => () => { runRef.current += 1; const a = audioRef.current; if (a) { cancelAnimationFrame(a.raf); a.source.disconnect(); a.stream.getTracks().forEach(t => t.stop()); void a.context.close().catch(() => {}); } }, []);

  const start = async () => {
    if (mic === "starting" || mic === "listening") return;
    if (!navigator.mediaDevices?.getUserMedia) { setError("Microphone access requires HTTPS or localhost in a supported browser."); setMic("error"); return; }
    const run = ++runRef.current;
    setMic("starting"); setError("");
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }, video: false });
      if (run !== runRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      context = new AudioContext();
      await context.resume();
      if (run !== runRef.current) { stream.getTracks().forEach(t => t.stop()); void context.close(); return; }
      const analyser = context.createAnalyser();
      // 16384 samples resolves bass fundamentals much better than 2048; latency is the tradeoff.
      analyser.fftSize = 16384;
      analyser.smoothingTimeConstant = 0;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser); // Never connect to speakers: avoids feedback.
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      const buffer = new Float32Array(detector.inputLength);
      audioRef.current = { context, stream, source, raf: 0 };
      lastSignalRef.current = performance.now();
      setMic("listening");
      let lastAnalysis = 0;
      const tick = (now: number) => {
        if (run !== runRef.current || !audioRef.current) return;
        audioRef.current.raf = requestAnimationFrame(tick);
        if (now - lastAnalysis < 65) return;
        lastAnalysis = now;
        analyser.getFloatTimeDomainData(buffer);
        const [raw, clarity] = detector.findPitch(buffer, context!.sampleRate);
        const valid = rms(buffer) >= 0.006 && Number.isFinite(raw) && raw >= 30 && raw <= 1200 && clarity >= 0.88;
        if (!valid) {
          if (now - lastSignalRef.current > 650 && readingRef.current !== null) { historyRef.current = []; readingRef.current = null; setReading(null); }
          if (now - lastSignalRef.current > 1200 && autoRef.current !== null) { autoRef.current = null; setAutoId(null); candidateRef.current = { id: "", since: 0 }; }
          return;
        }
        lastSignalRef.current = now;
        // Reject sudden octave jumps/harmonic mistakes instead of averaging incompatible pitches.
        const h = historyRef.current;
        if (h.length && Math.abs(centsBetween(raw, median(h))) > 260) h.length = 0;
        h.push(raw);
        if (h.length > 5) h.shift();
        if (h.length < 3) return;
        const hz = median(h);
        const cfg = configRef.current;
        const options = INSTRUMENTS[cfg.instrument].strings;
        const scale = cfg.referenceA / 440;
        let selected: StringTarget | undefined;
        if (cfg.mode === "manual") {
          selected = options.find(s => s.id === cfg.manualId);
        } else {
          const closest = nearestString(hz, options.map(s => ({ ...s, frequency: s.frequency * scale })));
          const distance = Math.abs(centsBetween(hz, closest.frequency));
          // Don't claim a string if its pitch is too far away to distinguish confidently.
          if (distance <= 175) {
            if (candidateRef.current.id !== closest.id) candidateRef.current = { id: closest.id, since: now };
            if (now - candidateRef.current.since >= 220 && autoRef.current !== closest.id) {
              autoRef.current = closest.id;
              setAutoId(closest.id);
            }
          } else candidateRef.current = { id: "", since: now };
          selected = options.find(s => s.id === autoRef.current);
          // Release the previous target after a clear, sustained different note.
          if (selected && distance > 175 && now - candidateRef.current.since > 700) { autoRef.current = null; setAutoId(null); selected = undefined; }
        }
        if (!selected) { if (readingRef.current) { readingRef.current = null; setReading(null); } return; }
        const targetHz = selected.frequency * scale;
        const result: Reading = { frequency: hz, clarity, cents: centsBetween(hz, targetHz), note: noteFromFrequency(hz), target: { ...selected, frequency: targetHz } };
        readingRef.current = result;
        if (now - lastUiRef.current > 90) { setReading(result); lastUiRef.current = now; }
      };
      audioRef.current.raf = requestAnimationFrame(tick);
    } catch (e) {
      stream?.getTracks().forEach(t => t.stop());
      if (context) void context.close().catch(() => {});
      if (run !== runRef.current) return;
      setMic("error");
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access in your browser and try again." : "Could not start the microphone. Check your input device and try again.");
    }
  };

  const cents = reading?.cents ?? null;
  const inTune = cents !== null && Math.abs(cents) <= 5;
  const direction = cents === null ? "Play one string to begin" : inTune ? "In tune — great work" : cents < 0 ? "Tighten the string · pitch is low" : "Loosen the string · pitch is high";
  const status = cents === null ? "Waiting for a clear note" : inTune ? "IN TUNE" : cents < 0 ? "FLAT" : "SHARP";
  const position = cents === null ? 50 : 50 + clamp(cents, -50, 50) / 2;
  const handleInstrument = (key: InstrumentKey) => { setInstrument(key); setManualId(INSTRUMENTS[key].strings[0].id); setCompleted([]); };
  const selectString = (id: string) => { setMode("manual"); setManualId(id); };
  const fieldLabel = "text-[10px] font-extrabold tracking-[0.16em] text-slate-400";
  const panel = "min-w-0 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-[#121c2b] to-[#0e1623] p-4 sm:p-6";
  const selectStyle = "h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-[#151f2e] px-3 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-teal-300";
  return (
    <section aria-label="Instrument tuner" className="min-w-0 w-full min-h-full rounded-xl sm:rounded-2xl bg-[#090e17] p-3 text-slate-100 sm:p-6 lg:p-8 [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] text-teal-300"><span className="h-2 w-2 rounded-full bg-teal-300"/> STUDIO TOOLS / LIVE AUDIO</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] sm:text-4xl lg:text-[42px]">Precision Tuner<span className="text-teal-300">.</span></h1>
            <p className="mt-2 text-sm text-slate-400">Accurate, guided tuning. One string at a time.</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-extrabold tracking-widest ${mic === "listening" ? "border-teal-700 bg-teal-950 text-teal-300" : mic === "error" ? "border-red-800 text-red-300" : "border-slate-700 text-slate-400"}`}><span className="h-2 w-2 rounded-full bg-current"/>{mic === "listening" ? "MIC LIVE" : mic === "starting" ? "CONNECTING" : mic === "error" ? "MIC ERROR" : "MIC OFF"}</div>
        </header>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.25fr_.85fr]">
          <label className="flex min-w-0 flex-col gap-2"><span className={fieldLabel}>INSTRUMENT</span><select className={selectStyle} value={instrument} onChange={e => handleInstrument(e.target.value as InstrumentKey)}>{(Object.keys(INSTRUMENTS) as InstrumentKey[]).map(k => <option key={k} value={k}>{INSTRUMENTS[k].name} — {INSTRUMENTS[k].description}</option>)}</select></label>
          <div className="flex min-w-0 flex-col gap-2"><span className={fieldLabel}>DETECTION MODE</span><div className="flex h-12 gap-1 rounded-xl border border-slate-700 bg-[#151f2e] p-1" role="group" aria-label="Detection mode">{(["auto", "manual"] as Mode[]).map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-w-0 flex-1 rounded-lg text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 ${mode === m ? "bg-[#2b3c4d] text-teal-300" : "text-slate-400 hover:text-white"}`}>{m === "auto" ? "✦ Auto detect" : "◎ Manual"}</button>)}</div></div>
          <label className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1"><span className={fieldLabel}>REFERENCE PITCH</span><select className={selectStyle} value={referenceA} onChange={e => setReferenceA(Number(e.target.value))}><option value={440}>A = 440 Hz</option><option value={442}>A = 442 Hz</option><option value={432}>A = 432 Hz</option></select></label>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(270px,1fr)]">
          <main className={panel}>
            <div className="flex justify-between gap-3 text-[10px] font-extrabold tracking-widest text-slate-400"><span>LIVE PITCH MONITOR</span><span className="text-right font-medium normal-case tracking-normal">{mode === "auto" ? "Pluck a single open string" : `Selected target: ${target?.note ?? "—"}`}</span></div>
            <div className="px-0 pb-3 pt-7 text-center sm:px-3">
              <div className="flex flex-wrap justify-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-400">TARGET STRING <strong className="text-teal-300">{target ? `${target.label} / ${target.note}` : "AUTO IDENTIFY"}</strong></div>
              <div className="mt-4 text-[76px] font-extrabold leading-none tracking-[-0.09em] tabular-nums sm:text-[110px]">{reading ? reading.note.replace(/(\d+)$/, "") : "—"}<span className="ml-2 align-top text-4xl text-slate-400 sm:text-5xl">{reading?.note.match(/\d+$/)?.[0] ?? ""}</span></div>
              <div className="mb-4 mt-2 text-sm tabular-nums text-slate-400">{reading ? `${reading.frequency.toFixed(2)} Hz` : "— — . — — Hz"}</div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-extrabold tracking-widest ${cents === null ? "border-slate-700 bg-slate-800 text-slate-400" : inTune ? "border-teal-700 bg-teal-950 text-teal-300" : "border-amber-800 bg-amber-950 text-amber-300"}`}><span className="h-2 w-2 rounded-full bg-current"/>{status}</div>
              <div className="mx-auto mt-9 max-w-[470px]" aria-label={cents === null ? "No pitch detected" : `${cents.toFixed(1)} cents from target`}>
                <div className="flex justify-between text-[10px] font-bold tracking-wide text-slate-400"><span>♭ FLAT</span><span className="text-teal-300">IN TUNE</span><span>SHARP ♯</span></div>
                <div className="relative my-3 h-[13px] rounded-full bg-[linear-gradient(90deg,#d77865_0%,#e6aa70_26%,#55d6bf_44%,#55d6bf_56%,#e6aa70_74%,#d77865_100%)]"><div className="absolute -top-2 left-1/2 h-[29px] w-[2px] -translate-x-1/2 bg-white"/><div className="absolute -top-[9px] h-[31px] w-[5px] -translate-x-1/2 rounded bg-white shadow-[0_0_0_3px_#101827,0_0_14px_#ffffff88] transition-[left,opacity] duration-150 motion-reduce:transition-none" style={{ left: `${position}%`, opacity: cents === null ? 0.25 : 1 }}/></div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>−50</span><span>−25</span><span>0</span><span>+25</span><span>+50</span></div>
              </div>
              <div className="mt-6 flex items-baseline justify-center gap-2 tabular-nums"><strong className="text-4xl tracking-tight">{cents === null ? "—" : `${cents > 0 ? "+" : ""}${cents.toFixed(1)}`}</strong><span className={fieldLabel}>CENTS</span></div>
              <div className={`mx-auto mt-5 flex max-w-[430px] items-center gap-3 rounded-xl border p-4 text-left ${inTune ? "border-teal-800 bg-[#142b2b]" : "border-amber-900/70 bg-[#28231f]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl ${inTune ? "bg-teal-900 text-teal-300" : "bg-[#3e3026] text-amber-300"}`}>{cents === null ? "◌" : inTune ? "✓" : cents < 0 ? "↗" : "↘"}</span><div><strong className="block text-sm">{direction}</strong><small className="mt-1 block text-xs leading-relaxed text-slate-400">{cents === null ? "Use a quiet room and play only one string." : inTune ? "Within ±5 cents of the target pitch." : "Make small adjustments, then pluck again."}</small></div></div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-700 pt-5 sm:gap-3">{[["MEASURED", reading ? `${reading.frequency.toFixed(2)} Hz` : "—"],["TARGET", target ? `${(target.frequency * referenceA / 440).toFixed(2)} Hz` : "—"],["CONFIDENCE", reading ? `${Math.round(reading.clarity * 100)}%` : "—"]].map(([label, value]) => <div key={label} className="flex min-w-0 flex-col gap-2"><span className="text-[9px] font-extrabold tracking-wider text-slate-400 sm:text-[10px]">{label}</span><strong className="text-xs tabular-nums sm:text-sm">{value}</strong></div>)}</div>
            {error && <div role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/70 p-3 text-xs text-red-200">{error}</div>}
            <button type="button" className={`mt-6 h-12 w-full rounded-xl text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50 ${mic === "listening" ? "border border-slate-600 bg-slate-700 text-white hover:bg-slate-600" : "bg-teal-300 text-teal-950 hover:bg-teal-200"}`} disabled={mic === "starting"} onClick={mic === "listening" ? stop : () => void start()}>{mic === "listening" ? "■ Stop microphone" : mic === "starting" ? "Connecting microphone…" : "◉ Start microphone"}</button>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">Audio is analyzed locally in your browser. It is not uploaded or recorded.</p>
          </main>
          <aside className={panel}>
            <div className="flex justify-between gap-2 text-[10px] font-extrabold tracking-widest text-slate-400"><span>STRING SELECTOR</span><span className="text-right font-medium normal-case tracking-normal">{completed.length}/{strings.length} marked done</span></div>
            <h2 className="mb-2 mt-6 text-2xl font-bold tracking-tight">{mode === "auto" ? "Play any string" : "Choose a string"}</h2>
            <p className="mb-5 text-xs leading-relaxed text-slate-400">{mode === "auto" ? "The tuner identifies the nearest standard open-string pitch. For a very loose string, select it manually." : "Your selected string stays locked while you adjust its pitch."}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{strings.map(s => { const active = targetId === s.id; const done = completed.includes(s.id); return <button key={s.id} type="button" aria-pressed={active} onClick={() => selectString(s.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 ${active ? "border-teal-400 bg-[#15312f]" : "border-slate-700 bg-[#151f2e] hover:bg-[#1c2d3c]"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${active ? "bg-teal-300 text-teal-950" : "bg-slate-700 text-slate-300"}`}>{s.label.split(" · ")[0]}</span><span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm">{s.note}</strong><small className="text-[10px] text-slate-400">{s.label.split(" · ")[1]} · {(s.frequency * referenceA / 440).toFixed(2)} Hz</small></span>{done ? <span className="text-lg text-teal-300">✓</span> : active ? <span className="text-[9px] font-extrabold tracking-widest text-teal-300">ACTIVE</span> : <span className="text-slate-400">↗</span>}</button>; })}</div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={!target} onClick={() => { if (!target) return; setCompleted(prev => prev.includes(target.id) ? prev.filter(id => id !== target.id) : [...prev, target.id]); }} className="rounded-lg border border-slate-600 bg-[#203746] px-2 py-3 text-[11px] font-bold text-teal-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">{target && completed.includes(target.id) ? "↶ Unmark string" : "✓ Mark as tuned"}</button><button type="button" onClick={() => { setMode("auto"); setCompleted([]); }} className="rounded-lg border border-slate-700 px-2 py-3 text-[11px] font-bold text-slate-400 hover:bg-slate-800">Reset session</button></div>
            <div className="mt-6 rounded-xl border border-slate-700 bg-[#172536] p-4"><span className="text-[10px] font-extrabold tracking-widest text-teal-300">TIP</span><p className="mt-2 text-xs leading-relaxed text-slate-300">Auto detection works best with one open string at a time. Use Manual mode if the string is far from its intended pitch or the detector hears a harmonic.</p></div>
          </aside>
        </div>
      </div>
    </section>
  );
}
