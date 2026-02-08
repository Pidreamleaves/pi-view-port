# pi-view-port

一个基于 Vue 3 + TypeScript 的通用文件预览组件库。
支持 PDF、Markdown、HTML、图片、视频、音频以及 **Office 文档 (Word, Excel, PPT)** 的预览。
原为内部应用使用，现解耦为独立库，方便外部应用集成。

![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL-green?style=flat-square)

## 特性

- **多格式支持**：
  - **文档**: PDF (pdf.js), Markdown (marked), HTML
  - **Office**: Word (.docx), Excel (.xlsx), PPT (.pptx) (基于 OnlyOffice 核心转换)
  - **多媒体**: 图片, 视频, 音频
- **开箱即用**: 内置 UI 工具栏、全屏切换、错误处理。
- **主题定制**: 支持深色模式 (Dark Mode) 和自定义主题色。
- **TypeScript**: 提供完整的类型定义。

## 安装

```bash
npm install pi-view-port
# 或者
yarn add pi-view-port
# 或者
pnpm add pi-view-port
```

## 快速开始

### 1. 引入样式

在你的入口文件 (如 `main.ts`) 中引入组件样式：

```ts
import 'pi-view-port/style.css';
```

### 2. 资源配置

详见下文 **[OnlyOffice 资源配置](#onlyoffice-资源配置-重要)**

### 3. 基本使用

```vue
<script setup lang="ts">
import { FileViewer } from 'pi-view-port';

const fileUrl = 'https://example.com/sample.pdf';
</script>

<template>
  <div style="height: 80vh;">
    <FileViewer 
      :file-url="fileUrl" 
      file-name="sample.pdf"
    />
  </div>
</template>
```

## OnlyOffice 资源配置 (重要)

本组件使用 OnlyOffice 的 WASM 版本进行 Office 文档的转换和预览。由于资源文件较大 (~100MB)，推荐使用我们提供的 Vite 插件进行自动配置。

### 方式一：使用 Vite 插件 (推荐，无感配置)

在你的 `vite.config.ts` 中引入并注册插件：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { piViewPortPlugin } from 'pi-view-port/vite';

export default defineConfig({
  plugins: [
    vue(),
    // 自动处理 OnlyOffice 资源的开发环境服务和生产环境复制
    piViewPortPlugin()
  ]
});
```

**插件功能：**
- **开发环境**：自动拦截资源请求，无需手动复制文件。
- **生产构建**：自动将资源复制到 `dist/packages/onlyoffice`。
- **自动配置**：组件会自动识别资源路径，无需调用 `setOnlyOfficeBaseUrl`。

### 方式二：手动复制 (传统方式)

如果你不使用 Vite 或无法使用插件，可以手动复制资源。

1. **复制文件**：
   将 `node_modules/pi-view-port/public/packages` 文件夹复制到你的项目的 `public/` 目录下。

   复制后的结构应如下所示：
   ```
   your-project/
     public/
       packages/
         onlyoffice/
           7/
             ...
   ```

2. **配置路径** (可选)：
   如果你的静态资源部署在非根目录，需要配置 BaseUrl：

   ```ts
   import { setOnlyOfficeBaseUrl } from 'pi-view-port';

   // 默认值为 '/packages/onlyoffice'
   setOnlyOfficeBaseUrl('/your-base-path/packages/onlyoffice');
   ```

## 组件接口 (Props)

### FileViewer

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `fileUrl` | `string` | - | 文件的 URL 地址 |
| `fileData` | `Blob` | `File` | - | 文件的原始数据 (优先于 fileUrl) |
| `fileName` | `string` | - | 文件名，用于显示和辅助类型检测 |
| `fileType` | `string` | - | 显式指定文件类型 (如 'pdf', 'docx')，若不传则自动检测 |
| `fullscreen` | `boolean` | `false` | 是否初始全屏 |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 主题模式 |
| `isDark` | `boolean` | - | 强制指定暗色模式状态 |
| `useDefaultStyles` | `boolean` | `true` | 是否启用默认的容器样式 |
| `officeConfig` | `object` | `{ editable: false }` | Office 组件专属配置 (详见下表) |

### OfficeConfig 接口

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `editable` | `boolean` | `false` | 是否开启编辑模式 (仅 Office 文档有效)。默认为 `false` (只读预览)。 |

### Events

| 事件名 | 说明 | 回调参数 |
| :--- | :--- | :--- |
| `load-complete` | 文件加载成功时触发 | `info: any` |
| `load-error` | 文件加载失败时触发 | `error: FileViewerError` |
| `mode-change` | 视图模式切换时触发 (如全屏) | `mode: string` |

## 高级用法

### 自定义主题

组件使用 CSS 变量定义颜色，你可以在父容器覆盖这些变量：

```css
.my-viewer-container {
  --fv-primary: #ff0000; /* 修改主色调 */
  --fv-bg-main: #f0f0f0;
}
```

### 仅使用子组件

如果你不需要完整的 `FileViewer` 包装（工具栏等），可以单独引入子组件：

```ts
import { OnlyOfficeDoc, OnlyOfficeXls } from 'pi-view-port';
```

## 常见问题

**Q: Office 文档显示空白或报错 404？**
A: 请检查 Network 面板，确认 `x2t.js`, `api.js` 等 OnlyOffice 资源是否加载成功。通常是因为未正确复制 `public/packages/onlyoffice` 目录或未配置正确的 `BaseUrl`。

**Q: 需要后端服务支持吗？**
A: 不需要。Office 预览基于 WASM 在前端运行，所有渲染逻辑均在浏览器中完成。

## 相关资源

- [OnlyOffice 文档](https://help.onlyoffice.com/installation/desktop.aspx)
- [OnlyOffice 资源配置](https://help.onlyoffice.com/installation/desktop.aspx#config)
- [MVP OnlyOffice](https://github.com/electroluxcode/mvp-onlyoffice) - 参考相关实现


## License

AGPL
