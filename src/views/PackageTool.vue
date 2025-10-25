<template>
  <div class="package-tool">
    <el-card class="tool-card">
      <template #header>
        <div class="card-header">
          <span>打包工具</span>
        </div>
      </template>

      <!-- 目录选择 -->
      <el-form :model="form" label-width="120px">
        <el-form-item label="项目目录">
          <el-input v-model="form.projectPath" placeholder="请选择项目目录" readonly>
            <template #append>
              <el-button @click="selectProjectPath">选择目录</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="输出目录">
          <el-input v-model="form.outputPath" placeholder="请选择输出目录" readonly>
            <template #append>
              <el-button @click="selectOutputPath">选择目录</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="startPackage" :loading="loading">
            {{ loading ? '打包中...' : '开始打包' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 日志输出 -->
      <div class="log-section">
        <h4>操作日志</h4>
        <div class="log-content">
          <div v-for="(log, index) in logs" :key="index" class="log-item">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')

const form = reactive({
  projectPath: '',
  outputPath: ''
})

const loading = ref(false)
const logs = ref([])

// 添加日志
const addLog = (message) => {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift({ time, message })
  // 限制日志数量，避免内存占用过多
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 选择项目目录
const selectProjectPath = async () => {
  try {
    const result = await ipcRenderer.invoke('select-folder')
    if (!result.canceled && result.filePaths.length > 0) {
      form.projectPath = result.filePaths[0]
    }
  } catch (error) {
    ElMessage.error('选择目录失败: ' + error.message)
  }
}

// 选择输出目录
const selectOutputPath = async () => {
  try {
    const result = await ipcRenderer.invoke('select-folder')
    if (!result.canceled && result.filePaths.length > 0) {
      form.outputPath = result.filePaths[0]
    }
  } catch (error) {
    ElMessage.error('选择目录失败: ' + error.message)
  }
}

// 合并JS和CSS文件
const mergeJsCss = async (runPath) => {
  try {
    const oneJSPath = path.join(runPath, 'one-js')
    const oneCSSPath = path.join(runPath, 'one-css')
    const oneAllJSPath = path.join(runPath, 'zip', 'js', 'one-all.js')
    const oneAllCSSPath = path.join(runPath, 'zip', 'css', 'one-all.css')

    // 确保目标目录存在
    const jsDir = path.dirname(oneAllJSPath)
    const cssDir = path.dirname(oneAllCSSPath)
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true })
    }
    if (!fs.existsSync(cssDir)) {
      fs.mkdirSync(cssDir, { recursive: true })
    }

    // 合并JS文件
    if (fs.existsSync(oneJSPath)) {
      const jsFiles = fs.readdirSync(oneJSPath).filter(file =>
        file.endsWith('.js') && fs.statSync(path.join(oneJSPath, file)).isFile()
      )

      let jsContent = ''
      for (const file of jsFiles) {
        const filePath = path.join(oneJSPath, file)
        const content = fs.readFileSync(filePath, 'utf8')
        jsContent += content + '\n'
      }

      fs.writeFileSync(oneAllJSPath, jsContent)
      addLog(`合并完成JS: ${jsFiles.length} 个文件`)
    } else {
      addLog('未找到one-js目录，跳过JS合并')
    }

    // 合并CSS文件
    if (fs.existsSync(oneCSSPath)) {
      const cssFiles = fs.readdirSync(oneCSSPath).filter(file =>
        file.endsWith('.css') && fs.statSync(path.join(oneCSSPath, file)).isFile()
      )

      let cssContent = ''
      for (const file of cssFiles) {
        const filePath = path.join(oneCSSPath, file)
        const content = fs.readFileSync(filePath, 'utf8')
        cssContent += content + '\n'
      }

      fs.writeFileSync(oneAllCSSPath, cssContent)
      addLog(`合并完成CSS: ${cssFiles.length} 个文件`)
    } else {
      addLog('未找到one-css目录，跳过CSS合并')
    }

  } catch (error) {
    throw new Error(`合并JS/CSS失败: ${error.message}`)
  }
}

// 复制目录
const copyDirectory = (source, target) => {
  if (!fs.existsSync(source)) {
    return
  }

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true })
  }

  const files = fs.readdirSync(source)

  for (const file of files) {
    const sourcePath = path.join(source, file)
    const targetPath = path.join(target, file)

    const stat = fs.statSync(sourcePath)

    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath)
    } else {
      fs.copyFileSync(sourcePath, targetPath)
    }
  }
}

// 处理HTML文件
const processHtmlFile = (sourceHtmlPath, targetHtmlPath) => {
  if (!fs.existsSync(sourceHtmlPath)) {
    throw new Error('HTML文件不存在: ' + sourceHtmlPath)
  }

  let htmlContent = fs.readFileSync(sourceHtmlPath, 'utf8')

  // 移除 <!-- one remove begin --> 和 <!-- one remove end --> 之间的内容
  const pattern = /<!-- one remove begin -->[\s\S]*?<!-- one remove end -->/g
  htmlContent = htmlContent.replace(pattern, '')

  fs.writeFileSync(targetHtmlPath, htmlContent)
}

// 创建ZIP压缩包
const createZipPackage = async (publishPath) => {
  try {
    const archiver = require('archiver')
    const projectName = path.basename(publishPath)
    const zipPath = path.join(path.dirname(publishPath), `${projectName}.zip`)

    addLog(`开始创建ZIP压缩包: ${zipPath}`)

    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    })

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        addLog(`ZIP压缩包创建完成，大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`)
        resolve()
      })

      archive.on('error', (err) => {
        reject(new Error(`创建ZIP压缩包失败: ${err.message}`))
      })

      archive.pipe(output)

      // 添加发布目录中的所有文件到ZIP包
      archive.directory(publishPath, projectName)

      archive.finalize()
    })
  } catch (error) {
    throw new Error(`创建ZIP压缩包失败: ${error.message}`)
  }
}

// 开始打包
const startPackage = async () => {
  if (!form.projectPath) {
    ElMessage.warning('请选择项目目录')
    return
  }

  if (!form.outputPath) {
    ElMessage.warning('请选择输出目录')
    return
  }

  loading.value = true
  logs.value = []

  try {
    addLog('开始打包...')

    // 1. 合并JS和CSS
    await mergeJsCss(form.projectPath)

    // 2. 创建发布目录
    const projectName = path.basename(form.projectPath)
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14)
    const publishPath = path.join(form.outputPath, `${projectName}-${timestamp}`)

    if (!fs.existsSync(publishPath)) {
      fs.mkdirSync(publishPath, { recursive: true })
    }
    addLog(`发布文件夹创建: ${publishPath}`)

    // 3. 复制必要目录
    const directoriesToCopy = ['js', 'css', 'zip', 'static']
    for (const dir of directoriesToCopy) {
      const sourceDir = path.join(form.projectPath, dir)
      const targetDir = path.join(publishPath, dir)

      if (fs.existsSync(sourceDir)) {
        copyDirectory(sourceDir, targetDir)
        addLog(`复制完成 ${dir}`)
      } else {
        addLog(`跳过 ${dir} 目录（不存在）`)
      }
    }

    // 4. 复制favicon.ico文件
    const faviconSourcePath = path.join(form.projectPath, 'favicon.ico')
    const faviconTargetPath = path.join(publishPath, 'favicon.ico')
    if (fs.existsSync(faviconSourcePath)) {
      fs.copyFileSync(faviconSourcePath, faviconTargetPath)
      addLog('复制完成 favicon.ico')
    } else {
      addLog('跳过 favicon.ico（不存在）')
    }

    // 4. 处理HTML文件
    const sourceHtmlPath = path.join(form.projectPath, 'index.html')
    const targetHtmlPath = path.join(publishPath, 'index.html')

    if (fs.existsSync(sourceHtmlPath)) {
      processHtmlFile(sourceHtmlPath, targetHtmlPath)
      addLog('处理完成HTML')
    } else {
      addLog('跳过HTML处理（index.html不存在）')
    }

    // 6. 整体打包为zip
    await createZipPackage(publishPath)

    addLog('打包完成！')
    ElMessage.success('打包完成！')

  } catch (error) {
    addLog(`打包失败: ${error.message}`)
    ElMessage.error(`打包失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  addLog('打包工具已就绪')
})
</script>

<style scoped>
.package-tool {
  padding: 20px;
}

.tool-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-section {
  margin-top: 20px;
  border-top: 1px solid #e6e6e6;
  padding-top: 20px;
}

.log-section h4 {
  margin-bottom: 10px;
  color: #333;
}

.log-content {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
}

.log-time {
  color: #909399;
  margin-right: 10px;
  min-width: 80px;
}

.log-message {
  color: #606266;
  word-break: break-all;
}
</style>