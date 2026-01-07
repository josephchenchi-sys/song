<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isMobile = ref(false);

onMounted(() => {
    isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
});
</script>

<template>
  <div v-if="isMobile" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
    <p class="font-bold">注意</p>
    <p>建議使用桌面版瀏覽器以獲得最佳效能與體驗。</p>
  </div>
</template>
