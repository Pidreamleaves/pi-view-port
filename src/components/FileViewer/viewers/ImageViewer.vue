<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-vue-next';
import { FileLoadError } from '../../../types';

const props = withDefaults(defineProps<{
  /** 文件URL */
  fileUrl?: string;
  /** 文件数据 */
  fileData?: Blob | File;
  /** 文件名 */
  fileName?: string;
  /** 主题模式：'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** 主题暗色状态 */
  isDark?: boolean;
  useDefaultStyles?: boolean;
}>(), {
  useDefaultStyles: true
});

const emit = defineEmits<{
  /** 加载完成事件 */
  (e: 'load-complete', info: any): void;
  /** 加载失败事件 */
  (e: 'load-error', error: FileLoadError): void;
}>();

const imageUrl = ref<string>('');
const scale = ref(1);
const rotation = ref(0);
const dragging = ref(false);
const position = ref({ x: 0, y: 0 });
const startPosition = ref({ x: 0, y: 0 });
const loading = ref(true);

/**
 * 计算图片的变换样式
 */
const transformStyle = computed(() => {
  return {
    transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
    transition: dragging.value ? 'none' : 'transform 0.2s ease-out'
  };
});

/**
 * 加载图片
 */
const loadImage = async () => {
  loading.value = true;
  try {
    if (props.fileData) {
      imageUrl.value = URL.createObjectURL(props.fileData);
    } else if (props.fileUrl) {
      imageUrl.value = props.fileUrl;
    }
    
    // 预加载图片以检查有效性
    const img = new Image();
    img.onload = () => {
      loading.value = false;
      emit('load-complete', {
        name: props.fileName,
        type: 'image',
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = (err) => {
      loading.value = false;
      console.error('[FileViewer] Image load error:', err);
      emit('load-error', new FileLoadError('图片加载失败', err));
    };
    img.src = imageUrl.value;
    
  } catch (err) {
    loading.value = false;
    emit('load-error', new FileLoadError('图片加载失败', err));
  }
};

/**
 * 缩放图片
 * @param delta 缩放增量
 */
const zoom = (delta: number) => {
  const newScale = scale.value + delta;
  if (newScale >= 0.1 && newScale <= 5) {
    scale.value = parseFloat(newScale.toFixed(1));
  }
};

/**
 * 旋转图片
 * @param deg 旋转角度
 */
const rotate = (deg: number) => {
  rotation.value = (rotation.value + deg) % 360;
};

/**
 * 重置图片状态
 */
const reset = () => {
  scale.value = 1;
  rotation.value = 0;
  position.value = { x: 0, y: 0 };
};

// 拖拽逻辑
const startDrag = (e: MouseEvent) => {
  dragging.value = true;
  startPosition.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  };
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (dragging.value) {
    position.value = {
      x: e.clientX - startPosition.value.x,
      y: e.clientY - startPosition.value.y
    };
  }
};

const stopDrag = () => {
  dragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
};

watch(() => [props.fileUrl, props.fileData], loadImage);

onMounted(() => {
  loadImage();
});
</script>

<template>
  <div
    class="image-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <!-- 浮动工具栏 -->
    <div class="img-toolbar">
      <button
        class="fv-icon-btn dark"
        title="缩小"
        @click="zoom(-0.1)"
      >
        <ZoomOut class="icon" />
      </button>
      <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
      <button
        class="fv-icon-btn dark"
        title="放大"
        @click="zoom(0.1)"
      >
        <ZoomIn class="icon" />
      </button>
      <div class="divider" />
      <button
        class="fv-icon-btn dark"
        title="向左旋转"
        @click="rotate(-90)"
      >
        <RotateCcw class="icon" />
      </button>
      <button
        class="fv-icon-btn dark"
        title="向右旋转"
        @click="rotate(90)"
      >
        <RotateCw class="icon" />
      </button>
      <div class="divider" />
      <button
        class="fv-icon-btn dark reset-btn"
        title="重置"
        @click="reset"
      >
        重置
      </button>
    </div>

    <!-- 图片容器 -->
    <div 
      class="img-container"
      @mousedown="startDrag"
    >
      <div
        v-if="loading"
        class="loading-text"
      >
        Loading...
      </div>
      <img 
        v-if="imageUrl && !loading"
        :src="imageUrl" 
        alt="Preview" 
        class="preview-img"
        :style="transformStyle"
        draggable="false"
      >
    </div>
  </div>
</template>

<style lang="scss" scoped>
.image-viewer.fv-style-default {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--fv-bg-root);
  /* Use flex to center image container */
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-viewer.fv-style-default .img-toolbar {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--fv-toolbar-overlay);
  backdrop-filter: blur(4px);
  border-radius: var(--fv-radius-lg);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 10;
}

.image-viewer.fv-style-default .fv-icon-btn.dark {
  color: var(--fv-toolbar-text);
}

.image-viewer.fv-style-default .fv-icon-btn.dark:hover {
  color: var(--fv-text-inverse);
  background-color: var(--fv-toolbar-hover-bg);
}

.image-viewer.fv-style-default .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.image-viewer.fv-style-default .zoom-text {
  color: var(--fv-toolbar-text);
  font-size: 0.75rem;
  width: 2rem;
  text-align: center;
}

.image-viewer.fv-style-default .divider {
  width: 1px;
  height: 1rem;
  background-color: var(--fv-divider-overlay);
}

.image-viewer.fv-style-default .reset-btn {
  font-size: 0.75rem;
  padding: 0 0.5rem;
}

.image-viewer.fv-style-default .img-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
}

.image-viewer.fv-style-default .loading-text {
  color: var(--fv-text-secondary);
}

.image-viewer.fv-style-default .preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease-out;
  user-select: none;
  /* Prevent image from overflowing initially */
  display: block; 
}
</style>
