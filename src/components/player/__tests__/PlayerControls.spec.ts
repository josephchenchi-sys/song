import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlayerControls from '../PlayerControls.vue';

describe('PlayerControls', () => {
    it('shows play button when paused', () => {
        const wrapper = mount(PlayerControls, {
            props: { isPlaying: false, currentTime: 0, duration: 100 }
        });
        expect(wrapper.find('button').text()).toContain('播放');
    });

    it('shows pause button when playing', () => {
        const wrapper = mount(PlayerControls, {
            props: { isPlaying: true, currentTime: 0, duration: 100 }
        });
        expect(wrapper.find('button').text()).toContain('暫停');
    });

    it('emits toggle-play event', async () => {
        const wrapper = mount(PlayerControls, {
            props: { isPlaying: false, currentTime: 0, duration: 100 }
        });
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('toggle-play')).toBeTruthy();
    });

    it('emits seek event when slider changes', async () => {
        const wrapper = mount(PlayerControls, {
            props: { isPlaying: false, currentTime: 0, duration: 100 }
        });
        const input = wrapper.find('input[type="range"]');
        await input.setValue(50);
        expect(wrapper.emitted('seek')).toBeTruthy();
        expect(wrapper.emitted('seek')?.[0]).toEqual([50]);
    });
});
