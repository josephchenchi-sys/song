<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isVocalsEnabled: boolean;
  pitchShift: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-vocals', enabled: boolean): void;
  (e: 'update-pitch', delta: number): void;
  (e: 'reset-pitch'): void;
}>();

const pitchDisplay = computed(() => {
    if (props.pitchShift === 0) return '原調';
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
        <div class="flex items-center gap-2">
            <div class="flex items-center bg-white rounded border border-gray-300 overflow-hidden">
                <button 
                @click="emit('update-pitch', -1)"
                class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-lg font-bold text-gray-700"
                >-</button>
                <span class="w-16 text-center font-mono font-bold text-blue-600 text-sm">{{ pitchDisplay }}</span>
                <button 
                @click="emit('update-pitch', 1)"
                class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-lg font-bold text-gray-700"
                >+</button>
            </div>
            <button 
                v-if="pitchShift !== 0"
                @click="emit('reset-pitch')"
                class="text-xs text-gray-500 hover:text-blue-600 underline"
            >
                重置
            </button>
        </div>
      </div>

    </div>
  </div>
</template>
