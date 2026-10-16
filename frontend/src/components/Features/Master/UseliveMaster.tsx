import { useCallback, useEffect, useRef, useState } from 'react';

export const EQ_FREQUENCIES = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];

/** The subset of Master's Settings the live engine needs. */
export type LiveSettings = {
  eq: number[];
  highpass: number;
  compression: number;
  width: number;
  targetLufs: number;
  truePeak: number;
};

type Chain = { input: GainNode; output: AudioNode; apply: (s: LiveSettings) => void };

type Graph = {
  ctx: AudioContext;
  chain: Chain;
  dry: GainNode;
  wet: GainNode;
  norm: GainNode;
  limiter: DynamicsCompressorNode;
  analyser: AnalyserNode;
  samples: Float32Array<ArrayBuffer>;
};

type Excerpt = { channels: Float32Array<ArrayBuffer>[]; sampleRate: number; length: number };

export type Analysis = 'idle' | 'analyzing' | 'ready' | 'unavailable';

/**
 * Web Audio version of the server's FFmpeg chain, so the sound you hear matches the export:
 * high-pass -> 9-band peaking EQ (Q = 1) -> compressor -> mid/side stereo width.
 * Input gain is deliberately not part of the chain: on the server it sits before loudnorm,
 * which cancels it, so the preview mirrors that.
 */
function createChain(ctx: BaseAudioContext, smooth: boolean): Chain {
  const set = (p: AudioParam, v: number) => {
    if (smooth) p.setTargetAtTime(v, ctx.currentTime, 0.02);
    else p.value = v;
  };

  // Upmix mono sources to stereo so the width stage always has two channels.
  const input = ctx.createGain();
  input.channelCount = 2;
  input.channelCountMode = 'explicit';
  input.channelInterpretation = 'speakers';

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.Q.value = Math.SQRT1_2;

  const bands = EQ_FREQUENCIES.map(f => {
    const b = ctx.createBiquadFilter();
    b.type = 'peaking';
    b.frequency.value = f;
    b.Q.value = 1;
    return b;
  });

  // FFmpeg acompressor: threshold 0.125 (-18 dB), attack 20 ms, release 180 ms.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 6;
  comp.attack.value = 0.02;
  comp.release.value = 0.18;

  const serial: AudioNode[] = [input, hp, ...bands, comp];
  serial.reduce((prev, next) => {
    prev.connect(next);
    return next;
  });

  // Mid/side width: mid = (L+R)/2, side = (L-R)/2 * width, out L = mid+side, out R = mid-side.
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  comp.connect(splitter);

  const mid = ctx.createGain();
  const side = ctx.createGain();
  const sideInv = ctx.createGain();
  sideInv.gain.value = -1;

  const tap = (channel: number, gain: number, into: GainNode) => {
    const g = ctx.createGain();
    g.gain.value = gain;
    splitter.connect(g, channel);
    g.connect(into);
  };
  tap(0, 0.5, mid);
  tap(1, 0.5, mid);
  tap(0, 0.5, side);
  tap(1, -0.5, side);

  side.connect(sideInv);
  mid.connect(merger, 0, 0);
  side.connect(merger, 0, 0);
  mid.connect(merger, 0, 1);
  sideInv.connect(merger, 0, 1);

  return {
    input,
    output: merger,
    apply: s => {
      set(hp.frequency, s.highpass);
      bands.forEach((b, i) => set(b.gain, s.eq[i] ?? 0));
      set(comp.ratio, Math.max(1, s.compression));
      set(side.gain, s.width / 100);
    },
  };
}

/** Decode the file and keep only a 60 s excerpt from the middle (the full buffer is released). */
async function decodeExcerpt(file: File): Promise<Excerpt> {
  const ctx = new OfflineAudioContext(2, 1, 44100);
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  const length = Math.min(decoded.length, Math.floor(60 * decoded.sampleRate));
  const start = Math.floor((decoded.length - length) / 2);
  const channels = Array.from({ length: Math.min(2, decoded.numberOfChannels) }, (_, c) =>
    decoded.getChannelData(c).slice(start, start + length),
  );
  return { channels, sampleRate: decoded.sampleRate, length };
}

/** Integrated loudness (ITU-R BS.1770 style, with absolute and relative gating) of a K-weighted buffer. */
function integratedLufs(buf: AudioBuffer): number {
  const seg = Math.round(buf.sampleRate * 0.1);
  const segments = Math.floor(buf.length / seg);
  if (segments < 4) return -Infinity;

  const data = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const power: number[] = [];
  for (let i = 0; i < segments; i++) {
    let sum = 0;
    for (const d of data) {
      let acc = 0;
      for (let n = i * seg; n < (i + 1) * seg; n++) {
        const v = d[n] ?? 0;
        acc += v * v;
      }
      sum += acc / seg;
    }
    power.push(sum);
  }

  const blocks: number[] = [];
  for (let i = 0; i + 4 <= segments; i++) {
    blocks.push(power.slice(i, i + 4).reduce((a, b) => a + b, 0) / 4);
  }

  const toLufs = (p: number) => -0.691 + 10 * Math.log10(p);
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const audible = blocks.filter(p => p > 0 && toLufs(p) > -70);
  if (!audible.length) return -Infinity;

  const relative = toLufs(mean(audible)) - 10;
  const gated = audible.filter(p => toLufs(p) > relative);
  return gated.length ? toLufs(mean(gated)) : -Infinity;
}

/** Render the excerpt through the same chain offline and measure its loudness. */
async function measureProcessed(ex: Excerpt, s: LiveSettings): Promise<number> {
  const ctx = new OfflineAudioContext(2, ex.length, ex.sampleRate);
  const buffer = ctx.createBuffer(ex.channels.length, ex.length, ex.sampleRate);
  ex.channels.forEach((d, c) => buffer.copyToChannel(d, c));

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const chain = createChain(ctx, false);
  chain.apply(s);

  // K-weighting: high shelf (+4 dB @ 1.68 kHz) then 38 Hz high-pass.
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 1681.97;
  shelf.gain.value = 4;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 38.13;
  hp.Q.value = 0.5;

  src.connect(chain.input);
  chain.output.connect(shelf);
  shelf.connect(hp);
  hp.connect(ctx.destination);
  src.start();

  return integratedLufs(await ctx.startRendering());
}

function applyToGraph(g: Graph, s: LiveSettings, lufs: number | null, bypass: boolean) {
  const t = g.ctx.currentTime;
  g.chain.apply(s);
  g.limiter.threshold.setTargetAtTime(s.truePeak, t, 0.02);

  // Mirrors the export's loudness normalization: land the processed signal on the target.
  const db = lufs === null ? 0 : Math.max(-24, Math.min(24, s.targetLufs - lufs));
  g.norm.gain.setTargetAtTime(10 ** (db / 20), t, 0.05);

  g.dry.gain.setTargetAtTime(bypass ? 1 : 0, t, 0.01);
  g.wet.gain.setTargetAtTime(bypass ? 0 : 1, t, 0.01);
}

export function useLiveMaster(file: File | null, settings: LiveSettings) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const graph = useRef<Graph | null>(null);
  const settingsRef = useRef(settings);
  const [graphReady, setGraphReady] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);
  const [analysis, setAnalysis] = useState<Analysis>('idle');
  const [sourceLufs, setSourceLufs] = useState<number | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /** Build the audio graph. Must run from a user gesture (the player's play event). */
  const ensure = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!graph.current) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const source = ctx.createMediaElementSource(el);
      const chain = createChain(ctx, true);
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const norm = ctx.createGain();
      const out = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;

      // Approximates the true-peak ceiling with a brick-wall style compressor.
      const limiter = ctx.createDynamicsCompressor();
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.08;

      source.connect(dry);
      dry.connect(out);
      source.connect(chain.input);
      chain.output.connect(norm);
      norm.connect(limiter);
      limiter.connect(wet);
      wet.connect(out);
      out.connect(analyser);
      analyser.connect(ctx.destination);

      graph.current = {
        ctx,
        chain,
        dry,
        wet,
        norm,
        limiter,
        analyser,
        samples: new Float32Array(analyser.fftSize),
      };
      setGraphReady(true);
    }

    if (graph.current.ctx.state === 'suspended') void graph.current.ctx.resume();
  }, []);

  // Decode a loudness-analysis excerpt whenever a new file is chosen.
  useEffect(() => {
    let cancelled = false;
    setExcerpt(null);
    setSourceLufs(null);
    if (!file) {
      setAnalysis('idle');
      return;
    }
    setAnalysis('analyzing');
    decodeExcerpt(file)
      .then(ex => {
        if (!cancelled) setExcerpt(ex);
      })
      .catch(() => {
        if (!cancelled) setAnalysis('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Re-measure processed loudness (debounced) when a tone-shaping control changes.
  // Target, ceiling and gain don't affect it, so dragging those stays instant.
  const chainKey = JSON.stringify([settings.eq, settings.highpass, settings.compression, settings.width]);
  useEffect(() => {
    if (!excerpt) return;
    let cancelled = false;
    setAnalysis('analyzing');
    const timer = window.setTimeout(() => {
      measureProcessed(excerpt, settingsRef.current)
        .then(lufs => {
          if (cancelled) return;
          if (Number.isFinite(lufs)) {
            setSourceLufs(lufs);
            setAnalysis('ready');
          } else {
            setSourceLufs(null);
            setAnalysis('unavailable');
          }
        })
        .catch(() => {
          if (!cancelled) setAnalysis('unavailable');
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [excerpt, chainKey]);

  // Push every change into the running graph.
  useEffect(() => {
    if (graph.current) applyToGraph(graph.current, settings, sourceLufs, bypass);
  }, [settings, sourceLufs, bypass, graphReady]);

  // Output peak meter, written straight to the DOM so React doesn't re-render at frame rate.
  useEffect(() => {
    let raf = 0;
    let level = 0;
    const tick = () => {
      const g = graph.current;
      const bar = meterRef.current;
      if (g && bar) {
        g.analyser.getFloatTimeDomainData(g.samples);
        let peak = 0;
        for (const v of g.samples) peak = Math.max(peak, Math.abs(v));
        level = Math.max(peak, level * 0.92);
        const db = level > 0 ? 20 * Math.log10(level) : -90;
        bar.style.width = `${Math.max(0, Math.min(100, ((db + 60) / 60) * 100))}%`;
        bar.style.background = db > -1 ? '#f87171' : '#fbbf24';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      void graph.current?.ctx.close();
      graph.current = null;
    },
    [],
  );

  return { audioRef, meterRef, ensure, bypass, setBypass, analysis, sourceLufs };
}