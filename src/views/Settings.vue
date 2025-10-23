<template>
  <div class="settings">
    <h2>系统设置</h2>

    <el-card>
      <el-tabs v-model="activeTab">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form :model="basicForm" label-width="120px">
            <el-form-item label="系统名称">
              <el-input v-model="basicForm.systemName" placeholder="请输入系统名称" />
            </el-form-item>
            <el-form-item label="系统版本">
              <el-input v-model="basicForm.version" placeholder="请输入系统版本" />
            </el-form-item>
            <el-form-item label="版权信息">
              <el-input v-model="basicForm.copyright" placeholder="请输入版权信息" />
            </el-form-item>
            <el-form-item label="系统描述">
              <el-input
                v-model="basicForm.description"
                type="textarea"
                :rows="4"
                placeholder="请输入系统描述"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBasicSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <el-form :model="securityForm" label-width="120px">
            <el-form-item label="密码策略">
              <el-checkbox-group v-model="securityForm.passwordPolicy">
                <el-checkbox label="requireLength">要求最小长度8位</el-checkbox>
                <el-checkbox label="requireComplexity">要求包含数字和字母</el-checkbox>
                <el-checkbox label="requireSpecialChar">要求包含特殊字符</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="会话超时">
              <el-input-number
                v-model="securityForm.sessionTimeout"
                :min="5"
                :max="480"
                controls-position="right"
              />
              <span style="margin-left: 8px">分钟</span>
            </el-form-item>
            <el-form-item label="登录失败锁定">
              <el-switch v-model="securityForm.loginLock" />
              <span style="margin-left: 8px">
                {{ securityForm.loginLock ? '启用' : '禁用' }}登录失败锁定功能
              </span>
            </el-form-item>
            <el-form-item label="最大失败次数">
              <el-input-number
                v-model="securityForm.maxFailedAttempts"
                :min="3"
                :max="10"
                :disabled="!securityForm.loginLock"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSecuritySettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 通知设置 -->
        <el-tab-pane label="通知设置" name="notification">
          <el-form :model="notificationForm" label-width="120px">
            <el-form-item label="邮件通知">
              <el-switch v-model="notificationForm.emailEnabled" />
              <span style="margin-left: 8px">
                {{ notificationForm.emailEnabled ? '启用' : '禁用' }}邮件通知
              </span>
            </el-form-item>
            <el-form-item label="SMTP服务器" v-if="notificationForm.emailEnabled">
              <el-input v-model="notificationForm.smtpServer" placeholder="smtp.example.com" />
            </el-form-item>
            <el-form-item label="端口" v-if="notificationForm.emailEnabled">
              <el-input-number
                v-model="notificationForm.smtpPort"
                :min="1"
                :max="65535"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="系统消息">
              <el-switch v-model="notificationForm.systemMessage" />
              <span style="margin-left: 8px">
                {{ notificationForm.systemMessage ? '启用' : '禁用' }}系统消息通知
              </span>
            </el-form-item>
            <el-form-item label="桌面通知">
              <el-switch v-model="notificationForm.desktopNotification" />
              <span style="margin-left: 8px">
                {{ notificationForm.desktopNotification ? '启用' : '禁用' }}桌面通知
              </span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveNotificationSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 关于系统 -->
        <el-tab-pane label="关于系统" name="about">
          <div class="about-content">
            <h3>Electron Vue3 管理系统</h3>
            <p>这是一个基于 Electron + Vue3 + Vite + Element Plus 构建的现代化桌面管理系统。</p>

            <el-descriptions title="系统信息" :column="1" border>
              <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="Electron版本">^28.0.0</el-descriptions-item>
              <el-descriptions-item label="Vue版本">^3.4.0</el-descriptions-item>
              <el-descriptions-item label="Element Plus版本">^2.5.0</el-descriptions-item>
              <el-descriptions-item label="构建工具">Vite ^5.0.0</el-descriptions-item>
              <el-descriptions-item label="最后更新">2024-01-15</el-descriptions-item>
            </el-descriptions>

            <div style="margin-top: 20px;">
              <el-button type="primary" @click="checkUpdate">检查更新</el-button>
              <el-button @click="showLicense">查看许可证</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('basic')

// 基本设置表单
const basicForm = reactive({
  systemName: 'Electron Vue3 管理系统',
  version: 'v1.0.0',
  copyright: '© 2024 Electron Vue3 Admin',
  description: '这是一个基于 Electron + Vue3 + Vite + Element Plus 构建的现代化桌面管理系统。'
})

// 安全设置表单
const securityForm = reactive({
  passwordPolicy: ['requireLength', 'requireComplexity'],
  sessionTimeout: 30,
  loginLock: true,
  maxFailedAttempts: 5
})

// 通知设置表单
const notificationForm = reactive({
  emailEnabled: false,
  smtpServer: '',
  smtpPort: 587,
  systemMessage: true,
  desktopNotification: true
})

const saveBasicSettings = () => {
  ElMessage.success('基本设置已保存')
}

const saveSecuritySettings = () => {
  ElMessage.success('安全设置已保存')
}

const saveNotificationSettings = () => {
  ElMessage.success('通知设置已保存')
}

const checkUpdate = () => {
  ElMessage.info('正在检查更新...')
}

const showLicense = () => {
  ElMessage.info('显示许可证信息')
}
</script>

<style scoped>
.settings h2 {
  margin-bottom: 20px;
  color: #303133;
}

.about-content {
  padding: 20px;
}

.about-content h3 {
  margin-bottom: 15px;
  color: #303133;
}

.about-content p {
  margin-bottom: 20px;
  color: #606266;
  line-height: 1.6;
}
</style>