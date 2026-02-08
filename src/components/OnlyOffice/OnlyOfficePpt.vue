<template>
  <div
    class="onlyoffice-ppt-wrapper"
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
const containerId = `office-ppt-${Math.random().toString(36).slice(2)}`;
let editorManager: EditorManager | null = null;

// 支持的文件类型
const SUPPORTED_TYPES = ['pptx', 'ppt', 'odp', 'ppsx'];

onMounted(async () => {
  try {
    const fileName = props.file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    if (!SUPPORTED_TYPES.includes(fileType)) {
      throw new Error(`OnlyOfficePpt 不支持文件类型: ${fileType}`);
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
    
    (window as any)[`_ppt_handlers_${containerId}`] = { ready: readyHandler, save: saveHandler };

  } catch (e) {
    console.error('OnlyOfficePpt init failed:', e);
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
  const handlers = (window as any)[`_ppt_handlers_${containerId}`];
  if (handlers) {
      onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.DOCUMENT_READY, handlers.ready);
      onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT, handlers.save);
      delete (window as any)[`_ppt_handlers_${containerId}`];
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
