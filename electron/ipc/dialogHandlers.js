import { ipcMain, dialog } from 'electron'

/**
 * 注册文件对话框相关的IPC处理程序
 */
export function registerDialogHandlers() {
  // 选择文件夹
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result
  })

  // 打开目录对话框（兼容打包工具）
  ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      ...options
    })
    return result
  })

  // 打开文件对话框
  ipcMain.handle('dialog:openFile', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      ...options
    })
    return result
  })
}