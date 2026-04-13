"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const upload = (0, multer_1.default)({ dest: "uploads/" });
const port = 3000;
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173"
    ],
    credentials: true,
}));
// ensures folders exist
if (!fs_1.default.existsSync("uploads")) {
    fs_1.default.mkdirSync("uploads");
}
if (!fs_1.default.existsSync("outputs")) {
    fs_1.default.mkdirSync("outputs");
}
const GENRE_FILTERS = {
    trap: [
        "highpass=f=30",
        "equalizer=f=60:width_type=o:width=2:g=2",
        "equalizer=f=300:width_type=o:width=2:g=-4",
        "equalizer=f=5000:width_type=o:width=2:g=2"
    ],
    lofi: [
        "highpass=f=80",
        "equalizer=f=200:width_type=o:width=2:g=2",
        "equalizer=f=4000:width_type=o:width=2:g=-3",
        "equalizer=f=10000:width_type=o:width=2:g=-2"
    ],
    pop: [
        "highpass=f=100",
        "equalizer=f=250:width_type=o:width=2:g=-3",
        "equalizer=f=3000:width_type=o:width=2:g=3",
        "equalizer=f=10000:width_type=o:width=2:g=2"
    ],
    hiphop: [
        "highpass=f=35", // remove rumble
        "equalizer=f=80:width_type=o:width=2:g=2", // punchy kick
        "equalizer=f=250:width_type=o:width=2:g=-3", // remove mud
        "equalizer=f=3000:width_type=o:width=2:g=2", // vocal clarity
        "equalizer=f=9000:width_type=o:width=2:g=1" // slight air
    ],
    edm: [
        "highpass=f=40",
        "equalizer=f=80:width_type=o:width=2:g=3",
        "equalizer=f=300:width_type=o:width=2:g=-3",
        "equalizer=f=8000:width_type=o:width=2:g=3"
    ],
    rock: [
        "highpass=f=60",
        "equalizer=f=120:width_type=o:width=2:g=2",
        "equalizer=f=400:width_type=o:width=2:g=-3",
        "equalizer=f=6000:width_type=o:width=2:g=3"
    ],
    acoustic: [
        "highpass=f=80",
        "equalizer=f=250:width_type=o:width=2:g=-2",
        "equalizer=f=5000:width_type=o:width=2:g=2"
    ]
};
app.post("/upload", upload.single("audio"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }
    const platform = req.body.platform?.toLowerCase();
    const genre = req.body.genre?.toLowerCase();
    if (!GENRE_FILTERS[genre]) {
        return res.status(400).send("Invalid genre");
    }
    const inputPath = req.file.path;
    const outputPath = `outputs/mastered-${Date.now()}.wav`;
    let filters = [...GENRE_FILTERS[genre]];
    if (platform === "instagram") {
        filters.push("loudnorm=I=-14:TP=-1.0:LRA=11", "alimiter=limit=0.95", "stereotools=mlev=0.6");
    }
    else if (platform === "youtube") {
        filters.push("loudnorm=I=-14:TP=-1.0:LRA=11", "alimiter=limit=0.95");
    }
    else {
        return res.status(400).send("Invalid platform");
    }
    (0, fluent_ffmpeg_1.default)(inputPath)
        .audioFilters(filters)
        .on("end", () => {
        res.download(outputPath, () => {
            fs_1.default.unlinkSync(inputPath);
            // fs.unlinkSync(outputPath);
        });
    })
        .on("error", (err) => {
        console.error("FFmpeg Error:", err);
        res.status(500).send("Error processing audio");
    })
        .save(outputPath);
    console.log("Platform:", platform);
    console.log("Genre:", genre);
    console.log("File:", req.file);
});
app.listen(port, () => {
    console.log(`Server is listening on Port: ${port}`);
});
//# sourceMappingURL=index.js.map