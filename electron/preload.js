const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // 文件对话框
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),

  // 图片处理
  compressImage: (options) => ipcRenderer.invoke('compress-image', options),
  batchRenameConvert: (options) => ipcRenderer.invoke('batch-rename-convert', options),
  batchReplaceConvert: (options) => ipcRenderer.invoke('batch-replace-convert', options),

  // SEO工具
  parseHtmlImages: (options) => ipcRenderer.invoke('parse-html-images', options),
  saveSeoChanges: (options) => ipcRenderer.invoke('save-seo-changes', options),
  revertSeoChanges: (options) => ipcRenderer.invoke('revert-seo-changes', options),

  // 打包工具
  createZipPackage: (options) => ipcRenderer.invoke('create-zip-package', options)
})