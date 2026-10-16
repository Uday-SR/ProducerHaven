export type MasteringMode = 'manual' | 'platform' | 'pack';
export type OutputFormat = 'wav' | 'mp3';
export type Settings = {
    /** 9 band gains in dB, matching FREQ order (-12..12). */
    eq: number[];
    highpass: number;
    compression: number;
    width: number;
    gain: number;
    targetLufs: number;
    truePeak: number;
};
export type Pack = {
    eq: number[];
    compression: number;
};
/** [targetLufs, truePeak] */
export type PlatformTarget = readonly [targetLufs: number, truePeak: number];
/** First-pass loudnorm measurements, kept as strings for direct use in the FFmpeg filter. */
export type LoudnessMeasurement = {
    input_i: string;
    input_tp: string;
    input_lra: string;
    input_thresh: string;
    target_offset: string;
};
//# sourceMappingURL=equalizer.types.d.ts.map