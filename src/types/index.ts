export enum ProcessingStatus {
    IDLE = 'IDLE',
    LOADING_MODEL = 'LOADING_MODEL',
    EXTRACTING_AUDIO = 'EXTRACTING_AUDIO',
    SEPARATING = 'SEPARATING',
    RENDERING = 'RENDERING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}

export interface SourceMedia {
    id: string;
    file: File;
    url: string;
    format: string;
    size: number;
    duration: number;
}

export interface ProcessedResult {
    originalVideo: Blob;
    vocals: AudioBuffer;
    instrumental: AudioBuffer;
    vocalsBlob: Blob;
    instrumentalBlob: Blob;
    instrumentalAudioBlob: Blob;
}

export type ProgressCallback = (stage: string, percent: number, details: string) => void;

export interface IProcessor {
    init(onProgress?: (loaded: number, total: number) => void): Promise<void>;
    process(file: File, onProgress: ProgressCallback): Promise<ProcessedResult>;
    renderDownload(options: { pitchShift: number }): Promise<Blob>;
}

export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isVocalsEnabled: boolean;
    pitchShift: number;
    volume: number;
}
