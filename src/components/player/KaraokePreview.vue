<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import PlayerControls from './PlayerControls.vue';
import KaraokeControls from './KaraokeControls.vue';
import DownloadSection from './DownloadSection.vue';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { useProcessing } from '../../composables/useProcessing';

const { state: playerState, togglePlay, seek, setVocals, setPitch, loadBuffers, init: initAudio } = useAudioPlayer();
const { state: processState } = useProcessing();

const videoPlayer = ref<InstanceType<typeof VideoPlayer> | null>(null);
const videoSrc = ref<string>('');

// Sync Loop
let animationFrameId: number;

const syncLoop = () => {
    if (playerState.isPlaying && videoPlayer.value) {
        const audioTime = playerState.currentTime;
        const videoTime = videoPlayer.value.getTime();
        
        // Sync if drifted > 0.1s
        if (Math.abs(videoTime - audioTime) > 0.1) {
            videoPlayer.value.setTime(audioTime);
        }
    }
    animationFrameId = requestAnimationFrame(syncLoop);
};

onMounted(async () => {
    await initAudio();
    
    if (processState.result) {
        // Create URL for video
        videoSrc.value = URL.createObjectURL(processState.result.originalVideo);
        
        // Load buffers into player
        loadBuffers(processState.result.vocals, processState.result.instrumental);
    }
    
    syncLoop();
});

onUnmounted(() => {
    cancelAnimationFrame(animationFrameId);
    if (videoSrc.value) {
        URL.revokeObjectURL(videoSrc.value);
    }
});

// Watch play state to trigger video play/pause
watch(() => playerState.isPlaying, (playing) => {
    if (playing) videoPlayer.value?.play();
    else videoPlayer.value?.pause();
});

// Handle seek
const onSeek = (time: number) => {
    seek(time);
    videoPlayer.value?.setTime(time);
};

</script>

<template>
  <div class="w-full max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-md overflow-hidden">
    <div class="p-4 border-b">
        <h3 class="text-lg font-bold text-gray-800">預覽 (卡拉 OK 模式)</h3>
    </div>
    
    <VideoPlayer ref="videoPlayer" :src="videoSrc" />
    
    <div class="p-6 space-y-6">
        <PlayerControls 
            :is-playing="playerState.isPlaying"
            :current-time="playerState.currentTime"
            :duration="playerState.duration"
            @toggle-play="togglePlay"
            @seek="onSeek"
        />
        
        <KaraokeControls 
            :is-vocals-enabled="playerState.isVocalsEnabled"
            :pitch-shift="playerState.pitchShift"
            @toggle-vocals="setVocals"
            @update-pitch="setPitch"
        />
        
        <DownloadSection />
    </div>
  </div>
</template>