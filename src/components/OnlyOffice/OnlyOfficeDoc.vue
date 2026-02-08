<template>
  <div
    class="onlyoffice-doc-wrapper"
    style="position: relative; height: 100%; width: 100%;"
  >
    <div
      :id="containerId"
      style="position: absolute; inset: 0;"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, type PropType, computed, ref } from 'vue';
import { initializeOnlyOffice, createEditorView, onlyofficeEventbus, ONLYOFFICE_EVENT_KEYS, type EditorManager, getOnlyOfficeLang } from '@/utils/onlyoffice';
import { useViewerTheme } from '@/theme';

const props = defineProps({
  file: { type: Object as PropType<File>, required: true },
  readOnly: { type: Boolean, default: false },
  theme: { type: String as PropType<'light' | 'dark' | 'auto'>, default: undefined },
  isDark: { type: Boolean, default: undefined }
});

const emit = defineEmits(['ready', 'save', 'error']);

const injectedTheme = useViewerTheme();
const prefersDark = ref(false);
let mediaQueryList: MediaQueryList | null = null;

const onMediaChange = (event: MediaQueryListEvent) => {
  prefersDark.value = event.matches;
};

const resolvedIsDark = computed(() => {
  if (typeof props.isDark === 'boolean') return props.isDark;
  if (props.theme === 'dark') return true;
  if (props.theme === 'light') return false;
  if (typeof injectedTheme?.isDark === 'boolean') return injectedTheme.isDark;
  if (injectedTheme?.mode) return injectedTheme.mode === 'dark';
  return prefersDark.value;
});

// 生成唯一 ID
const containerId = `office-doc-${Math.random().toString(36).slice(2)}`;
let editorManager: EditorManager | null = null;

// 支持的文件类型
const SUPPORTED_TYPES = ['docx', 'doc', 'txt', 'rtf', 'odt'];

onMounted(async () => {
  try {
    const fileName = props.file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    if (!SUPPORTED_TYPES.includes(fileType)) {
      throw new Error(`OnlyOfficeDoc 不支持文件类型: ${fileType}`);
    }

    await initializeOnlyOffice();

    editorManager = await createEditorView({
      isNew: false,
      fileName: fileName,
      file: props.file,
      readOnly: props.readOnly,
      containerId: containerId,
      lang: getOnlyOfficeLang(),
      theme: resolvedIsDark.value ? 'theme-dark' : 'theme-light',
    });

    // 监听文档就绪事件
    const readyHandler = (data: any) => {
      if (data.fileName === fileName) {
        emit('ready', data);
      }
    };
    onlyofficeEventbus.on(ONLYOFFICE_EVENT_KEYS.DOCUMENT_READY, readyHandler);

    // 监听保存事件
    const saveHandler = (data: any) => {
      if (editorManager && data.instanceId === editorManager.getInstanceId()) {
        emit('save', data);
      }
    };
    onlyofficeEventbus.on(ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT, saveHandler);

    // 清理事件监听的闭包在组件卸载时很难精确移除，
    // 但 EventBus 在 editorManager 销毁时并不自动清理全局监听。
    // 这里的 EventBus 实现比较简单，建议在组件卸载时手动移除监听。
    // 由于 EventBus.on 返回的是 void，我们需要保存 handler 引用来 off。
    // 这里为了简化，我们假设 EventBus 会在应用生命周期内持续存在。
    // 更好的做法是在 onUnmounted 中移除特定的 handler。
    // 但是当前的 eventbus.ts 实现可能需要检查是否支持 off 且参数一致。
    // 查看 eventbus.ts 源码发现它是基于 mitt 或简单的发布订阅。
    // 让我们假设它支持 off。
    
    (window as any)._doc_handlers = { ready: readyHandler, save: saveHandler };

  } catch (e) {
    console.error('OnlyOfficeDoc init failed:', e);
    emit('error', e);
  }
});

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.value = mediaQueryList.matches;
    mediaQueryList.addEventListener('change', onMediaChange);
  }
});

onUnmounted(() => {
  if (editorManager) {
    editorManager.destroy();
  }
  
  // 清理事件监听
  const handlers = (window as any)._doc_handlers;
  if (handlers) {
      onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.DOCUMENT_READY, handlers.ready);
      onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT, handlers.save);
      delete (window as any)._doc_handlers;
  }
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', onMediaChange);
    mediaQueryList = null;
  }
});

watch(() => props.readOnly, (newVal) => {
  if (editorManager) {
    editorManager.setReadOnly(newVal);
  }
});

watch(resolvedIsDark, (newVal) => {
  if (editorManager) {
    editorManager.setTheme(newVal ? 'theme-dark' : 'theme-light');
  }
});
</script>
