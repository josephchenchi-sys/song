import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessorService } from '../ProcessorService';

// Mock dependencies
vi.mock('@ffmpeg/ffmpeg', () => ({
    createFFmpeg: vi.fn(() => ({
        load: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockResolvedValue(undefined),
        FS: vi.fn(),
        isLoaded: vi.fn().mockReturnValue(false)
    })),
    fetchFile: vi.fn(),
}));

vi.mock('demucs-web', () => {
    return {
        DemucsProcessor: class {
            loadModel = vi.fn().mockResolvedValue(undefined);
            separate = vi.fn().mockResolvedValue({
                vocals: { left: new Float32Array(), right: new Float32Array() },
                bass: { left: new Float32Array(), right: new Float32Array() },
                drums: { left: new Float32Array(), right: new Float32Array() },
                other: { left: new Float32Array(), right: new Float32Array() },
            });
            onProgress = () => {};
        },
        CONSTANTS: {
            SAMPLE_RATE: 44100,
            DEFAULT_MODEL_URL: 'mock-url'
        }
    };
});

// Mock AudioContext
class AudioContextMock {
    constructor() {}
    createBuffer() {
        return {
            copyToChannel: vi.fn()
        };
    }
    decodeAudioData() {
        return Promise.resolve({
            getChannelData: vi.fn(() => new Float32Array(100)),
            numberOfChannels: 2
        });
    }
}
vi.stubGlobal('AudioContext', AudioContextMock);

describe('ProcessorService', () => {
    let service: ProcessorService;

    beforeEach(() => {
        service = new ProcessorService();
        // Reset mocks if any
    });

    it('can be instantiated', () => {
        expect(service).toBeDefined();
    });
    
    it('has init method', () => {
         expect(service.init).toBeDefined();
         expect(typeof service.init).toBe('function');
    });

    it('has process method', () => {
         expect(service.process).toBeDefined();
         expect(typeof service.process).toBe('function');
    });
    
     it('has renderDownload method', () => {
         expect(service.renderDownload).toBeDefined();
         expect(typeof service.renderDownload).toBe('function');
    });
});