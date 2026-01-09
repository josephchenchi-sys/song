import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryList from '../HistoryList.vue';
import { StorageService } from '../../../services/StorageService';
import { useProcessing } from '../../../composables/useProcessing';

// Mock dependencies
vi.mock('../../../services/StorageService', () => ({
    StorageService: {
        getInstance: vi.fn(() => ({
            getSongs: vi.fn().mockResolvedValue([
                { id: '1', name: 'Song 1.mp4', timestamp: 1000 },
                { id: '2', name: 'Song 2.mp4', timestamp: 2000 }
            ]),
            deleteSong: vi.fn().mockResolvedValue(undefined),
            getStorageUsage: vi.fn().mockResolvedValue(1048576) // 1MB
        }))
    }
}));

import { ref } from 'vue';
// ...
const mockLoadFromHistory = vi.fn();
vi.mock('../../../composables/useProcessing', () => ({
    useProcessing: () => ({
        loadFromHistory: mockLoadFromHistory,
        state: { status: 'IDLE' },
        historyVersion: ref(0)
    })
}));

describe('HistoryList', () => {
    it('renders list of songs', async () => {
        const wrapper = mount(HistoryList);
        // Wait for onMounted async calls
        await new Promise(resolve => setTimeout(resolve, 0));
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('li')).toHaveLength(2);
        expect(wrapper.text()).toContain('Song 1.mp4');
    });

    it('loads song on click', async () => {
        const wrapper = mount(HistoryList);
        await new Promise(resolve => setTimeout(resolve, 0));
        await wrapper.vm.$nextTick();

        await wrapper.find('button.load-btn').trigger('click');
        expect(mockLoadFromHistory).toHaveBeenCalledWith('1');
    });
});
