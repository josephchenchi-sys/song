import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

export class AudioPlayerService {
    private ctx: AudioContext;
    private vocalsBuffer: AudioBuffer | null = null;
    private instrumentalBuffer: AudioBuffer | null = null;
    
    private vocalsGain: GainNode;
    private instrumentalGain: GainNode;
    private masterGain: GainNode;
    
    private processorNode: ScriptProcessorNode | null = null;
    private vFilter: SimpleFilter | null = null;
    private iFilter: SimpleFilter | null = null;
    private vST: SoundTouch | null = null;
    private iST: SoundTouch | null = null;
    
    private isPlaying: boolean = false;
    private pitch: number = 0;
    private currentPosition: number = 0;

    constructor() {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass({ sampleRate: 44100 });
        
        this.vocalsGain = this.ctx.createGain();
        this.instrumentalGain = this.ctx.createGain();
        this.masterGain = this.ctx.createGain();
        
        // Connect logical graph (though actual mixing happens in script processor)
        // We keep these to hold state values like gain.value
        this.vocalsGain.connect(this.masterGain);
        this.instrumentalGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
    }

    async init(): Promise<void> {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    loadBuffers(vocals: AudioBuffer, instrumental: AudioBuffer): void {
        this.vocalsBuffer = vocals;
        this.instrumentalBuffer = instrumental;
        this.currentPosition = 0;
        this.pause();
    }

    private createSoundTouchSource(buffer: AudioBuffer) {
        const soundTouch = new SoundTouch();
        soundTouch.tempo = 1.0;
        const source = new SimpleFilter(new WebAudioBufferSource(buffer), soundTouch);
        const factor = Math.pow(2, this.pitch / 12);
        soundTouch.pitch = factor;
        return { soundTouch, source };
    }

    play(): void {
        if (this.isPlaying || !this.vocalsBuffer || !this.instrumentalBuffer) return;
        this.ctx.resume();
        
        const bufferSize = 4096;
        
        this.processorNode = this.ctx.createScriptProcessor(bufferSize, 2, 2);
        
        const v = this.createSoundTouchSource(this.vocalsBuffer);
        const i = this.createSoundTouchSource(this.instrumentalBuffer);
        
        this.vFilter = v.source;
        this.iFilter = i.source;
        this.vST = v.soundTouch;
        this.iST = i.soundTouch;
        
        this.vFilter.sourcePosition = this.currentPosition;
        this.iFilter.sourcePosition = this.currentPosition;

        const vSamples = new Float32Array(bufferSize * 2);
        const iSamples = new Float32Array(bufferSize * 2);

        this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
            const outL = e.outputBuffer.getChannelData(0);
            const outR = e.outputBuffer.getChannelData(1);
            
            if (!this.vFilter || !this.iFilter) return;

            const vFrames = this.vFilter.extract(vSamples, bufferSize);
            const iFrames = this.iFilter.extract(iSamples, bufferSize);
            
            const frames = Math.max(vFrames, iFrames);

            const vGain = this.vocalsGain.gain.value;
            const iGain = this.instrumentalGain.gain.value;
            const mGain = this.masterGain.gain.value;

            for (let j = 0; j < frames; j++) {
                const vL = vSamples[j * 2] * vGain;
                const vR = vSamples[j * 2 + 1] * vGain;
                
                const iL = iSamples[j * 2] * iGain;
                const iR = iSamples[j * 2 + 1] * iGain;
                
                outL[j] = (vL + iL) * mGain;
                outR[j] = (vR + iR) * mGain;
            }
            
            for (let j = frames; j < bufferSize; j++) {
                outL[j] = 0;
                outR[j] = 0;
            }

            if (frames > 0) {
                this.currentPosition += frames;
            } else {
                this.pause();
                // Dispatch event or callback could go here
            }
        };

        this.processorNode.connect(this.ctx.destination);
        this.isPlaying = true;
    }

    pause(): void {
        if (!this.isPlaying) return;
        
        if (this.processorNode) {
            this.processorNode.onaudioprocess = null;
            this.processorNode.disconnect();
            this.processorNode = null;
        }
        this.isPlaying = false;
    }

    seek(time: number): void {
        this.currentPosition = Math.floor(time * this.ctx.sampleRate);
        if (this.vFilter) this.vFilter.sourcePosition = this.currentPosition;
        if (this.iFilter) this.iFilter.sourcePosition = this.currentPosition;
    }

    setVocalsEnabled(enabled: boolean): void {
        // We use setTargetAtTime for smooth transition but in script processor we read .value directly
        // So we need to ensure the .value updates. 
        // AudioParam.value is the intrinsic value, but automations apply on top.
        // However, we are reading .value in the loop which might not reflect automation if not calculated by the engine?
        // Actually, AudioParam.value returns the current computed value in most browsers, but let's stick to simple assignment for immediate effect if not using automation node graph for processing.
        // Since we do manual mixing, we can just set .value.
        
        const target = enabled ? 1 : 0;
        this.vocalsGain.gain.value = target; 
        // If we wanted smooth fade we'd need to interpolate inside the loop or use the GainNode in the graph. 
        // But our script processor mixes directly to destination.
    }

    setPitch(semitones: number): void {
        this.pitch = semitones;
        const factor = Math.pow(2, semitones / 12);
        if (this.vST) this.vST.pitch = factor;
        if (this.iST) this.iST.pitch = factor;
    }
    
    getCurrentTime(): number {
        return this.currentPosition / this.ctx.sampleRate;
    }
    
    getIsPlaying(): boolean {
        return this.isPlaying;
    }
}
