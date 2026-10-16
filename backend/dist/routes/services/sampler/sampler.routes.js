"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Set SAMPLER_DATA_DIR in your backend environment if you want another location.
// Local-disk persistence is suitable for local development and persistent servers,
// but not serverless/ephemeral filesystems. For production, use your existing DB/object storage.
const DATA_DIR = node_path_1.default.resolve(process.env.SAMPLER_DATA_DIR || "data/sampler");
const UPLOAD_DIR = node_path_1.default.join(DATA_DIR, "uploads");
const PRESET_FILE = node_path_1.default.join(DATA_DIR, "presets.json");
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: async (_req, _file, cb) => {
            try {
                await promises_1.default.mkdir(UPLOAD_DIR, { recursive: true });
                cb(null, UPLOAD_DIR);
            }
            catch (error) {
                cb(error, UPLOAD_DIR);
            }
        },
        filename: (_req, file, cb) => {
            const ext = node_path_1.default.extname(file.originalname).toLowerCase().slice(0, 10);
            cb(null, `${node_crypto_1.default.randomUUID()}${ext}`);
        },
    }),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("audio/")) {
            cb(new Error("Only audio files are allowed"));
            return;
        }
        cb(null, true);
    },
});
async function readPresets() {
    try {
        const raw = await promises_1.default.readFile(PRESET_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
}
async function writePresets(presets) {
    await promises_1.default.mkdir(DATA_DIR, { recursive: true });
    const temporary = `${PRESET_FILE}.${node_crypto_1.default.randomUUID()}.tmp`;
    await promises_1.default.writeFile(temporary, JSON.stringify(presets, null, 2), "utf8");
    await promises_1.default.rename(temporary, PRESET_FILE);
}
function validatePreset(body) {
    if (!body || typeof body !== "object")
        return "A preset object is required.";
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80) {
        return "Preset name must be 1–80 characters.";
    }
    if (!Array.isArray(body.pads) || body.pads.length !== 16) {
        return "Exactly 16 pads are required.";
    }
    if (!Array.isArray(body.slices) || body.slices.length > 256) {
        return "Slices must be an array of at most 256 items.";
    }
    for (const slice of body.slices) {
        if (typeof slice.id !== "string" ||
            typeof slice.name !== "string" ||
            !Number.isFinite(slice.start) ||
            !Number.isFinite(slice.end) ||
            slice.start < 0 ||
            slice.end <= slice.start)
            return "Each slice needs an id, name, and valid start/end times.";
    }
    for (const pad of body.pads) {
        if (!Number.isInteger(pad.id) || pad.id < 0 || pad.id > 15 ||
            typeof pad.key !== "string" || pad.key.length > 4 ||
            typeof pad.name !== "string" || pad.name.length > 80 ||
            !(pad.sliceId === null || typeof pad.sliceId === "string") ||
            !Number.isFinite(pad.volume) || pad.volume < 0 || pad.volume > 1.5 ||
            typeof pad.muted !== "boolean")
            return "One or more pads have invalid data.";
    }
    return null;
}
// POST /api/sampler/uploads — optional endpoint for uploading the source audio to backend storage.
router.post("/uploads", upload.single("audio"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Attach an audio file using the 'audio' form field." });
        return;
    }
    res.status(201).json({
        id: node_path_1.default.basename(req.file.filename, node_path_1.default.extname(req.file.filename)),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        // Add a protected download/stream route if your app needs server-side access.
    });
});
// GET /api/sampler/presets — list saved presets, newest first.
router.get("/presets", async (_req, res) => {
    try {
        const presets = await readPresets();
        res.json(presets.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    catch (error) {
        console.error("Sampler preset read failed:", error);
        res.status(500).json({ error: "Could not read sampler presets." });
    }
});
// POST /api/sampler/presets — create a saved preset.
router.post("/presets", async (req, res) => {
    const validationError = validatePreset(req.body);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }
    try {
        const presets = await readPresets();
        const preset = {
            id: node_crypto_1.default.randomUUID(),
            name: req.body.name.trim(),
            pads: req.body.pads,
            slices: req.body.slices,
            sourceAssetId: typeof req.body.sourceAssetId === "string" ? req.body.sourceAssetId : null,
            createdAt: new Date().toISOString(),
        };
        presets.push(preset);
        await writePresets(presets);
        res.status(201).json(preset);
    }
    catch (error) {
        console.error("Sampler preset save failed:", error);
        res.status(500).json({ error: "Could not save sampler preset." });
    }
});
exports.default = router;
//# sourceMappingURL=sampler.routes.js.map