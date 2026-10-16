import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./sampler.css";

type Slice = { id: string; name: string; start: number; end: number };
type Pad = {
  id: number;
  key: string;
  name: string;
  sliceId: string | null;
  volume: number;
  muted: boolean;
};
type PresetPayload = {
  name: string;
  pads: Pad[];
  slices: Slice[];
  sourceAssetId?: string | null;
};

const KEY_ROWS = [
  ["1", "2", "3", "4"],
  ["q", "w", "e", "r"],
  ["a", "s", "d", "f"],
  ["z", "x", "c", "v"],
];
const ALL_KEYS = KEY_ROWS.flat();

function initialPads(): Pad[] {
  return Array.from({ length: 16 }, (_, id) => ({
    id,
    key: ALL_KEYS[id],
    name: `Pad ${id + 1}`,
    sliceId: null,
    volume: 1,
    muted: false,
  }));
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Sampler() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [pads, setPads] = useState<Pad[]>(initialPads);
  const [selectedPadId, setSelectedPadId] = useState(0);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [sliceCount, setSliceCount] = useState(8);
  const [presetName, setPresetName] = useState("My Drum Kit");
  const [status, setStatus] = useState("Load an audio file to begin.");
  const [busy, setBusy] = useState(false);

  const audioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext;
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }, []);

  const selectedPad = pads.find((p) => p.id === selectedPadId) ?? pads[0];
  const selectedSlice = slices.find((s) => s.id === selectedSliceId) ?? null;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (!canvas || !buffer) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / width));
    const mid = height / 2;
    for (let x = 0; x < width; x++) {
      const from = x * step;
      const to = Math.min(data.length, from + step);
      let min = 1, max = -1;
      for (let i = from; i < to; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, mid + min * mid * 0.9);
      ctx.lineTo(x + 0.5, mid + max * mid * 0.9);
      ctx.stroke();
    }

    const x1 = (selectionStart / buffer.duration) * width;
    const x2 = (selectionEnd / buffer.duration) * width;
    ctx.fillStyle = "rgba(34,197,94,0.20)";
    ctx.fillRect(x1, 0, Math.max(0, x2 - x1), height);
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    [x1, x2].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    for (const slice of slices) {
      const sx = (slice.start / buffer.duration) * width;
      const ex = (slice.end / buffer.duration) * width;
      ctx.strokeStyle = slice.id === selectedSliceId ? "#fbbf24" : "rgba(226,232,240,0.45)";
      ctx.lineWidth = slice.id === selectedSliceId ? 2 : 1;
      ctx.strokeRect(sx, 2, Math.max(1, ex - sx), height - 4);
    }
  }, [selectionStart, selectionEnd, slices, selectedSliceId]);

  useEffect(() => {
    drawWaveform();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(drawWaveform);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawWaveform, duration]);

  useEffect(() => {
    return () => {
      for (const source of activeSourcesRef.current) {
        try { source.stop(); } catch { /* already stopped */ }
        source.disconnect();
      }
      activeSourcesRef.current.clear();
      if (audioContextRef.current) void audioContextRef.current.close();
    };
  }, []);

  const loadAudioFile = async (file: File) => {
    setBusy(true);
    try {
      const ctx = audioContext();
      await ctx.resume();
      const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
      bufferRef.current = decoded;
      setFileName(file.name);
      setDuration(decoded.duration);
      setSelectionStart(0);
      setSelectionEnd(decoded.duration);
      setSlices([]);
      setSelectedSliceId(null);
      setPads(initialPads());
      setStatus(`Loaded ${file.name} (${decoded.duration.toFixed(2)} seconds).`);
    } catch (error) {
      console.error(error);
      setStatus("Could not decode this file. Try a WAV, MP3, or supported audio file.");
    } finally {
      setBusy(false);
    }
  };

  const playRegion = async (start: number, end: number, volume = 1) => {
    const buffer = bufferRef.current;
    if (!buffer) {
      setStatus("Load an audio file first.");
      return;
    }
    const safeStart = Math.max(0, Math.min(start, buffer.duration));
    const safeEnd = Math.max(safeStart, Math.min(end, buffer.duration));
    if (safeEnd - safeStart < 0.005) {
      setStatus("Select a region longer than 5 milliseconds.");
      return;
    }
    const ctx = audioContext();
    await ctx.resume();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.max(0, Math.min(volume, 1.5));
    source.connect(gain);
    gain.connect(ctx.destination);
    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(0, safeStart, safeEnd - safeStart);
  };

  const updateSelectedRegionFromCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration;
    if (event.shiftKey) {
      setSelectionEnd(Math.max(selectionStart + 0.01, Math.min(duration, t)));
    } else {
      setSelectionStart(Math.min(t, Math.max(0, selectionEnd - 0.01)));
      if (selectionEnd <= t) setSelectionEnd(Math.min(duration, t + 0.25));
    }
  };

  const addManualSlice = () => {
    if (!bufferRef.current || selectionEnd - selectionStart < 0.01) {
      setStatus("Choose a valid region in the waveform first.");
      return;
    }
    const slice: Slice = {
      id: makeId(),
      name: `Slice ${slices.length + 1}`,
      start: selectionStart,
      end: selectionEnd,
    };
    setSlices((old) => [...old, slice]);
    setSelectedSliceId(slice.id);
    setStatus(`Created ${slice.name}. Select a pad and assign it.`);
  };

  const autoSlice = () => {
    if (!bufferRef.current) {
      setStatus("Load an audio file first.");
      return;
    }
    const buffer = bufferRef.current;
    const count = Math.max(1, Math.min(16, sliceCount));
    const next: Slice[] = Array.from({ length: count }, (_, i) => ({
      id: makeId(),
      name: `Slice ${i + 1}`,
      start: (buffer.duration * i) / count,
      end: (buffer.duration * (i + 1)) / count,
    }));
    setSlices(next);
    setSelectedSliceId(next[0]?.id ?? null);
    setSelectionStart(0);
    setSelectionEnd(buffer.duration / count);
    setStatus(`Created ${count} equal-duration slices. Select a slice and assign it to a pad.`);
  };

  const detectTransients = () => {
    const buffer = bufferRef.current;
    if (!buffer) {
      setStatus("Load an audio file first.");
      return;
    }
    // Lightweight energy-onset approximation. Not a full musical beat detector.
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.max(256, Math.floor(sampleRate * 0.025));
    const hop = Math.max(128, Math.floor(windowSize / 2));
    const energies: number[] = [];
    for (let i = 0; i + windowSize < data.length; i += hop) {
      let sum = 0;
      for (let j = i; j < i + windowSize; j++) sum += data[j] * data[j];
      energies.push(Math.sqrt(sum / windowSize));
    }
    const candidates: number[] = [];
    const minGap = Math.max(1, Math.floor((0.12 * sampleRate) / hop));
    let last = -minGap;
    for (let i = 2; i < energies.length - 2; i++) {
      const previous = (energies[i - 2] + energies[i - 1]) / 2;
      const next = (energies[i + 1] + energies[i + 2]) / 2;
      if (energies[i] > previous * 1.7 && energies[i] >= next && energies[i] > 0.008 && i - last >= minGap) {
        candidates.push((i * hop) / sampleRate);
        last = i;
      }
    }
    const boundaries = [0, ...candidates.filter((t) => t > 0.03 && t < buffer.duration - 0.03), buffer.duration];
    const unique = boundaries.filter((t, i) => i === 0 || t - boundaries[i - 1] > 0.06);
    const capped = unique.slice(0, 17);
    if (capped[capped.length - 1] !== buffer.duration) capped.push(buffer.duration);
    const nextSlices: Slice[] = [];
    for (let i = 0; i < capped.length - 1 && nextSlices.length < 16; i++) {
      if (capped[i + 1] - capped[i] >= 0.06) {
        nextSlices.push({
          id: makeId(),
          name: `Hit ${nextSlices.length + 1}`,
          start: capped[i],
          end: capped[i + 1],
        });
      }
    }
    if (!nextSlices.length) {
      setStatus("No clear transients detected. Try equal slicing or adjust the selection manually.");
      return;
    }
    setSlices(nextSlices);
    setSelectedSliceId(nextSlices[0].id);
    setStatus(`Detected approximately ${nextSlices.length} regions. Review boundaries before using them.`);
  };

  const assignSlice = () => {
    if (!selectedSliceId) {
      setStatus("Select or create a slice first.");
      return;
    }
    const slice = slices.find((s) => s.id === selectedSliceId);
    if (!slice) return;
    setPads((old) => old.map((p) => p.id === selectedPadId
      ? { ...p, sliceId: slice.id, name: slice.name }
      : p));
    setStatus(`${slice.name} assigned to pad ${selectedPadId + 1} (${selectedPad.key.toUpperCase()}).`);
  };

  const clearPad = () => setPads((old) => old.map((p) => p.id === selectedPadId
    ? { ...p, sliceId: null, name: `Pad ${p.id + 1}` }
    : p));

  const triggerPad = useCallback((pad: Pad) => {
    if (pad.muted || !pad.sliceId) return;
    const slice = slices.find((s) => s.id === pad.sliceId);
    if (slice) void playRegion(slice.start, slice.end, pad.volume);
  }, [slices, duration]); // playRegion uses stable refs; current slice data is in state

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      const pad = pads.find((p) => p.key.toLowerCase() === event.key.toLowerCase());
      if (pad) {
        event.preventDefault();
        triggerPad(pad);
        setSelectedPadId(pad.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pads, triggerPad]);

  const savePreset = async () => {
    const payload: PresetPayload = { name: presetName, pads, slices };
    setBusy(true);
    try {
      const response = await fetch("/api/sampler/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      setStatus("Preset saved to the backend.");
    } catch (error) {
      console.error(error);
      setStatus("Could not save preset. Check the backend URL and server logs.");
    } finally {
      setBusy(false);
    }
  };

  const loadPresets = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/sampler/presets");
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as Array<PresetPayload & { id: string }>;
      if (!data.length) {
        setStatus("No saved presets yet.");
        return;
      }
      const preset = data[0];
      setPresetName(preset.name);
      setPads(preset.pads);
      setSlices(preset.slices);
      setSelectedSliceId(preset.slices[0]?.id ?? null);
      setStatus(`Loaded preset "${preset.name}". Load its source audio separately to play samples.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not load presets. Check the backend URL and server logs.");
    } finally {
      setBusy(false);
    }
  };

  const assignedCount = useMemo(() => pads.filter((p) => p.sliceId).length, [pads]);

  return (
    <main className="sampler">
      <header className="sampler-header">
        <div>
          <p className="sampler-eyebrow">AUDIO WORKSPACE</p>
          <h1>Drum Sampler</h1>
          <p className="sampler-subtitle">Slice audio, map samples to pads, and perform with your keyboard.</p>
        </div>
        <button className="sampler-button secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          Load audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadAudioFile(file);
            event.currentTarget.value = "";
          }}
        />
      </header>

      <section className="sampler-panel">
        <div className="sampler-panel-title">
          <div>
            <h2>Source waveform</h2>
            <p>{fileName || "No audio loaded"}{duration ? ` · ${duration.toFixed(2)} sec` : ""}</p>
          </div>
          <button className="sampler-button" onClick={() => void playRegion(selectionStart, selectionEnd)} disabled={!duration}>Preview selection</button>
        </div>
        <canvas
          ref={canvasRef}
          className="sampler-waveform"
          onClick={updateSelectedRegionFromCanvas}
          title="Click to set selection start; Shift+click to set selection end"
        />
        <p className="sampler-hint">Click waveform to set the start marker; Shift + click to set the end marker.</p>
        <div className="sampler-fields">
          <label>Start (sec)
            <input type="number" min="0" max={duration || undefined} step="0.01" value={selectionStart.toFixed(2)}
              onChange={(e) => setSelectionStart(Math.max(0, Math.min(Number(e.target.value), duration)))} />
          </label>
          <label>End (sec)
            <input type="number" min="0" max={duration || undefined} step="0.01" value={selectionEnd.toFixed(2)}
              onChange={(e) => setSelectionEnd(Math.max(selectionStart, Math.min(Number(e.target.value), duration)))} />
          </label>
          <button className="sampler-button" onClick={addManualSlice} disabled={!duration}>Create manual slice</button>
        </div>
      </section>

      <section className="sampler-panel">
        <div className="sampler-panel-title">
          <div>
            <h2>Automatic slicing</h2>
            <p>Equal slices or approximate transient-based regions</p>
          </div>
        </div>
        <div className="sampler-fields">
          <label>Equal slices
            <input type="number" min="1" max="16" value={sliceCount}
              onChange={(e) => setSliceCount(Math.max(1, Math.min(16, Number(e.target.value) || 1)))} />
          </label>
          <button className="sampler-button" onClick={autoSlice} disabled={!duration}>Split equally</button>
          <button className="sampler-button" onClick={detectTransients} disabled={!duration}>Detect transients</button>
        </div>
        <div className="sampler-slice-list">
          {slices.length === 0 && <p className="sampler-empty">No slices yet. Create a manual slice or split the source.</p>}
          {slices.map((slice) => (
            <button key={slice.id} className={`sampler-slice ${selectedSliceId === slice.id ? "selected" : ""}`}
              onClick={() => {
                setSelectedSliceId(slice.id);
                setSelectionStart(slice.start);
                setSelectionEnd(slice.end);
              }}>
              <strong>{slice.name}</strong>
              <span>{slice.start.toFixed(2)}s – {slice.end.toFixed(2)}s</span>
              <span>{(slice.end - slice.start).toFixed(2)}s</span>
            </button>
          ))}
        </div>
      </section>

      <section className="sampler-panel">
        <div className="sampler-panel-title">
          <div>
            <h2>Pad bank</h2>
            <p>{assignedCount}/16 pads assigned · Click a pad, then assign the selected slice.</p>
          </div>
          <div className="sampler-inline-actions">
            <button className="sampler-button" onClick={assignSlice} disabled={!selectedSliceId}>Assign to selected pad</button>
            <button className="sampler-button secondary" onClick={clearPad}>Clear pad</button>
          </div>
        </div>
        <div className="sampler-pad-grid">
          {pads.map((pad) => {
            const assignedSlice = slices.find((s) => s.id === pad.sliceId);
            return (
              <button
                key={pad.id}
                className={`sampler-pad ${selectedPadId === pad.id ? "active" : ""} ${assignedSlice ? "assigned" : ""}`}
                onClick={() => {
                  setSelectedPadId(pad.id);
                  if (assignedSlice) void playRegion(assignedSlice.start, assignedSlice.end, pad.volume);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedPadId(pad.id);
                  setPads((old) => old.map((p) => p.id === pad.id ? { ...p, muted: !p.muted } : p));
                }}
                title="Click to select/play. Right-click to toggle mute."
              >
                <span className="sampler-pad-key">{pad.key.toUpperCase()}</span>
                <strong>{assignedSlice?.name ?? pad.name}</strong>
                <span>{assignedSlice ? `${(assignedSlice.end - assignedSlice.start).toFixed(2)} sec` : "Empty pad"}</span>
                {pad.muted && <em>Muted</em>}
              </button>
            );
          })}
        </div>
        <div className="sampler-fields sampler-pad-settings">
          <label>Selected pad name
            <input value={selectedPad.name} onChange={(e) => setPads((old) => old.map((p) => p.id === selectedPadId ? { ...p, name: e.target.value } : p))} />
          </label>
          <label>Keyboard key
            <input maxLength={1} value={selectedPad.key} onChange={(e) => setPads((old) => old.map((p) => p.id === selectedPadId ? { ...p, key: e.target.value.slice(-1) } : p))} />
          </label>
          <label>Volume: {Math.round(selectedPad.volume * 100)}%
            <input type="range" min="0" max="1.5" step="0.05" value={selectedPad.volume}
              onChange={(e) => setPads((old) => old.map((p) => p.id === selectedPadId ? { ...p, volume: Number(e.target.value) } : p))} />
          </label>
          <label className="sampler-checkbox"><input type="checkbox" checked={selectedPad.muted}
            onChange={(e) => setPads((old) => old.map((p) => p.id === selectedPadId ? { ...p, muted: e.target.checked } : p))} /> Muted</label>
        </div>
      </section>

      <section className="sampler-panel">
        <div className="sampler-panel-title">
          <div>
            <h2>Save / load preset</h2>
            <p>Stores slice boundaries and pad assignments in your backend.</p>
          </div>
        </div>
        <div className="sampler-fields">
          <label>Preset name
            <input value={presetName} onChange={(e) => setPresetName(e.target.value)} maxLength={80} />
          </label>
          <button className="sampler-button" onClick={() => void savePreset()} disabled={busy}>Save preset</button>
          <button className="sampler-button secondary" onClick={() => void loadPresets()} disabled={busy}>Load latest preset</button>
        </div>
      </section>

      <div className="sampler-status" role="status">{status}</div>
      <footer className="sampler-footer">Keyboard: 1–4, Q–R, A–F, Z–V · Right-click a pad to mute it.</footer>
    </main>
  );
}
