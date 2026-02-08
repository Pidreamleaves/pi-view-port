<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 基础代码高亮样式
import DOMPurify from 'dompurify';
import { ChevronRight, ChevronLeft } from 'lucide-vue-next';
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

const htmlContent = ref<string>('');
const toc = ref<Array<{ id: string; text: string; level: number }>>([]);
const loading = ref(true);
const isTocCollapsed = ref(false);

const toggleToc = () => {
  isTocCollapsed.value = !isTocCollapsed.value;
};

/**
 * 渲染 Markdown 内容
 * @param text Markdown 文本
 */
const renderMarkdown = async (text: string) => {
  // 重置目录
  toc.value = [];
  
  // 自定义渲染器以提取目录和支持代码高亮
  const renderer = new marked.Renderer();
  
  // 重写标题渲染以收集目录
  renderer.heading = function(this: any, { tokens, depth }: any) {
    const text = this.parser.parseInline(tokens);
    // 使用 Unicode 属性转义支持中文等非 ASCII 字符
    // \p{L} 匹配任何语言的字母，\p{N} 匹配数字
    const escapedText = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || `heading-${Math.random().toString(36).substr(2, 9)}`;
    
    // 添加到目录
    toc.value.push({
      id: escapedText,
      text: text.replace(/<[^>]*>?/gm, ''), // 简单的去除 HTML 标签
      level: depth
    });
    
    return `
            <h${depth} id="${escapedText}">
              ${text}
            </h${depth}>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true
  });

  const rawHtml = await marked.parse(text);
  // 净化 HTML 防止 XSS
  const cleanHtml = DOMPurify.sanitize(rawHtml as string);
  htmlContent.value = cleanHtml;
  
  // 渲染后高亮代码块
  nextTick(() => {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  });

  emit('load-complete', {
    name: props.fileName,
    type: 'markdown'
  });
};

/**
 * 加载内容
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
        throw new Error(`Failed to load Markdown: ${response.statusText}`);
      }
      content = await response.text();
    }

    if (content) {
      await renderMarkdown(content);
      console.log('[FileViewer] Markdown content loaded and rendered');
    }
  } catch (err) {
    console.error('[FileViewer] Markdown load error:', err);
    emit('load-error', new FileLoadError('Markdown加载失败', err));
  } finally {
    loading.value = false;
  }
};

/**
 * 滚动到指定标题
 * @param id 标题ID
 */
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

watch(() => [props.fileUrl, props.fileData], loadContent);

onMounted(() => {
  loadContent();
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="md-viewer"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <div
      v-if="loading"
      class="md-loading"
    >
      <div class="spinner" />
    </div>
    
    <!-- 内容区域 -->
    <div class="md-content">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="markdown-body"
        v-html="htmlContent"
      />
    </div>

    <!-- 目录侧边栏 -->
    <div
      v-if="toc.length > 0"
      class="md-toc-wrapper"
      :class="{ collapsed: isTocCollapsed }"
    >
      <button 
        class="toc-toggle-btn"
        title="切换目录"
        @click="toggleToc"
      >
        <ChevronLeft
          v-if="isTocCollapsed"
          class="icon"
        />
        <ChevronRight
          v-else
          class="icon"
        />
      </button>

      <div class="md-toc">
        <h3 class="toc-title">
          目录
        </h3>
        <ul class="toc-list">
          <li
            v-for="(item, index) in toc"
            :key="index"
            :class="['toc-item', `level-${item.level}`]"
          >
            <a
              href="#"
              class="toc-link"
              @click.prevent="scrollToHeading(item.id)"
            >
              {{ item.text }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.md-viewer.fv-style-default {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: var(--fv-bg-root);
  position: relative;
  overflow: hidden;
}

.md-viewer.fv-style-default .md-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fv-bg-overlay);
  z-index: 10;
}

.md-viewer.fv-style-default .md-loading .spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid transparent;
  border-top-color: var(--fv-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.md-viewer.fv-style-default .md-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  min-width: 0;
}

/* Markdown Typography */
.md-viewer.fv-style-default :deep(.markdown-body) {
  color: var(--fv-text-main);
  line-height: 1.6;
  max-width: 100%;

  h1, h2, h3, h4, h5, h6 {
    color: var(--fv-text-main);
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.25;
  }

  h1 { font-size: 2em; border-bottom: 1px solid var(--fv-border); padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid var(--fv-border); padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }

  p {
    margin-bottom: 1em;
  }

  a {
    color: var(--fv-text-link);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  ul, ol {
    padding-left: 2em;
    margin-bottom: 1em;
  }

  ul { list-style-type: disc; }
  ol { list-style-type: decimal; }

  blockquote {
    margin: 0 0 1em;
    padding: 0 1em;
    color: var(--fv-text-secondary);
    border-left: 0.25em solid var(--fv-border);
  }

  pre {
    background-color: var(--fv-bg-panel);
    padding: 1rem;
    border-radius: var(--fv-radius-md);
    overflow: auto;
    margin-bottom: 1em;
  }

  code {
    font-family: monospace;
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    background-color: var(--fv-bg-hover);
    border-radius: var(--fv-radius-sm);
  }

  pre code {
    background-color: transparent;
    padding: 0;
  }
  
  img {
    max-width: 100%;
    border-radius: var(--fv-radius-md);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
    
    th, td {
      border: 1px solid var(--fv-border);
      padding: 0.5rem;
    }
    
    th {
      background-color: var(--fv-bg-panel);
      font-weight: 600;
    }
  }
}

.md-viewer.fv-style-default .md-toc-wrapper {
  position: relative;
  width: 16rem;
  border-left: 1px solid var(--fv-border);
  background-color: var(--fv-bg-panel);
  transition: width 0.3s ease;
  flex-shrink: 0;
  
  &.collapsed {
    width: 0;
    border-left: none;
    
    .md-toc {
      opacity: 0;
      visibility: hidden;
    }
    
    .toc-toggle-btn {
      right: 100%;
      border-right: 1px solid var(--fv-border);
      border-left: none;
      border-radius: var(--fv-radius-md) 0 0 var(--fv-radius-md);
    }
  }
  
  /* Small screens: overlay or hidden by default? 
     Requirement: collapsible. 
     We can make it slide out.
  */
  @media (max-width: 768px) {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 20;
    box-shadow: var(--fv-shadow-lg);
    
    &.collapsed {
      width: 0;
      /* Button stays visible to open it */
      .toc-toggle-btn {
        right: 0; /* Align with right edge when collapsed (0 width) */
        left: auto;
        transform: translateX(-100%) translateY(-50%); /* Move left by its own width */
        border-radius: var(--fv-radius-md) 0 0 var(--fv-radius-md);
      }
    }
  }
}

.md-viewer.fv-style-default .toc-toggle-btn {
  position: absolute;
  top: 50%;
  right: 100%;
  transform: translateY(-50%);
  width: 20px;
  height: 40px;
  background-color: var(--fv-bg-panel);
  border: 1px solid var(--fv-border);
  border-right: none;
  border-radius: var(--fv-radius-md) 0 0 var(--fv-radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 30;
  color: var(--fv-text-secondary);
  box-shadow: -2px 0 4px rgba(0,0,0,0.05); /* Add shadow to ensure visibility */
  
  &:hover {
    background-color: var(--fv-bg-hover);
    color: var(--fv-text-primary);
  }
  
  .icon {
    width: 16px;
    height: 16px;
  }
}

.md-viewer.fv-style-default .md-toc {
  width: 16rem; /* Fixed width for inner content */
  height: 100%;
  padding: 1rem;
  overflow: auto;
  transition: opacity 0.2s;
}

.md-viewer.fv-style-default .toc-title {
  font-weight: bold;
  margin-bottom: 1rem;
  color: var(--fv-text-main);
}

.md-viewer.fv-style-default .toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.md-viewer.fv-style-default .toc-item {
  margin-bottom: 0.5rem;
  
  &.level-1 { padding-left: 0; }
  &.level-2 { padding-left: 1rem; }
  &.level-3 { padding-left: 2rem; }
}

.md-viewer.fv-style-default .toc-link {
  color: var(--fv-text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &:hover {
    color: var(--fv-text-link);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
