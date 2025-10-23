<template>
  <div class="user-management">
    <h2>用户管理</h2>

    <!-- 搜索和操作栏 -->
    <el-card class="toolbar">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增用户
        </el-button>
        <el-button type="danger" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </el-card>

    <!-- 用户表格 -->
    <el-card>
      <el-table
        :data="userList"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="'active'"
              :inactive-value="'inactive'"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'

const searchForm = reactive({
  username: '',
  status: ''
})

const userList = ref([])
const selectedUsers = ref([])

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

// 模拟用户数据
const mockUsers = Array.from({ length: 50 }, (_, index) => ({
  id: index + 1,
  username: `user${index + 1}`,
  email: `user${index + 1}@example.com`,
  role: index % 5 === 0 ? 'admin' : 'user',
  status: index % 10 === 0 ? 'inactive' : 'active',
  createTime: '2024-01-15'
}))

onMounted(() => {
  loadUsers()
})

const loadUsers = () => {
  // 模拟API调用
  setTimeout(() => {
    userList.value = mockUsers.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
    pagination.total = mockUsers.length
  }, 500)
}

const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

const handleReset = () => {
  Object.assign(searchForm, {
    username: '',
    status: ''
  })
  pagination.current = 1
  loadUsers()
}

const handleAdd = () => {
  ElMessage.info('新增用户功能')
}

const handleEdit = (row) => {
  ElMessage.info(`编辑用户: ${row.username}`)
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${row.username}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    ElMessage.success('删除成功')
  })
}

const handleBatchDelete = () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要删除的用户')
    return
  }
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    ElMessage.success('批量删除成功')
  })
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const handleStatusChange = (row) => {
  const statusText = row.status === 'active' ? '启用' : '禁用'
  ElMessage.success(`用户 ${row.username} 已${statusText}`)
}

const handleSizeChange = (size) => {
  pagination.size = size
  loadUsers()
}

const handleCurrentChange = (current) => {
  pagination.current = current
  loadUsers()
}
</script>

<style scoped>
.user-management h2 {
  margin-bottom: 20px;
  color: #303133;
}

.toolbar {
  margin-bottom: 20px;
}

.actions {
  margin-top: 15px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>