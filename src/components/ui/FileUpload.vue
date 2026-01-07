<script setup lang="ts">
const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>();

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  
  if (!validTypes.includes(file.type)) {
    alert('不支援的檔案格式。請上傳 MP4, WebM 或 MOV。');
    input.value = '';
    return;
  }
  
  emit('file-selected', file);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
    <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
      選擇影片
      <input type="file" class="hidden" accept="video/*" @change="handleFileChange">
    </label>
    <p class="mt-2 text-sm text-gray-500">支援 MP4, WebM, MOV</p>
  </div>
</template>
