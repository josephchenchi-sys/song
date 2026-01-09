<script setup lang="ts">
import { computed } from 'vue';
import FileUpload from '../ui/FileUpload.vue';
import ProgressBar from '../ui/ProgressBar.vue';
import { useProcessing } from '../../composables/useProcessing';
import { ProcessorService } from '../../services/ProcessorService';
import { ProcessingStatus } from '../../types';

const { state, setSourceMedia, updateStatus, setProcessedResult, setError, saveCurrentResult, resetState } = useProcessing();
const processorService = ProcessorService.getInstance();

// Init processor service (load WASM)
const initProcessor = async () => {
    try {
        await processorService.init((loaded, total) => {
            if (total > 0) {
                updateStatus(ProcessingStatus.LOADING_MODEL, (loaded/total)*100, `下載模型中... ${(loaded/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB`);
            }
        });
        
        if (state.status === ProcessingStatus.LOADING_MODEL) {
            updateStatus(ProcessingStatus.IDLE, 0, '系統就緒');
        }
    } catch (e: any) {
        console.error('Failed to initialize ProcessorService:', e);
        setError(`初始化失敗: ${e.message || '請確認瀏覽器支援 SharedArrayBuffer'}`);
    }
};

initProcessor();

const onFileSelected = (file: File) => {
    setSourceMedia(file);
};

const startProcessing = async () => {
    if (!state.sourceMedia) return;
    
    try {
        const result = await processorService.process(state.sourceMedia.file, (stage, percent, details) => {
            let status = ProcessingStatus.EXTRACTING_AUDIO;
            if (stage === 'separating') status = ProcessingStatus.SEPARATING;
            if (stage === 'rendering') status = ProcessingStatus.RENDERING;
            // Don't set COMPLETED here to avoid race condition with result setting
            if (stage === 'completed') status = ProcessingStatus.RENDERING;
            
            updateStatus(status, percent, details);
        });
        
        setProcessedResult(result);
        await saveCurrentResult();
        updateStatus(ProcessingStatus.COMPLETED, 100, '處理完成');
    } catch (e: any) {
        setError(e.message || 'Unknown error');
    }
};

const isProcessing = computed(() => {
    return state.status !== ProcessingStatus.IDLE && state.status !== ProcessingStatus.COMPLETED && state.status !== ProcessingStatus.ERROR;
});

const isCompleted = computed(() => state.status === ProcessingStatus.COMPLETED);
const showUpload = computed(() => state.status === ProcessingStatus.IDLE || state.status === ProcessingStatus.ERROR || state.status === ProcessingStatus.LOADING_MODEL);

const currentDetail = computed(() => {
    return state.logs.length > 0 ? state.logs[state.logs.length - 1] : '';
});

const statusText = computed(() => {
    switch (state.status) {
        case ProcessingStatus.LOADING_MODEL: return '載入模型中...';
        case ProcessingStatus.EXTRACTING_AUDIO: return '提取音訊中...';
        case ProcessingStatus.SEPARATING: return '分離人聲中...';
        case ProcessingStatus.RENDERING: return '合成影片中...';
        case ProcessingStatus.COMPLETED: return '處理完成';
        case ProcessingStatus.ERROR: return `錯誤: ${state.error}`;
        default: return '準備就緒';
    }
});
</script>

<template>
  <div class="w-full max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md">
    
    <div v-if="showUpload" class="mb-6">
       <FileUpload @file-selected="onFileSelected" />
       
       <div v-if="state.sourceMedia" class="mt-4 text-center">
          <p class="mb-4 text-gray-700">已選擇: {{ state.sourceMedia.file.name }}</p>
          <button 
            @click="startProcessing"
            class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded transition disabled:opacity-50"
            :disabled="state.status === ProcessingStatus.LOADING_MODEL"
          >
            開始處理
          </button>
       </div>
    </div>

    <div v-if="isProcessing || state.status === ProcessingStatus.LOADING_MODEL" class="mb-6 py-4">
        <ProgressBar :progress="state.progress" :status-text="statusText" />
        <p v-if="currentDetail" class="mt-2 text-center text-xs text-gray-500 italic">
            {{ currentDetail }}
        </p>
    </div>
    
    <div v-if="state.status === ProcessingStatus.ERROR" class="mt-4 p-4 bg-red-100 text-red-700 rounded">
        {{ state.error }}
        <button @click="updateStatus(ProcessingStatus.IDLE, 0)" class="ml-4 underline">重試</button>
    </div>

    <div v-if="state.status === ProcessingStatus.COMPLETED" class="mt-4 text-center p-6 border-2 border-dashed border-green-200 rounded-lg bg-green-50">
        <div class="mb-4 text-green-600">
            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="font-bold text-lg">處理完成！</p>
            <p class="text-sm">已自動儲存至歷史紀錄</p>
        </div>
        <button 
            @click="resetState"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition"
        >
            處理下一首
        </button>
    </div>
  </div>
</template>
