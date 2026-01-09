<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { StorageService } from '../../services/StorageService';
import { useProcessing } from '../../composables/useProcessing';
import { ProcessingStatus } from '../../types';

const songs = ref<Array<{ id: string; name: string; timestamp: number }>>([]);
const storageUsage = ref(0);
const storage = StorageService.getInstance();
const { state, loadFromHistory, historyVersion } = useProcessing();

const isProcessing = computed(() => {
    return state.status !== ProcessingStatus.IDLE && 
           state.status !== ProcessingStatus.COMPLETED && 
           state.status !== ProcessingStatus.ERROR;
});

const fetchSongs = async () => {
    songs.value = await storage.getSongs();
    storageUsage.value = await storage.getStorageUsage();
};

const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
};

const deleteSong = async (id: string) => {
    if (confirm('確定要刪除此紀錄嗎？')) {
        await storage.deleteSong(id);
        await fetchSongs();
    }
};

onMounted(fetchSongs);

watch(historyVersion, fetchSongs);

const MAX_SONGS = 5;
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-4">
    <h3 class="text-lg font-bold mb-4 text-gray-800">歷史紀錄</h3>
    <ul class="space-y-2">
      <li v-for="song in songs" :key="song.id" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100">
        <div class="flex-1 min-w-0 mr-4">
            <p class="font-medium text-gray-900 truncate" :title="song.name">{{ song.name }}</p>
            <p class="text-xs text-gray-500">{{ formatDate(song.timestamp) }}</p>
        </div>
        <div class="flex items-center gap-2">
            <button 
                @click="loadFromHistory(song.id)"
                :disabled="isProcessing"
                class="load-btn text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                載入
            </button>
            <button 
                @click="deleteSong(song.id)"
                :disabled="isProcessing"
                class="text-xs text-red-500 hover:text-red-700 px-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                ✕
            </button>
        </div>
      </li>
      <li v-if="songs.length === 0" class="text-center text-gray-400 py-4 text-sm">
        尚無紀錄
      </li>
    </ul>
    
    <!-- Storage Info -->
    <div class="mt-4 pt-4 border-t text-[10px] text-gray-400 flex justify-between">
        <span>已佔用: {{ formatSize(storageUsage) }}</span>
        <span>最大 {{ MAX_SONGS }} 筆</span>
    </div>
  </div>
</template>
