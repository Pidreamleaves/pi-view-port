<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
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

const videoRef = ref<HTMLVideoElement | null>(null);
const videoSrc = ref<string>('');
let objectUrl: string | null = null;

const cleanup = () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
};

const initVideo = () => {
  cleanup();
  
  if (props.fileUrl) {
    videoSrc.value = props.fileUrl;
  } else if (props.fileData) {
    objectUrl = URL.createObjectURL(props.fileData);
    videoSrc.value = objectUrl;
  } else {
    emit('load-error', new FileLoadError('无法加载视频', '未提供视频源'));
  }
};

const onLoadedMetadata = () => {
  emit('load-complete', {
    type: 'video',
    duration: videoRef.value?.duration,
    width: videoRef.value?.videoWidth,
    height: videoRef.value?.videoHeight
  });
};

const onError = (e: Event) => {
  const target = e.target as HTMLVideoElement;
  let errorMessage = '视频加载失败';
  let errorDetails = '未知错误';

  if (target.error) {
    switch (target.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        errorMessage = '播放中止';
        errorDetails = '用户中止了视频播放';
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        errorMessage = '网络错误';
        errorDetails = '网络问题导致视频加载失败';
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorMessage = '解码错误';
        errorDetails = '视频已损坏或格式不支持';
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = '格式不支持';
        errorDetails = '不支持的视频格式或服务器无法识别';
        break;
    }
  }

  console.error('[VideoViewer]', errorMessage, errorDetails);
  
  emit('load-error', new FileLoadError(errorMessage, errorDetails));
};

watch(() => [props.fileUrl, props.fileData], initVideo);

onMounted(() => {
  initVideo();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div
    class="video-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <video
      ref="videoRef"
      class="video-player"
      controls
      controlsList="nodownload"
      :src="videoSrc"
      @loadedmetadata="onLoadedMetadata"
      @error="onError"
    >
      您的浏览器不支持 video 标签。
    </video>
  </div>
</template>

<style lang="scss" scoped>
.video-viewer.fv-style-default {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fv-bg-video);
  overflow: hidden; /* Ensure content doesn't overflow */
}

.video-viewer.fv-style-default .video-player {
  width: 100%;
  height: 100%;
  outline: none;
  object-fit: contain; 
}
</style>
