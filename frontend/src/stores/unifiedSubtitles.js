import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSubtitlesStore } from './subtitles'
import { lyricsApi, checkBackend } from '../api'

export const useUnifiedSubtitlesStore = defineStore('unifiedSubtitles', () => {
  // 统一台词列表，包含 local 和 server
  const subtitles = ref([])
  const isLoading = ref(false)
  const defaultStorage = ref(localStorage.getItem('subtitle_storage') || 'local') // 'local' | 'server'

  // 计算属性
  const localSubtitles = computed(() =>
    subtitles.value.filter(s => s.source === 'local')
  )
  const serverSubtitles = computed(() =>
    subtitles.value.filter(s => s.source === 'server')
  )
  const localCount = computed(() => localSubtitles.value.length)
  const serverCount = computed(() => serverSubtitles.value.length)

  // 加载所有台词
  async function loadAll() {
    isLoading.value = true
    try {
      const localStore = useSubtitlesStore()
      const hasServer = await checkBackend()

      // 加载本地台词
      await localStore.loadAll()
      const localSubs = localStore.subtitles.map(s => ({
        ...s,
        source: 'local'
      }))

      // 加载服务器台词
      let serverSubs = []
      if (hasServer) {
        try {
          const serverData = await lyricsApi.list()
          serverSubs = serverData.map(s => ({
            id: s.id,
            name: s.title || `台词-${s.id.slice(0, 8)}`,
            content: s.content,
            source: 'server',
            audioId: s.audio_id,
            isDefault: s.is_default === 1,
            createdAt: s.created_at
          }))
        } catch (e) {
          console.error('加载服务器台词失败:', e)
        }
      }

      subtitles.value = [...localSubs, ...serverSubs]
    } catch (e) {
      console.error('加载台词列表失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 添加台词（根据默认存储位置）
  async function addSubtitle({ name, content, source = 'import', audioId = null }) {
    if (defaultStorage.value === 'server') {
      // 保存到服务器
      try {
        const result = await lyricsApi.create({
          audioId,
          title: name,
          content,
          language: 'zh'
        })
        const newSub = {
          id: result.id,
          name: name,
          content,
          source: 'server',
          audioId,
          isDefault: false,
          createdAt: result.created_at
        }
        subtitles.value.push(newSub)
        return newSub
      } catch (e) {
        console.error('保存到服务器失败:', e)
        throw e
      }
    } else {
      // 保存到本地
      const localStore = useSubtitlesStore()
      const newSub = await localStore.addSubtitle({ name, content, source, audioId })
      subtitles.value.push({ ...newSub, source: 'local' })
      return { ...newSub, source: 'local' }
    }
  }

  // 更新台词
  async function updateSubtitle(id, updates) {
    const sub = subtitles.value.find(s => s.id === id)
    if (!sub) return null

    if (sub.source === 'server') {
      try {
        const payload = {}
        if (updates.name !== undefined) payload.title = updates.name
        if (updates.content !== undefined) payload.content = updates.content
        if (updates.audioId !== undefined) payload.audio_id = updates.audioId
        const result = await lyricsApi.update(id, payload)
        const index = subtitles.value.findIndex(s => s.id === id)
        if (index !== -1) {
          subtitles.value[index] = {
            ...subtitles.value[index],
            name: result.title || subtitles.value[index].name,
            content: result.content || subtitles.value[index].content
          }
        }
        return subtitles.value[index]
      } catch (e) {
        console.error('更新服务器台词失败:', e)
        throw e
      }
    } else {
      const localStore = useSubtitlesStore()
      const updated = await localStore.updateSubtitle(id, updates)
      if (updated) {
        const index = subtitles.value.findIndex(s => s.id === id)
        if (index !== -1) {
          subtitles.value[index] = { ...subtitles.value[index], ...updates }
        }
      }
      return subtitles.value.find(s => s.id === id)
    }
  }

  // 删除台词
  async function deleteSubtitle(id) {
    const sub = subtitles.value.find(s => s.id === id)
    if (!sub) return

    if (sub.source === 'server') {
      await lyricsApi.delete(id)
    } else {
      const localStore = useSubtitlesStore()
      await localStore.deleteSubtitle(id)
    }

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

  // 获取未绑定音频的台词
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

  // 设为默认台词
  async function setAsDefault(subtitleId) {
    const subtitle = getSubtitle(subtitleId)
    if (!subtitle || !subtitle.audioId) return

    if (subtitle.source === 'server') {
      await lyricsApi.setDefault(subtitleId)
    }

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

  // 设置默认存储位置
  function setDefaultStorage(storage) {
    defaultStorage.value = storage
  }

  // 将本地台词上传到服务器
  async function uploadLocalToServer(subtitleId, serverAudioId = null) {
    const sub = subtitles.value.find(s => s.id === subtitleId)
    if (!sub || sub.source !== 'local') throw new Error('只能上传本地台词')

    // 只有服务器音频 ID（UUID 格式）才能传给服务器，本地 ID（audio_xxx）不能传
    const isServerId = serverAudioId && !serverAudioId.startsWith('audio_')
    const result = await lyricsApi.create({
      audioId: isServerId ? serverAudioId : undefined,
      title: sub.name,
      content: sub.content,
      language: 'zh'
    })

    const newSub = {
      id: result.id,
      name: result.title || sub.name,
      content: sub.content,
      source: 'server',
      audioId: result.audio_id,
      isDefault: false,
      createdAt: result.created_at
    }
    subtitles.value.push(newSub)
    return newSub
  }

  return {
    subtitles,
    isLoading,
    defaultStorage,
    localSubtitles,
    serverSubtitles,
    localCount,
    serverCount,
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
    setAsDefault,
    setDefaultStorage,
    uploadLocalToServer
  }
})
