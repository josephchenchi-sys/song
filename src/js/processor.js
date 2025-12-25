import { IVideoProcessor } from './contracts/processor.js';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';

// Configure ONNX Runtime to use CDN to avoid Vite dev server issues with dynamic imports of .mjs files from public/
// Using the same version as installed
const ORT_VERSION = '1.23.2'; 
// Safest is to use the exact version.
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

export class Processor extends IVideoProcessor {
  constructor() {
    super();
    this.ffmpeg = createFFmpeg({ 
      log: true,
      corePath: '/ffmpeg-core.js' 
    });
    this.audioContext = new AudioContext({ sampleRate: CONSTANTS.SAMPLE_RATE });
    this.demucs = new DemucsProcessor({
      ort,
      onProgress: (info) => {
         // This will be wired in process()
      },
      onLog: (phase, msg) => console.log(`[Demucs] ${phase}: ${msg}`),
      onDownloadProgress: (loaded, total) => {
          if (this.onInitProgress) {
              this.onInitProgress(loaded, total);
          }
      }
    });
    this.modelLoaded = false;
    this.onInitProgress = null;
  }

  async init(onProgress) {
    console.log('Processor initializing...');
    
    // Load FFmpeg
    if (!this.ffmpeg.isLoaded()) {
      await this.ffmpeg.load();
    }
    
    // Load Demucs Model
    if (!this.modelLoaded) {
      console.log('Loading Demucs model...');
      this.onInitProgress = onProgress;
      // This will fetch ~170MB model.
      // Ensure your network allows downloading from Hugging Face.
      await this.demucs.loadModel(CONSTANTS.DEFAULT_MODEL_URL);
      this.modelLoaded = true;
      this.onInitProgress = null;
      console.log('Demucs model loaded.');
    }
  }

  async process(file, onProgress) {
    if (!this.modelLoaded) {
        throw new Error("Model not loaded. Initialization failed or still in progress.");
    }

    console.log('Processing started', file);
    onProgress('extracting', 0);

    // 1. Extract Audio using FFmpeg
    this.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
    
    // Extract to wav 
    await this.ffmpeg.run('-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', 'input.wav');
    
    const audioData = this.ffmpeg.FS('readFile', 'input.wav');
    
    onProgress('separating', 10);
    
    // 2. Decode Audio
    const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
    
    // Prepare channels
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.numberOfChannels > 1 
      ? audioBuffer.getChannelData(1) 
      : leftChannel;

    // 3. Separate Audio
    this.demucs.onProgress = (info) => {
        // Map 0-1 demucs progress to 10-90% overall progress
        const p = 10 + (info.progress * 80);
        onProgress('separating', p, `Segment ${info.currentSegment}/${info.totalSegments}`);
    };

    // Note: Demucs separate might take time
    const result = await this.demucs.separate(leftChannel, rightChannel);
    
    onProgress('rendering', 90, 'Mixing audio tracks...');

    // 4. Process Results
    // We want Instrumental = Bass + Drums + Other
    const mix = (tracks) => {
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
    const createBuffer = (data) => {
        const buf = this.audioContext.createBuffer(2, data.left.length, 44100);
        buf.copyToChannel(data.left, 0);
        buf.copyToChannel(data.right, 1);
        return buf;
    };

    const vocalsBuffer = createBuffer(vocalsData);
    const instrumentalBuffer = createBuffer(instrumentalData);

    // 5. Encode Instrumental to WAV for FFmpeg
    const wavBytes = this.encodeWAV(instrumentalData.left, instrumentalData.right, 44100);
    this.ffmpeg.FS('writeFile', 'instrumental.wav', wavBytes);

    // 6. Mux Video + Instrumental
    await this.ffmpeg.run('-i', 'input.mp4', '-i', 'instrumental.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.mp4');
    
    const outputData = this.ffmpeg.FS('readFile', 'output.mp4');
    const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });

    onProgress('completed', 100);

    return {
        vocals: vocalsBuffer,
        instrumental: instrumentalBuffer,
        originalVideo: file,
        instrumentalVideoBlob: outputBlob
    };
  }

  async renderDownload(settings) {
    // For MVP, if output.mp4 exists in MEMFS, return it.
    // Pitch shift rendering offline is not implemented yet.
    try {
        const data = this.ffmpeg.FS('readFile', 'output.mp4');
        return new Blob([data.buffer], { type: 'video/mp4' });
    } catch (e) {
        throw new Error("Output file not found. Process video first.");
    }
  }

  // Simple WAV encoder (Int16)
  encodeWAV(left, right, sampleRate) {
    const length = left.length;
    const buffer = new ArrayBuffer(44 + length * 4);
    const view = new DataView(buffer);

    // RIFF
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 4, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Stereo
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
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

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
