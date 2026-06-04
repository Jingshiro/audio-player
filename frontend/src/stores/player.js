import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 播放进度持久化 key
const STORAGE_KEY = 'player_state'

function loadPlayerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function savePlayerState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded, ignore */ }
}

export const usePlayerStore = defineStore('player', () => {
  // 音频元素引用
  const audioElement = ref(null)

  // 当前播放的音频文件
  const currentTrack = ref(null)

  // 播放状态
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const previousVolume = ref(0.8)

  // 台词
  const lyrics = ref([]) // { time, content }[]
  const currentLyricIndex = ref(-1)
  let lastLyricSearchIndex = 0 // 二分查找缓存

  // 多台词支持
  const lyricSources = ref([]) // { id, name, language, content }[]
  const activeLyricIndex = ref(0)

  // 播放列表
  const playlist = ref([]) // { id, name, file, url }[]
  const currentIndex = ref(-1)

  // 进度保存节流
  let lastSaveTime = 0

  // 计算属性
  const currentLyricSource = computed(() => {
    return lyricSources.value[activeLyricIndex.value] || null
  })

  const progress = computed(() => {
    if (!duration.value) return 0
    return (currentTime.value / duration.value) * 100
  })

  const currentLyric = computed(() => {
    if (currentLyricIndex.value >= 0 && currentLyricIndex.value < lyrics.value.length) {
      return lyrics.value[currentLyricIndex.value]
    }
    return null
  })

  // Media Session API - 后台播放支持
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return

    const track = currentTrack.value
    if (!track) return

    // 设置元数据（通知栏/锁屏显示）
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name || '未知音频',
      artist: '本地音频',
      album: '音声播放器',
    })

    // 注册操作处理
    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
  }

  // 操作方法
  let currentAudioRef = null
  let savedListeners = {}

  function setAudioElement(el) {
    // 移除旧监听器
    if (currentAudioRef) {
      for (const [event, handler] of Object.entries(savedListeners)) {
        currentAudioRef.removeEventListener(event, handler)
      }
      savedListeners = {}
    }
    audioElement.value = el
    currentAudioRef = el
    setupAudioListeners()
  }

  function setupAudioListeners() {
    const audio = audioElement.value
    if (!audio) return

    // 恢复上次播放状态
    const saved = loadPlayerState()
    if (saved) {
      volume.value = saved.volume ?? 0.8
      isMuted.value = saved.isMuted ?? false
      previousVolume.value = saved.previousVolume ?? 0.8
      audio.volume = saved.isMuted ? 0 : (saved.volume ?? 0.8)
    }

    savedListeners = {
      play: () => {
        isPlaying.value = true
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing'
        }
      },
      pause: () => {
        isPlaying.value = false
        persistState()
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused'
        }
      },
      timeupdate: () => {
        currentTime.value = audio.currentTime
        updateCurrentLyricIndex()
        const now = Date.now()
        if (now - lastSaveTime > 5000) {
          lastSaveTime = now
          persistState()
        }
      },
      loadedmetadata: () => { duration.value = audio.duration },
      ended: () => { isPlaying.value = false; playNext() }
    }

    for (const [event, handler] of Object.entries(savedListeners)) {
      audio.addEventListener(event, handler)
    }

    audio.volume = volume.value
  }

  // 保存播放状态到 localStorage
  function persistState() {
    savePlayerState({
      trackId: currentTrack.value?.id,
      trackName: currentTrack.value?.name,
      currentTime: currentTime.value,
      volume: volume.value,
      isMuted: isMuted.value,
      previousVolume: previousVolume.value,
      savedAt: Date.now()
    })
  }

  // 二分查找当前歌词行（带缓存优化）
  function updateCurrentLyricIndex() {
    const time = currentTime.value
    const arr = lyrics.value
    if (arr.length === 0) {
      currentLyricIndex.value = -1
      return
    }

    // 从上次位置开始，先向后找（播放是前进的）
    let idx = lastLyricSearchIndex
    if (idx < 0) idx = 0
    if (idx >= arr.length) idx = arr.length - 1

    // 向后找（时间增加）
    while (idx < arr.length - 1 && arr[idx + 1].time <= time) {
      idx++
    }
    // 向前找（时间倒退/seek）
    while (idx > 0 && arr[idx].time > time) {
      idx--
    }

    lastLyricSearchIndex = idx
    currentLyricIndex.value = idx
  }

  // 播放控制
  function play() {
    audioElement.value?.play()
  }

  function pause() {
    audioElement.value?.pause()
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function seek(time) {
    if (audioElement.value) {
      audioElement.value.currentTime = time
      currentTime.value = time
    }
  }

  function setVolume(vol) {
    volume.value = vol
    if (audioElement.value) {
      audioElement.value.volume = vol
    }
    if (vol > 0) {
      isMuted.value = false
      previousVolume.value = vol
    }
  }

  function toggleMute() {
    if (isMuted.value) {
      setVolume(previousVolume.value || 0.8)
      isMuted.value = false
    } else {
      previousVolume.value = volume.value
      setVolume(0)
      isMuted.value = true
    }
  }

  // 音频加载（支持断点续播）
  function loadTrack(track, resume = true) {
    currentTrack.value = track
    setupMediaSession()
    if (audioElement.value && track?.url) {
      audioElement.value.src = track.url
      audioElement.value.load()

      // 检查是否有保存的进度
      const saved = loadPlayerState()
      if (resume && saved && saved.trackId === track.id && saved.currentTime > 0) {
        // 恢复到上次播放位置
        const resumeTime = saved.currentTime
        audioElement.value.addEventListener('loadedmetadata', () => {
          audioElement.value.currentTime = resumeTime
          currentTime.value = resumeTime
        }, { once: true })
      } else {
        currentTime.value = 0
      }

      duration.value = 0
      isPlaying.value = false
      lastLyricSearchIndex = 0
    }
  }

  function addToPlaylist(track) {
    playlist.value.push(track)
  }

  function removeFromPlaylist(index) {
    playlist.value.splice(index, 1)
    if (currentIndex.value >= playlist.value.length) {
      currentIndex.value = playlist.value.length - 1
    }
  }

  function playNext() {
    if (playlist.value.length === 0) return
    const nextIndex = currentIndex.value + 1
    if (nextIndex < playlist.value.length) {
      currentIndex.value = nextIndex
      loadTrack(playlist.value[nextIndex])
      play()
    }
  }

  function playPrev() {
    if (playlist.value.length === 0) return
    const prevIndex = currentIndex.value - 1
    if (prevIndex >= 0) {
      currentIndex.value = prevIndex
      loadTrack(playlist.value[prevIndex])
      play()
    }
  }

  // 台词管理
  function setLyrics(newLyrics) {
    lyrics.value = newLyrics
    currentLyricIndex.value = -1
  }

  function addLyricSource(source) {
    lyricSources.value.push(source)
  }

  function setActiveLyric(index) {
    activeLyricIndex.value = index
    if (lyricSources.value[index]?.lyrics) {
      setLyrics(lyricSources.value[index].lyrics)
    }
  }

  function updateLyricLine(index, newContent) {
    if (index >= 0 && index < lyrics.value.length) {
      lyrics.value[index] = { ...lyrics.value[index], content: newContent }
    }
  }

  function updateLyricTime(index, newTime) {
    if (index >= 0 && index < lyrics.value.length) {
      lyrics.value[index] = { ...lyrics.value[index], time: newTime }
      // 重新排序
      lyrics.value.sort((a, b) => a.time - b.time)
    }
  }

  function addLyricLine(index, time, content) {
    lyrics.value.splice(index, 0, { time, content })
    lyrics.value.sort((a, b) => a.time - b.time)
  }

  function removeLyricLine(index) {
    lyrics.value.splice(index, 1)
  }

  function clearLyrics() {
    lyrics.value = []
    lyricSources.value = []
    currentLyricIndex.value = -1
    activeLyricIndex.value = 0
  }

  return {
    // 状态
    audioElement,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    lyrics,
    currentLyricIndex,
    lyricSources,
    activeLyricIndex,
    playlist,
    currentIndex,

    // 计算属性
    currentLyricSource,
    progress,
    currentLyric,

    // 方法
    setAudioElement,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    loadTrack,
    addToPlaylist,
    removeFromPlaylist,
    playNext,
    playPrev,
    setLyrics,
    addLyricSource,
    setActiveLyric,
    updateLyricLine,
    updateLyricTime,
    addLyricLine,
    removeLyricLine,
    clearLyrics
  }
})
