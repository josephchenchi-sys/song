<script setup lang="ts">
defineProps<{
  progress: number;
  statusText: string;
}>();
</script>

<template>
  <div class="w-full space-y-3">
    <div class="flex justify-between items-end">
      <div>
        <span class="text-sm font-semibold text-blue-600 uppercase tracking-wider">{{ statusText }}</span>
      </div>
      <div class="text-right">
        <span class="text-2xl font-bold text-gray-800">{{ Math.round(progress) }}%</span>
      </div>
    </div>
    
    <div class="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
      <div 
        class="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out relative"
        :style="{ width: `${progress}%` }"
      >
        <!-- 光澤動畫效果 -->
        <div class="absolute inset-0 bg-white/20 skew-x-[-20deg] animate-pulse"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shine {
  from { transform: translateX(-100%) skewX(-20deg); }
  to { transform: translateX(200%) skewX(-20deg); }
}
</style>