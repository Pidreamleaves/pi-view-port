<script setup lang="ts">
import { ref, watch, onMounted, shallowRef, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { FileLoadError } from '../../../types';

// 配置 Worker 源
// 在真实项目中，应该使用构建后的 worker 脚本或通过 URL 引入
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

const pdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null);
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.0);
const loading = ref(false);
const rendering = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const textLayerRef = ref<HTMLDivElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

/**
 * 加载 PDF 文档
 */
const loadPdf = async () => {
  loading.value = true;
  try {
    let loadingTask;
    if (props.fileData) {
      const arrayBuffer = await props.fileData.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    } else if (props.fileUrl) {
      loadingTask = pdfjsLib.getDocument(props.fileUrl);
    } else {
      return;
    }

    const doc = await loadingTask.promise;
    pdfDoc.value = doc;
    totalPages.value = doc.numPages;
    currentPage.value = 1;
    
    emit('load-complete', {
      name: props.fileName,
      type: 'pdf',
      pages: totalPages.value
    });

    await renderPage(currentPage.value);
  } catch (err) {
    console.error('[FileViewer] PDF load error:', err);
    emit('load-error', new FileLoadError('PDF加载失败', err));
  } finally {
    loading.value = false;
  }
};

/**
 * 渲染指定页面
 * @param num 页码
 */
const renderPage = async (num: number) => {
  const doc = pdfDoc.value;
  if (!doc || rendering.value) return;
  
  rendering.value = true;
  try {
    const page = await doc.getPage(num);
    
    // Calculate scale to fit container width if needed
    let finalScale = scale.value;
    const viewport = page.getViewport({ scale: finalScale });
    
    // If container exists, check if we need to auto-fit
    if (containerRef.value) {
      // Basic auto-fit logic: if content is wider than container, scale down
      // Or we could implement a "fit-width" mode
      // For now, let's just use the manual scale, but ensure canvas is responsive via CSS
    }

    const canvas = canvasRef.value;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      
      await page.render(renderContext as any).promise;
    }
  } catch (err) {
    console.error('Page render error:', err);
  } finally {
    rendering.value = false;
  }
};

/**
 * 切换页面
 * @param delta 偏移量
 */
const changePage = async (delta: number) => {
  const newPage = currentPage.value + delta;
  if (newPage >= 1 && newPage <= totalPages.value) {
    currentPage.value = newPage;
    await renderPage(newPage);
  }
};

/**
 * 缩放页面
 * @param delta 缩放增量
 */
const zoom = async (delta: number) => {
  const newScale = Math.max(0.5, Math.min(3.0, scale.value + delta));
  scale.value = parseFloat(newScale.toFixed(1));
  await renderPage(currentPage.value);
};

// Handle resize
const handleResize = () => {
  // Debounce render if needed, for now just simple re-render if scale strategy depends on width
  // Currently we use fixed scale, but we might want to re-center or adjust
  // If we implemented "fit-width", we would update scale here and call renderPage
};

watch(() => [props.fileUrl, props.fileData], loadPdf);

onMounted(() => {
  loadPdf();
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    class="pdf-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <!-- 工具栏 -->
    <div class="pdf-toolbar">
      <div class="pdf-controls">
        <button 
          :disabled="currentPage <= 1 || rendering" 
          class="fv-icon-btn"
          @click="changePage(-1)"
        >
          <ChevronLeft class="icon" />
        </button>
        <span class="page-info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button 
          :disabled="currentPage >= totalPages || rendering" 
          class="fv-icon-btn"
          @click="changePage(1)"
        >
          <ChevronRight class="icon" />
        </button>
      </div>
      
      <div class="pdf-controls">
        <button 
          class="fv-icon-btn" 
          title="缩小"
          @click="zoom(-0.1)"
        >
          <ZoomOut class="icon" />
        </button>
        <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
        <button 
          class="fv-icon-btn" 
          title="放大"
          @click="zoom(0.1)"
        >
          <ZoomIn class="icon" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div
      ref="containerRef"
      class="pdf-content"
    >
      <div
        v-if="loading"
        class="pdf-loading"
      >
        <div class="spinner" />
      </div>
      
      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="pdf-canvas"
        />
        <div
          ref="textLayerRef"
          class="textLayer"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pdf-viewer.fv-style-default {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%; /* Ensure full width */
  background-color: var(--fv-bg-root);
  position: relative;
}

.pdf-viewer.fv-style-default .pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: var(--fv-bg-surface);
  border-bottom: 1px solid var(--fv-border);
  box-shadow: var(--fv-shadow-sm);
  z-index: 10;
  flex-shrink: 0; /* Prevent toolbar shrinking */
}

.pdf-viewer.fv-style-default .pdf-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pdf-viewer.fv-style-default .fv-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: var(--fv-radius-md);
  color: var(--fv-text-main);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: var(--fv-bg-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

}

.pdf-viewer.fv-style-default .fv-icon-btn .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.pdf-viewer.fv-style-default .page-info, 
.pdf-viewer.fv-style-default .zoom-info {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--fv-text-main);
  min-width: 3rem;
  text-align: center;
}

.pdf-viewer.fv-style-default .pdf-content {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 1rem;
  position: relative;
  width: 100%; /* Ensure content takes full width */
}

.pdf-viewer.fv-style-default .pdf-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fv-bg-overlay);
  z-index: 20;
}

.pdf-viewer.fv-style-default .pdf-loading .spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid transparent;
  border-top-color: var(--fv-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.pdf-viewer.fv-style-default .canvas-wrapper {
  position: relative;
  box-shadow: var(--fv-shadow-lg);
  background-color: var(--fv-bg-panel);
  width: fit-content;
  height: fit-content;
  /* Ensure canvas doesn't overflow without scroll */
  max-width: 100%; 
}

.pdf-viewer.fv-style-default .pdf-canvas {
  display: block;
  max-width: 100%; /* Responsive canvas */
  height: auto !important; /* Maintain aspect ratio */
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Text Layer styles */
.pdf-viewer.fv-style-default :deep(.textLayer) {
  position: absolute;
  text-align: initial;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0.2;
  line-height: 1.0;
}

.pdf-viewer.fv-style-default :deep(.textLayer > span) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.pdf-viewer.fv-style-default :deep(.textLayer ::selection) {
  background: var(--fv-primary);
}
</style>
