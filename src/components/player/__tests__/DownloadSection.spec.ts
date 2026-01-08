import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DownloadSection from '../DownloadSection.vue';

// Mock ProcessorService
const renderDownloadMock = vi.fn().mockResolvedValue(new Blob(['video'], { type: 'video/mp4' }));
vi.mock('../../../services/ProcessorService', () => ({
    ProcessorService: {
        getInstance: vi.fn(() => ({
            renderDownload: renderDownloadMock
        }))
    }
}));

// Mock useAudioPlayer to get pitch
const togglePlayMock = vi.fn();
vi.mock('../../../composables/useAudioPlayer', () => ({
    useAudioPlayer: () => ({
        state: { pitchShift: 2, isPlaying: true },
        togglePlay: togglePlayMock
    })
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:url');
global.URL.revokeObjectURL = vi.fn();

describe('DownloadSection', () => {
    it('shows download button', () => {
        const wrapper = mount(DownloadSection);
        expect(wrapper.text()).toContain('伴奏影片 (MP4)');
    });

    it('calls renderDownload with correct pitch and pauses playback on click', async () => {
        const wrapper = mount(DownloadSection);
        const buttons = wrapper.findAll('button');
        // The first button is "伴奏影片 (MP4)"
        await buttons[0].trigger('click');
        
        expect(togglePlayMock).toHaveBeenCalled();
        expect(renderDownloadMock).toHaveBeenCalledWith({ 
            pitchShift: 2,
            mode: 'instrumental',
            format: 'mp4'
        });
    });
});
