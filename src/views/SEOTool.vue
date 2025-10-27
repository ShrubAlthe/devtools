<template>
  <div class="seo-tool">
    <el-card>
      <template #header>
        <span>SEO工具 - HTML图片标签优化</span>
      </template>

      <div class="file-selection">
        <div class="file-input">
          <el-button type="primary" @click="selectHtmlFile">
            <el-icon><Document /></el-icon>
            选择HTML文件
          </el-button>
          <span class="file-path" v-if="htmlFilePath">
            已选择: {{ htmlFilePath }}
          </span>
        </div>

        <div class="folder-input">
          <el-button type="primary" @click="selectImageFolders">
            <el-icon><Folder /></el-icon>
            选择图片目录
          </el-button>
          <span class="folder-paths" v-if="selectedFolders.length > 0">
            已选择: {{ selectedFolders.join(', ') }}
          </span>
        </div>

        <div class="action-buttons">
          <el-button
            type="primary"
            :disabled="!htmlFilePath || selectedFolders.length === 0"
            @click="parseHtmlAndImages"
            :loading="parsing"
          >
            {{ parsing ? '解析中...' : '解析HTML和图片' }}
          </el-button>
        </div>
      </div>

      <div v-if="imageGroups.length > 0" class="result-section">
        <div class="group-tabs">
          <el-tabs v-model="activeGroup" type="card">
            <el-tab-pane
              v-for="group in imageGroups"
              :key="group.name"
              :label="group.name"
              :name="group.name"
            >
              <div class="image-table-section">
                <el-table
                  :data="group.images"
                  border
                  style="width: 100%"
                  :row-class-name="tableRowClassName"
                >
                  <el-table-column prop="index" label="编号" width="80" align="center" />
                  <el-table-column label="图片预览" width="120" align="center">
                    <template #default="{ row }">
                      <div class="image-preview">
                        <img
                          v-if="row.previewPath"
                          :src="row.previewPath"
                          :alt="row.alt"
                          class="preview-image"
                        />
                        <div v-else class="no-preview">
                          <el-icon><Picture /></el-icon>
                          <span>无预览</span>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="图片名称" min-width="200">
                    <template #default="{ row }">
                      <div class="image-name-input">
                        <el-input
                          v-model="row.imageNameWithoutExt"
                          @change="handleImageNameChange(row)"
                          placeholder="图片名称"
                          style="margin-right: 8px;"
                        />
                        <span class="image-extension">{{ row.imageExt }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="alt标签" min-width="200">
                    <template #default="{ row }">
                      <el-input
                        v-model="row.alt"
                        @change="handleAltChange(row)"
                        placeholder="alt标签"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="后缀匹配" width="120" align="center">
                    <template #default="{ row }">
                      <el-input
                        v-model="row.suffixMatch"
                        @change="handleSuffixChange(row)"
                        placeholder=".png"
                        size="small"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="120" align="center">
                    <template #default="{ row }">
                      <el-button
                        type="warning"
                        size="small"
                        @click="revertChanges(row)"
                        :disabled="!row.saved"
                      >
                        撤回
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column prop="originalPath" label="原路径" min-width="300" show-overflow-tooltip />
                </el-table>

                <div class="save-section">
                  <div class="save-button-container">
                    <el-button
                      type="primary"
                      @click="saveChanges(group.name)"
                      :loading="saving"
                      :disabled="!hasChanges(group.name)"
                      class="save-button"
                    >
                      {{ saving ? '保存中...' : '保存修改' }}
                    </el-button>
                    <span v-if="hasChanges(group.name)" class="changes-hint">
                      * 有未保存的修改
                    </span>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <div v-if="errorMessage" class="error-section">
        <el-alert :title="errorMessage" type="error" show-icon />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, toRaw } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Folder, Picture } from '@element-plus/icons-vue'

const htmlFilePath = ref('')
const selectedFolders = ref([])
const parsing = ref(false)
const saving = ref(false)
const activeGroup = ref('')
const errorMessage = ref('')

const imageGroups = ref([])

// 选择HTML文件
const selectHtmlFile = async () => {
  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('dialog:openFile', {
      filters: [
        { name: 'HTML Files', extensions: ['html', 'htm'] }
      ]
    })
    if (!result.canceled) {
      htmlFilePath.value = result.filePaths[0]
      errorMessage.value = ''
    }
  } catch (error) {
    ElMessage.error('选择HTML文件失败: ' + error.message)
  }
}

// 选择图片目录
const selectImageFolders = async () => {
  try {
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('dialog:openDirectory', {
      properties: ['openDirectory', 'multiSelections']
    })
    if (!result.canceled) {
      selectedFolders.value = result.filePaths
      errorMessage.value = ''
    }
  } catch (error) {
    ElMessage.error('选择图片目录失败: ' + error.message)
  }
}

// 解析HTML和图片
const parseHtmlAndImages = async () => {
  if (!htmlFilePath.value) {
    ElMessage.warning('请先选择HTML文件')
    return
  }
  if (selectedFolders.value.length === 0) {
    ElMessage.warning('请先选择图片目录')
    return
  }

  parsing.value = true
  imageGroups.value = []
  errorMessage.value = ''

  try {
    const { ipcRenderer } = require('electron')
    console.log('开始解析HTML和图片...')
    console.log('HTML文件路径:', htmlFilePath.value)
    console.log('图片目录:', selectedFolders.value)

    // 使用最原始的方式创建新数组确保数据可克隆
    const imageFoldersArray = []
    for (let i = 0; i < selectedFolders.value.length; i++) {
      imageFoldersArray.push(selectedFolders.value[i])
    }
    console.log('转换后的图片目录:', imageFoldersArray)

    // 逐个参数测试
    console.log('测试参数1: htmlFilePath')
    const test1 = await ipcRenderer.invoke('parse-html-images', {
      htmlFilePath: htmlFilePath.value,
      imageFolders: []
    })
    console.log('测试1结果:', test1)

    console.log('测试参数2: imageFolders')
    const test2 = await ipcRenderer.invoke('parse-html-images', {
      htmlFilePath: '',
      imageFolders: imageFoldersArray
    })
    console.log('测试2结果:', test2)

    // 完整调用
    const result = await ipcRenderer.invoke('parse-html-images', {
      htmlFilePath: htmlFilePath.value,
      imageFolders: imageFoldersArray
    })

    console.log('解析结果:', result)

    if (result.success) {
      // 确保数据具有响应性
      imageGroups.value = result.groups.map(group => ({
        ...group,
        images: group.images.map(image => {
          // 分离图片名称和后缀
          const lastDotIndex = image.imageName.lastIndexOf('.')
          const imageNameWithoutExt = lastDotIndex > 0 ? image.imageName.substring(0, lastDotIndex) : image.imageName
          const imageExt = lastDotIndex > 0 ? image.imageName.substring(lastDotIndex) : ''

          return {
            ...image,
            imageNameWithoutExt: imageNameWithoutExt, // 只存储名称部分
            imageExt: imageExt, // 存储后缀部分
            originalImageName: image.imageName, // 保存原始图片名称
            originalImageNameWithoutExt: imageNameWithoutExt, // 保存原始名称部分
            originalImageExt: imageExt, // 保存原始后缀部分
            originalAlt: image.alt, // 保存原始alt
            originalSuffixMatch: '.png', // 初始化后缀匹配
            suffixMatch: '.png', // 后缀匹配输入框，默认值为.png
            modified: false,
            saved: false // 新增：标记是否已保存过修改
          }
        })
      }))

      if (imageGroups.value.length > 0) {
        activeGroup.value = imageGroups.value[0].name
      }

      // 调试：检查第一个图片的数据
      if (imageGroups.value.length > 0 && imageGroups.value[0].images.length > 0) {
        const firstImage = imageGroups.value[0].images[0]
        console.log('第一个图片的数据:', {
          index: firstImage.index,
          originalPath: firstImage.originalPath,
          imageName: firstImage.imageName,
          alt: firstImage.alt,
          groupName: firstImage.groupName,
          modified: firstImage.modified
        })
      }

      ElMessage.success(`解析完成，共找到 ${result.totalImages} 个图片标签`)
    } else {
      errorMessage.value = result.error
      ElMessage.error('解析失败: ' + result.error)
    }
  } catch (error) {
    console.error('解析错误详情:', error)
    errorMessage.value = `IPC通信错误: ${error.message}`
    ElMessage.error('解析失败: ' + error.message)
  } finally {
    parsing.value = false
  }
}

// 处理图片名称修改
const handleImageNameChange = (row) => {
  row.modified = true
}

// 处理alt标签修改
const handleAltChange = (row) => {
  row.modified = true
}

// 处理后缀匹配修改
const handleSuffixChange = (row) => {
  row.modified = true
}

// 撤回修改
const revertChanges = async (row) => {
  try {
    const { ipcRenderer } = require('electron')

    // 创建可序列化的撤回数据
    const revertData = {
      htmlFilePath: String(htmlFilePath.value),
      groupName: String(row.groupName),
      image: {
        index: row.index,
        originalPath: row.originalPath,
        imageName: row.imageNameWithoutExt + row.imageExt, // 当前修改后的完整名称
        originalImageName: row.originalImageName, // 原始完整名称
        alt: row.alt, // 当前修改后的alt
        originalAlt: row.originalAlt, // 原始alt
        suffixMatch: row.suffixMatch || '',
        pictureHtml: row.pictureHtml
      },
      imageFolders: Array.from(selectedFolders.value).map(folder => String(folder))
    }

    console.log('撤回修改，传递的数据:', JSON.parse(JSON.stringify(revertData)))

    const result = await ipcRenderer.invoke('revert-seo-changes', revertData)

    if (result.success) {
      // 恢复UI数据
      row.imageNameWithoutExt = row.originalImageNameWithoutExt
      row.imageExt = row.originalImageExt
      row.alt = row.originalAlt || ''
      row.suffixMatch = row.originalSuffixMatch || ''
      row.modified = false
      row.saved = false // 撤回后禁用撤回按钮

      ElMessage.success('修改已撤回')
    } else {
      ElMessage.error('撤回失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('撤回失败: ' + error.message)
  }
}

// 检查是否有未保存的修改
const hasChanges = (groupName) => {
  const group = imageGroups.value.find(g => g.name === groupName)
  return group && group.images.some(img => img.modified)
}

// 保存修改
const saveChanges = async (groupName) => {
  const group = imageGroups.value.find(g => g.name === groupName)
  if (!group) return

  const modifiedImages = group.images.filter(img => img.modified)
  if (modifiedImages.length === 0) {
    ElMessage.warning('没有需要保存的修改')
    return
  }

  saving.value = true

  try {
    const { ipcRenderer } = require('electron')

    // 创建可序列化的图片对象
    const serializableImages = modifiedImages.map(img => ({
      index: img.index,
      originalPath: img.originalPath,
      imageName: img.imageNameWithoutExt + img.imageExt, // 组合名称和后缀
      alt: img.alt,
      groupName: img.groupName,
      pictureHtml: img.pictureHtml,
      suffixMatch: img.suffixMatch || ''
    }))

    // 确保所有数据都是可序列化的
    const serializableData = {
      htmlFilePath: String(htmlFilePath.value),
      groupName: String(groupName),
      images: serializableImages,
      imageFolders: Array.from(selectedFolders.value).map(folder => String(folder))
    }

    console.log('保存修改，传递的数据:', JSON.parse(JSON.stringify(serializableData)))

    const result = await ipcRenderer.invoke('save-seo-changes', serializableData)

    if (result.success) {
      // 重置修改状态，但不更新原始数据，以便撤回功能可以回滚到原始状态
      modifiedImages.forEach(img => {
        img.modified = false
        img.saved = true // 标记为已保存，启用撤回按钮
        // 注意：这里不更新 originalImageName、originalAlt、originalSuffixMatch
        // 这样撤回按钮可以回滚到真正的原始状态
      })
      ElMessage.success('保存成功')
    } else {
      ElMessage.error('保存失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 表格行样式
const tableRowClassName = ({ row }) => {
  return row.modified ? 'modified-row' : ''
}
</script>

<style scoped>
.seo-tool {
  padding: 20px;
}

.file-selection {
  margin-bottom: 30px;
}

.file-input,
.folder-input {
  margin-bottom: 20px;
}

.file-path,
.folder-paths {
  margin-left: 15px;
  color: #606266;
  font-size: 14px;
}

.action-buttons {
  margin: 20px 0;
}

.result-section {
  margin-top: 30px;
}

.group-tabs {
  margin-top: 20px;
}

.image-table-section {
  padding: 20px 0;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #909399;
  font-size: 12px;
}

.save-section {
  margin-top: 20px;
  position: relative;
  height: 60px;
}

.save-button-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #ebeef5;
  z-index: 1000;
}

.save-button {
  min-width: 120px;
}

.changes-hint {
  color: #e6a23c;
  font-size: 14px;
  font-weight: 500;
}

.error-section {
  margin-top: 20px;
}

:deep(.modified-row) {
  background-color: #f0f9ff !important;
}

.image-name-input {
  display: flex;
  align-items: center;
}

.image-extension {
  color: #909399;
  font-size: 14px;
  white-space: nowrap;
}
</style>