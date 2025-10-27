import { app, BrowserWindow, protocol } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerAllHandlers } from './ipc/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development'

let mainWindow

// 注册自定义协议处理本地文件
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-image', (request, callback) => {
    const url = request.url.replace('local-image://', '')
    try {
      return callback({ path: decodeURIComponent(url) })
    } catch (error) {
      console.error('Protocol error:', error)
      return callback({ error: -2 })
    }
  })
})

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f5f5f5'
  })

  // 注册所有IPC处理程序
  registerAllHandlers()

  if (isDev) {
    // 开发模式：连接到Vite开发服务器
    let devServerUrl = 'http://localhost:5173'

    // 尝试连接开发服务器，如果端口被占用则尝试其他端口
    const tryConnect = async (port) => {
      const url = `http://localhost:${port}`
      try {
        await mainWindow.loadURL(url)
        console.log(`成功连接到开发服务器: ${url}`)
        return true
      } catch (error) {
        console.log(`端口 ${port} 连接失败，尝试下一个端口...`)
        return false
      }
    }

    // 尝试多个端口
    const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181]
    for (const port of ports) {
      if (await tryConnect(port)) {
        break
      }
    }

    // 如果所有端口都失败，显示错误页面
    if (!mainWindow.webContents.getURL()) {
      mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})