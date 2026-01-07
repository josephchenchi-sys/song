declare module 'soundtouchjs' {
    export class SoundTouch {
        pitch: number;
        tempo: number;
    }
    export class WebAudioBufferSource {
        constructor(buffer: AudioBuffer);
    }
    export class SimpleFilter {
        constructor(source: any, pipe: SoundTouch);
        extract(target: Float32Array, numFrames: number): number;
        sourcePosition: number;
    }
}

declare module 'demucs-web' {
    export class DemucsProcessor {
        constructor(options: any);
        loadModel(url: string): Promise<void>;
        separate(left: Float32Array, right: Float32Array): Promise<any>;
        onProgress: (info: any) => void;
    }
    export const CONSTANTS: {
        SAMPLE_RATE: number;
        DEFAULT_MODEL_URL: string;
    }
}
