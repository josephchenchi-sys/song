<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-play'): void;
  (e: 'seek', time: number): void;
}>();

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const displayTime = computed(() => {
    return `${formatTime(props.currentTime)} / ${formatTime(props.duration)}`;
});
</script>

<template>
  <div class="flex items-center gap-4 w-full">
    <button 
      @click="emit('toggle-play')"
      class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded w-20 flex-shrink-0"
    >
      {{ isPlaying ? '暫停' : '播放' }}
    </button>
    
    <input 
      type="range" 
      min="0" 
      :max="duration" 
      step="0.1" 
      :value="currentTime"
      @input="e => emit('seek', parseFloat((e.target as HTMLInputElement).value))"
      class="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
    >
    
    <span class="text-sm font-mono text-gray-600 w-24 text-right flex-shrink-0">{{ displayTime }}</span>
  </div>
</template>
