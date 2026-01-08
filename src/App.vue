<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import ProcessorSection from './components/processor/ProcessorSection.vue';
import KaraokePreview from './components/player/KaraokePreview.vue';
import MobileWarning from './components/ui/MobileWarning.vue';
import HistoryList from './components/history/HistoryList.vue';
import { useProcessing } from './composables/useProcessing';
import { ProcessingStatus } from './types';

const { state } = useProcessing();
const historyList = ref<InstanceType<typeof HistoryList> | null>(null);

watch(() => state.status, (newStatus) => {
    if (newStatus === ProcessingStatus.COMPLETED) {
        // Refresh history when processing completes
        historyList.value?.refresh();
    }
});

const isProcessing = computed(() => {
    return state.status !== ProcessingStatus.IDLE && 
           state.status !== ProcessingStatus.COMPLETED && 
           state.status !== ProcessingStatus.ERROR;
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-8 px-4 pb-20 font-sans">
    
    <div class="max-w-2xl mx-auto mb-6">
        <MobileWarning />
    </div>
    
    <main class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start transition-all duration-500 ease-in-out">
      
      <!-- Left Sidebar: History (Hidden when processing) -->
      <aside 
         v-show="!isProcessing"
         class="lg:col-span-1 lg:sticky lg:top-8 order-2 lg:order-1 h-[600px] lg:h-[calc(100vh-100px)] transition-all duration-300"
      >
         <HistoryList ref="historyList" />
      </aside>

      <!-- Main Content: Processor & Preview -->
      <div 
        :class="[
            'space-y-8 order-1 lg:order-2 transition-all duration-500',
            isProcessing ? 'lg:col-span-3 max-w-2xl mx-auto w-full mt-20' : 'lg:col-span-2'
        ]"
      >
        <ProcessorSection />
        
        <!-- Preview hidden when processing -->
        <div v-if="state.result && !isProcessing" class="fade-in">
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