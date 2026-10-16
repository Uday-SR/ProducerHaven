import React, { useState } from "react";
import axios from "axios";
import { AudioLines, Drum, Guitar, Mic2, Music2, Scissors, TriangleAlert } from "lucide-react";

import Upload from "../Reuse/Upload";
import AudioWaveform from "../Reuse/AudioWaveform";
import Loader from "../Reuse/Loader";

import { Download } from "../../icons/Download";
import splitImg from "../../assets/splitImg.png";

interface SeparationResponse {
  message: string;
  stems: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  };
}

const STEM_META: Record<string, { label: string; hint: string; Icon: typeof Mic2 }> = {
  vocals: { label: "Vocals", hint: "Lead and backing voices", Icon: Mic2 },
  drums: { label: "Drums", hint: "Kick, snare, hats and percussion", Icon: Drum },
  bass: { label: "Bass", hint: "Sub and low-end lines", Icon: Guitar },
  other: { label: "Instruments", hint: "Keys, guitars, synths and everything else", Icon: Music2 },
};

const panel = "rounded-2xl border border-white/10 bg-[#121318] p-5 sm:p-6";
const body = "font-['Roboto',sans-serif]";

export default function Splitter() {
  const [stems, setStems] = useState<SeparationResponse["stems"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setError("");
      setStems(null);
      setFileName(file.name);

      const res = await axios.post<SeparationResponse>(
        "http://127.0.0.1:8000/separate/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setStems(res.data.stems);
    } catch (err) {
      console.error(err);
      setError("The track could not be split. Check that the file is valid audio and that the separation server is running, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.25em] text-amber-400">
              <Scissors size={15} /> ProdHaven / Audio Lab
            </div>
            <h1 className="archivo-black-regular text-3xl sm:text-5xl">
              SPLITTER<span className="text-amber-400">.</span>
            </h1>
            <p className={`${body} mt-3 max-w-xl text-sm leading-relaxed text-zinc-400`}>
              Pull a finished song apart into vocals, drums, bass and instruments. Listen to each stem, then download the ones you need.
            </p>
          </div>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-xs text-amber-300">
            AI SEPARATION
          </span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className={`${panel} flex flex-col gap-5`}>
            <img
              src={splitImg}
              alt="Illustration of a song being split into separate parts"
              className="aspect-[4/3] w-full rounded-xl border border-white/10 object-cover"
            />
            <div>
              <h2 className="orbitron-x text-sm">WHAT YOU CAN DO WITH IT</h2>
              <p className={`${body} mt-3 text-sm leading-relaxed text-zinc-400`}>
                Remix a record, make a karaoke version, sample a drum break, or study how a mix is built. Each element comes out as its own audio file.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {Object.entries(STEM_META).map(([id, { label, Icon }]) => (
                <li key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.025] px-3 py-2 text-xs text-zinc-300">
                  <Icon size={15} className="text-amber-400" />
                  <span className={body}>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${panel} flex flex-col`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="orbitron-x text-sm">SOURCE TRACK</h2>
              <span className="text-xs text-zinc-500">Full mixes work best</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[.025] p-8 text-center transition hover:border-amber-400/60">
              <AudioLines className="mb-4 text-amber-400" size={30} />
              <p className={`${body} mb-1 text-sm font-medium`}>{fileName || "Choose a song to split"}</p>
              <p className={`${body} mb-5 text-xs text-zinc-500`}>
                {loading ? "Separating stems. This can take a few minutes." : "Import an audio file to begin."}
              </p>
              <Upload label={loading ? "Processing..." : "Import"} onUpload={handleUpload} />
            </div>

            {loading && (
              <div role="status" className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[.05] p-5">
                <Loader />
                <p className="font-mono text-xs text-amber-300">Processing {fileName}</p>
              </div>
            )}

            {error && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <p className={body}>{error}</p>
              </div>
            )}
          </div>
        </section>

        {stems && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="orbitron-x text-sm">SEPARATED STEMS</h2>
              <span className="max-w-full truncate font-mono text-xs text-zinc-500">{fileName}</span>
            </div>

            <div className="grid gap-4">
              {Object.entries(stems).map(([name, url]) => {
                const meta = STEM_META[name] ?? { label: name, hint: "", Icon: Music2 };
                const { Icon } = meta;

                return (
                  <article key={name} className={panel}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
                          <Icon size={19} />
                        </span>
                        <div>
                          <h3 className="orbitron-x text-sm">{meta.label.toUpperCase()}</h3>
                          {meta.hint && <p className={`${body} mt-1 text-xs text-zinc-500`}>{meta.hint}</p>}
                        </div>
                      </div>

                      <a
                        href={url}
                        download
                        aria-label={`Download ${meta.label} stem`}
                        className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                      >
                        <Download />
                        <span className={body}>Download</span>
                      </a>
                    </div>

                    <div className="min-h-[120px] rounded-xl border border-white/5 bg-black/30 p-3">
                      <AudioWaveform audioUrl={url} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}