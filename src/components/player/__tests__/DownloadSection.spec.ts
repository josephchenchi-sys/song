import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DownloadSection from '../DownloadSection.vue';

// Mock ProcessorService
const renderDownloadMock = vi.fn().mockResolvedValue(new Blob(['video'], { type: 'video/mp4' }));
vi.mock('../../../services/ProcessorService', () => ({
    ProcessorService: class {
        renderDownload = renderDownloadMock;
    }
}));

// Mock useAudioPlayer to get pitch
vi.mock('../../../composables/useAudioPlayer', () => ({
    useAudioPlayer: () => ({
        state: { pitchShift: 2 }
    })
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:url');
global.URL.revokeObjectURL = vi.fn();

describe('DownloadSection', () => {
    it('shows download button', () => {
        const wrapper = mount(DownloadSection);
        expect(wrapper.text()).toContain('下載伴奏');
    });

    it('calls renderDownload with correct pitch on click', async () => {
        const wrapper = mount(DownloadSection);
        await wrapper.find('button').trigger('click');
        
        expect(renderDownloadMock).toHaveBeenCalledWith({ pitchShift: 2 });
    });
});
