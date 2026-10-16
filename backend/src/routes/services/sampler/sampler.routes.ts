import { Router, type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

const router = Router();

// Set SAMPLER_DATA_DIR in your backend environment if you want another location.
// Local-disk persistence is suitable for local development and persistent servers,
// but not serverless/ephemeral filesystems. For production, use your existing DB/object storage.
const DATA_DIR = path.resolve(process.env.SAMPLER_DATA_DIR || "data/sampler");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PRESET_FILE = path.join(DATA_DIR, "presets.json");
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type Pad = {
  id: number;
  key: string;
  name: string;
  sliceId: string | null;
  volume: number;
  muted: boolean;
};
type Slice = { id: string; name: string; start: number; end: number };
type Preset = {
  id: string;
  name: string;
  pads: Pad[];
  slices: Slice[];
  createdAt: string;
  sourceAssetId?: string | null;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
      } catch (error) {
        cb(error as Error, UPLOAD_DIR);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
      cb(null, `${crypto.randomUUID()}${ext}`);
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

async function readPresets(): Promise<Preset[]> {
  try {
    const raw = await fs.readFile(PRESET_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Preset[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writePresets(presets: Preset[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporary = `${PRESET_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(presets, null, 2), "utf8");
  await fs.rename(temporary, PRESET_FILE);
}

function validatePreset(body: any): string | null {
  if (!body || typeof body !== "object") return "A preset object is required.";
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
    if (
      typeof slice.id !== "string" ||
      typeof slice.name !== "string" ||
      !Number.isFinite(slice.start) ||
      !Number.isFinite(slice.end) ||
      slice.start < 0 ||
      slice.end <= slice.start
    ) return "Each slice needs an id, name, and valid start/end times.";
  }
  for (const pad of body.pads) {
    if (
      !Number.isInteger(pad.id) || pad.id < 0 || pad.id > 15 ||
      typeof pad.key !== "string" || pad.key.length > 4 ||
      typeof pad.name !== "string" || pad.name.length > 80 ||
      !(pad.sliceId === null || typeof pad.sliceId === "string") ||
      !Number.isFinite(pad.volume) || pad.volume < 0 || pad.volume > 1.5 ||
      typeof pad.muted !== "boolean"
    ) return "One or more pads have invalid data.";
  }
  return null;
}

// POST /api/sampler/uploads — optional endpoint for uploading the source audio to backend storage.
router.post("/uploads", upload.single("audio"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Attach an audio file using the 'audio' form field." });
    return;
  }
  res.status(201).json({
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    // Add a protected download/stream route if your app needs server-side access.
  });
});

// GET /api/sampler/presets — list saved presets, newest first.
router.get("/presets", async (_req: Request, res: Response) => {
  try {
    const presets = await readPresets();
    res.json(presets.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    console.error("Sampler preset read failed:", error);
    res.status(500).json({ error: "Could not read sampler presets." });
  }
});

// POST /api/sampler/presets — create a saved preset.
router.post("/presets", async (req: Request, res: Response) => {
  const validationError = validatePreset(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const presets = await readPresets();
    const preset: Preset = {
      id: crypto.randomUUID(),
      name: req.body.name.trim(),
      pads: req.body.pads,
      slices: req.body.slices,
      sourceAssetId: typeof req.body.sourceAssetId === "string" ? req.body.sourceAssetId : null,
      createdAt: new Date().toISOString(),
    };
    presets.push(preset);
    await writePresets(presets);
    res.status(201).json(preset);
  } catch (error) {
    console.error("Sampler preset save failed:", error);
    res.status(500).json({ error: "Could not save sampler preset." });
  }
});

export default router;
