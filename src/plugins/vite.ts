import type { Plugin, ResolvedConfig } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import serveStatic from 'serve-static';

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

export function piViewPortPlugin(options: PiViewPortPluginOptions = {}): Plugin {
  const baseUrl = options.baseUrl || '/packages/onlyoffice';
  const outDir = options.outDir || 'packages/onlyoffice';
  
  let config: ResolvedConfig;

  // 确定资源源路径
  // 当用户使用 npm 包时，路径是 node_modules/pi-view-port/public/packages/onlyoffice
  // 我们需要动态查找这个路径
  // 在开发 pi-view-port-pack 时，路径是 ../../public/packages/onlyoffice (相对于 src/plugins)
  // 发布后，结构是：
  // node_modules/pi-view-port/
  //   dist/vite.mjs
  //   public/packages/onlyoffice
  
  // 使用 import.meta.url 或者 __dirname 来定位
  // 注意：构建后的文件在 dist 目录
  
  return {
    name: 'vite-plugin-pi-view-port',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    
    configureServer(server) {
      // 查找资源路径
      // 1. 尝试从 node_modules 查找
      let resourcePath = '';
      
      // 尝试解析 package.json 位置
      try {
        // 如果是开发本项目，直接指向 public
        const devPublicPath = path.resolve(process.cwd(), 'public/packages/onlyoffice');
        if (fs.existsSync(devPublicPath)) {
          resourcePath = devPublicPath;
        } else {
            // 如果是作为依赖使用，尝试从 node_modules 查找
            // 假设插件文件在 node_modules/pi-view-port/dist/vite.mjs
            // 资源在 node_modules/pi-view-port/public/packages/onlyoffice
            // 所以是 ../public/packages/onlyoffice
            
            // 注意：这里需要处理 ESM 和 CJS 的 __dirname 问题
            // 这里的代码会被构建，构建工具会处理 __dirname
            
            // 更好的方式：尝试 require.resolve('pi-view-port/package.json') 然后找 public
            // 但如果用户还没有 require 这个包，可能找不到
            
            // 使用简单的相对路径假设
            // 如果这个插件被构建到了 dist/vite.mjs
            // 那么资源应该在 ../public/packages/onlyoffice
            
            // 但这里是源码，我们需要写能在运行时(用户项目)工作的代码
            
            // 运行时，这段代码在 node_modules/pi-view-port/dist/vite.mjs
            // 资源在 node_modules/pi-view-port/public/packages/onlyoffice
            const currentFileDir = __dirname; // 构建后会是 dist
            const potentialPath = path.resolve(currentFileDir, '../public/packages/onlyoffice');
            
            if (fs.existsSync(potentialPath)) {
                resourcePath = potentialPath;
            } else {
                // 可能是 CJS 结构或者其他
                // 尝试更通用的查找
                // 假设我们在 node_modules/pi-view-port/dist
                const pkgRoot = path.resolve(currentFileDir, '..');
                const publicInPkg = path.resolve(pkgRoot, 'public/packages/onlyoffice');
                if (fs.existsSync(publicInPkg)) {
                    resourcePath = publicInPkg;
                }
            }
        }
      } catch (e) {
        console.warn('[pi-view-port] Failed to resolve resource path', e);
      }

      if (resourcePath && fs.existsSync(resourcePath)) {
        // 挂载中间件
        server.middlewares.use(baseUrl, serveStatic(resourcePath));
        console.log(`[pi-view-port] OnlyOffice resources served at ${baseUrl}`);
      } else {
        console.warn(`[pi-view-port] Could not find OnlyOffice resources at ${resourcePath}. Please verify your installation.`);
      }
    },

    async closeBundle() {
      // 构建模式：复制文件
      if (config.command !== 'build') return;
      
      let resourcePath = '';
      try {
        // 同样的查找逻辑
        const devPublicPath = path.resolve(process.cwd(), 'public/packages/onlyoffice');
        if (fs.existsSync(devPublicPath)) {
             // 此时是在开发包本身，不应该复制到自己的 dist 里（或者是需要的？）
             // 如果用户正在构建自己的应用，process.cwd() 是用户项目根目录
             // 此时 devPublicPath 不存在
             resourcePath = ''; 
        }
        
        // 再次尝试从插件位置查找
        const currentFileDir = __dirname; 
        const potentialPath = path.resolve(currentFileDir, '../public/packages/onlyoffice');
        if (fs.existsSync(potentialPath)) {
            resourcePath = potentialPath;
        } else {
            const pkgRoot = path.resolve(currentFileDir, '..');
            const publicInPkg = path.resolve(pkgRoot, 'public/packages/onlyoffice');
            if (fs.existsSync(publicInPkg)) {
                resourcePath = publicInPkg;
            }
        }
        
        // 如果是在开发本项目（pi-view-port-pack），process.cwd() 下有 public，
        // 我们不应该把它复制到 dist，因为 vite build 会自动处理 public 目录
        // 但这里的上下文是“用户使用插件”，用户项目没有 public/packages/onlyoffice
        
        // 只有当 resourcePath 存在且有效时才复制
        if (resourcePath && fs.existsSync(resourcePath)) {
             const dest = path.resolve(config.build.outDir, outDir);
             await fs.copy(resourcePath, dest, { overwrite: false });
             console.log(`[pi-view-port] OnlyOffice resources copied to ${dest}`);
        }
        
      } catch (e) {
         console.warn('[pi-view-port] Failed to copy resources', e);
      }
    },
    
    // 注入全局变量，让组件知道资源在哪里
    config() {
        return {
            define: {
                // 如果用户没有手动设置，组件会使用这个默认值
                // 注意：这需要组件源码配合读取
                // 目前组件源码读取的是 src/utils/onlyoffice/lib/const.ts 中的 ONLYOFFICE_BASE_URL
                // 那个变量是 export let，不是 process.env
                // 但我们可以通过注入代码来设置它？
                // 不，组件已经编译好了。
                
                // 方案：组件应该尝试读取 window.__PI_VIEW_PORT_BASE_URL__ 或者类似的全局变量
                // 或者我们修改组件源码，让它优先读取 import.meta.env.VITE_PI_ONLYOFFICE_BASE_URL
                
                // 简单起见，我们只需告诉用户配置插件即可，
                // 组件侧，我们最好修改一下，支持从全局变量读取默认值
                'process.env.VITE_PI_ONLYOFFICE_BASE_URL': JSON.stringify(baseUrl)
            }
        }
    }
  };
}
