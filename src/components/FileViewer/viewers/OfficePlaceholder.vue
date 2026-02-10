<script setup lang="ts">
import { ref, watch, onMounted, shallowRef } from 'vue';
import { FileText, Loader2 } from 'lucide-vue-next';
import OnlyOfficeDoc from '@/components/OnlyOffice/OnlyOfficeDoc.vue';
import OnlyOfficePpt from '@/components/OnlyOffice/OnlyOfficePpt.vue';
import OnlyOfficeXls from '@/components/OnlyOffice/OnlyOfficeXls.vue';

const props = withDefaults(defineProps<{
  /** 文件URL */
  fileUrl?: string;
  /** 文件名 */
  fileName?: string;
  /** 文件数据 */
  fileData?: Blob | File;
  /** 主题暗色状态 (从父组件计算得出) */
  isDark?: boolean;
  useDefaultStyles?: boolean;
  /** Office 组件专属配置 */
  officeConfig?: {
    editable?: boolean;
  };
}>(), {
  useDefaultStyles: true,
  officeConfig: () => ({ editable: false })
});

const emit = defineEmits<{
  (e: 'load-complete', info: any): void;
  (e: 'load-error', error: any): void;
}>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const fileObject = ref<File | null>(null);
const activeComponent = shallowRef<any>(null);

const DOC_EXTS = ['docx', 'doc', 'txt', 'rtf', 'odt'];
const PPT_EXTS = ['pptx', 'ppt', 'odp', 'ppsx'];
const XLS_EXTS = ['xlsx', 'xls', 'ods', 'csv'];

const initFile = async () => {
  error.value = null;
  activeComponent.value = null;
  fileObject.value = null;

  const name = props.fileName || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (DOC_EXTS.includes(ext)) {
    activeComponent.value = OnlyOfficeDoc;
  } else if (PPT_EXTS.includes(ext)) {
    activeComponent.value = OnlyOfficePpt;
  } else if (XLS_EXTS.includes(ext)) {
    activeComponent.value = OnlyOfficeXls;
  } else {
    // 不支持的类型，回退到占位符
    return;
  }

  try {
    isLoading.value = true;
    let blob: Blob;

    if (props.fileData) {
      blob = props.fileData;
    } else if (props.fileUrl) {
      const response = await fetch(props.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      blob = await response.blob();
    } else {
      // 没有数据也没有URL，回退到占位符
      activeComponent.value = null;
      return;
    }

    // 构造 File 对象
    fileObject.value = new File([blob], name, { type: blob.type });
  } catch (err: any) {
    console.error('Office viewer init error:', err);
    error.value = err.message;
    // 发生错误时，回退到占位符显示错误信息
    activeComponent.value = null;
  } finally {
    isLoading.value = false;
  }
};

onMounted(initFile);
watch(() => [props.fileUrl, props.fileData, props.fileName], initFile);

const onReady = () => {
  emit('load-complete', { type: 'office' });
};

const onError = (err: any) => {
  console.error('OnlyOffice component error:', err);
  // 组件加载失败，回退到占位符
  activeComponent.value = null;
  error.value = err.message || '文档加载失败';
};

// 暴露子组件的 save 方法
const officeComponentRef = ref<any>(null);
const save = () => {
  if (officeComponentRef.value && typeof officeComponentRef.value.save === 'function') {
    officeComponentRef.value.save();
  } else {
    console.warn('OfficePlaceholder: Current component does not support save');
  }
};

defineExpose({
  save,
});
</script>

<template>
  <div
    class="office-viewer-wrapper"
    :class="{ 'fv-style-default': props.useDefaultStyles }"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="loading-state"
    >
      <Loader2 class="animate-spin loading-icon" />
      <span>正在加载文档资源...</span>
    </div>

    <!-- Active Viewer -->
    <component
      :is="activeComponent"
      v-else-if="activeComponent && fileObject"
      ref="officeComponentRef"
      :file="fileObject"
      :read-only="!props.officeConfig?.editable"
      :is-dark="props.isDark"
      @ready="onReady"
      @error="onError"
    />

    <!-- Fallback / Placeholder -->
    <div
      v-else
      class="office-placeholder"
    >
      <FileText class="office-icon" />
      <h3 class="office-title">
        {{ error ? '文档加载失败' : '暂不支持预览此类文件' }}
      </h3>
      <p class="office-desc">
        {{ error || 'Office文档目前暂不支持在线预览。' }}
        <span
          v-if="fileName"
          class="file-name-tag"
        >文件: {{ fileName }}</span>
      </p>
      <a 
        v-if="fileUrl" 
        :href="fileUrl" 
        download 
        class="download-btn"
      >
        下载文件
      </a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.office-viewer-wrapper.fv-style-default {
  width: 100%;
  height: 100%;
  position: relative;
}

.office-viewer-wrapper.fv-style-default .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--fv-text-secondary);
  gap: 1rem;
}

.office-viewer-wrapper.fv-style-default .loading-state .loading-icon {
  width: 2rem;
  height: 2rem;
  color: var(--fv-primary);
}

.office-viewer-wrapper.fv-style-default .office-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  background-color: var(--fv-bg-surface);
  color: var(--fv-text-secondary);
}

.office-viewer-wrapper.fv-style-default .office-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  color: var(--fv-primary);
}

.office-viewer-wrapper.fv-style-default .office-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--fv-text-main);
}

.office-viewer-wrapper.fv-style-default .office-desc {
  font-size: 0.875rem;
  text-align: center;
  max-width: 28rem;
  margin-bottom: 1rem;
  color: var(--fv-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.office-viewer-wrapper.fv-style-default .file-name-tag {
  font-family: monospace;
  background-color: var(--fv-bg-hover);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.office-viewer-wrapper.fv-style-default .download-btn {
  padding: 0.5rem 1rem;
  background-color: var(--fv-primary);
  color: var(--fv-text-inverse);
  border-radius: var(--fv-radius-md);
  font-size: 0.875rem;
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--fv-primary-hover);
  }
}
</style>
