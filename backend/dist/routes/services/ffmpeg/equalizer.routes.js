"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const router = (0, express_1.Router)();
(0, node_fs_1.mkdirSync)(node_path_1.default.join(node_os_1.default.tmpdir(), 'prodhaven-uploads'), { recursive: true });
const upload = (0, multer_1.default)({
    dest: node_path_1.default.join(node_os_1.default.tmpdir(), 'prodhaven-uploads'),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});
const DEFAULT = {
    eq: Array(9).fill(0),
    highpass: 25,
    compression: 2,
    width: 100,
    gain: 0,
    targetLufs: -14,
    truePeak: -1,
};
const FREQ = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
const PACKS = {
    universal: { eq: [0, 0, -.5, -.5, 0, 0, .5, .5, 0], compression: 2 },
    rock: { eq: [.5, 1, -1.5, -1, 0, 1, 1.5, 1, 0], compression: 3 },
    pop: { eq: [.5, .5, -1.5, -1, 0, 1, 1.5, 1.5, 1], compression: 2.5 },
    hiphop: { eq: [1.5, 1, -1.5, -1, 0, 1, 1, .5, 0], compression: 3 },
    trap: { eq: [2, 1, -2, -1, 0, .5, 1, 1.5, 1], compression: 3.5 },
    house: { eq: [1, 1, -1.5, -.5, 0, .5, 1, 1.5, .5], compression: 3 },
    edm: { eq: [1.5, 1, -2, -1, 0, .5, 1, 1.5, 1], compression: 3.5 },
    lofi: { eq: [-1, 0, 1, 1, .5, 0, -1, -2, -2], compression: 1.5 },
    acoustic: { eq: [-.5, 0, -1, -.5, 0, .5, 1, 1, .5], compression: 1.5 },
    rnb: { eq: [1, .5, -1, -.5, 0, .5, .5, 1, .5], compression: 2 },
};
const PLATFORMS = {
    universal: [-14, -1],
    instagram: [-14, -1.5],
    youtube: [-14, -1],
    spotify: [-14, -1],
    apple: [-16, -1],
    tiktok: [-14, -1.5],
    soundcloud: [-14, -1],
};
/** Safe table lookup: returns undefined for missing keys and prototype keys like "constructor". */
function lookup(table, key) {
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}
const bounded = (v, low, high, fallback) => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high ? v : fallback;
function parseSettings(raw) {
    let s = {};
    if (typeof raw === 'string') {
        try {
            s = JSON.parse(raw);
        }
        catch {
            throw new Error('Invalid settings JSON');
        }
    }
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
        throw new Error('Invalid settings');
    }
    if (s.eq !== undefined &&
        (!Array.isArray(s.eq) ||
            s.eq.length !== 9 ||
            s.eq.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < -12 || n > 12))) {
        throw new Error('Invalid EQ bands');
    }
    return {
        eq: s.eq || [...DEFAULT.eq],
        highpass: bounded(s.highpass, 20, 100, DEFAULT.highpass),
        compression: bounded(s.compression, 1, 5, DEFAULT.compression),
        width: bounded(s.width, 0, 150, DEFAULT.width),
        gain: bounded(s.gain, -12, 12, DEFAULT.gain),
        targetLufs: bounded(s.targetLufs, -20, -9, DEFAULT.targetLufs),
        truePeak: bounded(s.truePeak, -3, -.5, DEFAULT.truePeak),
    };
}
function chain(s) {
    const filters = [`highpass=f=${s.highpass}`];
    s.eq.forEach((gain, i) => {
        if (gain !== 0)
            filters.push(`equalizer=f=${FREQ[i]}:t=q:w=1:g=${gain}`);
    });
    if (s.compression > 1) {
        filters.push(`acompressor=threshold=0.125:ratio=${s.compression}:attack=20:release=180:makeup=1`);
    }
    // stereotools accepts a side-channel level; 1 is neutral, 0 mono.
    if (s.width !== 100)
        filters.push(`stereotools=slev=${s.width / 100}`);
    if (s.gain !== 0)
        filters.push(`volume=${s.gain}dB`);
    return filters;
}
function runFFmpeg(args, signal) {
    return new Promise((resolve, reject) => {
        const proc = (0, node_child_process_1.spawn)('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], {
            signal,
        });
        let stderr = '';
        proc.stderr.on('data', chunk => {
            stderr += String(chunk);
            if (stderr.length > 120000)
                stderr = stderr.slice(-120000);
        });
        proc.on('error', reject);
        proc.on('close', code => code === 0
            ? resolve(stderr)
            : reject(new Error(`FFmpeg exited with ${code}: ${stderr.slice(-1500)}`)));
    });
}
function measured(output) {
    const blocks = [...output.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
    const last = blocks[blocks.length - 1];
    if (!last)
        throw new Error('Unable to measure input loudness');
    const m = JSON.parse(last[0]);
    const keys = ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'];
    for (const k of keys) {
        if (!Number.isFinite(Number(m[k]))) {
            throw new Error(`Invalid loudness measurement: ${k}`);
        }
    }
    return {
        input_i: String(m.input_i),
        input_tp: String(m.input_tp),
        input_lra: String(m.input_lra),
        input_thresh: String(m.input_thresh),
        target_offset: String(m.target_offset),
    };
}
router.post('/upload', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        res.status(400).send('No audio file uploaded');
        return;
    }
    const input = req.file.path;
    const format = req.body.format === 'mp3' ? 'mp3' : 'wav';
    const output = node_path_1.default.join(node_os_1.default.tmpdir(), `prodhaven-${(0, node_crypto_1.randomUUID)()}.${format}`);
    const abort = new AbortController();
    res.on('close', () => {
        if (!res.writableFinished)
            abort.abort();
    });
    try {
        const mode = String(req.body.mode || 'platform').toLowerCase();
        const platform = String(req.body.platform || 'instagram').toLowerCase();
        const genre = String(req.body.genre || 'universal').toLowerCase();
        if (!['manual', 'platform', 'pack'].includes(mode)) {
            res.status(400).send('Invalid mastering mode');
            await promises_1.default.unlink(input).catch(() => { });
            return;
        }
        // Resolve presets once so TypeScript knows they are defined below.
        const platformTarget = mode === 'platform' ? lookup(PLATFORMS, platform) : undefined;
        const pack = mode === 'pack' ? lookup(PACKS, genre) : undefined;
        if (mode === 'platform' && !platformTarget) {
            res.status(400).send('Invalid platform');
            await promises_1.default.unlink(input).catch(() => { });
            return;
        }
        if (mode === 'pack' && !pack) {
            res.status(400).send('Invalid mastering pack');
            await promises_1.default.unlink(input).catch(() => { });
            return;
        }
        const s = parseSettings(req.body.settings);
        // Client submits editable preset parameters. Older clients without settings receive server presets.
        if (!req.body.settings && pack) {
            s.eq = [...pack.eq];
            s.compression = pack.compression;
        }
        if (!req.body.settings && platformTarget) {
            s.targetLufs = platformTarget[0];
            s.truePeak = platformTarget[1];
        }
        const base = chain(s);
        const norm = `loudnorm=I=${s.targetLufs}:TP=${s.truePeak}:LRA=11`;
        const first = await runFFmpeg([
            '-i',
            input,
            '-vn',
            '-af',
            [...base, `${norm}:print_format=json`].join(','),
            '-f',
            'null',
            '-',
        ], abort.signal);
        const m = measured(first);
        const second = `${norm}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
            `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:` +
            `offset=${m.target_offset}:linear=true:print_format=summary`;
        const codec = format === 'mp3'
            ? ['-c:a', 'libmp3lame', '-b:a', '320k', '-ar', '44100']
            : ['-c:a', 'pcm_s24le', '-ar', '48000'];
        await runFFmpeg([
            '-i',
            input,
            '-vn',
            '-af',
            [...base, second].join(','),
            '-ac',
            '2',
            ...codec,
            output,
        ], abort.signal);
        res.download(output, `mastered.${format}`, async (err) => {
            await Promise.allSettled([promises_1.default.unlink(input), promises_1.default.unlink(output)]);
            if (err && !res.headersSent)
                res.status(500).send('Unable to deliver master');
        });
    }
    catch (err) {
        console.error('Mastering error:', err);
        await Promise.allSettled([promises_1.default.unlink(input), promises_1.default.unlink(output)]);
        if (!res.headersSent && !res.destroyed) {
            res
                .status(err instanceof Error && /Invalid|Unable to measure/.test(err.message)
                ? 400
                : 500)
                .send(err instanceof Error && /Invalid/.test(err.message)
                ? err.message
                : 'Audio processing failed. Verify your audio file and FFmpeg installation.');
        }
    }
});
exports.default = router;
//# sourceMappingURL=equalizer.routes.js.map