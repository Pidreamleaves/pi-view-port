import type { Plugin, ResolvedConfig } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import serveStatic from 'serve-static';
import { fileURLToPath } from 'url';

interface PiViewPortPluginOptions {
  /**
   * OnlyOffice 资源的基础路径
   * @default '/packages/onlyoffice'
   */
  baseUrl?: string;
  
  /**
   * 构建时输出目录
   * @default 'packages/onlyoffice' (相对于 dist)
   */
  outDir?: string;
}

// Robustly get __dirname in both CJS and ESM environments
function getDirname() {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  return path.dirname(fileURLToPath(import.meta.url));
}

export function piViewPortPlugin(options: PiViewPortPluginOptions = {}): Plugin {
  const baseUrl = options.baseUrl || '/packages/onlyoffice';
  const outDir = options.outDir || 'packages/onlyoffice';
  
  let config: ResolvedConfig;

  // Function to resolve resource path
  const resolveResourcePath = () => {
    let resourcePath = '';
    
    // 1. Try resolving relative to CWD (useful for development of the package itself)
    const devPublicPath = path.resolve(process.cwd(), 'public/packages/onlyoffice');
    if (fs.existsSync(devPublicPath)) {
      console.log('[pi-view-port] Found resources in CWD:', devPublicPath);
      return devPublicPath;
    }

    // 2. Try resolving relative to this plugin file (for consumers of the package)
    try {
      const currentFileDir = getDirname();
      // Assuming structure: node_modules/pi-view-port/dist/vite.mjs
      // Resources at: node_modules/pi-view-port/public/packages/onlyoffice
      // So path is: ../public/packages/onlyoffice
      const potentialPath = path.resolve(currentFileDir, '../public/packages/onlyoffice');
      
      console.log('[pi-view-port] Looking for resources at:', potentialPath);
      
      if (fs.existsSync(potentialPath)) {
        console.log('[pi-view-port] Found resources at:', potentialPath);
        return potentialPath;
      }
      
      // Fallback: try one level up if structure is different
      const potentialPathUp = path.resolve(currentFileDir, '../../public/packages/onlyoffice');
      if (fs.existsSync(potentialPathUp)) {
         console.log('[pi-view-port] Found resources at:', potentialPathUp);
         return potentialPathUp;
      }

    } catch (e) {
      console.warn('[pi-view-port] Error resolving path relative to plugin:', e);
    }
    
    return '';
  };

  return {
    name: 'vite-plugin-pi-view-port',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    
    configureServer(server) {
      const resourcePath = resolveResourcePath();

      if (resourcePath && fs.existsSync(resourcePath)) {
        // 挂载中间件
        server.middlewares.use(baseUrl, serveStatic(resourcePath));
        console.log(`[pi-view-port] OnlyOffice resources served at ${baseUrl}`);
      } else {
        console.warn(`[pi-view-port] Could not find OnlyOffice resources. Please verify your installation.`);
      }
    },

    async closeBundle() {
      // 构建模式：复制文件
      if (config.command !== 'build') return;
      
      // Check if we are building the library itself (don't copy if it's the library build)
      // A simple check is if package.json name is 'pi-view-port' and we are in root
      // But safer to just try to copy if found
      
      const resourcePath = resolveResourcePath();
        
      if (resourcePath && fs.existsSync(resourcePath)) {
           // Don't copy if source and dest are the same (avoid infinite loop or errors)
           // But here source is node_modules/... and dest is dist/packages/...
           const dest = path.resolve(config.build.outDir, outDir);
           
           try {
               await fs.copy(resourcePath, dest, { overwrite: false });
               console.log(`[pi-view-port] OnlyOffice resources copied to ${dest}`);
           } catch (e) {
               console.warn('[pi-view-port] Failed to copy resources:', e);
           }
      } else {
          console.warn('[pi-view-port] Failed to find resources to copy during build.');
      }
    },
    
    // 注入全局变量，让组件知道资源在哪里
    config() {
        return {
            define: {
                'process.env.VITE_PI_ONLYOFFICE_BASE_URL': JSON.stringify(baseUrl)
            }
        }
    }
  };
}
