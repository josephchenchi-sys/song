<script setup lang="ts">
const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>();

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  // Basic validation: check if it's video or audio. 
  // More specific validation can happen if needed, but 'audio/' and 'video/' cover most.
  if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
    alert('不支援的檔案格式。請上傳影片或音訊檔。');
    input.value = '';
    return;
  }
  
  emit('file-selected', file);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
    <div class="mb-4 text-gray-400 group-hover:text-blue-500 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    </div>
    <label class="cursor-pointer bg-white text-blue-600 font-semibold py-2 px-6 rounded-full border border-blue-200 shadow-sm hover:shadow-md hover:bg-blue-50 transition mb-2">
      選擇檔案
      <input type="file" class="hidden" accept="video/*,audio/*" @change="handleFileChange">
    </label>
    <p class="text-sm text-gray-500">支援 MP4, MP3, MOV, WAV 等格式</p>
  </div>
</template>
