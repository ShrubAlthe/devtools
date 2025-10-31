import { ipcMain, BrowserWindow, screen } from 'electron'

// 窗口拖动功能
let movingInterval = null

/**
 * 注册窗口控制相关的IPC处理程序
 */
export function registerWindowHandlers() {
  // 窗口最小化
  ipcMain.on('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.minimize()
    }
  })

  // 窗口最大化/还原
  ipcMain.on('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  // 窗口关闭
  ipcMain.on('window-close', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.close()
    }
  })

  // 获取窗口边界
  ipcMain.on('get-window-bounds', (event) => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      const bounds = window.getBounds()
      event.reply('window-bounds', bounds)
    }
  })
}