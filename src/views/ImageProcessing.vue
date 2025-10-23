<template>
  <div class="image-processing">
    <h2>图像处理工具</h2>

    <el-tabs v-model="activeTab" type="card">
      <!-- 功能1: 图片压缩为WebP -->
      <el-tab-pane label="图片压缩为WebP" name="compress">
        <el-card>
          <template #header>
            <span>功能1: 图片压缩为WebP格式</span>
          </template>

          <div class="function-section">
            <el-upload
              class="upload-demo"
              drag
              multiple
              :auto-upload="false"
              :file-list="compressFileList"
              :on-change="handleCompressFileChange"
              :on-remove="handleCompressFileRemove"
              accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击选择</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 JPG、JPEG、PNG、GIF、BMP、TIFF 格式的图片文件
                </div>
              </template>
            </el-upload>

            <div class="filename-suffix">
              <el-form :model="compressForm" label-width="100px">
                <el-form-item label="文件名后缀:">
                  <el-input
                    v-model="compressForm.suffix"
                    placeholder="输入要插入到文件名后的文本"
                    maxlength="20"
                    show-word-limit
                  />
                </el-form-item>
              </el-form>
            </div>

            <div class="action-buttons">
              <el-button
                type="primary"
                :disabled="compressFileList.length === 0"
                @click="handleCompressToWebP"
                :loading="compressing"
              >
                {{ compressing ? '压缩中...' : '压缩为WebP格式' }}
              </el-button>
              <el-button @click="clearCompressFiles">清空列表</el-button>
            </div>

            <div v-if="compressResult.length > 0" class="result-section">
              <h4>压缩结果:</h4>
              <ul>
                <li v-for="(result, index) in compressResult" :key="index">
                  {{ result }}
                </li>
              </ul>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 功能2: 批量重命名并转换 -->
      <el-tab-pane label="批量重命名并转换" name="rename">
        <el-card>
          <template #header>
            <span>功能2: 批量重命名并转换</span>
          </template>

          <div class="function-section">
            <div class="folder-select">
              <el-button type="primary" @click="selectRenameFolder">
                <el-icon><Folder /></el-icon>
                选择文件夹
              </el-button>
              <span class="folder-path" v-if="renameFolderPath">
                已选择: {{ renameFolderPath }}
              </span>
            </div>

            <div class="compress-option">
              <el-checkbox v-model="renameCompressToWebp">
                压缩为WebP格式
              </el-checkbox>
              <div class="format-tip">
                支持格式: JPG, JPEG, PNG
              </div>
            </div>

            <div class="action-buttons">
              <el-button
                type="primary"
                :disabled="!renameFolderPath"
                @click="handleBatchRenameAndConvert"
                :loading="renaming"
              >
                {{ renaming ? '处理中...' : '批量重命名' }}
              </el-button>
            </div>

            <div v-if="renameResult.length > 0" class="result-section">
              <h4>处理结果:</h4>
              <ul>
                <li v-for="(result, index) in renameResult" :key="index">
                  {{ result }}
                </li>
              </ul>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 功能3: 批量名称替换 -->
      <el-tab-pane label="批量名称替换" name="replace">
        <el-card>
          <template #header>
            <span>功能3: 批量名称替换</span>
          </template>

          <div class="function-section">
            <div class="folder-select">
              <el-button type="primary" @click="selectReplaceFolder">
                <el-icon><Folder /></el-icon>
                选择文件夹
              </el-button>
              <span class="folder-path" v-if="replaceFolderPath">
                已选择: {{ replaceFolderPath }}
              </span>
            </div>

            <div class="replace-inputs">
              <el-form :model="replaceForm" label-width="100px">
                <el-form-item label="原名称:">
                  <el-input
                    v-model="replaceForm.originalName"
                    placeholder="输入要替换的文本"
                  />
                </el-form-item>
                <el-form-item label="替换名称:">
                  <el-input
                    v-model="replaceForm.replaceName"
                    placeholder="输入替换后的文本"
                  />
                </el-form-item>
              </el-form>
            </div>

            <div class="action-buttons">
              <el-button
                type="primary"
                :disabled="!replaceFolderPath || !replaceForm.originalName"
                @click="handleBatchReplaceAndConvert"
                :loading="replacing"
              >
                {{ replacing ? '处理中...' : '批量替换' }}
              </el-button>
            </div>

            <div v-if="replaceResult.length > 0" class="result-section">
              <h4>处理结果:</h4>
              <ul>
                <li v-for="(result, index) in replaceResult" :key="index">
                  {{ result }}
                </li>
              </ul>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Folder, Picture } from '@element-plus/icons-vue'

const activeTab = ref('compress')

// 功能1: 压缩相关数据
const compressFileList = ref([])
const compressing = ref(false)
const compressResult = ref([])
const compressForm = reactive({
  suffix: ''
})

// 功能2: 重命名相关数据
const renameFolderPath = ref('')
const renaming = ref(false)
const renameResult = ref([])
const renameCompressToWebp = ref(false)

// 功能3: 替换相关数据
const replaceFolderPath = ref('')
const replacing = ref(false)
const replaceResult = ref([])
const replaceForm = reactive({
  originalName: '',
  replaceName: ''
})

// 功能1: 处理文件选择
const handleCompressFileChange = (file, fileList) => {
  compressFileList.value = fileList
}

const handleCompressFileRemove = (file, fileList) => {
  compressFileList.value = fileList
}

const clearCompressFiles = () => {
  compressFileList.value = []
  compressResult.value = []
  compressForm.suffix = ''
}

// 功能1: 压缩为WebP
const handleCompressToWebP = async () => {
  if (compressFileList.value.length === 0) {
    ElMessage.warning('请先选择图片文件')
    return
  }

  compressing.value = true
  compressResult.value = []

  try {
    const { ipcRenderer } = require('electron')

    for (const file of compressFileList.value) {
      try {
        const result = await ipcRenderer.invoke('compress-to-webp', {
          filePath: file.raw.path,
          suffix: compressForm.suffix || ''
        })
        compressResult.value.push(`成功: ${file.name} -> ${result}`)
      } catch (error) {
        compressResult.value.push(`失败: ${file.name} - ${error.message}`)
      }
    }

    ElMessage.success('压缩完成')
  } catch (error) {
    ElMessage.error('压缩失败: ' + error.message)
  } finally {
    compressing.value = false
  }
}

// 功能2: 选择文件夹
const selectRenameFolder = async () => {
  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('select-folder')
    if (!result.canceled) {
      renameFolderPath.value = result.filePaths[0]
    }
  } catch (error) {
    ElMessage.error('选择文件夹失败: ' + error.message)
  }
}

// 功能2: 批量重命名并转换
const handleBatchRenameAndConvert = async () => {
  if (!renameFolderPath.value) {
    ElMessage.warning('请先选择文件夹')
    return
  }

  renaming.value = true
  renameResult.value = []

  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('batch-rename-convert', {
      folderPath: renameFolderPath.value,
      compressToWebp: renameCompressToWebp.value
    })

    if (result.success) {
      renameResult.value = result.messages
      ElMessage.success(`处理完成，共处理 ${result.processedCount} 个文件`)
    } else {
      ElMessage.error('处理失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('处理失败: ' + error.message)
  } finally {
    renaming.value = false
  }
}

// 功能3: 选择文件夹
const selectReplaceFolder = async () => {
  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('select-folder')
    if (!result.canceled) {
      replaceFolderPath.value = result.filePaths[0]
    }
  } catch (error) {
    ElMessage.error('选择文件夹失败: ' + error.message)
  }
}

// 功能3: 批量替换并转换
const handleBatchReplaceAndConvert = async () => {
  if (!replaceFolderPath.value) {
    ElMessage.warning('请先选择文件夹')
    return
  }

  if (!replaceForm.originalName) {
    ElMessage.warning('请输入原名称')
    return
  }

  replacing.value = true
  replaceResult.value = []

  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('batch-replace-convert', {
      folderPath: replaceFolderPath.value,
      originalName: replaceForm.originalName,
      replaceName: replaceForm.replaceName || ''
    })

    if (result.success) {
      replaceResult.value = result.messages
      ElMessage.success(`处理完成，共处理 ${result.processedCount} 个文件`)
    } else {
      ElMessage.error('处理失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('处理失败: ' + error.message)
  } finally {
    replacing.value = false
  }
}
</script>

<style scoped>
.image-processing h2 {
  margin-bottom: 20px;
  color: #303133;
}

.function-section {
  padding: 20px 0;
}

.upload-demo {
  margin-bottom: 20px;
}

.folder-select {
  margin-bottom: 20px;
}

.folder-path {
  margin-left: 15px;
  color: #606266;
  font-size: 14px;
}

.compress-option {
  margin: 20px 0;
}

.format-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.filename-suffix {
  margin: 20px 0;
  max-width: 500px;
}

.replace-inputs {
  margin: 20px 0;
  max-width: 400px;
}

.action-buttons {
  margin: 20px 0;
}

.result-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.result-section h4 {
  margin-bottom: 10px;
  color: #303133;
}

.result-section ul {
  margin: 0;
  padding-left: 20px;
}

.result-section li {
  margin-bottom: 5px;
  color: #606266;
}
</style>