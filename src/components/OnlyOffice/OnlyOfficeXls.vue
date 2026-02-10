<template>
  <div
    class="onlyoffice-xls-wrapper"
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
const containerId = `office-xls-${Math.random().toString(36).slice(2)}`;
let editorManager: EditorManager | null = null;

// 支持的文件类型
const SUPPORTED_TYPES = ['xlsx', 'xls', 'ods', 'csv'];

onMounted(async () => {
  try {
    const fileName = props.file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    if (!SUPPORTED_TYPES.includes(fileType)) {
      throw new Error(`OnlyOfficeXls 不支持文件类型: ${fileType}`);
    }

    await initializeOnlyOffice();

    // 对于 CSV 文件，createEditorView 内部会调用 x2t.convertDocument，
    // 后者会自动检测并使用 SheetJS 进行转换。
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
    
    eventHandlers = { ready: readyHandler, save: saveHandler };

  } catch (e) {
    console.error('OnlyOfficeXls init failed:', e);
    emit('error', e);
  }
});

// 暴露保存方法
const save = () => {
  if (editorManager) {
    editorManager.export();
  } else {
    console.warn('OnlyOfficeXls: save called but editorManager is not ready');
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
