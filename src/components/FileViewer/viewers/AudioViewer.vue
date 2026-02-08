<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Music } from 'lucide-vue-next';
import { FileLoadError } from '../../../types';

const props = withDefaults(defineProps<{
  fileUrl?: string;
  fileData?: Blob | File;
  fileName?: string;
  theme?: 'light' | 'dark' | 'auto';
  isDark?: boolean;
  useDefaultStyles?: boolean;
}>(), {
  useDefaultStyles: true
});

const emit = defineEmits<{
  (e: 'load-complete', info: any): void;
  (e: 'load-error', error: FileLoadError): void;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);
const audioSrc = ref<string>('');
let objectUrl: string | null = null;

const cleanup = () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
};

const initAudio = () => {
  cleanup();
  
  if (props.fileUrl) {
    audioSrc.value = props.fileUrl;
  } else if (props.fileData) {
    objectUrl = URL.createObjectURL(props.fileData);
    audioSrc.value = objectUrl;
  } else {
    emit('load-error', new FileLoadError('无法加载音频', '未提供音频源'));
  }
};

const onLoadedMetadata = () => {
  emit('load-complete', {
    type: 'audio',
    duration: audioRef.value?.duration
  });
};

const onError = (e: Event) => {
  const target = e.target as HTMLAudioElement;
  let errorMessage = '音频加载失败';
  let errorDetails = '未知错误';

  if (target.error) {
    switch (target.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        errorMessage = '播放中止';
        errorDetails = '用户中止了音频播放';
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        errorMessage = '网络错误';
        errorDetails = '网络问题导致音频加载失败';
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorMessage = '解码错误';
        errorDetails = '音频已损坏或格式不支持';
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = '格式不支持';
        errorDetails = '不支持的音频格式或服务器无法识别';
        break;
    }
  }

  console.error('[AudioViewer]', errorMessage, errorDetails);
  
  emit('load-error', new FileLoadError(errorMessage, errorDetails));
};

watch(() => [props.fileUrl, props.fileData], initAudio);

onMounted(() => {
  initAudio();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div
    class="audio-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <div class="audio-icon-wrapper">
      <Music class="audio-icon" />
    </div>
    <div class="audio-controls-wrapper">
      <audio
        ref="audioRef"
        class="audio-player"
        controls
        controlsList="nodownload"
        :src="audioSrc"
        @loadedmetadata="onLoadedMetadata"
        @error="onError"
      >
        您的浏览器不支持 audio 标签。
      </audio>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audio-viewer.fv-style-default {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--fv-bg-root);
  position: relative;
  overflow: hidden;
}

.audio-viewer.fv-style-default .audio-icon-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}

.audio-viewer.fv-style-default .audio-icon {
  width: 30%;
  height: 30%;
  max-width: 200px;
  max-height: 200px;
  min-width: 64px;
  min-height: 64px;
  color: var(--fv-text-secondary);
  opacity: 0.5;
  /* Make icon responsive */
  object-fit: contain;
}

.audio-viewer.fv-style-default .audio-controls-wrapper {
  padding: 1.5rem;
  background-color: var(--fv-bg-panel);
  border-top: 1px solid var(--fv-border);
  display: flex;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
}

.audio-viewer.fv-style-default .audio-player {
  width: 100%;
  max-width: 800px;
  height: 40px;
  outline: none;
}
</style>
