<template>
  <div class="package-tool">
    <el-card class="tool-card">
      <template #header>
        <div class="card-header">
          <span>打包工具</span>
        </div>
      </template>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="selectFolders">
            <el-icon><Folder /></el-icon>
            选择文件夹
          </el-button>
          <span class="folder-count" v-if="form.selectedFolders.length > 0">
            已选择 {{ form.selectedFolders.length }} 个文件夹
          </span>
        </div>

        <div class="toolbar-center">
          <el-input
            v-model="form.prefix"
            placeholder="文件名前缀"
            maxlength="50"
            show-word-limit
            size="small"
            style="width: 150px; margin-right: 10px;"
          />
          <el-input
            v-model="form.suffix"
            placeholder="文件名后缀"
            maxlength="50"
            show-word-limit
            size="small"
            style="width: 150px; margin-right: 10px;"
          />
        </div>

        <div class="toolbar-right">
          <el-button
            type="primary"
            @click="startPackage"
            :loading="loading"
            :disabled="form.selectedFolders.length === 0"
          >
            {{ loading ? '打包中...' : '开始打包' }}
          </el-button>
          <el-button @click="clearAll">清空</el-button>
        </div>
      </div>

      <!-- 文件夹列表表格 -->
      <div class="folder-table-section" v-if="form.selectedFolders.length > 0">
        <el-table
          :data="form.selectedFolders"
          stripe
          border
          size="small"
          class="folder-table"
        >
          <el-table-column prop="path" label="文件夹路径" min-width="300">
            <template #default="{ row }">
              <div class="folder-path">{{ row.path }}</div>
            </template>
          </el-table-column>
          <el-table-column label="压缩包名称" min-width="250">
            <template #default="{ row, $index }">
              <el-input
                v-model="row.zipName"
                placeholder="压缩包名称"
                size="small"
                @change="updateZipName($index, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column label="最终名称预览" min-width="200">
            <template #default="{ row }">
              <div class="final-name-preview">
                {{ form.prefix }}{{ row.zipName }}{{ form.suffix }}.zip
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-button
                type="danger"
                size="small"
                text
                @click="removeFolder($index)"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 打包进度条 -->
        <div class="progress-section" v-if="loading">
          <el-progress
            :percentage="progressPercentage"
            :status="progressStatus"
            :stroke-width="8"
            :show-text="true"
          />
          <div class="progress-info">
            正在处理: {{ currentProcessingFolder }}
          </div>
        </div>
      </div>

      <!-- 打包结果 -->
      <div v-if="packageResults.length > 0" class="result-section">
        <h4>打包结果</h4>
        <div class="result-list">
          <div
            v-for="(result, index) in packageResults"
            :key="index"
            class="result-item"
            :class="{ success: result.success, error: !result.success }"
          >
            <div class="result-header">
              <span class="folder-name">{{ result.folderName }}</span>
              <span class="result-status">
                {{ result.success ? '✓ 成功' : '✗ 失败' }}
              </span>
            </div>
            <div class="result-details">
              <div v-if="result.success">
                <div>压缩包: {{ result.zipFileName }}</div>
                <div>文件数量: {{ result.fileCount }} 个</div>
                <div>压缩包大小: {{ result.fileSize }}</div>
              </div>
              <div v-else>
                <div>错误: {{ result.error }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作日志 -->
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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Folder, Close } from '@element-plus/icons-vue'

const form = reactive({
  selectedFolders: [],
  prefix: '',
  suffix: ''
})

const loading = ref(false)
const logs = ref([])
const packageResults = ref([])

// 进度条相关变量
const progressPercentage = ref(0)
const progressStatus = ref('')
const currentProcessingFolder = ref('')

// 添加日志
const addLog = (message) => {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift({ time, message })
  // 限制日志数量，避免内存占用过多
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 选择文件夹
const selectFolders = async () => {
  try {
    const result = await window.electronAPI.openDirectory({
      properties: ['openDirectory', 'multiSelections']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      // 去重添加，并设置默认压缩包名称
      result.filePaths.forEach(folderPath => {
        const folderName = folderPath.split('\\').pop() || folderPath
        const existingIndex = form.selectedFolders.findIndex(f => f.path === folderPath)

        if (existingIndex === -1) {
          form.selectedFolders.push({
            path: folderPath,
            name: folderName,
            zipName: folderName
          })
        }
      })
      addLog(`添加了 ${result.filePaths.length} 个文件夹`)
    }
  } catch (error) {
    ElMessage.error('选择文件夹失败: ' + error.message)
  }
}

// 更新压缩包名称
const updateZipName = (index, value) => {
  if (form.selectedFolders[index]) {
    form.selectedFolders[index].zipName = value || form.selectedFolders[index].name
    addLog(`更新压缩包名称: ${form.selectedFolders[index].path} -> ${form.selectedFolders[index].zipName}`)
  }
}

// 移除文件夹
const removeFolder = (index) => {
  const removedFolder = form.selectedFolders[index]
  form.selectedFolders.splice(index, 1)
  addLog(`移除了文件夹: ${removedFolder.path}`)
}

// 清空所有
const clearAll = () => {
  form.selectedFolders = []
  form.prefix = ''
  form.suffix = ''
  packageResults.value = []
  logs.value = []
  progressPercentage.value = 0
  progressStatus.value = ''
  currentProcessingFolder.value = ''
  addLog('已清空所有内容')
}

// 开始打包
const startPackage = async () => {
  if (form.selectedFolders.length === 0) {
    ElMessage.warning('请至少选择一个文件夹')
    return
  }

  loading.value = true
  packageResults.value = []
  logs.value = []
  progressPercentage.value = 0
  progressStatus.value = ''
  currentProcessingFolder.value = ''

  try {
    addLog('开始批量打包...')

    const totalFolders = form.selectedFolders.length
    let processedCount = 0

    for (const folder of form.selectedFolders) {
      try {
        currentProcessingFolder.value = folder.name
        addLog(`正在处理文件夹: ${folder.path}`)

        // 更新进度条
        processedCount++
        progressPercentage.value = Math.round((processedCount / totalFolders) * 100)
        progressStatus.value = progressPercentage.value === 100 ? 'success' : ''

        const result = await window.electronAPI.createZipPackage({
          folderPath: folder.path,
          prefix: form.prefix,
          suffix: form.suffix,
          zipName: folder.zipName
        })

        if (result.success) {
          packageResults.value.push({
            success: true,
            folderName: result.folderName,
            zipFileName: result.zipFileName,
            fileCount: result.fileCount,
            fileSize: result.fileSize
          })
          addLog(`✓ 成功打包: ${result.zipFileName}`)
        } else {
          packageResults.value.push({
            success: false,
            folderName: result.folderName,
            error: result.error
          })
          addLog(`✗ 打包失败: ${result.error}`)
        }
      } catch (error) {
        packageResults.value.push({
          success: false,
          folderName: folder.name,
          error: error.message
        })
        addLog(`✗ 处理失败: ${folder.name} - ${error.message}`)
      }
    }

    const successCount = packageResults.value.filter(r => r.success).length
    const totalCount = packageResults.value.length

    if (successCount > 0) {
      ElMessage.success(`打包完成！成功 ${successCount}/${totalCount} 个文件夹`)
    } else {
      ElMessage.error('所有文件夹打包失败')
    }

  } catch (error) {
    ElMessage.error('打包过程发生错误: ' + error.message)
  } finally {
    loading.value = false
    currentProcessingFolder.value = ''
  }
}
</script>

<style scoped>
.package-tool {
  padding: 20px;
}

.tool-card {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.folder-count {
  margin-left: 15px;
  color: #409EFF;
  font-size: 14px;
  font-weight: 500;
}

.folder-table-section {
  margin: 20px 0;
}

.folder-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.folder-table :deep(.el-table__header) {
  background-color: #f5f7fa;
}

.folder-table :deep(.el-table__header th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

/* 增加表格行高 */
.folder-table :deep(.el-table__body tr) {
  height: 60px;
}

.folder-table :deep(.el-table__body td) {
  padding: 12px 8px;
}

.folder-table :deep(.el-table__body tr:hover > td) {
  background-color: #f0f9ff;
}

.folder-table :deep(.el-table__row) {
  transition: background-color 0.2s ease;
}

.folder-path {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  word-break: break-all;
  line-height: 1.4;
}

.final-name-preview {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
  background-color: #f0f9ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #b3e19d;
  word-break: break-all;
}

/* 进度条样式 */
.progress-section {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-info {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
  text-align: center;
}

.result-section {
  margin-top: 20px;
  border-top: 1px solid #e6e6e6;
  padding-top: 20px;
}

.result-section h4 {
  margin-bottom: 15px;
  color: #333;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.result-item.success {
  background-color: #f0f9ff;
  border-color: #bae7ff;
}

.result-item.error {
  background-color: #fef0f0;
  border-color: #fbc4c4;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.folder-name {
  font-weight: 600;
  color: #303133;
}

.result-status {
  font-weight: 600;
}

.result-item.success .result-status {
  color: #67c23a;
}

.result-item.error .result-status {
  color: #f56c6c;
}

.result-details {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
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