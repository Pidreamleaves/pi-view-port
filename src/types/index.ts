/**
 * FileViewer 组件类型定义
 */

export interface ViewerConfig {
  /** 启用的文件类型列表 */
  enabledTypes?: string[];
  /** PDF 查看器配置 */
  pdf?: any;
  /** Markdown 查看器配置 */
  markdown?: any;
  /** HTML 查看器配置 */
  html?: any;
  /** 图片查看器配置 */
  image?: any;
}

export interface FileViewerProps {
  /** 文件 URL 地址 */
  fileUrl?: string;
  /** 文件原始数据 (Blob 或 File 对象) */
  fileData?: Blob | File;
  /** 文件类型 (可选，若不传则自动检测) */
  fileType?: string;
  /** 文件名 (可选，用于显示或类型检测) */
  fileName?: string;
  /** 是否启用全屏模式 */
  fullscreen?: boolean;
  /** 自定义配置项 */
  config?: ViewerConfig;
  /** 主题模式：'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** 主题暗色状态 */
  isDark?: boolean;
  /** 支持的文件类型配置 */
  supportedTypes?: SupportedFileTypes;
  /** 是否启用默认样式 */
  useDefaultStyles?: boolean;
}

export interface FileInfo {
  /** 文件 URL */
  url?: string;
  /** 文件名 */
  name: string;
  /** 文件类型 */
  type: string;
  /** 文件大小 (字节) */
  size?: number;
  /** 最后修改时间戳 */
  lastModified?: number;
}

export interface FileViewerErrorInterface {
  /** 错误类型 */
  type: 'load' | 'parse' | 'timeout' | 'unsupported' | 'component';
  /** 错误信息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 原始错误对象 */
  originalError?: Error;
}

/**
 * 文件预览器基础错误类
 */
export class FileViewerError extends Error {
  public type: string;
  public details?: any;
  public originalError?: Error;

  constructor(type: string, message: string, details?: any, originalError?: Error) {
    super(message);
    this.name = 'FileViewerError';
    this.type = type;
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * 文件加载错误
 */
export class FileLoadError extends FileViewerError {
  constructor(message: string, details?: any, originalError?: Error) {
    super('load', message, details, originalError);
  }
}

/**
 * 文件解析错误
 */
export class FileParseError extends FileViewerError {
  constructor(message: string, details?: any, originalError?: Error) {
    super('parse', message, details, originalError);
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends FileViewerError {
  constructor(message: string = '请求超时', details?: any) {
    super('timeout', message, details);
  }
}

/**
 * 不支持的文件类型错误
 */
export class UnsupportedError extends FileViewerError {
  constructor(message: string, details?: any) {
    super('unsupported', message, details);
  }
}

export interface FileTypeConfig {
  /** 支持的文件扩展名列表 */
  extensions: string[];
  /** 支持的 MIME 类型列表 */
  mimeTypes: string[];
  /** 对应的组件名称 */
  component: string;
  /** 是否启用 */
  enabled: boolean;
  /** 类型描述 */
  description: string;
}

export interface SupportedFileTypes {
  [key: string]: FileTypeConfig;
}
