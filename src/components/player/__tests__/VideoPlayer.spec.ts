import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VideoPlayer from '../VideoPlayer.vue';

describe('VideoPlayer', () => {
    it('renders video element with src', () => {
        const wrapper = mount(VideoPlayer, {
            props: { src: 'blob:test' }
        });
        const video = wrapper.find('video');
        expect(video.exists()).toBe(true);
        expect(video.attributes('src')).toBe('blob:test');
    });

    it('sets muted to true', () => {
        const wrapper = mount(VideoPlayer, {
            props: { src: 'blob:test' }
        });
        const video = wrapper.find('video').element as HTMLVideoElement;
        expect(video.muted).toBe(true);
    });
});
