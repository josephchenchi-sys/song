<script setup lang="ts">
import { ref } from 'vue';
import { ProcessorService } from '../../services/ProcessorService';
import { useAudioPlayer } from '../../composables/useAudioPlayer';

const { state: playerState } = useAudioPlayer();
const processorService = new ProcessorService();
const isDownloading = ref(false);

const handleDownload = async () => {
    isDownloading.value = true;
    try {
        const blob = await processorService.renderDownload({ 
            pitchShift: playerState.pitchShift 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `instrumental_${playerState.pitchShift > 0 ? '+' : ''}${playerState.pitchShift}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('下載失敗: ' + (e as Error).message);
    } finally {
        isDownloading.value = false;
    }
};
</script>

<template>
  <div class="mt-4 pt-4 border-t border-gray-100 flex justify-center">
    <button 
      @click="handleDownload"
      :disabled="isDownloading"
      class="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded inline-flex items-center gap-2 transition disabled:opacity-50"
    >
      <span v-if="isDownloading">處理中...</span>
      <span v-else>下載伴奏影片</span>
    </button>
  </div>
</template>
