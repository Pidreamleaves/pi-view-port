/**
 * OnlyOffice 服务客户端 SDK
 * 用于与 OnlyOffice 服务页面（iframe）通信
 */

import { convertBinToDocument, FILE_TYPE, ONLYOFFICE_LANG_KEY, getCurrentLang, setCurrentLang } from './index';

export interface CreateEditorOptions {
  fileName: string;
  file?: File; // File 对象
  readOnly?: boolean;
  lang?: string;
  containerId?: string;
}

export interface ExportOptions {
  // 是否自动下载文件，默认为 false
  download?: boolean;
  // 目标文件类型（用于转换），如果不提供则使用原文件类型
  targetFileType?: keyof typeof FILE_TYPE;
}

export interface EditorInstance {
  containerId: string;
  instanceId: string;
  setReadOnly: (readOnly: boolean) => Promise<void>;
  // 导出文档，可以自动转换格式并下载
  export: (options?: ExportOptions) => Promise<{
    fileName: string;
    fileType: string;
    binData: ArrayBuffer;
    data?: Uint8Array; // 转换后的文档数据（如果指定了 targetFileType）
    media?: Record<string, string>;
  }>;
  destroy: () => Promise<void>;
}

export type EventCallback = (data: any) => void;

export type MessageType = 
  | 'SERVICE_READY'
  | 'CREATE_EDITOR'
  | 'SET_READ_ONLY'
  | 'EXPORT'
  | 'DESTROY'
  | 'DOCUMENT_READY'
  | 'LOADING_CHANGE'
  | 'SAVE_DOCUMENT'
  | 'ERROR';

export interface ServiceMessage {
  type: MessageType;
  requestId?: string;
  data?: any;
  error?: string;
}

export class OnlyOfficeServiceClient {
  // 静态常量，通过类访问
  static readonly FILE_TYPE = FILE_TYPE;
  static readonly ONLYOFFICE_LANG_KEY = ONLYOFFICE_LANG_KEY;

  private iframe: HTMLIFrameElement | null = null;
  private iframeUrl: string;
  private ready: boolean = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;
  private pendingRequests: Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private requestIdCounter: number = 0;

  constructor(iframeUrl: string = '/onlyoffice-service') {
    this.iframeUrl = iframeUrl;
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    // 只在浏览器环境中设置消息监听器
    if (typeof window !== 'undefined') {
      this.setupMessageListener();
    }
  }

  /**
   * 初始化 iframe
   * @param iframe - iframe 元素，init 方法会设置其 src URL
   */
  async init(iframe: HTMLIFrameElement): Promise<void> {
    if (this.iframe) {
      return;
    }

    this.iframe = iframe;
    // 设置 iframe 的 src URL
    this.iframe.src = this.iframeUrl;

    // 设置消息监听器（如果还没设置）
    this.setupMessageListener();

    // 等待服务就绪
    await this.readyPromise;
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent<ServiceMessage>) => {
      // 验证消息来源（可选，根据实际需求调整）
      // if (event.origin !== window.location.origin) return;

      const message = event.data;
      if (!message || !message.type) return;

      // 处理服务就绪消息
      if (message.type === 'SERVICE_READY') {
        this.ready = true;
        if (this.readyResolve) {
          this.readyResolve();
          this.readyResolve = null;
        }
        return;
      }

      // 处理请求响应
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const request = this.pendingRequests.get(message.requestId)!;
        clearTimeout(request.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          request.reject(new Error(message.error));
        } else {
          request.resolve(message.data);
        }
        return;
      }

      // 处理事件消息
      if (message.type === 'DOCUMENT_READY' || 
          message.type === 'LOADING_CHANGE' || 
          message.type === 'SAVE_DOCUMENT') {
        const listeners = this.eventListeners.get(message.type);
        if (listeners) {
          listeners.forEach(callback => callback(message.data));
        }
      }
    });
  }

  /**
   * 发送消息到服务页面
   */
  private async sendMessage(type: MessageType, data?: any, timeout: number = 30000): Promise<any> {

    if (!this.ready) {
      await this.readyPromise;
    }

    if (!this.iframe || !this.iframe.contentWindow) {
      throw new Error('Iframe not initialized');
    }

    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      this.iframe!.contentWindow!.postMessage({
        type,
        requestId,
        data,
      }, '*');
    });
  }

  /**
   * 创建编辑器
   */
  async createEditor(options: CreateEditorOptions): Promise<EditorInstance> {
    // 将 File 对象转换为 ArrayBuffer
    let fileData: ArrayBuffer | undefined;
    if (options.file) {
      fileData = await options.file.arrayBuffer();
    }

    const result = await this.sendMessage('CREATE_EDITOR', {
      fileName: options.fileName,
      fileData: fileData ? Array.from(new Uint8Array(fileData)) : undefined,
      isNew: !options.file,
      readOnly: options.readOnly ?? false,
      lang: options.lang ?? 'en',
      containerId: options.containerId,
    });

    return {
      containerId: result.containerId,
      instanceId: result.instanceId,
      setReadOnly: (readOnly: boolean) => this.setReadOnly(result.instanceId, readOnly),
      export: (options?: ExportOptions) => this.export(result.instanceId, options),
      destroy: () => this.destroy(result.instanceId),
    };
  }

  /**
   * 切换只读模式
   */
  private async setReadOnly(instanceId: string, readOnly: boolean): Promise<void> {
    await this.sendMessage('SET_READ_ONLY', {
      instanceId,
      readOnly,
    });
  }

  /**
   * 导出文档
   */
  private async export(instanceId: string, options?: ExportOptions): Promise<{
    fileName: string;
    fileType: string;
    binData: ArrayBuffer;
    data?: Uint8Array;
    media?: Record<string, string>;
  }> {
    const result = await this.sendMessage('EXPORT', {
      instanceId,
    }, 60000); // 导出可能需要更长时间

    // 服务端返回的是数组，需要转换为 Uint8Array，再转换为 ArrayBuffer
    const uint8Array = new Uint8Array(result.binData);
    const binData = uint8Array.buffer;
    
    let convertedData: Uint8Array | undefined;
    
    // 如果需要转换格式
    if (options?.targetFileType) {
      const targetType = OnlyOfficeServiceClient.FILE_TYPE[options.targetFileType];
      const conversionResult = await convertBinToDocument(
        uint8Array,
        result.fileName,
        targetType,
        result.media
      );
      
      // 确保 data 是 Uint8Array 类型
      convertedData = conversionResult.data instanceof Uint8Array
        ? conversionResult.data
        : new Uint8Array(conversionResult.data as ArrayBuffer);
      
      // 如果设置了自动下载，则下载转换后的文件
      if (options.download) {
        this.downloadFile(convertedData, result.fileName, targetType);
      }
    } else if (options?.download) {
      // 如果没有转换，直接下载原始文件
      this.downloadFile(uint8Array, result.fileName, result.fileType);
    }
    
    return {
      fileName: result.fileName,
      fileType: result.fileType,
      binData,
      data: convertedData,
      media: result.media,
    };
  }

  /**
   * 下载文件
   */
  private downloadFile(data: Uint8Array, fileName: string, fileType: string): void {
    // 根据文件类型确定 MIME 类型
    const mimeTypes: Record<string, string> = {
      'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'DOC': 'application/msword',
      'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'XLS': 'application/vnd.ms-excel',
      'PPTX': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'PPT': 'application/vnd.ms-powerpoint',
      'CSV': 'text/csv',
      'TXT': 'text/plain',
    };
    
    const mimeType = mimeTypes[fileType] || 'application/octet-stream';
    // Uint8Array 可以直接用于 Blob，使用 ArrayBuffer 避免类型问题
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const blob = new Blob([buffer as ArrayBuffer], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 销毁编辑器
   */
  private async destroy(instanceId: string): Promise<void> {
    await this.sendMessage('DESTROY', {
      instanceId,
    });
  }

  /**
   * 监听事件
   */
  on(event: 'DOCUMENT_READY' | 'LOADING_CHANGE' | 'SAVE_DOCUMENT', callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 取消监听事件
   */
  off(event: 'DOCUMENT_READY' | 'LOADING_CHANGE' | 'SAVE_DOCUMENT', callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 获取当前语言
   */
  getCurrentLang(): 'zh' | 'en' {
    return getCurrentLang();
  }

  /**
   * 设置当前语言
   */
  setCurrentLang(lang: 'zh' | 'en'): void {
    setCurrentLang(lang);
  }

  /**
   * 销毁客户端（清理资源）
   */
  destroyClient(): void {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.ready = false;
    this.pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Client destroyed'));
    });
    this.pendingRequests.clear();
    this.eventListeners.clear();
  }
}

// 导出单例实例（可选）
export const onlyOfficeServiceClient = new OnlyOfficeServiceClient();

