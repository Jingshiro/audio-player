import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  saveAudioFile as dbSave,
  getAllAudioFiles as dbGetAll,
  deleteAudioFile as dbDelete,
  updateAudioFile as dbUpdate,
  loadAudioFileById as dbLoad
} from '../utils/indexedDB'

export const useLibraryStore = defineStore('library', () => {
  // 音频文件列表（元数据）
  const audioFiles = ref([])

  // 搜索
  const searchQuery = ref('')

  // 过滤
  const currentFolderId = ref(null)

  // 加载状态
  const isLoading = ref(false)

  // 计算属性
  const filteredFiles = computed(() => {
    let files = audioFiles.value

    if (currentFolderId.value) {
      files = files.filter(f => f.folderId === currentFolderId.value)
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      files = files.filter(f =>
        f.name.toLowerCase().includes(query) ||
        (f.tags && f.tags.some(t => t.toLowerCase().includes(query)))
      )
    }

    return files
  })

  // 从 IndexedDB 加载所有音频
  async function loadFromDB() {
    isLoading.value = true
    try {
      audioFiles.value = await dbGetAll()
    } catch (e) {
      console.error('从 IndexedDB 加载失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 添加音频文件
  async function addAudioFile(file) {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 将 File 转为 Blob 存入 IndexedDB
    const fileBlob = new Blob([await file.arrayBuffer()], { type: file.type })

    const audioData = {
      id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      originalName: file.name,
      fileBlob,
      duration: 0,
      lyrics: [],
      folderId: null,
      tags: [],
      createdAt: new Date().toISOString()
    }

    await dbSave(audioData)
    audioFiles.value.push(audioData)

    return audioData
  }

  // 删除音频文件
  async function removeAudioFile(id) {
    await dbDelete(id)
    audioFiles.value = audioFiles.value.filter(f => f.id !== id)
  }

  // 获取音频文件（含 Object URL）
  async function getAudioFileWithUrl(id) {
    return await dbLoad(id)
  }

  // 更新音频文件
  async function updateAudioFile(id, updates) {
    await dbUpdate(id, updates)
    const index = audioFiles.value.findIndex(f => f.id === id)
    if (index !== -1) {
      audioFiles.value[index] = { ...audioFiles.value[index], ...updates }
    }
  }

  // 添加台词到音频
  async function addLyricToAudio(audioId, lyric) {
    const file = audioFiles.value.find(f => f.id === audioId)
    if (!file) return

    const lyricId = `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newLyrics = [
      ...file.lyrics,
      {
        id: lyricId,
        name: lyric.name || '台词',
        language: lyric.language || 'zh',
        content: lyric.content,
        isDefault: file.lyrics.length === 0
      }
    ]

    await dbUpdate(audioId, { lyrics: newLyrics })
    file.lyrics = newLyrics
  }

  // 删除台词
  async function removeLyricFromAudio(audioId, lyricId) {
    const file = audioFiles.value.find(f => f.id === audioId)
    if (!file) return

    const newLyrics = file.lyrics.filter(l => l.id !== lyricId)
    if (newLyrics.length > 0 && !newLyrics.some(l => l.isDefault)) {
      newLyrics[0].isDefault = true
    }

    await dbUpdate(audioId, { lyrics: newLyrics })
    file.lyrics = newLyrics
  }

  // 设为默认台词
  async function setDefaultLyric(audioId, lyricId) {
    const file = audioFiles.value.find(f => f.id === audioId)
    if (!file) return

    const newLyrics = file.lyrics.map(l => ({
      ...l,
      isDefault: l.id === lyricId
    }))

    await dbUpdate(audioId, { lyrics: newLyrics })
    file.lyrics = newLyrics
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function setCurrentFolder(folderId) {
    currentFolderId.value = folderId
  }

  return {
    audioFiles,
    searchQuery,
    currentFolderId,
    filteredFiles,
    isLoading,
    loadFromDB,
    addAudioFile,
    removeAudioFile,
    getAudioFileWithUrl,
    updateAudioFile,
    addLyricToAudio,
    removeLyricFromAudio,
    setDefaultLyric,
    setSearchQuery,
    setCurrentFolder
  }
})
