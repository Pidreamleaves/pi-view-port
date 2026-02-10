<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent, shallowRef } from 'vue';
import { useViewerTheme } from '@/theme';
import type { FileViewerError, FileLoadError, SupportedFileTypes } from '../../types';
import { UnsupportedError } from '../../types';
import { Maximize, Minimize, AlertCircle } from 'lucide-vue-next';

/**
 * 文件预览组件 Props
 */
const props = withDefaults(defineProps<{
  /** 文件URL地址 */
  fileUrl?: string;
  /** 文件原始数据 */
  // eslint-disable-next-line vue/require-default-prop
  fileData?: Blob | File;
  /** 文件名 */
  fileName?: string;
  /** 文件类型，可选，自动检测 */
  fileType?: string;
  /** 是否启用全屏模式 */
  fullscreen?: boolean;
  /** 主题模式：'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** 支持的文件类型配置 */
  supportedTypes?: SupportedFileTypes;
  /** 是否启用默认样式 */
  useDefaultStyles?: boolean;
  /** Office 组件专属配置 */
  officeConfig?: {
    /** 是否允许编辑 Office 文档 (仅 Office 有效) */
    editable?: boolean;
  };
}>(), {
  fileUrl: '',
  fileName: '',
  fileType: '',
  fullscreen: false,
  theme: 'auto',
  useDefaultStyles: true,
  officeConfig: () => ({ editable: false })
});

const emit = defineEmits<{
  /** 文件加载完成事件 */
  (e: 'load-complete', info: any): void;
  /** 文件加载失败事件 */
  (e: 'load-error', error: FileViewerError): void;
  /** 文件解析错误事件 */
  (e: 'parse-error', error: FileViewerError): void;
  /** 预览模式切换事件 */
  (e: 'mode-change', mode: string): void;
}>();

// 动态加载子组件
const PdfViewer = defineAsyncComponent(() => import('./viewers/PdfViewer.vue'));
const MarkdownViewer = defineAsyncComponent(() => import('./viewers/MarkdownViewer.vue'));
const HtmlViewer = defineAsyncComponent(() => import('./viewers/HtmlViewer.vue'));
const ImageViewer = defineAsyncComponent(() => import('./viewers/ImageViewer.vue'));
const VideoViewer = defineAsyncComponent(() => import('./viewers/VideoViewer.vue'));
const AudioViewer = defineAsyncComponent(() => import('./viewers/AudioViewer.vue'));
const OfficePlaceholder = defineAsyncComponent(() => import('./viewers/OfficePlaceholder.vue'));

const activeComponent = shallowRef<any>(null);
const detectedType = ref<string>('');
const error = ref<FileViewerError | null>(null);
const isFullscreen = ref(props.fullscreen || false);
const containerRef = ref<HTMLElement | null>(null);
const prefersDark = ref(false);
let mediaQueryList: MediaQueryList | null = null;

const onMediaChange = (event: MediaQueryListEvent) => {
  prefersDark.value = event.matches;
};

onMounted(() => {
  loadViewer();
  document.addEventListener('fullscreenchange', onFullscreenChange);
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.value = mediaQueryList.matches;
    mediaQueryList.addEventListener('change', onMediaChange);
  }
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', onMediaChange);
    mediaQueryList = null;
  }
});

/**
 * 计算当前是否应显示暗黑模式
 */
const injectedTheme = useViewerTheme();

const isDarkMode = computed(() => {
  if (props.theme === 'dark') return true;
  if (props.theme === 'light') return false;
  // auto 模式
  if (typeof injectedTheme?.isDark === 'boolean') return injectedTheme.isDark;
  if (injectedTheme?.mode) return injectedTheme.mode === 'dark';
  return prefersDark.value;
});

const resolvedTheme = computed(() => {
  if (props.theme === 'dark') return 'dark';
  if (props.theme === 'light') return 'light';
  return isDarkMode.value ? 'dark' : 'light';
});

/**
 * 根容器样式类
 */
const rootClasses = computed(() => ({
  'fv-file-viewer': true,
  'fv-fullscreen': isFullscreen.value,
  'fv-style-default': props.useDefaultStyles !== false
}));

const DEFAULT_SUPPORTED_TYPES: SupportedFileTypes = {
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    component: 'PdfViewer',
    enabled: true,
    description: 'PDF'
  },
  markdown: {
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown'],
    component: 'MarkdownViewer',
    enabled: true,
    description: 'Markdown'
  },
  html: {
    extensions: ['.html', '.htm'],
    mimeTypes: ['text/html'],
    component: 'HtmlViewer',
    enabled: true,
    description: 'HTML'
  },
  image: {
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
    component: 'ImageViewer',
    enabled: true,
    description: 'Image'
  },
  video: {
    extensions: ['.mp4', '.webm', '.ogg', '.mov', '.mkv'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'],
    component: 'VideoViewer',
    enabled: true,
    description: 'Video'
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4'],
    component: 'AudioViewer',
    enabled: true,
    description: 'Audio'
  },
  office: {
    extensions: ['.docx', '.doc', '.txt', '.rtf', '.odt', '.pptx', '.ppt', '.odp', '.ppsx', '.xlsx', '.xls', '.ods', '.csv'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ],
    component: 'OfficePlaceholder',
    enabled: true,
    description: 'Office'
  }
};

/**
 * 自动检测文件类型
 * @param url 文件URL
 * @param data 文件Blob数据
 * @param type 显式指定的文件类型
 */
const detectFileType = (url?: string, data?: Blob | File, type?: string): string => {
  const supportedTypes = props.supportedTypes || DEFAULT_SUPPORTED_TYPES;
  // 1. 显式指定类型
  if (type) return type;

  // 2. 根据 MIME type 检测
  if (data && data.type) {
    for (const key in supportedTypes) {
      if (supportedTypes[key]?.enabled !== false && supportedTypes[key].mimeTypes.includes(data.type)) {
        return key;
      }
    }
  }

  // 3. 根据文件扩展名检测
  // 优先使用 fileName，因为 URL 可能不包含扩展名或包含查询参数
  const filename = props.fileName || (data instanceof File ? data.name : '') || url;
  if (filename) {
    // 移除 URL 参数
    const cleanName = filename.split('?')[0].split('#')[0];
    const ext = '.' + cleanName.split('.').pop()?.toLowerCase();
    
    for (const key in supportedTypes) {
      if (supportedTypes[key]?.enabled !== false && supportedTypes[key].extensions.includes(ext)) {
        return key;
      }
    }
  }

  return 'unknown';
};

/**
 * 加载对应的预览组件
 */
const loadViewer = () => {
  error.value = null;
  const type = detectFileType(props.fileUrl, props.fileData, props.fileType);
  detectedType.value = type;

  switch (type) {
    case 'pdf':
      activeComponent.value = PdfViewer;
      break;
    case 'markdown':
      activeComponent.value = MarkdownViewer;
      break;
    case 'html':
      activeComponent.value = HtmlViewer;
      break;
    case 'image':
      activeComponent.value = ImageViewer;
      break;
    case 'video':
      activeComponent.value = VideoViewer;
      break;
    case 'audio':
      activeComponent.value = AudioViewer;
      break;
    case 'office':
      activeComponent.value = OfficePlaceholder;
      break;
    default: {
      activeComponent.value = null;
      const err = new UnsupportedError('不支持的文件类型');
      error.value = err;
      emit('load-error', err);
    }
  }
};

/**
 * 切换全屏模式
 */
const toggleFullscreen = () => {
  if (!containerRef.value) return;

  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
};

/**
 * 监听全屏状态变化
 */
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  emit('mode-change', isFullscreen.value ? 'fullscreen' : 'normal');
};

const onLoadComplete = (info: any) => {
  emit('load-complete', info);
};

const onLoadError = (err: FileLoadError) => {
  error.value = err;
  emit('load-error', err);
};

// 暴露当前预览组件的 save 方法（如果支持）
const activeViewerRef = ref<any>(null);
const save = () => {
  if (activeViewerRef.value && typeof activeViewerRef.value.save === 'function') {
    activeViewerRef.value.save();
  } else {
    console.warn('FileViewer: Current viewer does not support save method');
  }
};

defineExpose({
  save,
});

watch(() => [props.fileUrl, props.fileData, props.fileType], loadViewer);
</script>

<template>
  <div
    ref="containerRef"
    :class="rootClasses"
    :data-fv-theme="resolvedTheme"
  >
    <!-- 顶部工具栏 -->
    <div class="fv-toolbar">
      <div class="fv-file-info">
        <span
          class="fv-file-name"
          :title="fileName"
        >
          {{ fileName || '文件预览' }}
        </span>
        <span
          v-if="detectedType"
          class="fv-file-tag"
        >
          {{ detectedType }}
        </span>
      </div>
      
      <div class="fv-actions">
        <button 
          class="fv-icon-btn" 
          :title="isFullscreen ? '退出全屏' : '全屏'"
          @click="toggleFullscreen"
        >
          <Minimize
            v-if="isFullscreen"
            class="icon"
          />
          <Maximize
            v-else
            class="icon"
          />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="fv-content">
      <!-- 错误提示 -->
      <div
        v-if="error"
        class="fv-error-state"
      >
        <AlertCircle class="fv-error-icon" />
        <h3 class="fv-error-title">
          {{ error.message }}
        </h3>
        <p class="fv-error-desc">
          {{ error.details || '无法预览此文件' }}
        </p>
      </div>

      <!-- 子组件渲染 -->
      <component 
        :is="activeComponent"
        v-if="activeComponent && !error"
        ref="activeViewerRef"
        :file-url="fileUrl"
        :file-data="fileData"
        :file-name="fileName"
        :is-dark="isDarkMode"
        :use-default-styles="props.useDefaultStyles"
        :office-config="props.officeConfig"
        @load-complete="onLoadComplete"
        @load-error="onLoadError"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fv-file-viewer.fv-style-default {
  --fv-transition-duration: 200ms;
  --fv-bg-main: #f5f7fa;
  --fv-bg-surface: #ffffff;
  --fv-bg-panel: #ffffff;
  --fv-bg-toolbar: #ffffff;
  --fv-bg-hover: #f3f4f6;
  --fv-bg-active: #e5e7eb;
  --fv-bg-root: var(--fv-bg-main);
  --fv-bg-overlay: rgba(255, 255, 255, 0.8);
  --fv-bg-video: #000000;
  --fv-text-primary: #111827;
  --fv-text-secondary: #4b5563;
  --fv-text-disabled: #9ca3af;
  --fv-text-inverse: #ffffff;
  --fv-text-link: #2563eb;
  --fv-text-error: #ef4444;
  --fv-text-main: var(--fv-text-primary);
  --fv-border: #e5e7eb;
  --fv-border-focus: #3b82f6;
  --fv-primary: #3b82f6;
  --fv-primary-hover: #2563eb;
  --fv-primary-active: #1d4ed8;
  --fv-primary-soft: rgba(59, 130, 246, 0.1);
  --fv-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --fv-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --fv-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --fv-radius-sm: 0.125rem;
  --fv-radius-md: 0.375rem;
  --fv-radius-lg: 0.5rem;
  --fv-radius-full: 9999px;
  --fv-z-toolbar: 10;
  --fv-z-fullscreen: 1000;
  --fv-toolbar-overlay: rgba(0, 0, 0, 0.6);
  --fv-toolbar-text: #e5e7eb;
  --fv-toolbar-hover-bg: rgba(255, 255, 255, 0.2);
  --fv-divider-overlay: rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  background-color: var(--fv-bg-panel);
  border: 1px solid var(--fv-border);
  border-radius: var(--fv-radius-lg);
  overflow: hidden;
  position: relative;
  box-shadow: var(--fv-shadow-sm);
  width: 100%;
  height: 100%;

  &.fv-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: var(--fv-z-fullscreen);
    border-radius: 0;
    border: none;
  }
}

.fv-file-viewer.fv-style-default[data-fv-theme='dark'] {
  --fv-bg-main: #121212;
  --fv-bg-surface: #1e1e1e;
  --fv-bg-panel: #2c2c2c;
  --fv-bg-toolbar: #1e1e1e;
  --fv-bg-hover: #333333;
  --fv-bg-active: #404040;
  --fv-bg-overlay: rgba(0, 0, 0, 0.6);
  --fv-text-primary: #e5e7eb;
  --fv-text-secondary: #9ca3af;
  --fv-text-disabled: #6b7280;
  --fv-text-inverse: #111827;
  --fv-border: #404040;
  --fv-border-focus: #60a5fa;
  --fv-primary: #60a5fa;
  --fv-primary-hover: #3b82f6;
  --fv-primary-active: #2563eb;
  --fv-primary-soft: rgba(96, 165, 250, 0.2);
  --fv-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --fv-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --fv-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5);
}

.fv-file-viewer.fv-style-default .fv-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: var(--fv-bg-toolbar);
  border-bottom: 1px solid var(--fv-border);
  flex-shrink: 0;
}

.fv-file-viewer.fv-style-default .fv-file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
}

.fv-file-viewer.fv-style-default .fv-file-name {
  font-weight: 500;
  color: var(--fv-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.fv-file-viewer.fv-style-default .fv-file-tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background-color: var(--fv-primary-soft);
  color: var(--fv-primary);
  border-radius: var(--fv-radius-full);
  text-transform: uppercase;
}

.fv-file-viewer.fv-style-default .fv-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fv-file-viewer.fv-style-default .fv-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border-radius: var(--fv-radius-md);
  color: var(--fv-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: var(--fv-bg-hover);
    color: var(--fv-text-main);
  }
}

.fv-file-viewer.fv-style-default .fv-icon-btn .icon {
  width: 1rem;
  height: 1rem;
}

.fv-file-viewer.fv-style-default .fv-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: var(--fv-bg-root);
}

.fv-file-viewer.fv-style-default .fv-content :deep(> *) {
  width: 100%;
  height: 100%;
}

.fv-file-viewer.fv-style-default .fv-error-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: var(--fv-bg-surface);
  color: var(--fv-text-error);
  z-index: 20;
}

.fv-file-viewer.fv-style-default .fv-error-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
}

.fv-file-viewer.fv-style-default .fv-error-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--fv-text-main);
}

.fv-file-viewer.fv-style-default .fv-error-desc {
  font-size: 0.875rem;
  color: var(--fv-text-secondary);
}
</style>
