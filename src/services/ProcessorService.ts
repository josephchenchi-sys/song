import { createFFmpeg, fetchFile, type FFmpeg } from '@ffmpeg/ffmpeg';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';
import { SoundTouch, SimpleFilter } from 'soundtouchjs';
import type { IProcessor, ProcessedResult, ProgressCallback } from '../types';

// Configure ONNX Runtime
const ORT_VERSION = '1.23.2';
// @ts-ignore
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

export class ProcessorService implements IProcessor {
    private static instance: ProcessorService;
    private ffmpeg: FFmpeg;
    private demucs: DemucsProcessor;
    private audioContext: AudioContext;
    private modelLoaded: boolean = false;
    private lastResult: {
        instrumentalRaw: { left: Float32Array; right: Float32Array };
        originalVideoFile: File;
    } | null = null;
    private onInitProgress: ((loaded: number, total: number) => void) | null = null;

    constructor() {
        console.log('[ProcessorService] Constructing...');
        const baseURL = import.meta.env.BASE_URL;
        // Ensure corePath ends correctly
        const corePath = `${window.location.origin}${baseURL}ffmpeg-core.js`;
        console.log('[ProcessorService] FFmpeg corePath:', corePath);

        this.ffmpeg = createFFmpeg({
            log: true,
            corePath: corePath
        });
        
        this.audioContext = new AudioContext({ sampleRate: CONSTANTS.SAMPLE_RATE });

        this.demucs = new DemucsProcessor({
            ort,
            onProgress: (info: any) => console.log('[Demucs] Progress:', info),
            onLog: (phase: string, msg: string) => console.log(`[Demucs] ${phase}: ${msg}`),
            onDownloadProgress: (loaded: number, total: number) => {
                if (this.onInitProgress) {
                    this.onInitProgress(loaded, total);
                }
            }
        });
    }

    public static getInstance(): ProcessorService {
        if (!ProcessorService.instance) {
            ProcessorService.instance = new ProcessorService();
        }
        return ProcessorService.instance;
    }

    async init(onProgress?: (loaded: number, total: number) => void): Promise<void> {
        console.log('[ProcessorService] init() called');
        
        try {
            if (!this.ffmpeg.isLoaded()) {
                console.log('[ProcessorService] Loading FFmpeg...');
                await this.ffmpeg.load();
                console.log('[ProcessorService] FFmpeg loaded.');
            }

            if (!this.modelLoaded) {
                console.log('[ProcessorService] Loading Demucs model...');
                this.onInitProgress = onProgress || null;
                await this.demucs.loadModel(CONSTANTS.DEFAULT_MODEL_URL);
                this.modelLoaded = true;
                this.onInitProgress = null;
                console.log('[ProcessorService] Demucs model loaded.');
            }
        } catch (error) {
            console.error('[ProcessorService] Initialization error:', error);
            throw error;
        }
    }

    async process(file: File, onProgress: ProgressCallback): Promise<ProcessedResult> {
        console.log('[ProcessorService] process() started for:', file.name);
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        if (!this.modelLoaded) {
            console.warn('[ProcessorService] Model not loaded, attempting lazy init...');
            await this.init();
        }

        try {
            onProgress('extracting', 0, '正在寫入檔案到虛擬檔案系統...');

            // 1. Extract Audio using FFmpeg
            this.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
            
            // Extract to wav (pcm_s16le)
            await this.ffmpeg.run('-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', 'input.wav');
            
            const audioData = this.ffmpeg.FS('readFile', 'input.wav');
            
            onProgress('separating', 10, 'Decoding audio...');

            // 2. Decode Audio
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
            
            const leftChannel = audioBuffer.getChannelData(0);
            const rightChannel = audioBuffer.numberOfChannels > 1 
                ? audioBuffer.getChannelData(1) 
                : leftChannel;

            // 3. Separate Audio
            this.demucs.onProgress = (info: any) => {
                 // Map 0-1 demucs progress to 10-90% overall progress
                const p = 10 + (info.progress * 80);
                onProgress('separating', p, `Separating... Segment ${info.currentSegment}/${info.totalSegments}`);
            };

            const result = await this.demucs.separate(leftChannel, rightChannel);
            
            onProgress('rendering', 90, 'Mixing audio tracks...');

            // 4. Mix Instrumental (Bass + Drums + Other)
            const mix = (tracks: any[]) => {
                const len = tracks[0].left.length;
                const outLeft = new Float32Array(len);
                const outRight = new Float32Array(len);
                for(let i=0; i<len; i++) {
                    for(const track of tracks) {
                        outLeft[i] += track.left[i];
                        outRight[i] += track.right[i];
                    }
                }
                return { left: outLeft, right: outRight };
            };

            const instrumentalData = mix([result.bass, result.drums, result.other]);
            const vocalsData = result.vocals;

            // Convert to AudioBuffer for preview
            const createBuffer = (data: { left: Float32Array, right: Float32Array }) => {
                const buf = this.audioContext.createBuffer(2, data.left.length, 44100);
                buf.copyToChannel(data.left, 0);
                buf.copyToChannel(data.right, 1);
                return buf;
            };

            const vocalsBuffer = createBuffer(vocalsData);
            const instrumentalBuffer = createBuffer(instrumentalData);

            // Store for download rendering
            this.lastResult = {
                instrumentalRaw: instrumentalData,
                originalVideoFile: file
            };

            // 5. Encode Instrumental to WAV for FFmpeg
            const wavBytes = this.encodeWAV(instrumentalData.left, instrumentalData.right, 44100);
            this.ffmpeg.FS('writeFile', 'instrumental.wav', wavBytes);

            // 6. Mux Video + Instrumental
            await this.ffmpeg.run('-i', 'input.mp4', '-i', 'instrumental.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.mp4');
            
            const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
            const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
            
            // Also encode vocals for separate download if needed (optional but good)
            const vocalsWavBytes = this.encodeWAV(vocalsData.left, vocalsData.right, 44100);
            const vocalsBlob = new Blob([vocalsWavBytes.buffer], { type: 'audio/wav' });

            onProgress('completed', 100, 'Done!');

            return {
                originalVideo: new Blob([await file.arrayBuffer()], { type: file.type }),
                vocals: vocalsBuffer,
                instrumental: instrumentalBuffer,
                instrumentalBlob: outputBlob,
                vocalsBlob: vocalsBlob
            };
        } catch (error) {
            console.error('[ProcessorService] Process error:', error);
            throw error;
        }
    }

    async renderDownload(options: { pitchShift: number }): Promise<Blob> {
        if (!this.lastResult) throw new Error("No processed video found.");

        const { pitchShift } = options;
        
        // If pitch shift is 0, try to return cached output.mp4
        if (pitchShift === 0) {
            try {
                const data = this.ffmpeg.FS('readFile', 'output.mp4');
                return new Blob([data.buffer], { type: 'video/mp4' });
            } catch (e) {
                // ignore
            }
        }

        console.log(`Rendering download with pitch shift: ${pitchShift}`);
        
        const raw = this.lastResult.instrumentalRaw;
        const shiftedData = this.applyPitchShiftOffline(raw, pitchShift);
        
        const wavBytes = this.encodeWAV(shiftedData.left, shiftedData.right, 44100);
        this.ffmpeg.FS('writeFile', 'instrumental_shifted.wav', wavBytes);

        await this.ffmpeg.run('-i', 'input.mp4', '-i', 'instrumental_shifted.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output_shifted.mp4');
        
        const outputData = this.ffmpeg.FS('readFile', 'output_shifted.mp4');
        return new Blob([outputData.buffer], { type: 'video/mp4' });
    }

    private applyPitchShiftOffline(data: { left: Float32Array, right: Float32Array }, semitones: number) {
        if (semitones === 0) return data;
        
        const factor = Math.pow(2, semitones / 12);
        const st = new SoundTouch();
        st.pitch = factor;
        st.tempo = 1.0;

        const source = {
            extract: (target: Float32Array, numFrames: number, offset: number) => {
                for (let i = 0; i < numFrames; i++) {
                    const idx = offset + i;
                    if (idx >= data.left.length) return 0; // EOF logic varies
                    target[i * 2] = data.left[idx];
                    target[i * 2 + 1] = data.right[idx];
                }
                return numFrames; 
            }
        };

        const filter = new SimpleFilter(source, st);
        const outLength = Math.ceil(data.left.length); // Speed is 1.0, so length is approx same
        const outLeft = new Float32Array(outLength);
        const outRight = new Float32Array(outLength);
        
        const bufferSize = 4096;
        const tempBuffer = new Float32Array(bufferSize * 2);
        let framesExtracted = 0;
        let position = 0;

        // @ts-ignore
        while ((framesExtracted = filter.extract(tempBuffer, bufferSize)) > 0) {
            for (let i = 0; i < framesExtracted; i++) {
                if (position < outLength) {
                    outLeft[position] = tempBuffer[i * 2];
                    outRight[position] = tempBuffer[i * 2 + 1];
                    position++;
                }
            }
            if (position >= outLength) break;
        }

        return { left: outLeft, right: outRight };
    }

    private encodeWAV(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
        const length = left.length;
        const buffer = new ArrayBuffer(44 + length * 4);
        const view = new DataView(buffer);

        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * 4, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 2, true); // Stereo
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length * 4, true);

        let offset = 44;
        for (let i = 0; i < length; i++) {
            let s = Math.max(-1, Math.min(1, left[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
            s = Math.max(-1, Math.min(1, right[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
        
        return new Uint8Array(buffer);
    }
}