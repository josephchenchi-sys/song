<script setup lang="ts">
import { ref, computed } from 'vue';
import { ProcessorService } from '../../services/ProcessorService';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { useProcessing } from '../../composables/useProcessing';

const { state: playerState, togglePlay } = useAudioPlayer();
const { state: processState } = useProcessing();
const processorService = ProcessorService.getInstance();
const isDownloading = ref(false);

const isAudioOnly = computed(() => {
    return processState.sourceMedia?.file.type.startsWith('audio/');
});

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const pauseIfPlaying = () => {
    if (playerState.isPlaying) {
        togglePlay();
    }
};

const handleDownload = async (mode: 'instrumental' | 'full' = 'instrumental', format: 'mp4' | 'mp3' = 'mp4') => {
    pauseIfPlaying();
    isDownloading.value = true;
    try {
        const blob = await processorService.renderDownload({ 
            pitchShift: playerState.pitchShift,
            mode,
            format
        });
        
        const originalName = processState.sourceMedia?.file.name.replace(/\.[^/.]+$/, "") || 'output';
        const prefix = mode === 'full' ? 'full' : 'instrumental';
        const pitchStr = `${playerState.pitchShift > 0 ? '+' : ''}${playerState.pitchShift}`;
        const ext = format;
        
        downloadBlob(blob, `${originalName}_(${prefix}_${pitchStr}).${ext}`);
    } catch (e) {
        alert('下載失敗: ' + (e as Error).message);
    } finally {
        isDownloading.value = false;
    }
};

const handleDownloadVocals = async () => {
    pauseIfPlaying();
    isDownloading.value = true;
    try {
        const blob = await processorService.renderDownload({ 
            pitchShift: playerState.pitchShift,
            mode: 'vocals'
        });
        
        const originalName = processState.sourceMedia?.file.name.replace(/\.[^/.]+$/, "") || 'output';
        const pitchStr = `${playerState.pitchShift > 0 ? '+' : ''}${playerState.pitchShift}`;
        
        downloadBlob(blob, `${originalName}_(vocals_${pitchStr}).wav`);
    } catch (e) {
        alert('人聲下載失敗: ' + (e as Error).message);
    } finally {
        isDownloading.value = false;
    }
};
</script>

<template>
  <div class="mt-8 pt-6 border-t border-gray-100">
    <h4 class="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider text-center">下載選項</h4>
    <div class="flex flex-col gap-4">
        <!-- Instrumental Group -->
        <div class="flex flex-wrap justify-center gap-3">
            <button 
            v-if="!isAudioOnly"
            @click="handleDownload('instrumental', 'mp4')"
            :disabled="isDownloading"
            class="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-5 rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow"
            >
            <span v-if="isDownloading">處理中...</span>
            <span v-else>伴奏影片 (MP4)</span>
            </button>
            
            <button 
            @click="handleDownload('instrumental', 'mp3')"
            :disabled="isDownloading"
            class="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-5 rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow"
            >
            <span v-if="isDownloading">處理中...</span>
            <span v-else>伴奏 MP3</span>
            </button>
        </div>

        <!-- Full Group -->
        <div class="flex flex-wrap justify-center gap-3">
            <button 
            v-if="!isAudioOnly"
            @click="handleDownload('full', 'mp4')"
            :disabled="isDownloading"
            class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow"
            >
            <span v-if="isDownloading">處理中...</span>
            <span v-else>完整影片 (MP4)</span>
            </button>

            <button 
            @click="handleDownload('full', 'mp3')"
            :disabled="isDownloading"
            class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-lg inline-flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow"
            >
            <span v-if="isDownloading">處理中...</span>
            <span v-else>完整 MP3</span>
            </button>
        </div>

        <!-- Vocals -->
        <div class="flex justify-center">
            <button 
            @click="handleDownloadVocals"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-flex items-center justify-center gap-2 transition text-sm shadow"
            >
            下載純人聲 (WAV)
            </button>
        </div>
    </div>
  </div>
</template>
