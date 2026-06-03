import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'
import { audioApi, checkBackend } from '../api'

export const useUnifiedLibraryStore = defineStore('unifiedLibrary', () => {
  // 统一音频列表，包含 local 和 server
  const audioFiles = ref([])
  const isLoading = ref(false)
  const searchQuery = ref('')
  const filterSource = ref('all') // 'all' | 'local' | 'server'

  // 计算属性：过滤后的文件
  const filteredFiles = computed(() => {
    let files = audioFiles.value

    if (filterSource.value !== 'all') {
      files = files.filter(f => f.source === filterSource.value)
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      files = files.filter(f =>
        f.name.toLowerCase().includes(query) ||
        (f.originalName && f.originalName.toLowerCase().includes(query))
      )
    }

    return files
  })

  // 统计
  const localCount = computed(() =>
    audioFiles.value.filter(f => f.source === 'local').length
  )
  const serverCount = computed(() =>
    audioFiles.value.filter(f => f.source === 'server').length
  )
  const localAudios = computed(() =>
    audioFiles.value.filter(f => f.source === 'local')
  )
  const serverAudios = computed(() =>
    audioFiles.value.filter(f => f.source === 'server')
  )

  // 加载所有音频（合并本地和服务器）
  async function loadAll() {
    isLoading.value = true
    try {
      const libraryStore = useLibraryStore()
      const hasServer = await checkBackend()

      // 加载本地音频
      await libraryStore.loadFromDB()
      const localFiles = libraryStore.audioFiles.map(f => ({
        ...f,
        source: 'local'
      }))

      // 加载服务器音频
      let serverFiles = []
      if (hasServer) {
        try {
          const serverData = await audioApi.list()
          serverFiles = serverData.map(f => ({
            id: f.id,
            name: f.name,
            originalName: f.original_name,
            duration: f.duration,
            source: 'server',
            folderId: f.folder_id,
            isDefault: f.is_default === 1,
            createdAt: f.created_at,
            hasFile: true
          }))
        } catch (e) {
          console.error('加载服务器音频失败:', e)
        }
      }

      // 合并
      audioFiles.value = [...localFiles, ...serverFiles]
    } catch (e) {
      console.error('加载音频列表失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 获取音频（根据来源）
  async function getAudioWithUrl(id) {
    const audio = audioFiles.value.find(f => f.id === id)
    if (!audio) return null

    if (audio.source === 'local') {
      const libraryStore = useLibraryStore()
      return await libraryStore.getAudioFileWithUrl(id)
    } else {
      // 服务器音频直接返回 URL
      return {
        ...audio,
        url: `/api/audio/${id}/stream`
      }
    }
  }

  // 获取音频的 Blob（用于 STT 等需要 base64 的场景）
  async function getAudioBlob(id) {
    const audio = audioFiles.value.find(f => f.id === id)
    if (!audio) return null

    if (audio.source === 'local') {
      const libraryStore = useLibraryStore()
      const data = await libraryStore.getAudioFileWithUrl(id)
      return data?.fileBlob || null
    } else {
      // 服务器音频：下载后返回 Blob
      try {
        const response = await fetch(`/api/audio/${id}/stream`)
        if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`)
        const blob = await response.blob()
        return blob
      } catch (e) {
        console.error('下载服务器音频失败:', e)
        return null
      }
    }
  }

  // 删除音频（服务器删除失败时回滚本地状态）
  async function removeAudio(id) {
    const audio = audioFiles.value.find(f => f.id === id)
    if (!audio) return

    if (audio.source === 'local') {
      const libraryStore = useLibraryStore()
      await libraryStore.removeAudioFile(id)
    } else {
      try {
        await audioApi.delete(id)
      } catch (e) {
        console.error('删除服务器音频失败:', e)
        throw e
      }
    }

    audioFiles.value = audioFiles.value.filter(f => f.id !== id)
  }

  // 搜索
  function setSearchQuery(query) {
    searchQuery.value = query
  }

  // 筛选来源
  function setFilterSource(source) {
    filterSource.value = source
  }

  return {
    audioFiles,
    isLoading,
    searchQuery,
    filterSource,
    filteredFiles,
    localCount,
    serverCount,
    localAudios,
    serverAudios,
    loadAll,
    getAudioWithUrl,
    getAudioBlob,
    removeAudio,
    setSearchQuery,
    setFilterSource
  }
})
