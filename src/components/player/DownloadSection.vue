<script setup lang="ts">
import { ref, computed } from 'vue';
import { ProcessorService } from '../../services/ProcessorService';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { useProcessing } from '../../composables/useProcessing';

const { state: playerState } = useAudioPlayer();
const { state: processState } = useProcessing();
const processorService = ProcessorService.getInstance();

const isRendering = ref(false);
const downloadFormat = ref<'mp4' | 'mp3'>('mp4');
const downloadType = ref<'instrumental' | 'vocals' | 'full'>('instrumental');

const downloadLabel = computed(() => {
    if (isRendering.value) return '處理中...';
    return `下載 ${downloadFormat.value.toUpperCase()} (${downloadType.value === 'instrumental' ? '伴奏' : downloadType.value === 'vocals' ? '人聲' : '完整版'})`;
});

const handleDownload = async () => {
    if (!processState.sourceMedia) return;
    
    isRendering.value = true;
    try {
        const blob = await processorService.renderDownload({
            pitchShift: playerState.pitchShift,
            format: downloadFormat.value,
            type: downloadType.value
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Construct filename
        const originalName = processState.sourceMedia.file.name.replace(/\.[^/.]+$/, "");
        const pitchText = playerState.pitchShift !== 0 ? `_${playerState.pitchShift > 0 ? '+' : ''}${playerState.pitchShift}key` : '';
        const typeText = `_${downloadType.value}`;
        a.download = `${originalName}${typeText}${pitchText}.${downloadFormat.value}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e: any) {
        alert('下載失敗: ' + e.message);
    } finally {
        isRendering.value = false;
    }
};
</script>

<template>
  <div class="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-100">
    <h4 class="text-sm font-bold text-blue-800 mb-4 uppercase tracking-wider">匯出選項</h4>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Type Selection -->
        <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">內容類型</label>
            <select v-model="downloadType" class="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="instrumental">伴奏 (Instrumental)</option>
                <option value="vocals">人聲 (Vocals)</option>
                <option value="full">完整版 (Full Mix)</option>
            </select>
        </div>
        
        <!-- Format Selection -->
        <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">輸出格式</label>
            <select v-model="downloadFormat" class="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="mp4">影片 (MP4)</option>
                <option value="mp3">音訊 (MP3)</option>
            </select>
        </div>
    </div>

    <button 
      @click="handleDownload"
      :disabled="isRendering"
      class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
    >
        <svg v-if="!isRendering" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        <svg v-else class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ downloadLabel }}
    </button>
    <p class="mt-2 text-[10px] text-blue-400 text-center">
        * 升降 Key 設定將套用於匯出的檔案中
    </p>
  </div>
</template>
