import React, { useState } from "react";
import axios from "axios";
import Upload from "../Reuse/Upload";
import { Download } from "../../icons/Download";

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

``  const handleUpload = async (files: FileList) => {
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
            "Content-Type": "multipart/form-data",
          },
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
      <h2>Upload a Track to Split</h2>

      <main className="justify-items-center">
        <div className="justify-items-center mx-20 mt-10 w-100 md:w-130 lg:w-150  h-auto border-2 rounded-3xl shadow-2xl shadow-emerald-300">
          <Upload label="Upload & Split" onUpload={handleUpload} />

          <div className="mx-2 my-4">{loading && <p>⏳ Separating track, please wait...</p>}</div>

          {stems && (
            <div className="mt-10 items-center">
              <h3 className="italic ml-25">Separated Stems</h3>
              {Object.entries(stems).map(([name, url]) => (
                <div key={name} className="my-5">
                  <h4>{name.toUpperCase()}</h4>

                  <div className="flex">
                    <audio controls src={url}></audio>
              
                    <a className="mx-2 my-4" href={url} download>
                      <Download/>
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
