import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryList from '../HistoryList.vue';
import { ProcessingStatus } from '../../../types';

// Mock StorageService
const { mockSongs } = vi.hoisted(() => {
    const createMockBlob = () => {
        const blob = new Blob([]);
        blob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
        return blob;
    };
    return {
        mockSongs: [
            { id: '1', name: 'Song 1', date: 1000, vocalsBlob: createMockBlob(), instrumentalAudioBlob: createMockBlob(), originalVideo: createMockBlob(), instrumentalVideoBlob: createMockBlob() }
        ]
    };
});

vi.mock('../../../services/StorageService', () => ({
    storageService: {
        getAllSongs: vi.fn().mockResolvedValue(mockSongs),
        getSong: vi.fn().mockResolvedValue(mockSongs[0]),
        deleteSong: vi.fn().mockResolvedValue(undefined),
        getStorageEstimate: vi.fn().mockResolvedValue({ usage: 100, quota: 1000 })
    }
}));

// Mock ProcessorService
vi.mock('../../../services/ProcessorService', () => ({
    ProcessorService: {
        getInstance: vi.fn(() => ({
            restoreSession: vi.fn().mockResolvedValue(undefined)
        }))
    }
}));

// Mock useProcessing
const stateMock = {
    status: ProcessingStatus.IDLE,
    result: null,
    sourceMedia: null
};
const updateStatusMock = vi.fn();
const setProcessedResultMock = vi.fn();
const setSourceMediaMock = vi.fn();

vi.mock('../../../composables/useProcessing', () => ({
    useProcessing: () => ({
        state: stateMock,
        updateStatus: updateStatusMock,
        setProcessedResult: setProcessedResultMock,
        setSourceMedia: setSourceMediaMock
    })
}));

// Mock AudioContext
const decodeAudioDataMock = vi.fn().mockResolvedValue({ duration: 100, length: 100, sampleRate: 44100, numberOfChannels: 2 });
class AudioContextMock {
    decodeAudioData = decodeAudioDataMock;
}
global.AudioContext = AudioContextMock as any;

describe('HistoryList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stateMock.status = ProcessingStatus.IDLE;
    });

    it('loads history on mount', async () => {
        const wrapper = mount(HistoryList);
        await wrapper.vm.$nextTick();
        // Wait for onMounted async
        await new Promise(r => setTimeout(r, 0));
        
        expect(wrapper.text()).toContain('Song 1');
    });

    it('loads a song and updates status if IDLE', async () => {
        const wrapper = mount(HistoryList);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 0)); // wait for history load
        
        stateMock.status = ProcessingStatus.IDLE;
        
        const loadButton = wrapper.find('button'); // First button is load
        await loadButton.trigger('click');
        
        // Should show loading status initially
        expect(updateStatusMock).toHaveBeenCalledWith(ProcessingStatus.EXTRACTING_AUDIO, 0, expect.any(String));
        
        // Wait for async loadSong
        await new Promise(r => setTimeout(r, 0));
        
        // Should set result
        expect(setProcessedResultMock).toHaveBeenCalled();
        // Should set status to COMPLETED
        expect(updateStatusMock).toHaveBeenCalledWith(ProcessingStatus.COMPLETED, 100, expect.any(String));
    });

    it('disables interactions if PROCESSING', async () => {
        // Set status BEFORE mounting to ensure computed prop picks it up initially
        stateMock.status = ProcessingStatus.SEPARATING;
        const wrapper = mount(HistoryList);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 0));
        
        const loadButton = wrapper.find('button');
        expect(loadButton.element.disabled).toBe(true);
        
        await loadButton.trigger('click');
        
        // Should NOT do anything
        expect(updateStatusMock).not.toHaveBeenCalled();
        expect(setProcessedResultMock).not.toHaveBeenCalled();
    });
});
