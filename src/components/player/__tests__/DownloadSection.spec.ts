import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DownloadSection from '../DownloadSection.vue';
import { ProcessorService } from '../../../services/ProcessorService';

// Mock dependencies
vi.mock('../../../services/StorageService', () => ({
    StorageService: {
        getInstance: vi.fn(() => ({
            getSongs: vi.fn().mockResolvedValue([]),
        }))
    }
}));

const mockRenderDownload = vi.fn().mockResolvedValue(new Blob());
vi.mock('../../../services/ProcessorService', () => ({
    ProcessorService: {
        getInstance: vi.fn(() => ({
            renderDownload: mockRenderDownload
        }))
    }
}));

vi.mock('../../../composables/useAudioPlayer', () => ({
    useAudioPlayer: () => ({
        state: { pitchShift: 0 },
        pause: vi.fn()
    })
}));

vi.mock('../../../composables/useProcessing', () => ({
    useProcessing: () => ({
        state: { sourceMedia: { file: { name: 'test.mp4' } } }
    })
}));

describe('DownloadSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        const wrapper = mount(DownloadSection);
        expect(wrapper.text()).toContain('匯出選項');
    });

    it('calls renderDownload on button click', async () => {
        const wrapper = mount(DownloadSection);
        await wrapper.find('button').trigger('click');
        expect(mockRenderDownload).toHaveBeenCalled();
    });
});
