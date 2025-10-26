import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/image-processing',
    mater: { title: '开发工具', icon: 'Home' },
    children: [
      {
        path: 'image-processing',
        name: 'ImageProcessing',
        component: () => import('@/views/ImageProcessing.vue'),
        meta: { title: '图像处理', icon: 'Picture' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting' }
      },
      {
        path: 'package-tool',
        name: 'PackageTool',
        component: () => import('@/views/PackageTool.vue'),
        meta: { title: '打包工具', icon: 'FolderOpened' }
      },
      {
        path: 'seo-tool',
        name: 'SEOTool',
        component: () => import('@/views/SEOTool.vue'),
        meta: { title: 'SEO工具', icon: 'Link' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router