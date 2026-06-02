import { defineStore } from 'pinia'
import { ref } from 'vue'

const DB_NAME = 'audio-player-db'
const DB_VERSION = 2
const STORE_NAME = 'subtitles'

let db = null

async function openDB() {
  if (db) return db
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { db = request.result; resolve(db) }
    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export const useSubtitlesStore = defineStore('subtitles', () => {
  const subtitles = ref([])
  const isLoading = ref(false)

  // 加载所有台词
  async function loadAll() {
    isLoading.value = true
    try {
      const database = await openDB()
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          subtitles.value = request.result
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.error('加载台词库失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 添加台词
  async function addSubtitle({ name, content, source = 'import', audioId = null }) {
    const id = `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const subtitle = {
      id,
      name,
      content,
      source,  // 'stt' | 'translate' | 'import'
      audioId, // 关联的音频 ID
      isDefault: false,
      createdAt: new Date().toISOString()
    }
    const database = await openDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise((resolve, reject) => {
      const request = store.put(subtitle)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    subtitles.value.push(subtitle)
    return subtitle
  }

  // 更新台词
  async function updateSubtitle(id, updates) {
    const index = subtitles.value.findIndex(s => s.id === id)
    if (index === -1) return null

    const updated = { ...subtitles.value[index], ...updates }
    const database = await openDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise((resolve, reject) => {
      const request = store.put(updated)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    subtitles.value[index] = updated
    return updated
  }

  // 删除台词
  async function deleteSubtitle(id) {
    const database = await openDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    subtitles.value = subtitles.value.filter(s => s.id !== id)
  }

  // 重命名台词
  async function renameSubtitle(id, newName) {
    return updateSubtitle(id, { name: newName })
  }

  // 获取台词
  function getSubtitle(id) {
    return subtitles.value.find(s => s.id === id)
  }

  // 获取音频关联的台词
  function getSubtitlesByAudio(audioId) {
    return subtitles.value.filter(s => s.audioId === audioId)
  }

  // 获取未关联的台词
  function getUnlinkedSubtitles() {
    return subtitles.value.filter(s => !s.audioId)
  }

  // 绑定台词到音频
  async function linkToAudio(subtitleId, audioId) {
    return updateSubtitle(subtitleId, { audioId })
  }

  // 解绑台词
  async function unlinkFromAudio(subtitleId) {
    return updateSubtitle(subtitleId, { audioId: null })
  }

  // 设为默认台词（同时取消同音频其他台词的默认状态）
  async function setAsDefault(subtitleId) {
    const subtitle = getSubtitle(subtitleId)
    if (!subtitle || !subtitle.audioId) return

    // 取消同音频其他台词的默认状态
    const siblings = getSubtitlesByAudio(subtitle.audioId)
    for (const s of siblings) {
      if (s.isDefault && s.id !== subtitleId) {
        await updateSubtitle(s.id, { isDefault: false })
      }
    }

    // 设置当前为默认
    return updateSubtitle(subtitleId, { isDefault: true })
  }

  return {
    subtitles,
    isLoading,
    loadAll,
    addSubtitle,
    updateSubtitle,
    deleteSubtitle,
    renameSubtitle,
    getSubtitle,
    getSubtitlesByAudio,
    getUnlinkedSubtitles,
    linkToAudio,
    unlinkFromAudio,
    setAsDefault
  }
})
