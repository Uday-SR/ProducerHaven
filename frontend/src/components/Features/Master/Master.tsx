import { useEffect, useState } from "react";
import axios from "axios";
import Upload from "../../Reuse/Upload";
import AudioWaveform from "../../Reuse/AudioWaveform";
import master from "../../../assets/Master.jpg";
import { Download } from "../../../icons/Download";
import "./../../../App.css"


const GENRE = ["Trap", "Lofi", "Pop", "Hiphop", "Edm", "Rock", "Acoustic"];
const PLATFORM = ["Instagram", "Youtube"];

export default function Master() {
    const [platform, setPlatform] = useState<string>("Instagram");
    const [genre, setGenre] = useState<string>("Acoustic");
    const [output, setOutput] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async (files: FileList) => {
        if (!files || files.length === 0) return;

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("audio", files[0]);
            formData.append("platform", platform);
            formData.append("genre", genre);

            const res = await axios.post(
                "http://localhost:3000/upload",
                formData,
                {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                responseType: "blob",
                }
            );

            const url = URL.createObjectURL(res.data);
            setOutput(url);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
        if (output) {
            URL.revokeObjectURL(output);
        }
        };
    }, [output]);

    return (
        <div className="justify-items-center">
            <div className="flex flex-col gap-4 items-center">

            <img
                src={master}
                className="object-cover size-50 w-fit rounded-2xl border-1 hover:border-amber-300 transition duration-300"
            />

            <div className="my-3 ml-5 italic text-blue-200 font-mono lg:w-150">
                <p>This tool enables platform-specific audio mastering, ensuring your track is optimized for its intended distribution channel. 
                    It minimizes common issues such as muddiness, unwanted noise, and imbalance, delivering a clean, polished, and professional 
                    sound ready for upload across platforms.</p>
            </div>
            
            {/* Genre Selector */}
            <div className="flex">
                <h1 className="mx-2 my-2 orbitron-x">Select Genre</h1>
                <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="bg-yellow-600 p-2 rounded bitcount-grid-double-x"
                >
                    {GENRE.map((g) => (
                    <option key={g} value={g}>
                        {g}
                    </option>
                    ))}
                </select>
            </div>    

            {/* Platform Selector */}
            <div className="flex ">
                <h1 className="mx-2 my-2 orbitron-x">Select Platform</h1>
                <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="bg-blue-900 p-2 rounded bitcount-grid-double-x"
                >
                    {PLATFORM.map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                    ))}
                </select>
            </div>    

            {/* Upload */}
            <Upload
                label={loading ? "Processing..." : "IMPORT"}
                onUpload={handleUpload}
            />

            {/* Output Waveform */}
            {output && 
                <>
                <h3 className="italic border-1 w-fit px-3 my-5 text-black text-shadow-2xs bg-amber-300">Results</h3>
                <div className="flex">
                    <AudioWaveform audioUrl={output} 
                    />
                    <a className="mx-2 mt-12 shrink-0" href={output} download>
                        <Download />
                    </a>
                </div>
                </>
            }
            </div>
        </div>    
    );
}