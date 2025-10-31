import { registerWindowHandlers } from './windowHandlers.js'
import { registerDialogHandlers } from './dialogHandlers.js'
import { registerImageHandlers } from './imageHandlers.js'
import { registerSeoHandlers } from './seoHandlers.js'
import { registerPackageHandlers } from './packageHandlers.js'

/**
 * 注册所有IPC处理程序
 */
export function registerAllHandlers() {
  console.log('开始注册IPC处理程序...')

  // 注册窗口控制处理器
  registerWindowHandlers()
  console.log('✓ 窗口控制处理器已注册')

  // 注册对话框处理器
  registerDialogHandlers()
  console.log('✓ 对话框处理器已注册')

  // 注册图片处理处理器
  registerImageHandlers()
  console.log('✓ 图片处理处理器已注册')

  // 注册SEO工具处理器
  registerSeoHandlers()
  console.log('✓ SEO工具处理器已注册')

  // 注册打包工具处理器
  registerPackageHandlers()
  console.log('✓ 打包工具处理器已注册')

  console.log('所有IPC处理程序注册完成')
}