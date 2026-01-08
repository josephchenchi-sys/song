import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProcessorSection from '../ProcessorSection.vue';
import { ProcessingStatus } from '../../../types';

// Mock Service
const mocks = vi.hoisted(() => {
    return {
        process: vi.fn().mockResolvedValue({}),
        init: vi.fn().mockResolvedValue(undefined)
    }
});

vi.mock('../../../services/ProcessorService', () => {
    const mockInstance = {
        process: mocks.process,
        init: mocks.init
    };
    return {
        ProcessorService: {
            getInstance: vi.fn(() => mockInstance)
        }
    };
});

// Mock Composable
import { reactive } from 'vue';
const stateMock = reactive({
    status: ProcessingStatus.IDLE,
    progress: 0,
    sourceMedia: null,
    error: null,
    logs: []
});
const setSourceMediaMock = vi.fn((file) => {
    stateMock.sourceMedia = { file } as any;
});
const updateStatusMock = vi.fn((status, progress) => {
    stateMock.status = status;
    stateMock.progress = progress;
});
const setProcessedResultMock = vi.fn();

vi.mock('../../../composables/useProcessing', () => ({
    useProcessing: () => ({
        state: stateMock,
        setSourceMedia: setSourceMediaMock,
        updateStatus: updateStatusMock,
        setProcessedResult: setProcessedResultMock,
        setError: vi.fn()
    })
}));

describe('ProcessorSection', () => {
    beforeEach(() => {
        stateMock.status = ProcessingStatus.IDLE;
        stateMock.sourceMedia = null;
        stateMock.progress = 0;
        vi.clearAllMocks();
    });

    it('shows upload initially', () => {
        const wrapper = mount(ProcessorSection);
        expect(wrapper.findComponent({ name: 'FileUpload' }).exists()).toBe(true);
    });

    it('shows start button when file is selected', async () => {
        const wrapper = mount(ProcessorSection);
        
        // Simulate file selection via state change (since we mocked useProcessing)
        // Ideally we trigger event on FileUpload which calls setSourceMedia
        
        // Find FileUpload and emit event
        const upload = wrapper.findComponent({ name: 'FileUpload' });
        const file = new File([''], 'test.mp4', { type: 'video/mp4' });
        await upload.vm.$emit('file-selected', file);
        
        expect(setSourceMediaMock).toHaveBeenCalledWith(file);
        
        // Force state update since our mock might not auto-reflect if component is not reactive to the *same* object reference (it is)
        stateMock.sourceMedia = { file } as any;
        await wrapper.vm.$nextTick();
        
        expect(wrapper.find('button').exists()).toBe(true);
        expect(wrapper.find('button').text()).toContain('開始去人聲處理');
    });

    it('starts processing on button click', async () => {
        const wrapper = mount(ProcessorSection);
        stateMock.sourceMedia = { file: new File([], 't.mp4') } as any;
        // Ensure status is IDLE explicitly after mount, as initProcessor might have changed it
        stateMock.status = ProcessingStatus.IDLE;
        await wrapper.vm.$nextTick();
        
        await wrapper.find('button').trigger('click');
        
        expect(mocks.process).toHaveBeenCalled();
    });

    it('shows progress bar when processing', async () => {
        const wrapper = mount(ProcessorSection);
        stateMock.status = ProcessingStatus.EXTRACTING_AUDIO;
        stateMock.progress = 20;
        await wrapper.vm.$nextTick();
        
        expect(wrapper.findComponent({ name: 'ProgressBar' }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: 'FileUpload' }).exists()).toBe(false);
    });
});
