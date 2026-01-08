import { createFFmpeg, fetchFile, type FFmpeg } from '@ffmpeg/ffmpeg';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';
import { SoundTouch, SimpleFilter } from 'soundtouchjs';
import type { IProcessor, ProcessedResult, ProgressCallback } from '../types';

// Configure ONNX Runtime
// Use local WASM files from public directory
// @ts-ignore
const baseURL = import.meta.env.BASE_URL;
// @ts-ignore
ort.env.wasm.wasmPaths = `${window.location.origin}${baseURL}`;

export class ProcessorService implements IProcessor {
    private static instance: ProcessorService;
    private ffmpeg: FFmpeg;
    private demucs: DemucsProcessor;
    private audioContext: AudioContext;
    private modelLoaded: boolean = false;
    private lastResult: {
        instrumentalRaw: { left: Float32Array; right: Float32Array };
        vocalsRaw: { left: Float32Array; right: Float32Array };
        originalRaw: { left: Float32Array; right: Float32Array };
        originalVideoFile: File;
    } | null = null;
    private onInitProgress: ((loaded: number, total: number) => void) | null = null;
    private isCancelled: boolean = false;

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

    public cancel() {
        this.isCancelled = true;
        // In a real scenario, we might want to terminate ffmpeg if running, but for now we just flag it.
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
                console.log('[ProcessorService] Loading Demucs model (will use cache if available)...');
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

    public async restoreSession(
        originalVideo: Blob, 
        instrumentalBuffer: AudioBuffer,
        vocalsBuffer: AudioBuffer
    ): Promise<void> {
        console.log('[ProcessorService] Restoring session...');
        if (!this.modelLoaded) {
            await this.init();
        }

        const getRaw = (buffer: AudioBuffer) => {
            return {
                left: buffer.getChannelData(0),
                right: buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)
            };
        };

        const instRaw = getRaw(instrumentalBuffer);
        const vocRaw = getRaw(vocalsBuffer);

        // Mix to reconstruct original audio (approximate)
        const len = instRaw.left.length;
        const origLeft = new Float32Array(len);
        const origRight = new Float32Array(len);
        
        // Simple mix
        for(let i=0; i<len; i++) {
            origLeft[i] = instRaw.left[i] + vocRaw.left[i];
            origRight[i] = instRaw.right[i] + vocRaw.right[i];
        }

        // Restore lastResult
        this.lastResult = {
            instrumentalRaw: instRaw,
            vocalsRaw: vocRaw,
            originalRaw: { left: origLeft, right: origRight },
            originalVideoFile: new File([originalVideo], 'restored.mp4', { type: originalVideo.type })
        };

        // Write video file to FFmpeg FS so we can mux later
        try {
            const data = await fetchFile(originalVideo);
            this.ffmpeg.FS('writeFile', 'input.mp4', data);
            console.log('[ProcessorService] Session restored, input.mp4 written.');
        } catch (e) {
            console.error('[ProcessorService] Failed to write input.mp4:', e);
            throw e;
        }
    }

    async process(file: File, onProgress: ProgressCallback): Promise<ProcessedResult> {
        this.isCancelled = false;
        console.log('[ProcessorService] process() started for:', file.name);
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        if (!this.modelLoaded) {
            console.warn('[ProcessorService] Model not loaded, attempting lazy init...');
            await this.init();
        }

        try {
            if (this.isCancelled) throw new Error('Cancelled by user');
            onProgress('extracting', 0, '正在寫入檔案到虛擬檔案系統...');

            // 1. Extract Audio using FFmpeg
            const isAudio = file.type.startsWith('audio/');
            const inputName = isAudio ? 'input.mp3' : 'input.mp4'; // Use generic extension or match input
            this.ffmpeg.FS('writeFile', inputName, await fetchFile(file));
            
            // Extract to wav (pcm_s16le)
            // If it's video, -vn strips video. If it's audio, it just converts.
            await this.ffmpeg.run('-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', 'input.wav');
            
            const audioData = this.ffmpeg.FS('readFile', 'input.wav');
            
            onProgress('separating', 10, 'Decoding audio...');

            // 2. Decode Audio
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
            
            const leftChannel = audioBuffer.getChannelData(0);
            const rightChannel = audioBuffer.numberOfChannels > 1 
                ? audioBuffer.getChannelData(1) 
                : leftChannel;

            // 3. Separate Audio
            if (this.isCancelled) throw new Error('Cancelled by user');
            
            this.demucs.onProgress = (info: any) => {
                 if (this.isCancelled) return; // Can't easily stop demucs but stop reporting
                 // Map 0-1 demucs progress to 10-90% overall progress
                const p = 10 + (info.progress * 80);
                onProgress('separating', p, `Separating... Segment ${info.currentSegment}/${info.totalSegments}`);
            };

            const result = await this.demucs.separate(leftChannel, rightChannel);
            
            if (this.isCancelled) throw new Error('Cancelled by user');

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
                vocalsRaw: vocalsData,
                originalRaw: { left: leftChannel, right: rightChannel },
                originalVideoFile: file
            };

            // 5. Encode Instrumental to WAV for FFmpeg
            const wavBytes = this.encodeWAV(instrumentalData.left, instrumentalData.right, 44100);
            this.ffmpeg.FS('writeFile', 'instrumental.wav', wavBytes);
            const instrumentalAudioBlob = new Blob([wavBytes.buffer], { type: 'audio/wav' });

            // 6. Mux Video + Instrumental (Only if video)
            let outputBlob: Blob;
            
            if (isAudio) {
                 // Just return the WAV as "instrumental blob" for now, or encode to mp3?
                 // Let's stick to consistent logic: The 'instrumentalBlob' in result is usually the "main preview" 
                 // Video player needs a video file or can play audio? 
                 // Let's create an audio-only MP4 (AAC) for consistency so VideoPlayer can play it
                 await this.ffmpeg.run('-i', 'instrumental.wav', '-c:a', 'aac', '-b:a', '192k', 'output.mp4');
                 const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
                 outputBlob = new Blob([outputData.buffer], { type: 'audio/mp4' });
            } else {
                 await this.ffmpeg.run('-i', inputName, '-i', 'instrumental.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.mp4');
                 const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
                 outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
            }
            
            // Also encode vocals for separate download if needed (optional but good)
            const vocalsWavBytes = this.encodeWAV(vocalsData.left, vocalsData.right, 44100);
            const vocalsBlob = new Blob([vocalsWavBytes.buffer], { type: 'audio/wav' });

            onProgress('completed', 100, 'Done!');

            return {
                originalVideo: new Blob([await file.arrayBuffer()], { type: file.type }),
                vocals: vocalsBuffer,
                instrumental: instrumentalBuffer,
                instrumentalBlob: outputBlob,
                vocalsBlob: vocalsBlob,
                instrumentalAudioBlob: instrumentalAudioBlob
            };
        } catch (error) {
            console.error('[ProcessorService] Process error:', error);
            throw error;
        }
    }

    async renderDownload(options: { pitchShift: number, mode?: 'instrumental' | 'full' | 'vocals', format?: 'mp4' | 'mp3' }): Promise<Blob> {
        if (!this.lastResult) throw new Error("No processed video found.");

        const { pitchShift, mode = 'instrumental', format = 'mp4' } = options;
        const typeSuffix = mode;
        
        console.log(`Rendering ${mode} download (format: ${format}) with pitch shift: ${pitchShift}`);
        
        let raw;
        if (mode === 'full') raw = this.lastResult.originalRaw;
        else if (mode === 'vocals') raw = this.lastResult.vocalsRaw;
        else raw = this.lastResult.instrumentalRaw;

        const shiftedData = this.applyPitchShiftOffline(raw, pitchShift);
        const wavBytes = this.encodeWAV(shiftedData.left, shiftedData.right, 44100);
        
        // If mode is vocals and format is mp3 or wav (default vocals is wav if format not specified, but here we enforce logic)
        // If specific format is requested, we honor it.
        
        const wavFilename = `temp_${typeSuffix}.wav`;
        this.ffmpeg.FS('writeFile', wavFilename, wavBytes);

        if (format === 'mp3') {
             const mp3Filename = `output_${typeSuffix}.mp3`;
             // Use libmp3lame for encoding
             await this.ffmpeg.run('-i', wavFilename, '-codec:a', 'libmp3lame', '-qscale:a', '2', mp3Filename);
             const outputData = this.ffmpeg.FS('readFile', mp3Filename);
             return new Blob([outputData.buffer], { type: 'audio/mpeg' });
        } else if (format === 'mp4') {
             // Existing MP4 logic
             const outFilename = `output_${typeSuffix}_shifted.mp4`;
             // We need to check if the original input has a video stream.
             // If original was audio-only, -map 0:v:0 will fail.
             // Simple heuristic: Try to include video, if fail fallback to audio only mp4? 
             // Or check file type stored.
             const isAudioSource = this.lastResult.originalVideoFile.type.startsWith('audio/');
             
             if (isAudioSource) {
                 // For audio source, just wrap audio in MP4 container (black screen not needed strictly, player handles it)
                 // or just return AAC audio in M4A/MP4 container
                 await this.ffmpeg.run('-i', wavFilename, '-c:a', 'aac', '-b:a', '192k', outFilename);
             } else {
                 await this.ffmpeg.run('-i', 'input.mp4', '-i', wavFilename, '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', outFilename);
             }

             const outputData = this.ffmpeg.FS('readFile', outFilename);
             return new Blob([outputData.buffer], { type: 'video/mp4' });
        } else {
            // Default return WAV
            return new Blob([wavBytes.buffer], { type: 'audio/wav' });
        }
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