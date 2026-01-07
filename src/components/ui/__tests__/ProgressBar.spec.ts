import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar.vue';

describe('ProgressBar', () => {
    it('renders progress text', () => {
        const wrapper = mount(ProgressBar, {
            props: {
                progress: 50,
                statusText: 'Processing...'
            }
        });
        expect(wrapper.text()).toContain('Processing...');
        expect(wrapper.text()).toContain('50%');
    });

    it('updates width based on progress', async () => {
        const wrapper = mount(ProgressBar, {
            props: {
                progress: 75,
                statusText: 'Loading'
            }
        });
        
        const bar = wrapper.find('.bg-blue-600'); // Assuming blue bar
        expect(bar.attributes('style')).toContain('width: 75%');
        
        await wrapper.setProps({ progress: 100 });
        expect(bar.attributes('style')).toContain('width: 100%');
    });
});
