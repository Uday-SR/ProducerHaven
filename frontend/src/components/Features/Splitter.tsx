import React, { useState } from "react";
import axios from "axios";

import Upload from "../Reuse/Upload";
import AudioWaveform from "../Reuse/AudioWaveform";

import { Download } from "../../icons/Download";
import splitImg from "../../assets/splitImg.png"


interface SeparationResponse {
  message: string;
  stems: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  };
}

export default function Splitter() {
  const [stems, setStems] = useState<SeparationResponse["stems"] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (files: FileList) => {
    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      setLoading(true);
      setStems(null); 
      const res = await axios.post<SeparationResponse>(
        "http://127.0.0.1:8000/separate/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      console.log("Separation result:", res.data);

      setStems(res.data.stems); 
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      <main className="justify-items-center">

        <img
            src={splitImg}
            className="object-cover rounded-2xl border-1 hover:border-amber-300 transition duration-300"
        />

        <div className="mt-10 ml-5 italic text-blue-200 font-mono lg:w-150">
          <p>Music splitter tool separates a song into individual components like vocals, drums, bass, and instruments using AI.
            It helps producers remix tracks, create karaoke versions, or analyze music by isolating each element from a full audio file.</p>
        </div>

        <div className="justify-items-center my-10">

          <Upload label={loading ? "Processing..." : "Import"} onUpload={handleUpload} />

          {stems && (
            <div className="items-center">
              <h3 className="italic">Separated Stems</h3>
              {Object.entries(stems).map(([name, url]) => (
                <div key={name} className="">
                  <h3>{name.toUpperCase()}</h3>

                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-1 min-h-[120px]">
                      <AudioWaveform audioUrl={url} />
                    </div>

                    <a className="mx-2 my-4 shrink-0" href={url} download>
                      <Download />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
      </main>  
    </div>
  );
}
