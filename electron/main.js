import { app, BrowserWindow, ipcMain, dialog, screen, protocol } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import sharp from 'sharp'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const isDev = process.env.NODE_ENV === 'development'

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

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      webSecurity: false  // 禁用web安全策略以允许加载本地文件
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false
  })

  // 开发模式下加载Vite开发服务器
  if (isDev) {
    // 等待Vite服务器启动，然后加载页面
    const startUrl = 'http://localhost:5173'
    mainWindow.loadURL(startUrl).catch(() => {
      // 如果5173端口被占用，尝试其他端口
      const fallbackUrls = ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180', 'http://localhost:5181', 'http://localhost:5182']

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

// 功能1: 压缩图片
ipcMain.handle('compress-image', async (event, { filePath, format, suffix }) => {
  try {
    const dir = dirname(filePath)
    const name = basename(filePath, extname(filePath))

    // 如果有后缀，插入到文件名和后缀名之间
    const newName = suffix ? `${name}${suffix}` : name
    const outputPath = join(dir, `${newName}.${format}`)

    if (format === 'webp') {
      await sharp(filePath)
        .webp({ quality: 80 })
        .toFile(outputPath)
    } else if (format === 'avif') {
      await sharp(filePath)
        .avif({ quality: 80 })
        .toFile(outputPath)
    } else {
      throw new Error(`不支持的格式: ${format}`)
    }

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

// 功能3: 批量名称替换
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

      // 替换文件名中的指定文本，保留原文件扩展名
      const fileName = basename(file, extname(file))
      const fileExt = extname(file)
      const newFileName = fileName.replace(new RegExp(originalName, 'g'), replaceName)
      const newName = `${newFileName}${fileExt}`
      const newPath = join(folderPath, newName)

      try {
        // 直接重命名文件，不进行格式转换
        fs.renameSync(oldPath, newPath)

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

// SEO工具: 解析HTML图片
ipcMain.handle('parse-html-images', async (event, { htmlFilePath, imageFolders }) => {
  try {
    console.log('开始解析HTML图片...')
    console.log('HTML文件路径:', htmlFilePath)
    console.log('图片目录:', imageFolders)

    // 检查文件是否存在
    if (!fs.existsSync(htmlFilePath)) {
      throw new Error('HTML文件不存在: ' + htmlFilePath)
    }

    // 读取HTML文件
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    // 解析picture标签
    const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi
    const pictures = []
    let match
    let index = 1

    while ((match = pictureRegex.exec(htmlContent)) !== null) {
      const pictureHtml = match[0]

      // 提取img标签的data-one-src和alt属性
      const imgSrcMatch = pictureHtml.match(/<img[^>]*data-one-src="([^"]*)"[^>]*>/i)
      const altMatch = pictureHtml.match(/<img[^>]*alt="([^"]*)"[^>]*>/i)

      if (imgSrcMatch) {
        const dataOneSrc = imgSrcMatch[1]
        const alt = altMatch ? altMatch[1] : ''

        // 从路径中提取图片名称和分组
        const pathParts = dataOneSrc.split('/')
        const imageName = pathParts[pathParts.length - 1]

        // 查找分组（从路径中倒数第二个部分）
        let groupName = 'default'
        if (pathParts.length >= 2) {
          groupName = pathParts[pathParts.length - 2]
        }

        // 查找对应的图片文件
        let previewPath = null
        const imageFolder = imageFolders.find(folder =>
          folder.includes(groupName) ||
          basename(folder) === groupName
        )

        if (imageFolder) {
          const imagePath = join(imageFolder, imageName)
          if (fs.existsSync(imagePath)) {
            // 使用自定义协议而不是base64，提高加载速度
            previewPath = `local-image://${imagePath}`
          }
        }

        pictures.push({
          index: index++,
          originalPath: dataOneSrc,
          imageName: imageName,
          alt: alt,
          groupName: groupName,
          pictureHtml: pictureHtml,
          previewPath: previewPath,
          modified: false
        })
      }
    }

    // 按分组组织图片
    const groups = {}
    pictures.forEach(picture => {
      if (!groups[picture.groupName]) {
        groups[picture.groupName] = {
          name: picture.groupName,
          images: []
        }
      }

      // 创建可序列化的图片对象 - 确保所有属性都是基本类型
      const serializableImage = {
        index: picture.index,
        originalPath: picture.originalPath,
        imageName: picture.imageName,
        alt: picture.alt,
        groupName: picture.groupName,
        pictureHtml: picture.pictureHtml,
        previewPath: picture.previewPath,
        modified: picture.modified
      }

      // 验证对象可序列化
      try {
        JSON.stringify(serializableImage)
        groups[picture.groupName].images.push(serializableImage)
      } catch (serializeError) {
        console.error('图片对象序列化失败:', serializeError)
        console.error('问题对象:', serializableImage)
      }
    })

    const result = {
      success: true,
      groups: Object.values(groups),
      totalImages: pictures.length
    }

    console.log('解析完成，找到图片组:', Object.keys(groups))
    console.log('总图片数:', pictures.length)
    console.log('返回结果结构:', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    console.error('解析HTML图片时发生错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// SEO工具: 保存修改
ipcMain.handle('save-seo-changes', async (event, { htmlFilePath, groupName, images, imageFolders }) => {
  try {
    // 读取HTML文件
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    for (const image of images) {
      // 获取原图片名称（去掉后缀）
      const oldFileName = basename(image.originalPath)
      const oldNameWithoutExt = oldFileName.split('.')[0]

      // 获取新图片名称（去掉后缀）
      const newFileName = image.imageName
      const newNameWithoutExt = newFileName.split('.')[0]

      // 替换HTML中的图片路径
      const oldPictureHtml = image.pictureHtml

      // 问题3: 同步修改data-one-src和data-one-srcset属性，但保持后缀名不变
      let newPictureHtml = oldPictureHtml

      // 处理source标签的data-one-srcset属性
      newPictureHtml = newPictureHtml.replace(
        /data-one-srcset="([^"]*)"/gi,
        (match, srcsetValue) => {
          // 只修改文件名部分，保持后缀名不变
          const srcsetPathParts = srcsetValue.split('/')
          const srcsetFileName = srcsetPathParts[srcsetPathParts.length - 1]
          const srcsetNameWithoutExt = srcsetFileName.split('.')[0]
          const srcsetExt = srcsetFileName.substring(srcsetNameWithoutExt.length)

          // 如果文件名匹配原图片名，则替换
          if (srcsetNameWithoutExt === oldNameWithoutExt) {
            srcsetPathParts[srcsetPathParts.length - 1] = newNameWithoutExt + srcsetExt
            return `data-one-srcset="${srcsetPathParts.join('/')}"`
          }
          return match
        }
      )

      // 处理img标签的data-one-src属性
      newPictureHtml = newPictureHtml.replace(
        /data-one-src="([^"]*)"/gi,
        (match, srcValue) => {
          // 只修改文件名部分，保持后缀名不变
          const srcPathParts = srcValue.split('/')
          const srcFileName = srcPathParts[srcPathParts.length - 1]
          const srcNameWithoutExt = srcFileName.split('.')[0]
          const srcExt = srcFileName.substring(srcNameWithoutExt.length)

          // 如果文件名匹配原图片名，则替换
          if (srcNameWithoutExt === oldNameWithoutExt) {
            srcPathParts[srcPathParts.length - 1] = newNameWithoutExt + srcExt
            return `data-one-src="${srcPathParts.join('/')}"`
          }
          return match
        }
      )

      // 问题2: 处理alt属性 - 如果不存在则添加，如果存在则修改
      if (image.alt.trim()) {
        if (newPictureHtml.includes('alt="')) {
          // 替换现有的alt属性
          newPictureHtml = newPictureHtml.replace(
            /alt="([^"]*)"/i,
            `alt="${image.alt}"`
          )
        } else {
          // 在img标签中添加alt属性
          newPictureHtml = newPictureHtml.replace(
            /<img([^>]*?)(\s*\/?>)/gi,
            (match, imgAttrs, closing) => {
              // 在img标签属性后添加alt属性，保持原有的闭合方式
              return `<img${imgAttrs} alt="${image.alt}"${closing}`
            }
          )
        }
      }

      // 更新HTML内容
      htmlContent = htmlContent.replace(oldPictureHtml, newPictureHtml)

      // 问题1: 重命名对应的图片文件 - 查找所有匹配的图片文件
      const imageFolder = imageFolders.find(folder =>
        folder.includes(groupName) ||
        basename(folder) === groupName
      )

      if (imageFolder) {
        // 查找所有匹配的图片文件（支持后缀匹配）
        const files = fs.readdirSync(imageFolder)
        const matchingFiles = files.filter(file => {
          const fileExt = file.toLowerCase()

          // 只处理图片文件，不处理视频文件
          const isImageFile = fileExt.endsWith('.jpg') ||
                            fileExt.endsWith('.jpeg') ||
                            fileExt.endsWith('.png') ||
                            fileExt.endsWith('.gif') ||
                            fileExt.endsWith('.webp') ||
                            fileExt.endsWith('.svg') ||
                            fileExt.endsWith('.bmp') ||
                            fileExt.endsWith('.ico') ||
                            fileExt.endsWith('.tiff') ||
                            fileExt.endsWith('.tif') ||
                            fileExt.endsWith('.avif')

          if (!isImageFile) return false

          // 获取文件名（去掉最后一个扩展名）
          const lastDotIndex = file.lastIndexOf('.')
          const fileNameWithoutExt = lastDotIndex > 0 ? file.substring(0, lastDotIndex) : file

          // 如果设置了后缀匹配，使用双重匹配逻辑
          if (image.suffixMatch && image.suffixMatch.trim()) {
            const suffix = image.suffixMatch.trim()
            // 匹配1：原文件名（精确匹配）
            const match1 = fileNameWithoutExt === oldNameWithoutExt
            // 匹配2：原文件名 + 后缀（精确匹配）
            const match2 = fileNameWithoutExt === oldNameWithoutExt + suffix
            return match1 || match2
          } else {
            // 默认逻辑：精确匹配文件名（去掉扩展名）
            return fileNameWithoutExt === oldNameWithoutExt
          }
        })

        // 重命名所有匹配的图片文件
        for (const oldFile of matchingFiles) {
          const oldFilePath = join(imageFolder, oldFile)

          // 获取文件扩展名（最后一个点号之后的部分）
          const lastDotIndex = oldFile.lastIndexOf('.')
          const fileExt = lastDotIndex > 0 ? oldFile.substring(lastDotIndex) : ''

          // 获取文件名（去掉扩展名）
          const oldFileNameWithoutExt = oldFile.substring(0, lastDotIndex)

          // 构建新文件名
          let newFile
          if (image.suffixMatch && image.suffixMatch.trim()) {
            const suffix = image.suffixMatch.trim()
            // 双重匹配的重命名逻辑
            if (oldFileNameWithoutExt === oldNameWithoutExt) {
              // 匹配1：原文件名 → 新文件名
              newFile = newNameWithoutExt + fileExt
            } else if (oldFileNameWithoutExt === oldNameWithoutExt + suffix) {
              // 匹配2：原文件名+后缀 → 新文件名+后缀
              newFile = newNameWithoutExt + suffix + fileExt
            } else {
              // 其他情况保持原逻辑
              newFile = oldFileNameWithoutExt.replace(oldNameWithoutExt, newNameWithoutExt) + fileExt
            }
          } else {
            // 默认逻辑：直接替换文件名
            newFile = newNameWithoutExt + fileExt
          }

          const newFilePath = join(imageFolder, newFile)

          if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, newFilePath)
            console.log(`重命名图片文件: ${oldFile} -> ${newFile}`)
          }
        }
      }
    }

    // 保存修改后的HTML文件
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8')

    return {
      success: true
    }
  } catch (error) {
    console.error('保存SEO修改时发生错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// SEO工具: 撤回修改
ipcMain.handle('revert-seo-changes', async (event, { htmlFilePath, groupName, image, imageFolders }) => {
  try {
    console.log('开始撤回修改:', { htmlFilePath, groupName, image })

    // 读取HTML文件
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    // 获取原图片名称和新图片名称
    const oldFileName = basename(image.originalPath)
    const oldNameWithoutExt = oldFileName.split('.')[0]
    const newFileName = image.imageName
    const newNameWithoutExt = newFileName.split('.')[0]

    console.log('撤回文件匹配:', { oldFileName, oldNameWithoutExt, newFileName, newNameWithoutExt })

    // 在HTML内容中查找当前对应的picture标签
    // 我们需要找到当前HTML中实际存在的picture标签，而不是使用原始HTML
    const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi
    let currentPictureHtml = null
    let match

    while ((match = pictureRegex.exec(htmlContent)) !== null) {
      const pictureHtml = match[0]

      // 检查这个picture标签是否包含新图片名
      if (pictureHtml.includes(newNameWithoutExt)) {
        currentPictureHtml = pictureHtml
        break
      }
    }

    if (!currentPictureHtml) {
      console.log('未找到包含新图片名的picture标签，使用原始HTML进行撤回')
      currentPictureHtml = image.pictureHtml
    }

    console.log('找到当前picture标签:', currentPictureHtml)
    console.log('原始picture标签:', image.pictureHtml)

    // 构建恢复后的picture标签
    let restoredPictureHtml = currentPictureHtml

    // 处理source标签的data-one-srcset属性
    restoredPictureHtml = restoredPictureHtml.replace(
      /data-one-srcset="([^"]*)"/gi,
      (match, srcsetValue) => {
        // 只修改文件名部分，保持后缀名不变
        const srcsetPathParts = srcsetValue.split('/')
        const srcsetFileName = srcsetPathParts[srcsetPathParts.length - 1]
        const srcsetNameWithoutExt = srcsetFileName.split('.')[0]
        const srcsetExt = srcsetFileName.substring(srcsetNameWithoutExt.length)

        // 如果文件名匹配新图片名，则恢复为原图片名
        if (srcsetNameWithoutExt === newNameWithoutExt) {
          srcsetPathParts[srcsetPathParts.length - 1] = oldNameWithoutExt + srcsetExt
          console.log(`恢复source标签: ${srcsetValue} -> ${srcsetPathParts.join('/')}`)
          return `data-one-srcset="${srcsetPathParts.join('/')}"`
        }
        return match
      }
    )

    // 处理img标签的data-one-src属性
    restoredPictureHtml = restoredPictureHtml.replace(
      /data-one-src="([^"]*)"/gi,
      (match, srcValue) => {
        // 只修改文件名部分，保持后缀名不变
        const srcPathParts = srcValue.split('/')
        const srcFileName = srcPathParts[srcPathParts.length - 1]
        const srcNameWithoutExt = srcFileName.split('.')[0]
        const srcExt = srcFileName.substring(srcNameWithoutExt.length)

        // 如果文件名匹配新图片名，则恢复为原图片名
        if (srcNameWithoutExt === newNameWithoutExt) {
          srcPathParts[srcPathParts.length - 1] = oldNameWithoutExt + srcExt
          console.log(`恢复img标签: ${srcValue} -> ${srcPathParts.join('/')}`)
          return `data-one-src="${srcPathParts.join('/')}"`
        }
        return match
      }
    )

    // 处理alt属性 - 恢复为原始alt
    if (image.originalAlt !== undefined) {
      if (restoredPictureHtml.includes('alt="')) {
        // 替换现有的alt属性
        restoredPictureHtml = restoredPictureHtml.replace(
          /alt="([^"]*)"/i,
          `alt="${image.originalAlt}"`
        )
        console.log(`恢复alt属性: -> ${image.originalAlt}`)
      } else if (image.originalAlt.trim()) {
        // 在img标签中添加alt属性
        restoredPictureHtml = restoredPictureHtml.replace(
          /<img([^>]*?)(\s*\/?>)/gi,
          (match, imgAttrs, closing) => {
            const result = `<img${imgAttrs} alt="${image.originalAlt}"${closing}`
            console.log(`添加alt属性: ${image.originalAlt}`)
            return result
          }
        )
      }
    }

    // 更新HTML内容 - 将当前HTML替换为恢复后的HTML
    htmlContent = htmlContent.replace(currentPictureHtml, restoredPictureHtml)
    console.log('HTML撤回完成')

    // 恢复对应的图片文件
    const imageFolder = imageFolders.find(folder =>
      folder.includes(groupName) ||
      basename(folder) === groupName
    )

    if (imageFolder) {
      // 查找所有匹配的图片文件（支持后缀匹配）
      const files = fs.readdirSync(imageFolder)
      const matchingFiles = files.filter(file => {
        const fileExt = file.toLowerCase()

        // 只处理图片文件，不处理视频文件
        const isImageFile = fileExt.endsWith('.jpg') ||
                          fileExt.endsWith('.jpeg') ||
                          fileExt.endsWith('.png') ||
                          fileExt.endsWith('.gif') ||
                          fileExt.endsWith('.webp') ||
                          fileExt.endsWith('.svg') ||
                          fileExt.endsWith('.bmp') ||
                          fileExt.endsWith('.ico') ||
                          fileExt.endsWith('.tiff') ||
                          fileExt.endsWith('.tif') ||
                          fileExt.endsWith('.avif')

        if (!isImageFile) return false

        // 获取文件名（去掉最后一个扩展名）
        const lastDotIndex = file.lastIndexOf('.')
        const fileNameWithoutExt = lastDotIndex > 0 ? file.substring(0, lastDotIndex) : file

        // 如果设置了后缀匹配，使用双重匹配逻辑
        if (image.suffixMatch && image.suffixMatch.trim()) {
          const suffix = image.suffixMatch.trim()
          // 匹配1：新文件名（精确匹配）
          const match1 = fileNameWithoutExt === newNameWithoutExt
          // 匹配2：新文件名 + 后缀（精确匹配）
          const match2 = fileNameWithoutExt === newNameWithoutExt + suffix
          return match1 || match2
        } else {
          // 默认逻辑：精确匹配文件名（去掉扩展名）
          return fileNameWithoutExt === newNameWithoutExt
        }
      })

      console.log('找到匹配的撤回文件:', matchingFiles)

      // 恢复所有匹配的图片文件
      for (const newFile of matchingFiles) {
        const newFilePath = join(imageFolder, newFile)

        // 获取文件扩展名（最后一个点号之后的部分）
        const lastDotIndex = newFile.lastIndexOf('.')
        const fileExt = lastDotIndex > 0 ? newFile.substring(lastDotIndex) : ''

        // 获取文件名（去掉扩展名）
        const newFileNameWithoutExt = newFile.substring(0, lastDotIndex)

        // 构建原文件名
        let oldFile
        if (image.suffixMatch && image.suffixMatch.trim()) {
          const suffix = image.suffixMatch.trim()
          // 双重匹配的恢复逻辑
          if (newFileNameWithoutExt === newNameWithoutExt) {
            // 匹配1：新文件名 → 原文件名
            oldFile = oldNameWithoutExt + fileExt
          } else if (newFileNameWithoutExt === newNameWithoutExt + suffix) {
            // 匹配2：新文件名+后缀 → 原文件名+后缀
            oldFile = oldNameWithoutExt + suffix + fileExt
          } else {
            // 其他情况保持原逻辑
            oldFile = newFileNameWithoutExt.replace(newNameWithoutExt, oldNameWithoutExt) + fileExt
          }
        } else {
          // 默认逻辑：直接替换文件名
          oldFile = oldNameWithoutExt + fileExt
        }

        const oldFilePath = join(imageFolder, oldFile)

        if (fs.existsSync(newFilePath)) {
          fs.renameSync(newFilePath, oldFilePath)
          console.log(`恢复图片文件: ${newFile} -> ${oldFile}`)
        }
      }
    }

    // 保存恢复后的HTML文件
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8')

    return {
      success: true
    }
  } catch (error) {
    console.error('撤回SEO修改时发生错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// 窗口拖动功能
let movingInterval = null;

ipcMain.on('window-move-start', (event) => {
  const currentWindow = BrowserWindow.fromWebContents(event.sender);
  const winPosition = currentWindow.getBounds();
  const cursorPosition = screen.getCursorScreenPoint();

  const offsetX = cursorPosition.x - winPosition.x;
  const offsetY = cursorPosition.y - winPosition.y;

  clearInterval(movingInterval);
  movingInterval = setInterval(() => {
    // 窗口销毁判断，高频率的更新有可能窗口已销毁，定时器还没结束
    if (!currentWindow.isDestroyed()) {
      // 如果窗口失去焦点，则停止移动
      if (!currentWindow.isFocused()) {
        clearInterval(movingInterval);
        movingInterval = null;
        return;
      }
      const newCursorPosition = screen.getCursorScreenPoint();
      currentWindow.setBounds({
        x: newCursorPosition.x - offsetX,
        y: newCursorPosition.y - offsetY,
        width: winPosition.width,
        height: winPosition.height,
      });
    } else {
      clearInterval(movingInterval);
      movingInterval = null;
    }
  }, 8); // 每16ms刷新一次
});

ipcMain.on('window-move-end', () => {
  clearInterval(movingInterval);
});