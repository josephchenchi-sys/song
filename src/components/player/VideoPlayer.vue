<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  src: string;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

const play = () => videoRef.value?.play();
const pause = () => videoRef.value?.pause();
const setTime = (time: number) => {
    if (videoRef.value) videoRef.value.currentTime = time;
};
const getTime = () => videoRef.value?.currentTime || 0;

defineExpose({
    play,
    pause,
    setTime,
    getTime,
    videoRef
});
</script>

<template>
  <div class="relative w-full bg-black rounded overflow-hidden aspect-video shadow-lg">
    <video 
      ref="videoRef"
      class="w-full h-full object-contain"
      :src="src"
      playsinline
      muted
    ></video>
  </div>
</template>
