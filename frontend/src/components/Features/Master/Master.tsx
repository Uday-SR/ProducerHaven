import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { EQ_FREQUENCIES as FREQUENCIES, useLiveMaster } from './UseliveMaster';
import { Activity, AudioLines, Check, ChevronDown, Download, Headphones, LoaderCircle, Music2, RotateCcw, SlidersHorizontal, Sparkles, UploadCloud, Volume2, WandSparkles, X } from 'lucide-react';

type Mode = 'manual' | 'platform' | 'pack';
type Settings = { 
  eq: number[]; 
  highpass: number; 
  compression: number; 
  width: number; 
  gain: number; 
  targetLufs: number; 
  truePeak: number 
};

const DEFAULT: Settings = { 
  eq: Array(9).fill(0), 
  highpass: 25, 
  compression: 2, 
  width: 100, 
  gain: 0, 
  targetLufs: -14, 
  truePeak: -1 
};

const PLATFORMS = [
  { id: 'universal', name: 'Universal', description: 'Balanced distribution master', lufs: -14, peak: -1 },
  { id: 'instagram', name: 'Instagram', description: 'Reels and feed audio', lufs: -14, peak: -1.5 },
  { id: 'youtube', name: 'YouTube', description: 'Video and music uploads', lufs: -14, peak: -1 },
  { id: 'spotify', name: 'Spotify', description: 'Streaming-friendly delivery', lufs: -14, peak: -1 },
  { id: 'apple', name: 'Apple Music', description: 'Sound Check-oriented profile', lufs: -16, peak: -1 },
  { id: 'tiktok', name: 'TikTok', description: 'Short-form playback', lufs: -14, peak: -1.5 },
  { id: 'soundcloud', name: 'SoundCloud', description: 'Independent releases', lufs: -14, peak: -1 },
];

const PACKS: { id: string; name: string; detail: string; eq: number[]; compression: number }[] = [
  { id: 'universal', name: 'Universal', detail: 'Transparent · Balanced', eq: [0,0,-.5,-.5,0,0,.5,.5,0], compression: 2 },
  { id: 'rock', name: 'Rock', detail: 'Punch · Presence', eq: [.5,1,-1.5,-1,0,1,1.5,1,0], compression: 3 },
  { id: 'pop', name: 'Pop', detail: 'Polish · Clarity', eq: [.5,.5,-1.5,-1,0,1,1.5,1.5,1], compression: 2.5 },
  { id: 'hiphop', name: 'Hip-Hop', detail: 'Low end · Vocal focus', eq: [1.5,1,-1.5,-1,0,1,1,.5,0], compression: 3 },
  { id: 'trap', name: 'Trap', detail: '808 weight · Crisp hats', eq: [2,1,-2,-1,0,.5,1,1.5,1], compression: 3.5 },
  { id: 'house', name: 'House', detail: 'Groove · Energy', eq: [1,1,-1.5,-.5,0,.5,1,1.5,.5], compression: 3 },
  { id: 'edm', name: 'EDM', detail: 'Impact · Brightness', eq: [1.5,1,-2,-1,0,.5,1,1.5,1], compression: 3.5 },
  { id: 'lofi', name: 'Lo-Fi', detail: 'Warm · Soft', eq: [-1,0,1,1,.5,0,-1,-2,-2], compression: 1.5 },
  { id: 'acoustic', name: 'Acoustic', detail: 'Natural · Open', eq: [-.5,0,-1,-.5,0,.5,1,1,.5], compression: 1.5 },
  { id: 'rnb', name: 'R&B', detail: 'Warm · Smooth', eq: [1,.5,-1,-.5,0,.5,.5,1,.5], compression: 2 },
];

const fmt = (n: number) => `${n > 0 ? '+' : ''}${Number(n.toFixed(1))}`;
function Slider({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (n: number) => void }) {
  return <div className="space-y-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-zinc-400">{label}</span><span className="font-mono text-amber-300 tabular-nums">{fmt(value)}{unit}</span></div><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full cursor-pointer accent-amber-400" /><div className="flex justify-between text-[10px] text-zinc-600"><span>{min}{unit}</span><span>{max}{unit}</span></div></div>;
}

export default function Master() {
  const [mode, setMode] = useState<Mode>('platform');
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [platform, setPlatform] = useState('instagram');
  const [pack, setPack] = useState('universal');
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const setField = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(s => ({ ...s, [key]: value }));
  const live = useLiveMaster(file, settings);
  useEffect(() => { if (!file) { setSourceUrl(null); return; } const url = URL.createObjectURL(file); setSourceUrl(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { return () => { controller.current?.abort(); }; }, []);
  const chooseFile = (f?: File) => { if (!f) return; if (!f.type.startsWith('audio/') && !/\.(wav|mp3|flac|aif|aiff|m4a|ogg)$/i.test(f.name)) { setError('Choose a supported audio file.'); return; } if (f.size > 100 * 1024 * 1024) { setError('Maximum file size is 100 MB.'); return; } setError(''); setFile(f); setOutputUrl(null); };
  const choosePlatform = (id: string) => { setPlatform(id); const p = PLATFORMS.find(p => p.id === id)!; setSettings(s => ({ ...s, targetLufs: p.lufs, truePeak: p.peak })); };
  const choosePack = (id: string) => { setPack(id); const p = PACKS.find(p => p.id === id)!; setSettings(s => ({ ...s, eq: [...p.eq], compression: p.compression, highpass: 25 })); };
  const masterAudio = async () => {
    if (!file || busy) return;
    setBusy(true); setError(''); setProgress('Processing your master…');
    const abort = new AbortController(); controller.current = abort;
    try {
      const data = new FormData(); data.append('audio', file); data.append('mode', mode); data.append('platform', platform); data.append('genre', pack); data.append('settings', JSON.stringify(settings)); data.append('format', format);
      const response = await axios.post('/upload', data, { responseType: 'blob', signal: abort.signal, timeout: 300000 });
      const url = URL.createObjectURL(response.data);
      setOutputUrl(old => { if (old) URL.revokeObjectURL(old); return url; }); setProgress('Master ready');
    } catch (e: unknown) {
      if (axios.isCancel(e)) setProgress('Cancelled');
      else { let message = 'Mastering failed. Check that your audio is valid and the server is running.'; if (axios.isAxiosError(e) && e.response?.data instanceof Blob) message = (await e.response.data.text()) || message; setError(message); setProgress(''); }
    } finally { setBusy(false); controller.current = null; }
  };
  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);
  const panel = 'rounded-2xl border border-white/10 bg-[#121318] p-5 sm:p-6';
  return <main className="min-h-screen bg-[#090a0d] px-4 pb-44 pt-8 text-zinc-100 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7"><div><div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.25em] text-amber-400"><Activity size={15}/> ProdHaven / Audio Lab</div><h1 className="archivo-black-regular text-3xl sm:text-5xl">MASTERING STUDIO<span className="text-amber-400">.</span></h1><p className="mt-3 max-w-xl text-sm text-zinc-400">Shape your sound. Choose a destination. Export a polished master.</p></div><span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-xs text-amber-300">FFMPEG ENGINE</span></header>
      <section className={panel}><div className="mb-4 flex items-center justify-between"><h2 className="orbitron-x text-sm">01 / SOURCE AUDIO</h2><span className="text-xs text-zinc-500">WAV · MP3 · FLAC · AIFF · M4A · OGG</span></div><input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.flac,.aif,.aiff,.m4a,.ogg" className="hidden" onChange={e => chooseFile(e.target.files?.[0])}/><div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }} className="rounded-xl border border-dashed border-white/20 bg-white/[.025] p-6 text-center transition hover:border-amber-400/60"><UploadCloud className="mx-auto mb-3 text-amber-400" size={27}/><p className="text-sm font-semibold">{file ? file.name : 'Drop your track here'}</p><p className="mt-1 text-xs text-zinc-500">{file ? `${(file.size / 1048576).toFixed(2)} MB · Ready to master` : 'Up to 100 MB · Stereo mix recommended'}</p><button onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg border border-white/20 px-5 py-2 text-xs font-semibold hover:border-amber-400">{file ? 'REPLACE TRACK' : 'BROWSE AUDIO'}</button></div>{sourceUrl && <p className="mt-4 text-xs text-zinc-500">Press play on the live preview bar at the bottom of the screen. Every change you make below is heard instantly, and you can flip between original and mastered while it plays.</p>}</section>
      <section className="space-y-4"><h2 className="orbitron-x text-sm">02 / CHOOSE YOUR WORKFLOW</h2><div className="grid gap-3 sm:grid-cols-3">{([{ id: 'manual', name: 'Manual Studio', desc: 'Full control of the mastering chain', Icon: SlidersHorizontal }, { id: 'platform', name: 'Platform Ready', desc: 'Destination-based delivery profiles', Icon: WandSparkles }, { id: 'pack', name: 'Mastering Packs', desc: 'Genre-inspired sonic starting points', Icon: Music2 }] as const).map(({id,name,desc,Icon}) => <button key={id} onClick={() => setMode(id)} className={`rounded-xl border p-5 text-left transition ${mode === id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-[#121318] hover:border-white/30'}`}><Icon size={23} className={mode === id ? 'text-amber-400' : 'text-zinc-500'}/><h3 className="orbitron-x mt-4 text-sm">{name}</h3><p className="mt-2 text-xs text-zinc-500">{desc}</p></button>)}</div></section>
      {mode === 'platform' && <section className={panel}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="orbitron-x text-sm">DESTINATION PROFILES</h2><span className="text-xs text-zinc-500">Select one</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PLATFORMS.map(p => <button key={p.id} onClick={() => choosePlatform(p.id)} className={`rounded-xl border p-4 text-left transition ${platform === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[.025] hover:border-white/30'}`}><div className="flex justify-between gap-2"><span className="font-semibold">{p.name}</span>{platform === p.id && <Check size={16} className="text-amber-400"/>}</div><p className="mt-2 text-xs text-zinc-500">{p.description}</p><p className="mt-4 font-mono text-xs text-amber-300">{p.lufs} LUFS · {p.peak} dBTP</p></button>)}</div><p className="mt-4 text-xs leading-relaxed text-zinc-500">These are practical export targets, not official platform guarantees. Platforms may normalize, transcode, or alter playback independently.</p></section>}
      {mode === 'pack' && <section className={panel}><h2 className="orbitron-x mb-5 text-sm">SONIC COLLECTION</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{PACKS.map(p => <button key={p.id} onClick={() => choosePack(p.id)} className={`rounded-xl border p-4 text-left transition ${pack === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[.025] hover:border-white/30'}`}><div className="flex justify-between"><Music2 size={18} className="text-amber-400"/>{pack === p.id && <Check size={16} className="text-amber-400"/>}</div><h3 className="orbitron-x mt-5 text-sm">{p.name}</h3><p className="mt-2 text-xs text-zinc-500">{p.detail}</p></button>)}</div></section>}
      <section className={panel}><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="orbitron-x text-sm">03 / MASTERING CHAIN</h2><p className="mt-2 text-xs text-zinc-500">{mode === 'manual' ? 'Fine-tune every parameter.' : 'Preset loaded. Customize it before export.'}</p></div><button onClick={() => setSettings({...DEFAULT, eq: [...DEFAULT.eq]})} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-amber-400"><RotateCcw size={13}/> RESET</button></div>
        <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><AudioLines size={18} className="text-amber-400"/> PARAMETRIC EQ</div><span className="font-mono text-xs text-zinc-500">9 BANDS · ±12 dB</span></div><div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">{settings.eq.map((value, i) => <div key={FREQUENCIES[i]} className="min-w-0 text-center"><div className="mb-3 font-mono text-xs tabular-nums text-amber-300">{fmt(value)}</div><div className="flex h-36 justify-center"><input aria-label={`${FREQUENCIES[i]} Hz EQ`} type="range" min={-12} max={12} step={.5} value={value} onChange={e => setField('eq', settings.eq.map((v,j) => i === j ? Number(e.target.value) : v))} className="h-36 w-7 cursor-pointer accent-amber-400 [writing-mode:vertical-lr] [direction:rtl]"/></div><p className="mt-3 font-mono text-[11px] text-zinc-400">{(FREQUENCIES[i] ?? 0) >= 1000 ? `${(FREQUENCIES[i] ?? 0) / 1000}k` : FREQUENCIES[i]}</p></div>)}</div>
        <div className="my-7 h-px bg-white/10"/><div className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3"><Slider label="High-pass / rumble removal" value={settings.highpass} min={20} max={100} unit=" Hz" onChange={n => setField('highpass',n)}/><Slider label="Compression ratio" value={settings.compression} min={1} max={5} step={.5} unit=":1" onChange={n => setField('compression',n)}/><Slider label="Stereo width" value={settings.width} min={0} max={150} unit="%" onChange={n => setField('width',n)}/><Slider label="Input / makeup gain" value={settings.gain} min={-12} max={12} step={.5} unit=" dB" onChange={n => setField('gain',n)}/><Slider label="Integrated loudness target" value={settings.targetLufs} min={-20} max={-9} step={.5} unit=" LUFS" onChange={n => setField('targetLufs',n)}/><Slider label="True-peak ceiling" value={settings.truePeak} min={-3} max={-0.5} step={.5} unit=" dBTP" onChange={n => setField('truePeak',n)}/></div><p className="mt-7 text-xs leading-relaxed text-zinc-500">Signal chain: high-pass → EQ → compression → stereo processing → gain → two-pass loudness normalization. Loudness and peak targets are measured and refined during export; results depend on source material. The live preview uses the same chain in your browser and estimates loudness from a 60-second excerpt, so the exported file can differ slightly.</p></section>
      <section className={panel}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="orbitron-x text-sm">04 / EXPORT MASTER</h2><p className="mt-2 text-xs text-zinc-500">Select delivery format and render your track.</p></div><div className="flex gap-2">{(['wav','mp3'] as const).map(f => <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-5 py-2 font-mono text-xs uppercase ${format === f ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/10 text-zinc-400'}`}>{f === 'wav' ? 'WAV / PCM' : 'MP3 / 320k'}</button>)}</div></div><button disabled={!file || busy} onClick={masterAudio} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-amber-400 px-5 py-4 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={19}/> : <Sparkles size={19}/>} {busy ? 'MASTERING IN PROGRESS…' : 'GENERATE MASTER'}</button>{busy && <button className="mt-3 flex w-full justify-center gap-2 text-xs text-zinc-400 hover:text-white" onClick={() => controller.current?.abort()}><X size={14}/> Cancel processing</button>}{progress && <p role="status" className="mt-3 text-center font-mono text-xs text-amber-300">{progress}</p>}{error && <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{outputUrl && <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/[.05] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-300"><Check size={17}/> YOUR MASTER IS READY</div><p className="mb-2 text-xs text-zinc-500">MASTERED / COMPARE WITH ORIGINAL ABOVE</p><audio controls src={outputUrl} preload="metadata" onPlay={() => live.audioRef.current?.pause()} className="w-full"/><a href={outputUrl} download={`${file?.name.replace(/\.[^.]+$/, '') || 'track'}-mastered.${format}`} className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-black hover:bg-amber-300"><Download size={17}/> DOWNLOAD MASTER</a></div>}</section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs text-zinc-600"><span>PRODHAVEN / MASTERING STUDIO</span><span className="flex items-center gap-2"><Headphones size={14}/> Listen critically before publishing.</span></footer>
    </div>
      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-amber-400/20 bg-[#0d0e12]/95 backdrop-blur ${sourceUrl ? '' : 'hidden'}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-amber-400"><Headphones size={15}/> Live preview</div>
          <div role="group" aria-label="Preview source" className="flex rounded-lg border border-white/10 p-0.5 text-xs font-semibold">
            <button aria-pressed={live.bypass} onClick={() => live.setBypass(true)} className={`rounded-md px-3 py-1.5 transition ${live.bypass ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>ORIGINAL</button>
            <button aria-pressed={!live.bypass} onClick={() => live.setBypass(false)} className={`rounded-md px-3 py-1.5 transition ${!live.bypass ? 'bg-amber-400 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>MASTERED</button>
          </div>
          <audio ref={live.audioRef} src={sourceUrl ?? undefined} controls preload="auto" onPlay={live.ensure} className="h-10 min-w-[220px] flex-1"/>
          <div className="flex w-44 flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div ref={live.meterRef} className="h-full w-0 rounded-full bg-amber-400"/></div>
            <span className="font-mono text-[10px] text-zinc-500">{live.bypass ? 'Original, unprocessed' : live.analysis === 'ready' && live.sourceLufs !== null ? `Est. ${live.sourceLufs.toFixed(1)} → ${settings.targetLufs} LUFS` : live.analysis === 'analyzing' ? 'Analyzing loudness…' : live.analysis === 'unavailable' ? 'Loudness preview unavailable' : ''}</span>
          </div>
        </div>
      </div>
  </main>;
}