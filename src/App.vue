<script setup lang="ts">
import ProcessorSection from './components/processor/ProcessorSection.vue';
import KaraokePreview from './components/player/KaraokePreview.vue';
import MobileWarning from './components/ui/MobileWarning.vue';
import { useProcessing } from './composables/useProcessing';
import { ProcessingStatus } from './types';

const { state } = useProcessing();
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-10 px-4 pb-20">
    <header class="text-center mb-10">
      <h1 class="text-3xl font-bold text-blue-600 mb-2">Video Vocal Remover</h1>
      <p class="text-gray-600">純前端影片去人聲工具</p>
    </header>
    
    <div class="max-w-2xl mx-auto">
        <MobileWarning />
    </div>
    
    <main class="space-y-8">
      <ProcessorSection />
      
      <div v-if="state.status === ProcessingStatus.COMPLETED" class="fade-in">
         <KaraokePreview />
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