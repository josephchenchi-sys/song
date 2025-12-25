import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

export class AudioPlayer {
  constructor() {
    // Force 44100Hz to match processor output and prevent pitch/speed drift
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
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
    soundTouch.tempo = 1.0; // Ensure tempo is 1.0
    const source = new SimpleFilter(new WebAudioBufferSource(buffer), soundTouch);
    const factor = Math.pow(2, this.pitch / 12);
    soundTouch.pitch = factor;
    return { soundTouch, source };
  }

  play() {
    if (this.isPlaying) return;
    this.ctx.resume();
    
    const bufferSize = 4096;
    
    // Create ONE Processor for both to ensure perfect sync
    this.processorNode = this.ctx.createScriptProcessor(bufferSize, 2, 2);
    
    const v = this.createSoundTouchSource(this.vocalsBuffer);
    const i = this.createSoundTouchSource(this.instBuffer);
    
    this.vFilter = v.source;
    this.iFilter = i.source;
    this.vST = v.soundTouch;
    this.iST = i.soundTouch;
    
    // Seek both filters to current position
    this.vFilter.sourcePosition = this.currentPosition;
    this.iFilter.sourcePosition = this.currentPosition;

    // Temporary buffers for extraction
    const vSamples = new Float32Array(bufferSize * 2);
    const iSamples = new Float32Array(bufferSize * 2);

    this.processorNode.onaudioprocess = (e) => {
        const outL = e.outputBuffer.getChannelData(0);
        const outR = e.outputBuffer.getChannelData(1);
        
        // Extract both simultaneously
        const vFrames = this.vFilter.extract(vSamples, bufferSize);
        const iFrames = this.iFilter.extract(iSamples, bufferSize);
        
        const frames = Math.max(vFrames, iFrames);

        // Mix directly to output or use intermediate Gain nodes
        // Since we are in script processor, we handle mixing here
        const vGain = this.vocalsGain.gain.value;
        const iGain = this.instGain.gain.value;
        const mGain = this.masterGain.gain.value;

        for (let j = 0; j < frames; j++) {
            // Vocals (Left/Right)
            const vL = vSamples[j * 2] * vGain;
            const vR = vSamples[j * 2 + 1] * vGain;
            
            // Instrumental (Left/Right)
            const iL = iSamples[j * 2] * iGain;
            const iR = iSamples[j * 2 + 1] * iGain;
            
            // Master Mix
            outL[j] = (vL + iL) * mGain;
            outR[j] = (vR + iR) * mGain;
        }
        
        // Fill remainder with silence
        for (let j = frames; j < bufferSize; j++) {
            outL[j] = 0;
            outR[j] = 0;
        }

        if (frames > 0) {
            this.currentPosition += frames;
        } else {
            // End of playback
            this.pause();
        }
    };

    // Connect to destination
    this.processorNode.connect(this.ctx.destination);
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying) return;
    
    if (this.processorNode) {
        this.processorNode.onaudioprocess = null;
        this.processorNode.disconnect();
        this.processorNode = null;
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
