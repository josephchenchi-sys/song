<script setup lang="ts">
import { computed } from 'vue';
import FileUpload from '../ui/FileUpload.vue';
import ProgressBar from '../ui/ProgressBar.vue';
import { useProcessing } from '../../composables/useProcessing';
import { ProcessorService } from '../../services/ProcessorService';
import { storageService } from '../../services/StorageService';
import { ProcessingStatus } from '../../types';

const { state, setSourceMedia, updateStatus, setProcessedResult, setError } = useProcessing();
const processorService = ProcessorService.getInstance();

// Init processor service (load WASM)
const initProcessor = async () => {
    try {
        // 立即設定初始狀態，讓進度條出現
        updateStatus(ProcessingStatus.LOADING_MODEL, 0, '正在初始化引擎 (FFmpeg / ONNX)...');

        await processorService.init((loaded, total) => {
            if (total > 0) {
                const percent = (loaded / total) * 100;
                updateStatus(ProcessingStatus.LOADING_MODEL, percent, `下載 AI 模型中... ${(loaded/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB`);
            } else {
                // 如果總大小未知，至少顯示已下載容量
                updateStatus(ProcessingStatus.LOADING_MODEL, 0, `下載 AI 模型中... ${(loaded/1024/1024).toFixed(1)}MB`);
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
            if (state.status === ProcessingStatus.IDLE) return; // Stop updates if cancelled
            let status = ProcessingStatus.EXTRACTING_AUDIO;
            if (stage === 'separating') status = ProcessingStatus.SEPARATING;
            if (stage === 'rendering') status = ProcessingStatus.RENDERING;
            if (stage === 'completed') status = ProcessingStatus.COMPLETED;
            
            updateStatus(status, percent, details);
        });
        
        // Save to cache
        try {
            updateStatus(ProcessingStatus.COMPLETED, 100, '正在儲存到本機快取...');
            await storageService.saveSong(state.sourceMedia.file, result);
        } catch (saveError) {
            console.error('Failed to save to history:', saveError);
            // Don't fail the whole process just because save failed
        }
        
        setProcessedResult(result);
        
        // Finalize
        updateStatus(ProcessingStatus.COMPLETED, 100, '處理完成');

    } catch (e: any) {
        if (e.message === 'Cancelled by user') {
            updateStatus(ProcessingStatus.IDLE, 0);
        } else {
            setError(e.message || 'Unknown error');
        }
    }
};

const cancelProcessing = () => {
    if (confirm('確定要取消處理嗎？')) {
        processorService.cancel();
        updateStatus(ProcessingStatus.IDLE, 0);
        state.sourceMedia = null; // Optional: Reset file selection too? Maybe just reset status.
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
        case ProcessingStatus.SEPARATING: return '分離人聲中 (此步驟較耗時)...';
        case ProcessingStatus.RENDERING: return '合成輸出中...';
        case ProcessingStatus.COMPLETED: return '處理完成';
        case ProcessingStatus.ERROR: return `錯誤: ${state.error}`;
        default: return '準備就緒';
    }
});
</script>

<template>
  <div class="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
    
    <!-- Upload Section -->
    <div v-if="showUpload" class="p-8">
       <FileUpload @file-selected="onFileSelected" />
       
       <div v-if="state.sourceMedia" class="mt-6 text-center animate-fade-in">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg mb-4 text-sm font-medium">
             <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
             {{ state.sourceMedia.file.name }}
          </div>
          <br>
          <button 
            @click="startProcessing"
            class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-10 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="state.status === ProcessingStatus.LOADING_MODEL"
          >
            開始去人聲處理
          </button>
       </div>
    </div>

    <!-- Processing Status -->
    <div v-if="isProcessing || state.status === ProcessingStatus.LOADING_MODEL" class="p-10 flex flex-col items-center justify-center min-h-[400px]">
        <div class="w-full max-w-md space-y-6">
            <div class="flex justify-between items-end">
                <span class="text-xl font-bold text-gray-700">{{ statusText }}</span>
                <span class="text-2xl font-black text-blue-600">{{ Math.round(state.progress) }}%</span>
            </div>
            
            <ProgressBar :progress="state.progress" :status-text="''" class="h-4" />
            
            <p v-if="currentDetail" class="text-center text-sm text-gray-400 italic h-6">
                {{ currentDetail }}
            </p>

            <div class="flex justify-center mt-8">
                <button 
                    @click="cancelProcessing"
                    class="px-6 py-2 border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-full transition text-sm font-medium"
                >
                    取消處理
                </button>
            </div>
        </div>
    </div>
    
    <div v-if="state.status === ProcessingStatus.ERROR" class="p-8 bg-red-50 border-t border-red-100">
        <div class="flex items-center gap-3 text-red-700 mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span class="font-bold">發生錯誤</span>
        </div>
        <p class="text-red-600 mb-4 ml-9">{{ state.error }}</p>
        <button @click="updateStatus(ProcessingStatus.IDLE, 0)" class="ml-9 text-sm text-blue-600 hover:underline font-medium">重試</button>
    </div>

    <!-- Completion state handled by parent or different component -->
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
