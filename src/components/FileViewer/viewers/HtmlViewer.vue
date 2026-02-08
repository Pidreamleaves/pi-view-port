<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import DOMPurify from 'dompurify';
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

const sanitizedContent = ref<string>('');
const loading = ref(true);

/**
 * 加载 HTML 内容
 */
const loadContent = async () => {
  loading.value = true;
  try {
    let content = '';

    if (props.fileData) {
      content = await props.fileData.text();
    } else if (props.fileUrl) {
      const response = await fetch(props.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to load HTML: ${response.statusText}`);
      }
      content = await response.text();
    }

    if (content) {
      // 配置 DOMPurify 进行安全过滤
      const clean = DOMPurify.sanitize(content, {
        WHOLE_DOCUMENT: true,
        RETURN_DOM: false,
        ADD_TAGS: ['link', 'style'], // 允许样式
        ADD_ATTR: ['target'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
      });
      
      sanitizedContent.value = clean as string;
      console.log('[FileViewer] HTML content sanitized and loaded');
      emit('load-complete', {
        name: props.fileName,
        type: 'html'
      });
    }
  } catch (err) {
    console.error('[FileViewer] HTML load error:', err);
    emit('load-error', new FileLoadError('HTML加载失败', err));
  } finally {
    loading.value = false;
  }
};

watch(() => [props.fileUrl, props.fileData], loadContent);

onMounted(() => {
  loadContent();
});
</script>

<template>
  <div
    class="html-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <div
      v-if="loading"
      class="html-loading"
    >
      <div class="spinner" />
    </div>
    
    <iframe
      v-if="sanitizedContent"
      :srcdoc="sanitizedContent"
      class="html-iframe"
      sandbox="allow-same-origin"
      title="HTML Preview"
    />
  </div>
</template>

<style lang="scss" scoped>
.html-viewer.fv-style-default {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--fv-bg-root);
  position: relative;
}

.html-viewer.fv-style-default .html-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fv-bg-overlay);
  z-index: 10;
}

.html-viewer.fv-style-default .html-loading .spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid transparent;
  border-top-color: var(--fv-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.html-viewer.fv-style-default .html-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
