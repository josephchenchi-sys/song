import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KaraokeControls from '../KaraokeControls.vue';

describe('KaraokeControls', () => {
    it('shows vocals toggle checked state', () => {
        const wrapper = mount(KaraokeControls, {
            props: { isVocalsEnabled: true, pitchShift: 0 }
        });
        const checkbox = wrapper.find('input[type="checkbox"]').element as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('emits toggle-vocals event', async () => {
        const wrapper = mount(KaraokeControls, {
            props: { isVocalsEnabled: true, pitchShift: 0 }
        });
        const checkbox = wrapper.find('input[type="checkbox"]');
        await checkbox.setValue(false);
        expect(wrapper.emitted('toggle-vocals')).toBeTruthy();
        expect(wrapper.emitted('toggle-vocals')?.[0]).toEqual([false]);
    });

    it('shows pitch value', () => {
        const wrapper = mount(KaraokeControls, {
            props: { isVocalsEnabled: true, pitchShift: 2 }
        });
        expect(wrapper.text()).toContain('+2');
    });

    it('emits update-pitch event', async () => {
        const wrapper = mount(KaraokeControls, {
            props: { isVocalsEnabled: true, pitchShift: 0 }
        });
        const btns = wrapper.findAll('button');
        const downBtn = btns[0]; // Assuming - is first
        const upBtn = btns[1]; // Assuming + is second
        
        await upBtn.trigger('click');
        expect(wrapper.emitted('update-pitch')).toBeTruthy();
        expect(wrapper.emitted('update-pitch')?.[0]).toEqual([1]);
        
        await downBtn.trigger('click');
        expect(wrapper.emitted('update-pitch')?.[1]).toEqual([-1]);
    });
});
