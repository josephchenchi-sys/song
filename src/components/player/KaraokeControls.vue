<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isVocalsEnabled: boolean;
  pitchShift: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-vocals', enabled: boolean): void;
  (e: 'update-pitch', delta: number): void;
}>();

const pitchDisplay = computed(() => {
    return props.pitchShift > 0 ? `+${props.pitchShift}` : props.pitchShift.toString();
});
</script>

<template>
  <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
    <div class="flex flex-wrap items-center gap-6">
      
      <!-- Vocals Toggle -->
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input 
          type="checkbox" 
          class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          :checked="isVocalsEnabled"
          @change="e => emit('toggle-vocals', (e.target as HTMLInputElement).checked)"
        >
        <span class="text-gray-700 font-medium">導唱 (人聲)</span>
      </label>
      
      <div class="h-6 w-px bg-gray-300"></div>

      <!-- Pitch Controls -->
      <div class="flex items-center gap-2">
        <span class="text-gray-700 font-medium">升降 Key:</span>
        <div class="flex items-center bg-white rounded border border-gray-300 overflow-hidden">
            <button 
              @click="emit('update-pitch', -1)"
              class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-lg font-bold text-gray-700"
            >-</button>
            <span class="w-10 text-center font-mono font-bold text-blue-600">{{ pitchDisplay }}</span>
            <button 
              @click="emit('update-pitch', 1)"
              class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-lg font-bold text-gray-700"
            >+</button>
        </div>
      </div>

    </div>
  </div>
</template>
