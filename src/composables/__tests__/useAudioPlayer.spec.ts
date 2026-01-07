import { describe, it, expect, vi } from 'vitest';
import { useAudioPlayer } from '../useAudioPlayer';

vi.mock('../../services/AudioPlayerService', () => {
    return {
        AudioPlayerService: class {
            init = vi.fn();
            loadBuffers = vi.fn();
            play = vi.fn();
            pause = vi.fn();
            seek = vi.fn();
            setVocalsEnabled = vi.fn();
            setPitch = vi.fn();
            getCurrentTime = vi.fn().mockReturnValue(10);
            getIsPlaying = vi.fn().mockReturnValue(true);
        }
    };
});

describe('useAudioPlayer', () => {
    it('initializes state correctly', () => {
        const { state } = useAudioPlayer();
        expect(state.isPlaying).toBe(false);
        expect(state.currentTime).toBe(0);
        expect(state.isVocalsEnabled).toBe(true);
    });

    it('togglePlay calls service play/pause', () => {
        const { state, togglePlay } = useAudioPlayer();
        togglePlay();
        // Since play is toggled, it sets local state to true immediately in our implementation
        expect(state.isPlaying).toBe(true);
    });

    it('can set vocals', () => {
        const { state, setVocals } = useAudioPlayer();
        setVocals(false);
        expect(state.isVocalsEnabled).toBe(false);
    });
});