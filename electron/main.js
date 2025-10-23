import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import sharp from 'sharp'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const isDev = process.env.NODE_ENV === 'development'

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false
  })

  // 开发模式下加载Vite开发服务器
  if (isDev) {
    // 等待Vite服务器启动，然后加载页面
    const startUrl = 'http://localhost:5182'
    mainWindow.loadURL(startUrl).catch(() => {
      // 如果5182端口被占用，尝试其他端口
      const fallbackUrls = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180', 'http://localhost:5181']

      const tryLoadUrl = (urlIndex) => {
        if (urlIndex >= fallbackUrls.length) {
          console.error('无法连接到Vite开发服务器')
          return
        }

        mainWindow.loadURL(fallbackUrls[urlIndex]).catch(() => {
          setTimeout(() => tryLoadUrl(urlIndex + 1), 1000)
        })
      }

      tryLoadUrl(0)
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 图像处理IPC处理程序

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result
})

// 功能1: 压缩为WebP
ipcMain.handle('compress-to-webp', async (event, { filePath, suffix }) => {
  try {
    const dir = dirname(filePath)
    const name = basename(filePath, extname(filePath))

    // 如果有后缀，插入到文件名和后缀名之间
    const newName = suffix ? `${name}${suffix}` : name
    const outputPath = join(dir, `${newName}.webp`)

    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(outputPath)

    return outputPath
  } catch (error) {
    throw new Error(`压缩失败: ${error.message}`)
  }
})

// 功能2: 批量重命名并转换
ipcMain.handle('batch-rename-convert', async (event, { folderPath, compressToWebp }) => {
  try {
    const messages = []
    let processedCount = 0

    // 获取文件夹中的所有图片文件（只接受JPG和PNG格式）
    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = extname(file).toLowerCase()
      return ['.jpg', '.jpeg', '.png'].includes(ext)
    })

    // 按文件名排序
    files.sort()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const oldPath = join(folderPath, file)
      const fileExt = extname(file).toLowerCase()

      let newName, newPath

      if (compressToWebp) {
        // 如果勾选了压缩为WebP
        newName = `${i + 1}.webp`
        newPath = join(folderPath, newName)

        try {
          // 转换为WebP格式
          await sharp(oldPath)
            .webp({ quality: 80 })
            .toFile(newPath)

          // 删除原文件
          fs.unlinkSync(oldPath)

          messages.push(`成功: ${file} -> ${newName}`)
          processedCount++
        } catch (error) {
          messages.push(`失败: ${file} - ${error.message}`)
        }
      } else {
        // 如果不压缩，只重命名
        newName = `${i + 1}${fileExt}`
        newPath = join(folderPath, newName)

        try {
          // 直接重命名文件
          fs.renameSync(oldPath, newPath)
          messages.push(`成功: ${file} -> ${newName}`)
          processedCount++
        } catch (error) {
          messages.push(`失败: ${file} - ${error.message}`)
        }
      }
    }

    return {
      success: true,
      processedCount,
      messages
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// 功能3: 批量替换并转换
ipcMain.handle('batch-replace-convert', async (event, { folderPath, originalName, replaceName }) => {
  try {
    const messages = []
    let processedCount = 0

    // 获取文件夹中的所有图片文件
    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = extname(file).toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'].includes(ext)
    })

    for (const file of files) {
      const oldPath = join(folderPath, file)

      // 替换文件名中的指定文本
      const fileName = basename(file, extname(file))
      const newFileName = fileName.replace(new RegExp(originalName, 'g'), replaceName)
      const newName = `${newFileName}.webp`
      const newPath = join(folderPath, newName)

      try {
        // 如果原文件不是WebP，转换为WebP格式
        if (extname(file).toLowerCase() !== '.webp') {
          await sharp(oldPath)
            .webp({ quality: 80 })
            .toFile(newPath)

          // 删除原文件
          fs.unlinkSync(oldPath)
        } else {
          // 如果已经是WebP，直接重命名
          fs.renameSync(oldPath, newPath)
        }

        messages.push(`成功: ${file} -> ${newName}`)
        processedCount++
      } catch (error) {
        messages.push(`失败: ${file} - ${error.message}`)
      }
    }

    return {
      success: true,
      processedCount,
      messages
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// 窗口控制IPC处理程序
let mainWindow

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

// 获取窗口边界
ipcMain.on('get-window-bounds', (event) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds()
    event.returnValue = bounds
  } else {
    event.returnValue = { x: 0, y: 0, width: 0, height: 0 }
  }
})

// 窗口拖动功能
ipcMain.on('window-drag', (event, { x, y }) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds()
    mainWindow.setBounds({
      x: x,
      y: y,
      width: bounds.width,
      height: bounds.height
    })
  }
})