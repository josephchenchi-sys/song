import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FileUpload from '../FileUpload.vue';

describe('FileUpload', () => {
    it('renders upload button', () => {
        const wrapper = mount(FileUpload);
        expect(wrapper.text()).toContain('選擇檔案');
    });

    it('emits file-selected event when file is selected', async () => {
        const wrapper = mount(FileUpload);
        const input = wrapper.find('input[type="file"]');
        
        const file = new File([''], 'test.mp4', { type: 'video/mp4' });
        // Simulating file selection requires setting files property directly
        Object.defineProperty(input.element, 'files', { value: [file] });
        
        await input.trigger('change');
        
        expect(wrapper.emitted('file-selected')).toBeTruthy();
        expect(wrapper.emitted('file-selected')?.[0]).toEqual([file]);
    });

    it('rejects invalid file types', async () => {
        const wrapper = mount(FileUpload);
        const input = wrapper.find('input[type="file"]');
        
        // Mock window.alert
        window.alert = () => {}; 
        
        const file = new File([''], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(input.element, 'files', { value: [file] });
        
        await input.trigger('change');
        
        expect(wrapper.emitted('file-selected')).toBeFalsy();
    });
});
