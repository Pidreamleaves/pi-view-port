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
import { onMounted, onUnmounted, watch, type PropType, ref } from 'vue';
import { initializeOnlyOffice, createEditorView, onlyofficeEventbus, ONLYOFFICE_EVENT_KEYS, type EditorManager, getOnlyOfficeLang } from '@/utils/onlyoffice';

const props = defineProps({
  file: { type: Object as PropType<File>, required: true },
  readOnly: { type: Boolean, default: true },
  isDark: { type: Boolean, default: false }
});

const emit = defineEmits(['ready', 'save', 'error']);

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
      theme: props.isDark ? 'theme-dark' : 'theme-light',
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

    // 保存 handler 引用用于清理
    eventHandlers = { ready: readyHandler, save: saveHandler };

  } catch (e) {
    console.error('OnlyOfficeDoc init failed:', e);
    emit('error', e);
  }
});

// 暴露保存方法
const save = () => {
  if (editorManager) {
    editorManager.export();
  } else {
    console.warn('OnlyOfficeDoc: save called but editorManager is not ready');
  }
};

defineExpose({
  save,
});

let eventHandlers: { ready: any, save: any } | null = null;

onUnmounted(() => {
  if (editorManager) {
    editorManager.destroy();
  }
  
  // 清理事件监听
  if (eventHandlers) {
    onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.DOCUMENT_READY, eventHandlers.ready);
    onlyofficeEventbus.off(ONLYOFFICE_EVENT_KEYS.SAVE_DOCUMENT, eventHandlers.save);
    eventHandlers = null;
  }
});

watch(() => props.readOnly, (newVal) => {
  if (editorManager) {
    editorManager.setReadOnly(newVal);
  }
});

watch(() => props.isDark, (newVal) => {
  if (editorManager) {
    editorManager.setTheme(newVal ? 'theme-dark' : 'theme-light');
  }
});
</script>
