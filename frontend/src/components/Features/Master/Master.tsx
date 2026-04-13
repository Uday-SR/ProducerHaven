import { useEffect, useState } from "react";
import axios from "axios";
import Upload from "../../Reuse/Upload";
import AudioWaveform from "../../Reuse/AudioWaveform";

const GENRE = ["trap", "lofi", "pop", "hiphop", "edm", "rock", "acoustic"];
const PLATFORM = ["instagram", "youtube"];

export default function Master() {
    const [platform, setPlatform] = useState<string>("instagram");
    const [genre, setGenre] = useState<string>("acoustic");
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
        <div className="flex flex-col gap-4">
        
        {/* Genre Selector */}
        <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="bg-blue-900 p-2 rounded"
        >
            {GENRE.map((g) => (
            <option key={g} value={g}>
                {g}
            </option>
            ))}
        </select>

        {/* Platform Selector */}
        <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-blue-900 p-2 rounded"
        >
            {PLATFORM.map((p) => (
            <option key={p} value={p}>
                {p}
            </option>
            ))}
        </select>

        {/* Upload */}
        <Upload
            label={loading ? "Processing..." : "Import"}
            onUpload={handleUpload}
        />

        {/* Output Waveform */}
        {output && <AudioWaveform audioUrl={output} />}
        </div>
    );
}