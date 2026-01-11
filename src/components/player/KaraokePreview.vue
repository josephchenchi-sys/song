<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import PlayerControls from './PlayerControls.vue';
import KaraokeControls from './KaraokeControls.vue';
import DownloadSection from './DownloadSection.vue';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { useProcessing } from '../../composables/useProcessing';
import { ProcessingStatus } from '../../types';

const { state: playerState, togglePlay, seek, setVocals, setPitch, loadBuffers, init: initAudio } = useAudioPlayer();
const { state: processState, updateStatus } = useProcessing();

const videoPlayer = ref<InstanceType<typeof VideoPlayer> | null>(null);
const videoSrc = ref<string>('');

// 重新載入資源的函式
const loadResources = () => {
    if (processState.result) {
        // 釋放舊的 URL
        if (videoSrc.value) URL.revokeObjectURL(videoSrc.value);
        
        // 建立新的 URL
        videoSrc.value = URL.createObjectURL(processState.result.originalVideo);
        
        // 載入音軌
        loadBuffers(processState.result.vocals, processState.result.instrumental);
    }
};

// Sync Loop
let animationFrameId: number;

const syncLoop = () => {
    if (playerState.isPlaying && videoPlayer.value) {
        const audioTime = playerState.currentTime;
        const videoTime = videoPlayer.value.getTime();
        
        // Sync if drifted > 0.1s
        // Video player might be slightly behind/ahead, we prefer audio as master
        if (Math.abs(videoTime - audioTime) > 0.1) {
            videoPlayer.value.setTime(audioTime);
        }
    }
    animationFrameId = requestAnimationFrame(syncLoop);
};

// ... (skip to onMounted)
onMounted(async () => {
    await initAudio();
    loadResources();
    syncLoop();
});

// 監聽結果變化（用於歷史紀錄切換）
watch(() => processState.result, () => {
    loadResources();
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

const handlePitchUpdate = (delta: number) => {
    let newPitch = playerState.pitchShift + delta;
    if (newPitch > 12) newPitch = 12;
    if (newPitch < -12) newPitch = -12;
    setPitch(newPitch);
};

const handleResetPitch = () => {
    setPitch(0);
};

const returnToUpload = () => {
    // Pause immediately on click
    if (playerState.isPlaying) {
        togglePlay();
    }
    
    // Use setTimeout to allow UI update before blocking with confirm (optional but good for UX)
    setTimeout(() => {
        if (confirm('確定要返回上傳頁面嗎？目前的處理結果將會關閉（可從歷史紀錄重新載入）。')) {
            updateStatus(ProcessingStatus.IDLE, 0);
        }
    }, 10);
};

</script>

<template>
  <div class="w-full max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-md overflow-hidden">
    <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-bold text-gray-800">預覽</h3>
        <button 
            @click="returnToUpload"
            class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-3 rounded transition"
        >
            上傳另一首
        </button>
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
            @update-pitch="handlePitchUpdate"
            @reset-pitch="handleResetPitch"
        />
        
        <DownloadSection />
    </div>
  </div>
</template>