import { ipcMain } from 'electron'
import archiver from 'archiver'
import { createWriteStream, readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'

/**
 * 创建ZIP压缩包
 * @param {string} folderPath - 要压缩的文件夹路径
 * @param {string} prefix - 文件名前缀
 * @param {string} suffix - 文件名后缀
 * @param {string} zipName - 自定义压缩包名称
 * @returns {Promise<Object>}
 */
const createZipPackage = async (folderPath, prefix = '', suffix = '', zipName = '') => {
  return new Promise((resolve, reject) => {
    try {
      // 获取文件夹名称
      const folderName = basename(folderPath)

      // 使用自定义压缩包名称或默认文件夹名称
      const baseName = zipName || folderName

      // 构建压缩包文件名：前缀 + 自定义名称 + 后缀
      const zipFileName = `${prefix}${baseName}${suffix}.zip`
      const parentDir = dirname(folderPath)
      const zipPath = join(parentDir, zipFileName)

      console.log(`开始创建ZIP压缩包: ${zipPath}`)
      console.log(`源文件夹: ${folderPath}`)

      // 检查源文件夹是否存在
      if (!statSync(folderPath).isDirectory()) {
        reject(new Error(`源路径不是文件夹: ${folderPath}`))
        return
      }

      // 创建输出流
      const output = createWriteStream(zipPath)
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      })

      let fileCount = 0

      output.on('close', () => {
        const fileSize = (archive.pointer() / 1024 / 1024).toFixed(2) + ' MB'
        console.log(`ZIP压缩包创建完成: ${zipPath}`)
        console.log(`文件数量: ${fileCount}, 压缩包大小: ${fileSize}`)

        resolve({
          success: true,
          folderName,
          zipFileName,
          fileCount,
          fileSize,
          zipPath
        })
      })

      archive.on('error', (err) => {
        console.error('创建ZIP压缩包失败:', err)
        reject(new Error(`创建ZIP压缩包失败: ${err.message}`))
      })

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('警告:', err)
        } else {
          console.error('错误:', err)
          reject(err)
        }
      })

      archive.on('entry', (entry) => {
        if (entry.stats.isFile()) {
          fileCount++
        }
      })

      // 管道输出
      archive.pipe(output)

      // 添加文件夹中的所有文件和子文件夹，但不创建额外的父级目录
      archive.directory(folderPath, false)

      // 完成压缩
      archive.finalize()

    } catch (error) {
      console.error('创建ZIP压缩包时发生错误:', error)
      reject(error)
    }
  })
}

/**
 * 递归获取文件夹中的文件数量
 * @param {string} dirPath - 文件夹路径
 * @returns {number}
 */
const getFileCount = (dirPath) => {
  let count = 0

  const files = readdirSync(dirPath)

  for (const file of files) {
    const filePath = join(dirPath, file)
    const stats = statSync(filePath)

    if (stats.isDirectory()) {
      count += getFileCount(filePath)
    } else if (stats.isFile()) {
      count++
    }
  }

  return count
}

/**
 * 注册打包工具相关的IPC处理程序
 */
export function registerPackageHandlers() {
  // 创建ZIP压缩包
  ipcMain.handle('create-zip-package', async (event, { folderPath, prefix, suffix, zipName }) => {
    try {
      console.log('收到创建ZIP压缩包请求:')
      console.log('文件夹路径:', folderPath)
      console.log('前缀:', prefix)
      console.log('后缀:', suffix)
      console.log('自定义名称:', zipName)

      // 验证参数
      if (!folderPath) {
        return {
          success: false,
          error: '文件夹路径不能为空'
        }
      }

      const result = await createZipPackage(folderPath, prefix || '', suffix || '', zipName || '')

      return {
        success: true,
        folderName: result.folderName,
        zipFileName: result.zipFileName,
        fileCount: result.fileCount,
        fileSize: result.fileSize,
        zipPath: result.zipPath
      }

    } catch (error) {
      console.error('处理创建ZIP压缩包请求时发生错误:', error)

      return {
        success: false,
        folderName: basename(folderPath),
        error: error.message
      }
    }
  })
}