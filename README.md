# pi-view-port

> 📖 English | [中文](README.zh.md)

A generic file preview component library based on Vue 3 + TypeScript.
Supports preview of PDF, Markdown, HTML, images, videos, audio, and **Office documents (Word, Excel, PPT)**.
Originally used for internal applications, now decoupled as an independent library to facilitate external application integration.

![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL-green?style=flat-square)

## Features

- **Multi-format Support**:
  - **Documents**: PDF (pdf.js), Markdown (marked), HTML
  - **Office**: Word (.docx), Excel (.xlsx), PPT (.pptx) (based on OnlyOffice core conversion)
  - **Multimedia**: Images, Video, Audio
- **Out of the Box**: Built-in UI toolbar, fullscreen toggle, error handling.
- **Theme Customization**: Supports Dark Mode and custom theme colors.
- **TypeScript**: Provides complete type definitions.

## Installation

```bash
npm install pi-view-port
# OR
yarn add pi-view-port
# OR
pnpm add pi-view-port
```

## Quick Start

### 1. Import Styles

Import the component styles in your entry file (e.g., `main.ts`):

```ts
import 'pi-view-port/style.css';
```

### 2. Resource Configuration

See **[OnlyOffice Resource Configuration](#onlyoffice-resource-configuration-important)** below for details.

### 3. Basic Usage

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

## OnlyOffice Resource Configuration (Important)

This component uses the WASM version of OnlyOffice for conversion and preview of Office documents. Since the resource files are large (~100MB), it is recommended to use the provided Vite plugin for automatic configuration.

### Method 1: Using Vite Plugin (Recommended, Zero Configuration)

Import and register the plugin in your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { piViewPortPlugin } from 'pi-view-port/vite';

export default defineConfig({
  plugins: [
    vue(),
    // Automatically handle OnlyOffice resources for dev server and production build
    piViewPortPlugin()
  ]
});
```

**Plugin Features:**
- **Development Environment**: Automatically intercepts resource requests, no need to manually copy files.
- **Production Build**: Automatically copies resources to `dist/packages/onlyoffice`.
- **Automatic Configuration**: The component automatically identifies the resource path, no need to call `setOnlyOfficeBaseUrl`.

### Method 2: Manual Copy (Traditional Way)

If you are not using Vite or cannot use the plugin, you can manually copy the resources.

1. **Copy Files**:
   Copy the `node_modules/pi-view-port/public/packages` folder to your project's `public/` directory.

   The structure after copying should look like this:
   ```
   your-project/
     public/
       packages/
         onlyoffice/
           7/
             ...
   ```

2. **Configure Path** (Optional):
   If your static resources are deployed in a non-root directory, you need to configure BaseUrl:

   ```ts
   import { setOnlyOfficeBaseUrl } from 'pi-view-port';

   // Default is '/packages/onlyoffice'
   setOnlyOfficeBaseUrl('/your-base-path/packages/onlyoffice');
   ```

## Component Props

### FileViewer

| Prop Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `fileUrl` | `string` | - | The URL address of the file |
| `fileData` | `Blob` \| `File` | - | Raw file data (prioritized over fileUrl) |
| `fileName` | `string` | - | File name, used for display and auxiliary type detection |
| `fileType` | `string` | - | Explicitly specify file type (e.g., 'pdf', 'docx'); automatically detected if not passed |
| `fullscreen` | `boolean` | `false` | Whether to start in fullscreen |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Theme mode |
| `isDark` | `boolean` | - | Force specify dark mode state |
| `useDefaultStyles` | `boolean` | `true` | Whether to enable default container styles |
| `officeConfig` | `object` | `{ editable: false }` | Office component exclusive configuration (see table below) |

### OfficeConfig Interface

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `editable` | `boolean` | `false` | Whether to enable edit mode (only valid for Office documents). Default is `false` (read-only preview). |

### Events

| Event Name | Description | Callback Parameters |
| :--- | :--- | :--- |
| `load-complete` | Triggered when file loads successfully | `info: any` |
| `load-error` | Triggered when file fails to load | `error: FileViewerError` |
| `mode-change` | Triggered when view mode switches (e.g., fullscreen) | `mode: string` |

## Advanced Usage

### Custom Theme

The component uses CSS variables to define colors; you can override these variables in the parent container:

```css
.my-viewer-container {
  --fv-primary: #ff0000; /* Change primary color */
  --fv-bg-main: #f0f0f0;
}
```

### Using Sub-components Only

If you don't need the complete `FileViewer` wrapper (toolbar, etc.), you can import sub-components separately:

```ts
import { OnlyOfficeDoc, OnlyOfficeXls } from 'pi-view-port';
```

## FAQ

**Q: Office documents show blank or 404 error?**
A: Please check the Network panel to confirm that OnlyOffice resources like `x2t.js`, `api.js` loaded successfully. Usually due to incorrect copying of `public/packages/onlyoffice` directory or incorrect `BaseUrl` configuration.

**Q: Is backend service support required?**
A: No. Office preview is based on WASM running in the frontend; all rendering logic is completed in the browser.

## Related Resources

- [OnlyOffice Documentation](https://help.onlyoffice.com/installation/desktop.aspx)
- [OnlyOffice Resource Config](https://help.onlyoffice.com/installation/desktop.aspx#config)
- [MVP OnlyOffice](https://github.com/electroluxcode/mvp-onlyoffice) - Reference implementation

## License

AGPL
