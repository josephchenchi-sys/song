import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

export class AudioPlayer {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.vocalsBuffer = null;
    this.instBuffer = null;
    
    // Gain Nodes
    this.vocalsGain = this.ctx.createGain();
    this.instGain = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    
    // Connect graph
    this.vocalsGain.connect(this.masterGain);
    this.instGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    // SoundTouch Filters
    this.vFilter = null;
    this.iFilter = null;
    this.vScript = null;
    this.iScript = null;
    
    this.isPlaying = false;
    this.pitch = 0; // Semitones
    this.currentPosition = 0; // Samples
  }

  async init() {
    console.log('AudioPlayer initialized');
    await this.ctx.resume();
  }

  loadBuffers(vocals, instrumental) {
    this.vocalsBuffer = vocals;
    this.instBuffer = instrumental;
  }

  createSoundTouchSource(buffer) {
    const soundTouch = new SoundTouch();
    const source = new SimpleFilter(new WebAudioBufferSource(buffer), soundTouch);
    soundTouch.pitch = Math.pow(2, this.pitch / 12);
    return { soundTouch, source };
  }

  play() {
    if (this.isPlaying) return;
    this.ctx.resume();
    
    const bufferSize = 4096;
    
    // Create Processors
    this.vScript = this.ctx.createScriptProcessor(bufferSize, 2, 2);
    this.iScript = this.ctx.createScriptProcessor(bufferSize, 2, 2);
    
    const v = this.createSoundTouchSource(this.vocalsBuffer);
    const i = this.createSoundTouchSource(this.instBuffer);
    
    this.vFilter = v.source;
    this.iFilter = i.source;
    this.vST = v.soundTouch;
    this.iST = i.soundTouch;
    
    // Seek
    this.vFilter.sourcePosition = this.currentPosition;
    this.iFilter.sourcePosition = this.currentPosition;

    // Intermediate buffers for interleaved extraction
    const vSamples = new Float32Array(bufferSize * 2);
    const iSamples = new Float32Array(bufferSize * 2);

    this.vScript.onaudioprocess = (e) => {
        const l = e.outputBuffer.getChannelData(0);
        const r = e.outputBuffer.getChannelData(1);
        
        // Extract interleaved samples (L, R, L, R...)
        const frames = this.vFilter.extract(vSamples, bufferSize);
        
        // De-interleave to Web Audio API planar format
        for (let j = 0; j < frames; j++) {
            l[j] = vSamples[j * 2];
            r[j] = vSamples[j * 2 + 1];
        }
        
        // Fill remainder with silence if end reached
        for (let j = frames; j < bufferSize; j++) {
            l[j] = 0;
            r[j] = 0;
        }

        // Sync position
        if (frames > 0) this.currentPosition += frames;
    };

    this.iScript.onaudioprocess = (e) => {
        const l = e.outputBuffer.getChannelData(0);
        const r = e.outputBuffer.getChannelData(1);
        
        const frames = this.iFilter.extract(iSamples, bufferSize);
        
        for (let j = 0; j < frames; j++) {
            l[j] = iSamples[j * 2];
            r[j] = iSamples[j * 2 + 1];
        }
        
        for (let j = frames; j < bufferSize; j++) {
            l[j] = 0;
            r[j] = 0;
        }
    };

    this.vScript.connect(this.vocalsGain);
    this.iScript.connect(this.instGain);
    
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying) return;
    
    if (this.vScript) {
        this.vScript.onaudioprocess = null;
        this.vScript.disconnect();
        this.vScript = null;
    }
    if (this.iScript) {
        this.iScript.onaudioprocess = null;
        this.iScript.disconnect();
        this.iScript = null;
    }
    this.isPlaying = false;
  }

  seek(time) {
    this.currentPosition = Math.floor(time * this.ctx.sampleRate);
    if (this.vFilter) this.vFilter.sourcePosition = this.currentPosition;
    if (this.iFilter) this.iFilter.sourcePosition = this.currentPosition;
  }

  setVocalsEnabled(enabled) {
    this.vocalsGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  setPitch(semitones) {
    this.pitch = semitones;
    const factor = Math.pow(2, semitones / 12);
    if (this.vST) this.vST.pitch = factor;
    if (this.iST) this.iST.pitch = factor;
  }
  
  getCurrentTime() {
      return this.currentPosition / this.ctx.sampleRate;
  }
}
