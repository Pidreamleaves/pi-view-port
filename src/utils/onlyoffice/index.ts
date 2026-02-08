// 统一导出 onlyoffice-comp 的所有公共 API

// 从 x2t.ts 导出
export { convertBinToDocument, createEditorView } from './lib/x2t';

// 从 utils.ts 导出
export { initializeOnlyOffice } from './lib/utils';

// 从 document-state.ts 导出
export {
  setDocmentObj,
  getDocmentObj,
  getOnlyOfficeLang,
  getCurrentLang,
  setCurrentLang,
} from './lib/document-state';

// 从 editor-manager.ts 导出
export { editorManager, editorManagerFactory, EditorManager } from './lib/editor-manager';

// 从 const.ts 导出
export {
  ONLYOFFICE_EVENT_KEYS,
  FILE_TYPE,
  ONLYOFFICE_ID,
  ONLYOFFICE_LANG_KEY,
  ONLYOFFICE_CONTAINER_CONFIG,
  setOnlyOfficeBaseUrl,
  ONLYOFFICE_BASE_URL,
} from './lib/const';

// 从 eventbus.ts 导出
export { onlyofficeEventbus } from './lib/eventbus';

export {
  onlyOfficeServiceClient,
  OnlyOfficeServiceClient,
  type CreateEditorOptions,
  type EditorInstance,
  type EventCallback,
  type MessageType,
  type ServiceMessage,
} from './service-client';
