import { IVideoProcessor } from './contracts/processor.js';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';
import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

// Configure ONNX Runtime to use CDN
const ORT_VERSION = '1.23.2'; 
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

export class Processor extends IVideoProcessor {
  constructor() {
    super();
    const baseURL = import.meta.env.BASE_URL;
    this.ffmpeg = createFFmpeg({ 
      log: true,
      corePath: `${baseURL}ffmpeg-core.js` 
    });
    this.audioContext = new AudioContext({ sampleRate: CONSTANTS.SAMPLE_RATE });
    this.demucs = new DemucsProcessor({
      ort,
      onProgress: (info) => {},
      onLog: (phase, msg) => console.log(`[Demucs] ${phase}: ${msg}`),
      onDownloadProgress: (loaded, total) => {
          if (this.onInitProgress) {
              this.onInitProgress(loaded, total);
          }
      }
    });
    this.modelLoaded = false;
    this.onInitProgress = null;
    this.lastResult = null; // Store for offline rendering
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

    onProgress('completed', 100);

    return {
        vocals: vocalsBuffer,
        instrumental: instrumentalBuffer,
        originalVideo: file,
        instrumentalVideoBlob: outputBlob
    };
  }

  async renderDownload(settings) {
    if (!this.lastResult) throw new Error("No processed video found.");

    const { pitchShift } = settings;
    
    // If pitch shift is 0, we can just return the existing output.mp4 if it matches
    if (pitchShift === 0) {
        try {
            const data = this.ffmpeg.FS('readFile', 'output.mp4');
            return new Blob([data.buffer], { type: 'video/mp4' });
        } catch (e) {
            // If not found, fall through to re-render
        }
    }

    console.log(`Rendering download with pitch shift: ${pitchShift}`);
    
    // 1. Pitch shift instrumental track offline
    const raw = this.lastResult.instrumentalRaw;
    const shiftedData = this.applyPitchShiftOffline(raw, pitchShift);
    
    // 2. Encode to WAV
    const wavBytes = this.encodeWAV(shiftedData.left, shiftedData.right, 44100);
    this.ffmpeg.FS('writeFile', 'instrumental_shifted.wav', wavBytes);

    // 3. Mux with original video
    await this.ffmpeg.run('-i', 'input.mp4', '-i', 'instrumental_shifted.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output_shifted.mp4');
    
    const outputData = this.ffmpeg.FS('readFile', 'output_shifted.mp4');
    return new Blob([outputData.buffer], { type: 'video/mp4' });
  }

  applyPitchShiftOffline(data, semitones) {
    const factor = Math.pow(2, semitones / 12);
    const st = new SoundTouch();
    st.pitch = factor;
    st.tempo = 1.0;

    const source = {
        extract: (target, numFrames, offset) => {
            for (let i = 0; i < numFrames; i++) {
                const idx = offset + i;
                if (idx >= data.left.length) return i;
                target[i * 2] = data.left[idx];
                target[i * 2 + 1] = data.right[idx];
            }
            return numFrames;
        }
    };

    const filter = new SimpleFilter(source, st);
    const outLength = Math.ceil(data.left.length); // Speed is 1.0
    const outLeft = new Float32Array(outLength);
    const outRight = new Float32Array(outLength);
    
    const bufferSize = 4096;
    const tempBuffer = new Float32Array(bufferSize * 2);
    let framesExtracted = 0;
    let position = 0;

    while ((framesExtracted = filter.extract(tempBuffer, bufferSize)) > 0) {
        for (let i = 0; i < framesExtracted; i++) {
            if (position < outLength) {
                outLeft[position] = tempBuffer[i * 2];
                outRight[position] = tempBuffer[i * 2 + 1];
                position++;
            }
        }
    }

    return { left: outLeft, right: outRight };
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
