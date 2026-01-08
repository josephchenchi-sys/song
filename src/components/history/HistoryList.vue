<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storageService } from '../../services/StorageService';
import { useProcessing } from '../../composables/useProcessing';
import { ProcessorService } from '../../services/ProcessorService';
import { ProcessingStatus } from '../../types';

const { state, setProcessedResult, setSourceMedia, updateStatus } = useProcessing();
const processorService = ProcessorService.getInstance();
const songs = ref<{id: string, name: string, date: number}[]>([]);
const isLoading = ref(false);
const storageEstimate = ref<{usage: number, quota: number} | null>(null);

const isGlobalProcessing = computed(() => {
    return state.status !== ProcessingStatus.IDLE && 
           state.status !== ProcessingStatus.COMPLETED && 
           state.status !== ProcessingStatus.ERROR;
});

const loadHistory = async () => {
    songs.value = await storageService.getAllSongs();
    updateStorageEstimate();
};

const updateStorageEstimate = async () => {
    storageEstimate.value = await storageService.getStorageEstimate();
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
};

const loadSong = async (id: string) => {
    if (isGlobalProcessing.value) return; // Double check
    
    isLoading.value = true;
    try {
        const record = await storageService.getSong(id);
        if (!record) throw new Error('Song not found');

        updateStatus(ProcessingStatus.EXTRACTING_AUDIO, 0, '正在讀取快取...');

        // Reconstruct AudioBuffers
        const audioContext = new AudioContext({ sampleRate: 44100 });
        
        const decodeBlob = async (blob: Blob) => {
            const arrayBuffer = await blob.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };

        const [vocalsBuffer, instrumentalBuffer] = await Promise.all([
            decodeBlob(record.vocalsBlob),
            decodeBlob(record.instrumentalAudioBlob)
        ]);
        
        await processorService.restoreSession(record.originalVideo, instrumentalBuffer, vocalsBuffer);

        const file = new File([record.originalVideo], record.name, { type: record.originalVideo.type });
        setSourceMedia(file);

        setProcessedResult({
            originalVideo: record.originalVideo,
            vocals: vocalsBuffer,
            instrumental: instrumentalBuffer,
            vocalsBlob: record.vocalsBlob,
            instrumentalBlob: record.instrumentalVideoBlob,
            instrumentalAudioBlob: record.instrumentalAudioBlob
        });

        updateStatus(ProcessingStatus.COMPLETED, 100, 'Loaded from history');

    } catch (e) {
        console.error(e);
        alert('讀取失敗');
        updateStatus(ProcessingStatus.IDLE, 0);
    } finally {
        isLoading.value = false;
    }
};

const deleteSong = async (id: string) => {
    if (!confirm('確定要刪除嗎？')) return;
    await storageService.deleteSong(id);
    await loadHistory();
};

onMounted(loadHistory);

// Expose refresh method if needed
defineExpose({ refresh: loadHistory });
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-800">歷史紀錄</h3>
        <div v-if="storageEstimate" class="text-xs text-gray-500 text-right">
            <p>已用: {{ formatSize(storageEstimate.usage) }}</p>
            <p>剩餘: {{ formatSize(storageEstimate.quota - storageEstimate.usage) }}</p>
        </div>
    </div>
    
    <div v-if="songs.length > 0" class="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
        <div v-for="song in songs" :key="song.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition shadow-sm">
            <div class="overflow-hidden pr-2 flex-1">
                <p class="font-bold text-gray-800 truncate text-sm">{{ song.name }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ formatDate(song.date) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button 
                    @click="loadSong(song.id)"
                    class="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isLoading || isGlobalProcessing"
                >
                    {{ isGlobalProcessing ? '處理中' : '載入' }}
                </button>
                <button 
                    @click="deleteSong(song.id)"
                    class="p-1.5 text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="刪除"
                    :disabled="isLoading || isGlobalProcessing"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <div v-else class="text-center text-gray-500 py-4 flex-1 flex items-center justify-center">
        尚無歷史紀錄
    </div>
  </div>
</template>