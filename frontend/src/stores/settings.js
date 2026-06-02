import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, checkBackend } from '../api'

export const useSettingsStore = defineStore('settings', () => {
  const subtitleStorage = ref('local') // 'local' | 'server'
  const hasBackend = ref(false)

  // 加载设置
  async function loadSettings() {
    hasBackend.value = await checkBackend()
    if (hasBackend.value) {
      try {
        const settings = await settingsApi.get()
        subtitleStorage.value = settings.subtitle_storage || 'local'
      } catch (e) {
        console.error('加载设置失败:', e)
      }
    } else {
      // 纯前端模式，从 localStorage 读取
      subtitleStorage.value = localStorage.getItem('subtitle_storage') || 'local'
    }
  }

  // 保存台词存储位置
  async function saveSubtitleStorage(storage) {
    subtitleStorage.value = storage
    localStorage.setItem('subtitle_storage', storage)
    if (hasBackend.value) {
      await settingsApi.set('subtitle_storage', storage)
    }
  }

  return {
    subtitleStorage,
    hasBackend,
    loadSettings,
    saveSubtitleStorage
  }
})
