<script setup lang="ts">
import ProcessorSection from './components/processor/ProcessorSection.vue';
import KaraokePreview from './components/player/KaraokePreview.vue';
import MobileWarning from './components/ui/MobileWarning.vue';
import HistoryList from './components/history/HistoryList.vue';
import { useProcessing } from './composables/useProcessing';
import { ProcessingStatus } from './types';

const { state } = useProcessing();
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col md:flex-row">
    <!-- Sidebar for History -->
    <aside class="w-full md:w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto md:h-screen sticky top-0">
        <header class="mb-8 text-center md:text-left">
            <h1 class="text-2xl font-bold text-blue-600">Vocal Remover</h1>
            <p class="text-xs text-gray-500">純前端影片去人聲工具</p>
        </header>
        <HistoryList />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 py-10 px-4 pb-20 overflow-y-auto">
        <div class="max-w-3xl mx-auto space-y-8">
            <MobileWarning />
            
            <ProcessorSection />
            
            <div v-if="state.status === ProcessingStatus.COMPLETED" class="fade-in">
                <KaraokePreview />
            </div>
        </div>
    </main>
  </div>
</template>

<style scoped>
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>