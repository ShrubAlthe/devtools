<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h2>开发工具</h2>
      </div>
      <el-menu
        :default-active="currentRoute"
        class="sidebar-menu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/image-processing">
          <el-icon><Picture /></el-icon>
          <span>图像处理</span>
        </el-menu-item>
        <el-menu-item index="/package-tool">
          <el-icon><FolderOpened /></el-icon>
          <span>打包工具</span>
        </el-menu-item>
        <el-menu-item index="/seo-tool">
          <el-icon><Link /></el-icon>
          <span>SEO工具</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="header" ref="headerRef" @mousedown="startDrag">
        <div class="header-left">
          <h3>{{ currentTitle }}</h3>
        </div>
        <div class="header-right">
          <div class="window-controls">
            <el-button
              class="control-btn"
              size="small"
              @click="minimizeWindow"
            >
              <el-icon><Minus /></el-icon>
            </el-button>
            <el-button
              class="control-btn"
              size="small"
              @click="maximizeWindow"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
            <el-button
              class="control-btn close-btn"
              size="small"
              @click="closeWindow"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Picture, Setting, FolderOpened, Link, Minus, FullScreen, Close } from '@element-plus/icons-vue'

const route = useRoute()

const currentRoute = computed(() => route.path)

const currentTitle = computed(() => {
  const matched = route.matched[route.matched.length - 1]
  return matched?.meta?.title || '开发工具'
})

// 窗口控制方法
const minimizeWindow = () => {
  window.electronAPI.minimizeWindow()
}

const maximizeWindow = () => {
  window.electronAPI.maximizeWindow()
}

const closeWindow = () => {
  window.electronAPI.closeWindow()
}

// 窗口拖动功能
let isDragging = false

const startDrag = (e) => {
  isDragging = true

  // 开始窗口移动
  window.electronAPI.windowMoveStart()

  document.addEventListener('mouseup', stopDrag, { once: true })
}

const stopDrag = () => {
  if (isDragging) {
    // 停止窗口移动
    window.electronAPI.windowMoveEnd()
    isDragging = false
  }
}

onUnmounted(() => {
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-bottom: 1px solid #263445;
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-menu {
  border: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left h3 {
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}

.close-btn:hover {
  background-color: #f56c6c;
  color: #fff;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>