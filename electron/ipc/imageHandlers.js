import { ipcMain } from 'electron'
import sharp from 'sharp'
import { readdirSync, renameSync, existsSync } from 'fs'
import { join, dirname, basename, extname } from 'path'

/**
 * 注册图片处理相关的IPC处理程序
 */
export function registerImageHandlers() {
  // 功能1: 压缩图片
  ipcMain.handle('compress-image', async (event, { filePath, format, suffix }) => {
    try {
      const dir = dirname(filePath)
      const fileName = basename(filePath, extname(filePath))

      let outputPath
      if (suffix) {
        outputPath = join(dir, `${fileName}${suffix}.${format}`)
      } else {
        outputPath = join(dir, `${fileName}.${format}`)
      }

      console.log(`压缩图片: ${filePath} -> ${outputPath}`)

      // 使用sharp处理图片
      const image = sharp(filePath)

      if (format === 'webp') {
        await image.webp({ quality: 80 }).toFile(outputPath)
      } else if (format === 'avif') {
        await image.avif({ quality: 80 }).toFile(outputPath)
      } else {
        throw new Error(`不支持的格式: ${format}`)
      }

      return {
        success: true,
        outputPath: outputPath
      }
    } catch (error) {
      console.error('压缩图片时发生错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // 功能2: 批量重命名并转换
  ipcMain.handle('batch-rename-convert', async (event, { folderPath, compressToWebp }) => {
    try {
      const files = readdirSync(folderPath)
      const imageFiles = files.filter(file => {
        const ext = extname(file).toLowerCase()
        return ext === '.jpg' || ext === '.jpeg' || ext === '.png'
      })

      const results = []
      let index = 1

      console.log(`批量重命名: 在文件夹 ${folderPath} 中找到 ${imageFiles.length} 个图片文件`)

      for (const file of imageFiles) {
        const filePath = join(folderPath, file)
        const fileExt = extname(file)
        const newFileName = `${index.toString()}${fileExt}`
        const newFilePath = join(folderPath, newFileName)

        console.log(`处理文件: ${file} -> ${newFileName}`)

        // 检查源文件是否存在
        if (!existsSync(filePath)) {
          console.log(`警告: 源文件不存在 - ${filePath}`)
          continue
        }

        // 检查目标文件是否已存在
        if (existsSync(newFilePath)) {
          console.log(`警告: 目标文件已存在 - ${newFilePath}`)
        }

        // 重命名文件
        try {
          renameSync(filePath, newFilePath)
          console.log(`成功重命名: ${file} -> ${newFileName}`)
          results.push({
            original: file,
            renamed: newFileName
          })
        } catch (renameError) {
          console.log(`重命名失败: ${renameError.message}`)
          results.push({
            original: file,
            renamed: newFileName,
            error: renameError.message
          })
        }

        // 如果需要转换为WebP
        if (compressToWebp) {
          const webpFileName = `${index.toString()}.webp`
          const webpFilePath = join(folderPath, webpFileName)

          await sharp(newFilePath).webp({ quality: 80 }).toFile(webpFilePath)
          results.push({
            original: file,
            renamed: webpFileName,
            converted: true
          })
        }

        index++
      }

      return {
        success: true,
        results: results
      }
    } catch (error) {
      console.error('批量重命名转换时发生错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // 功能3: 批量替换名称并转换
  ipcMain.handle('batch-replace-convert', async (event, { folderPath, originalName, replaceName }) => {
    try {
      const files = readdirSync(folderPath)
      const imageFiles = files.filter(file => {
        const ext = extname(file).toLowerCase()
        return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp'
      })

      const results = []

      for (const file of imageFiles) {
        if (file.includes(originalName)) {
          const filePath = join(folderPath, file)
          const newFileName = file.replace(originalName, replaceName)
          const newFilePath = join(folderPath, newFileName)

          // 重命名文件
          renameSync(filePath, newFilePath)
          results.push({
            original: file,
            renamed: newFileName
          })
        }
      }

      return {
        success: true,
        results: results
      }
    } catch (error) {
      console.error('批量替换名称时发生错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })
}