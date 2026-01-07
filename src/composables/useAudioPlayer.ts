import { reactive, onUnmounted } from 'vue';
import { AudioPlayerService } from '../services/AudioPlayerService';
import type { PlaybackState } from '../types';

const playerService = new AudioPlayerService();

const state = reactive<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isVocalsEnabled: true,
    pitchShift: 0,
    volume: 1.0
});

let animationFrameId: number | null = null;

const updateState = () => {
    state.currentTime = playerService.getCurrentTime();
    state.isPlaying = playerService.getIsPlaying();
    animationFrameId = requestAnimationFrame(updateState);
};

export const useAudioPlayer = () => {
    const init = async () => {
        await playerService.init();
        if (!animationFrameId) {
            updateState();
        }
    };

    const loadBuffers = (vocals: AudioBuffer, instrumental: AudioBuffer) => {
        playerService.loadBuffers(vocals, instrumental);
        state.duration = vocals.duration;
        state.currentTime = 0;
        state.isPlaying = false;
    };

    const togglePlay = () => {
        if (state.isPlaying) {
            playerService.pause();
            state.isPlaying = false;
        } else {
            playerService.play();
            state.isPlaying = true;
        }
    };

    const seek = (time: number) => {
        playerService.seek(time);
        state.currentTime = time;
    };

    const setVocals = (enabled: boolean) => {
        playerService.setVocalsEnabled(enabled);
        state.isVocalsEnabled = enabled;
    };

    const setPitch = (semitones: number) => {
        playerService.setPitch(semitones);
        state.pitchShift = semitones;
    };

    // Note: We don't stop the loop on unmount because this is a global player state
    // If we wanted to, we could count subscribers.

    return {
        state,
        init,
        loadBuffers,
        togglePlay,
        seek,
        setVocals,
        setPitch
    };
};
