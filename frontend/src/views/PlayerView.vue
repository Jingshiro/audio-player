<template>
  <div class="player-view" :class="{ 'lyrics-mode': lyricsMode }"
    @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <!-- 左侧信息区 -->
    <div class="player-left">
      <!-- 封面/唱片（手机端点击切换歌词全屏） -->
      <div class="disc-container disc-tap-area" @click="toggleLyricsMode">
        <div class="disc" :class="{ playing: playerStore.isPlaying }">
          <div class="disc-center"></div>
        </div>
        <!-- 手机端碟片上的可点击提示图标 -->
        <div class="disc-tap-hint">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 15h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>
        </div>
      </div>

      <!-- 音频信息 -->
      <div class="track-info">
        <div class="track-name">{{ playerStore.currentTrack?.name || '未选择音频' }}</div>
        <div class="track-artist">{{ playerStore.currentTrack ? '本地音频' : '请导入音频文件' }}</div>
      </div>

      <!-- 进度条 -->
      <div class="progress-container">
        <div class="progress-bar" ref="progressBarRef"
          @pointerdown="onProgressDown" @pointermove="onProgressMove" @pointerup="onProgressUp">
          <div class="progress-fill" :style="{ width: (isDragging ? dragProgress : playerStore.progress) + '%' }"></div>
        </div>
        <div class="time-info">
          <span>{{ formatTime(isDragging ? dragTime : playerStore.currentTime) }}</span>
          <span>{{ formatTime(playerStore.duration) }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button class="control-btn" @click="playerStore.playPrev()" title="上一首">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>
        <button class="control-btn play-btn" @click="playerStore.togglePlay()" title="播放/暂停">
          <svg viewBox="0 0 24 24" v-if="!playerStore.isPlaying">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
          </svg>
          <svg viewBox="0 0 24 24" v-else>
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <button class="control-btn" @click="playerStore.playNext()" title="下一首">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      <!-- 音量控制 -->
      <div class="volume-control">
        <svg class="volume-icon" width="20" height="20" viewBox="0 0 24 24" @click="playerStore.toggleMute()">
          <path fill="currentColor" v-if="playerStore.isMuted || playerStore.volume === 0"
            d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          <path fill="currentColor" v-else-if="playerStore.volume < 0.5"
            d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
          <path fill="currentColor" v-else
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <input type="range" class="volume-slider" :value="playerStore.volume * 100"
          @input="onVolumeChange" min="0" max="100">
      </div>
    </div>

    <!-- 手机端歌词模式下的返回按钮（放在 .player-right 外面避免层叠问题） -->
    <button class="lyrics-back-btn" @click="toggleLyricsMode">
      <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </button>

    <!-- 右侧台词区 -->
    <div class="player-right">
      <!-- 台词选择器 -->
      <div class="lyrics-header">
        <span>台词</span>
        <div class="lyric-selector" v-if="currentAudioId">
          <select class="select lyric-select" v-model="selectedLyricId" @change="onLyricSelect">
            <option value="">-- 选择台词 --</option>
            <optgroup label="已绑定">
              <option v-for="lyric in boundLyrics" :key="lyric.id" :value="lyric.id">
                {{ lyric.name }} {{ lyric.isDefault ? '(默认)' : '' }}
              </option>
            </optgroup>
            <optgroup label="台词库" v-if="unboundLyrics.length > 0">
              <option v-for="lyric in unboundLyrics" :key="lyric.id" :value="lyric.id">
                {{ lyric.name }}
              </option>
            </optgroup>
          </select>
          <button v-if="selectedLyricId" class="btn-sm btn-secondary" @click="bindLyric" title="绑定到当前音频">
            绑定
          </button>
          <button v-if="selectedLyricId && currentLyricData?.audioId === currentAudioId"
            class="btn-sm btn-secondary" @click="setDefaultLyric" title="设为默认">
            ★
          </button>
        </div>
        <button class="import-btn-sm" @click="triggerLrcImport" title="导入台词">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      <!-- 台词显示 -->
      <div class="lyrics-container" ref="lyricsContainerRef"
        @pointerdown="onLyricsDragStart" @pointermove="onLyricsDragMove" @pointerup="onLyricsDragEnd" @pointercancel="onLyricsDragEnd">
        <div class="lyrics-scroll" ref="lyricsScrollRef">
          <!-- 无台词提示 -->
          <div class="no-lyrics" v-if="playerStore.lyrics.length === 0">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p>请导入LRC台词文件</p>
          </div>

          <!-- 台词行 -->
          <template v-for="(lyric, index) in playerStore.lyrics" :key="index">
            <div v-if="editingIndex !== index"
              class="lyric-line"
              :class="{
                active: playerStore.currentLyricIndex === index,
                past: index < playerStore.currentLyricIndex
              }"
              @click="seekToLyric(lyric.time)"
              @dblclick="startEditing(index)">
              <span class="lyric-time">{{ formatTimeDetailed(lyric.time) }}</span>
              <span class="lyric-content">{{ lyric.content }}</span>
            </div>
            <div v-else class="lyric-line editing">
              <input class="lyric-time-input" :value="formatTimeDetailed(lyric.time)"
                @blur="onTimeBlur($event, index)" @keydown.enter="onTimeBlur($event, index)">
              <input class="lyric-content-input" v-model="editingContent"
                @blur="saveEditing(index)" @keydown.enter="saveEditing(index)"
                @keydown.escape="cancelEditing" ref="contentInputRef">
              <div class="lyric-edit-actions">
                <button class="edit-btn save" @click="saveEditing(index)" title="保存">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </button>
                <button class="edit-btn add" @click="addLineAfter(index)" title="添加行">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
                <button class="edit-btn delete" @click="removeLine(index)" title="删除行">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
                <button class="edit-btn cancel" @click="cancelEditing" title="取消">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 导入按钮 -->
      <div class="import-area">
        <div class="import-buttons">
          <button class="import-btn" @click="triggerAudioImport">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            导入音频
          </button>
          <button class="import-btn" @click="triggerLrcImport">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            导入台词
          </button>
        </div>
      </div>

      <!-- 隐藏的文件输入 -->
      <input type="file" ref="audioInputRef" accept="audio/*" style="display:none" @change="onAudioImport">
      <input type="file" ref="lrcInputRef" accept=".lrc,.txt" style="display:none" @change="onLrcImport">
    </div>

    <!-- 手机端歌词全屏迷你控制条 -->
    <div class="lyrics-mini-bar" v-if="lyricsMode">
      <button class="mini-nav-btn" @click.stop="playerStore.playPrev()">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <div class="mini-track-info">
        <div class="mini-track-name">{{ playerStore.currentTrack?.name || '未选择音频' }}</div>
        <div class="mini-progress-bar" ref="miniProgressRef"
          @pointerdown="onMiniProgressDown" @pointermove="onProgressMove" @pointerup="onProgressUp">
          <div class="mini-progress-fill" :style="{ width: (isDragging ? dragProgress : playerStore.progress) + '%' }"></div>
        </div>
      </div>
      <button class="mini-play-btn" @click.stop="playerStore.togglePlay()">
        <svg viewBox="0 0 24 24" v-if="!playerStore.isPlaying">
          <path fill="currentColor" d="M8 5v14l11-7z"/>
        </svg>
        <svg viewBox="0 0 24 24" v-else>
          <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </button>
      <button class="mini-nav-btn" @click.stop="playerStore.playNext()">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
    </div>

    <!-- 拖拽覆盖层 -->
    <div class="drag-overlay" v-if="isDragOver">
      <div class="drag-content">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
        </svg>
        <p>拖放音频或台词文件到此处</p>
      </div>
    </div>

    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useLibraryStore } from '../stores/library'
import { useUnifiedSubtitlesStore } from '../stores/unifiedSubtitles'
import { parseLRC, formatTime, formatTimeDetailed } from '../utils/lrcParser'
import Toast from '../components/Toast.vue'

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const unifiedSubtitlesStore = useUnifiedSubtitlesStore()
const toastRef = ref(null)

// DOM 引用
const audioInputRef = ref(null)
const lrcInputRef = ref(null)
const progressBarRef = ref(null)
const miniProgressRef = ref(null)
const lyricsContainerRef = ref(null)
const lyricsScrollRef = ref(null)
const contentInputRef = ref(null)

// 编辑状态
const editingIndex = ref(-1)
const editingContent = ref('')

// 拖拽状态
const isDragOver = ref(false)

// 进度条拖拽状态
const isDragging = ref(false)
const dragProgress = ref(0)
const dragTime = ref(0)

// 歌词容器拖拽滚动状态
const isLyricsDragging = ref(false)
const lyricsDragStartY = ref(0)
const lyricsDragOffset = ref(0)
let lyricsAutoScrollTimer = null

// 台词选择
const selectedLyricId = ref('')

// 手机端歌词全屏模式
const lyricsMode = ref(false)
function toggleLyricsMode() { lyricsMode.value = !lyricsMode.value }

// 当前音频 ID
const currentAudioId = computed(() => playerStore.currentTrack?.id || null)

// 当前音频绑定的台词
const boundLyrics = computed(() => {
  if (!currentAudioId.value) return []
  return unifiedSubtitlesStore.getSubtitlesByAudio(currentAudioId.value)
})

// 未绑定的台词
const unboundLyrics = computed(() => {
  return unifiedSubtitlesStore.getUnlinkedSubtitles()
})

// 当前选中的台词数据
const currentLyricData = computed(() => {
  if (!selectedLyricId.value) return null
  return unifiedSubtitlesStore.getSubtitle(selectedLyricId.value)
})

onMounted(async () => {
  // 设置音频元素
  const audioEl = document.getElementById('global-audio')
  if (audioEl) {
    playerStore.setAudioElement(audioEl)
  }
  // 加载台词库
  await unifiedSubtitlesStore.loadAll()
})

// 键盘快捷键
function handleKeydown(e) {
  if (e.code === 'Space' && editingIndex.value === -1) {
    e.preventDefault()
    playerStore.togglePlay()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 监听当前台词变化，自动滚动（拖拽期间跳过）
watch(() => playerStore.currentLyricIndex, (newIndex) => {
  if (isLyricsDragging.value) return
  if (newIndex >= 0) {
    scrollToLyric(newIndex)
  }
})

// 滚动到指定台词
function scrollToLyric(index) {
  nextTick(() => {
    const container = lyricsContainerRef.value
    const scroll = lyricsScrollRef.value
    if (!container || !scroll) return

    const lines = scroll.querySelectorAll('.lyric-line')
    if (lines[index]) {
      const containerHeight = container.clientHeight
      const lineTop = lines[index].offsetTop
      const lineHeight = lines[index].clientHeight
      const scrollTarget = lineTop - containerHeight / 2 + lineHeight / 2
      scroll.style.transform = `translateY(-${scrollTarget}px)`
    }
  })
}

// 跳转到台词时间
function seekToLyric(time) {
  const wasPlaying = playerStore.isPlaying
  if (wasPlaying) playerStore.pause()
  playerStore.seek(time)
  if (wasPlaying) playerStore.play()
}

// 歌词容器拖拽滚动
function onLyricsDragStart(e) {
  // 忽略编辑模式下的输入框拖拽
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  isLyricsDragging.value = true
  lyricsDragStartY.value = e.clientY
  // 记录当前 transform 的偏移量
  const scroll = lyricsScrollRef.value
  if (scroll) {
    const style = scroll.style.transform
    const match = style.match(/translateY\((.+?)px\)/)
    lyricsDragOffset.value = match ? -parseFloat(match[1]) : 0
  }
  // 拖拽时禁用过渡动画
  if (scroll) scroll.style.transition = 'none'
  const container = lyricsContainerRef.value
  if (container) container.setPointerCapture(e.pointerId)
}

function onLyricsDragMove(e) {
  if (!isLyricsDragging.value) return
  const delta = e.clientY - lyricsDragStartY.value
  const newOffset = lyricsDragOffset.value + delta
  const scroll = lyricsScrollRef.value
  if (scroll) {
    scroll.style.transform = `translateY(${-newOffset}px)`
  }
}

function onLyricsDragEnd(e) {
  if (!isLyricsDragging.value) return
  isLyricsDragging.value = false
  const scroll = lyricsScrollRef.value
  if (scroll) {
    // 恢复过渡动画
    scroll.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)'
  }
  // 延迟恢复自动滚动（让用户松手后能浏览一下，2秒后跟回当前播放行）
  clearTimeout(lyricsAutoScrollTimer)
  lyricsAutoScrollTimer = setTimeout(() => {
    lyricsDragOffset.value = 0
    if (playerStore.currentLyricIndex >= 0) {
      scrollToLyric(playerStore.currentLyricIndex)
    }
  }, 2000)
}

// 进度条拖拽
function getProgressFromEvent(e, el) {
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  return pos
}

function onProgressDown(e) {
  isDragging.value = true
  const el = progressBarRef.value
  const pos = getProgressFromEvent(e, el)
  dragProgress.value = pos * 100
  dragTime.value = pos * playerStore.duration
  el.setPointerCapture(e.pointerId)
}

function onMiniProgressDown(e) {
  isDragging.value = true
  const el = miniProgressRef.value
  const pos = getProgressFromEvent(e, el)
  dragProgress.value = pos * 100
  dragTime.value = pos * playerStore.duration
  el.setPointerCapture(e.pointerId)
}

function onProgressMove(e) {
  if (!isDragging.value) return
  const el = progressBarRef.value || miniProgressRef.value
  const pos = getProgressFromEvent(e, el)
  dragProgress.value = pos * 100
  dragTime.value = pos * playerStore.duration
}

function onProgressUp(e) {
  if (!isDragging.value) return
  isDragging.value = false
  const targetTime = dragTime.value
  const wasPlaying = playerStore.isPlaying
  // 先暂停，seek 完再恢复，避免浏览器在播放中 seek 时重置 currentTime
  if (wasPlaying) playerStore.pause()
  playerStore.seek(targetTime)
  if (wasPlaying) playerStore.play()
}

// 音量变化
function onVolumeChange(e) {
  playerStore.setVolume(e.target.value / 100)
}

// 文件导入
function triggerAudioImport() {
  audioInputRef.value?.click()
}

function triggerLrcImport() {
  lrcInputRef.value?.click()
}

async function onAudioImport(e) {
  const file = e.target.files[0]
  if (file) {
    // 保存到音频库（IndexedDB）
    const audioData = await libraryStore.addAudioFile(file)

    // 加载并播放
    const loadedAudio = await libraryStore.getAudioFileWithUrl(audioData.id)
    if (loadedAudio) {
      const track = {
        id: audioData.id,
        name: audioData.name,
        url: loadedAudio.url
      }
      playerStore.addToPlaylist(track)
      playerStore.loadTrack(track)
      playerStore.play()
    }
  }
}

function onLrcImport(e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lyrics = parseLRC(text)

      playerStore.setLyrics(lyrics)

      // 添加为台词源
      playerStore.addLyricSource({
        id: `lyric_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        language: 'zh',
        content: text,
        lyrics
      })

      // 同时保存到台词库（供 AI 工具使用）
      unifiedSubtitlesStore.addSubtitle({
        name: file.name.replace(/\.[^/.]+$/, ''),
        content: text,
        source: 'import'
      })
    }
    reader.readAsText(file)
  }
}

// 拖拽处理
function onDragOver(e) {
  isDragOver.value = true
}

function onDragLeave(e) {
  if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
    isDragOver.value = false
  }
}

async function onDrop(e) {
  isDragOver.value = false
  const files = e.dataTransfer.files
  for (const file of files) {
    if (file.type.startsWith('audio/')) {
      // 保存到音频库
      const audioData = await libraryStore.addAudioFile(file)
      const loadedAudio = await libraryStore.getAudioFileWithUrl(audioData.id)
      if (loadedAudio) {
        const track = {
          id: audioData.id,
          name: audioData.name,
          url: loadedAudio.url
        }
        playerStore.addToPlaylist(track)
        if (playerStore.playlist.length === 1) {
          playerStore.loadTrack(track)
        }
      }
    } else if (file.name.endsWith('.lrc') || file.name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const lyrics = parseLRC(text)
        playerStore.setLyrics(lyrics)
        playerStore.addLyricSource({
          id: `lyric_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          language: 'zh',
          content: text,
          lyrics
        })
        // 同时保存到台词库（供 AI 工具使用）
        unifiedSubtitlesStore.addSubtitle({
          name: file.name.replace(/\.[^/.]+$/, ''),
          content: text,
          source: 'import'
        })
      }
      reader.readAsText(file)
    }
  }
}

// 选择台词
function onLyricSelect() {
  if (!selectedLyricId.value) {
    playerStore.clearLyrics()
    return
  }
  const sub = unifiedSubtitlesStore.getSubtitle(selectedLyricId.value)
  if (sub) {
    const lyrics = parseLRC(sub.content)
    playerStore.setLyrics(lyrics)
    playerStore.addLyricSource({
      id: sub.id,
      name: sub.name,
      language: 'zh',
      content: sub.content,
      lyrics
    })
  }
}

// 绑定台词到当前音频
async function bindLyric() {
  if (!selectedLyricId.value || !currentAudioId.value) return
  await unifiedSubtitlesStore.linkToAudio(selectedLyricId.value, currentAudioId.value)
  toastRef.value?.success('已绑定到当前音频')
}

// 设为默认台词
async function setDefaultLyric() {
  if (!selectedLyricId.value) return
  await unifiedSubtitlesStore.setAsDefault(selectedLyricId.value)
  toastRef.value?.success('已设为默认台词')
}

// 台词内联编辑
function startEditing(index) {
  editingIndex.value = index
  editingContent.value = playerStore.lyrics[index].content
  nextTick(() => {
    contentInputRef.value?.[0]?.focus()
  })
}

function saveEditing(index) {
  if (editingContent.value.trim()) {
    playerStore.updateLyricLine(index, editingContent.value.trim())
  }
  editingIndex.value = -1
  editingContent.value = ''
}

function cancelEditing() {
  editingIndex.value = -1
  editingContent.value = ''
}

function onTimeBlur(e, index) {
  const timeStr = e.target.value
  const match = timeStr.match(/(\d{2}):(\d{2})\.(\d{2,3})/)
  if (match) {
    const min = parseInt(match[1], 10)
    const sec = parseInt(match[2], 10)
    const ms = parseInt(match[3].padEnd(3, '0'), 10)
    const time = min * 60 + sec + ms / 1000
    playerStore.updateLyricTime(index, time)
  }
}

function addLineAfter(index) {
  const nextTime = index < playerStore.lyrics.length - 1
    ? playerStore.lyrics[index + 1].time
    : playerStore.lyrics[index].time + 3
  playerStore.addLyricLine(index + 1, nextTime, '')
  editingIndex.value = index + 1
  editingContent.value = ''
  nextTick(() => {
    contentInputRef.value?.[0]?.focus()
  })
}

function removeLine(index) {
  playerStore.removeLyricLine(index)
  editingIndex.value = -1
}
</script>

<style scoped>
.player-view {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

/* 左侧播放器 */
.player-left {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--border-light);
}

/* 唱片动画 */
.disc-container {
  width: 240px;
  height: 240px;
  margin-bottom: 30px;
}

.disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 0 60px rgba(0, 0, 0, 0.3),
    0 0 0 8px rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s ease;
}

.disc.playing {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0px,
    transparent 8px,
    rgba(255, 255, 255, 0.03) 8px,
    rgba(255, 255, 255, 0.03) 9px
  );
}

.disc-center {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent-gradient);
  box-shadow: 0 4px 15px var(--accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.disc-center::before {
  content: '';
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1a1a1a;
}

/* 播放信息 */
.track-info {
  text-align: center;
  margin-bottom: 25px;
  width: 100%;
}

.track-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* 进度条 */
.progress-container {
  width: 100%;
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  transition: height 0.2s;
  touch-action: none;
}

.progress-bar:hover {
  height: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.time-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 8px;
  font-family: var(--font-mono);
}

/* 控制按钮 */
.controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.control-btn {
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.control-btn:hover {
  transform: scale(1.1);
  color: var(--accent-primary);
}

.play-btn {
  width: 70px;
  height: 70px;
  background: var(--accent-gradient);
  border-radius: 50%;
  box-shadow: 0 8px 25px var(--accent-glow);
  color: white;
}

.play-btn svg {
  width: 28px;
  height: 28px;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 35px var(--accent-glow);
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.volume-icon {
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.volume-icon:hover {
  color: var(--accent-primary);
}

.volume-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent-gradient);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--accent-gradient);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px var(--accent-glow);
}

/* 右侧台词区 */
.player-right {
  width: 380px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
}

.lyrics-header {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.lyrics-header::before {
  content: '';
  width: 4px;
  height: 18px;
  background: var(--accent-gradient);
  border-radius: 2px;
  flex-shrink: 0;
}

/* 台词选择器 */
.lyric-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex: 1;
  min-width: 0;
}

.lyric-select {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 12px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
}

.import-btn-sm {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.import-btn-sm:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent-primary);
}

/* 台词容器 */
.lyrics-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  touch-action: none;
  cursor: grab;
  user-select: none;
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}

.lyrics-scroll {
  position: absolute;
  width: 100%;
  transition: transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
  padding: 40% 0;
}

/* 台词行 */
.lyric-line {
  padding: 10px 12px;
  color: var(--text-dim);
  text-align: center;
  line-height: 1.6;
  transition: all 0.4s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
}

.lyric-line:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}

.lyric-line.active {
  color: var(--text-primary);
  font-size: 1.05rem;
  font-weight: 500;
  background: rgba(255, 107, 157, 0.1);
}

.lyric-line.past {
  color: var(--text-dim);
}

.lyric-time {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: right;
}

.lyric-content {
  flex: 1;
  text-align: left;
}

/* 编辑模式 */
.lyric-line.editing {
  background: rgba(255, 107, 157, 0.15);
  border: 1px solid rgba(255, 107, 157, 0.3);
  padding: 8px;
}

.lyric-time-input {
  width: 70px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
}

.lyric-content-input {
  flex: 1;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.lyric-content-input:focus {
  border-color: var(--accent-primary);
}

.lyric-edit-actions {
  display: flex;
  gap: 4px;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn.save { color: var(--color-success); }
.edit-btn.add { color: var(--color-info); }
.edit-btn.delete { color: var(--color-error); }
.edit-btn.cancel { color: var(--text-muted); }

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 无台词提示 */
.no-lyrics {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-dim);
}

.no-lyrics svg {
  width: 60px;
  height: 60px;
  fill: var(--text-dim);
  margin-bottom: 15px;
}

.no-lyrics p {
  font-size: 0.9rem;
}

/* 导入区域 */
.import-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.import-buttons {
  display: flex;
  gap: 10px;
}

.import-btn {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.import-btn:hover {
  background: rgba(255, 107, 157, 0.1);
  border-color: rgba(255, 107, 157, 0.3);
  color: var(--accent-primary);
}

.import-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* 拖拽覆盖层 */
.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(11, 19, 38, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--accent-primary);
}

.drag-content p {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 响应式 */
@media (max-width: 900px) {
  .player-view {
    flex-direction: column;
    overflow-y: auto;
  }

  .player-left {
    border-right: none;
    border-bottom: 1px solid var(--border-light);
    padding: 24px;
  }

  .disc-container {
    width: 180px;
    height: 180px;
  }

  .player-right {
    width: 100%;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .player-view {
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }

  .player-left {
    padding: 20px 16px;
  }

  .disc-container {
    width: 140px;
    height: 140px;
  }

  .track-name {
    font-size: 1.1rem;
  }

  .controls {
    gap: 20px;
  }

  .player-right {
    padding: 16px;
    min-height: 250px;
  }

  .lyrics-header {
    font-size: 0.9rem;
  }

  .lyric-line {
    padding: 10px 12px;
  }

  .lyric-time {
    font-size: 11px;
    min-width: 50px;
  }

  /* 手机端歌词全屏模式 */
  .lyrics-mode .player-left {
    display: none;
  }
  .lyrics-mode .player-right {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--bg-primary, #111);
    padding: 60px 16px 80px;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-y: auto;
    animation: lyricsFadeIn 0.3s ease;
  }
  @keyframes lyricsFadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* 全屏模式隐藏编辑UI */
  .lyrics-mode .lyrics-header {
    display: none;
  }
  .lyrics-mode .import-area {
    display: none;
  }
  .lyrics-mode .lyrics-container {
    max-height: calc(100dvh - 140px);
    mask-image: linear-gradient(180deg, black 0%, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, black 0%, black 85%, transparent 100%);
  }
  .lyrics-mode .lyrics-scroll {
    padding: 30% 0;
  }
  .lyrics-mode .lyric-line {
    padding: 16px 12px;
    font-size: 1.05rem;
  }
  .lyrics-mode .lyric-content {
    font-size: 1.05rem;
    line-height: 1.6;
  }
  .disc-tap-hint {
    display: none;
  }
}

/* 桌面端隐藏返回按钮、迷你控制条和碟片点击提示 */
.lyrics-back-btn { display: none; }
.lyrics-mini-bar { display: none; }
.disc-tap-hint { display: none; }

/* 手机端：显示返回按钮（仅在歌词全屏模式下） */
@media (max-width: 768px) {
  .lyrics-mode .lyrics-back-btn {
    display: flex;
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 200;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 50%;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .lyrics-back-btn:active {
    transform: scale(0.9);
    background: rgba(255,255,255,0.2);
  }

  /* 手机端碟片点击提示 */
  .disc-tap-area {
    position: relative;
    cursor: pointer;
  }
  .disc-tap-hint {
    display: flex;
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    background: rgba(0,0,0,0.5);
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .disc-tap-hint svg {
    width: 14px;
    height: 14px;
    fill: rgba(255,255,255,0.6);
  }
}

@media (min-width: 769px) {
  .disc-tap-area { cursor: default; }
}

/* 手机端歌词全屏迷你控制条 */
.lyrics-mini-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 102;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(17, 17, 17, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.08);
  animation: lyricsFadeIn 0.3s ease;
}

.mini-nav-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.mini-nav-btn:hover {
  color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.08);
}

.mini-track-info {
  flex: 1;
  min-width: 0;
}

.mini-track-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.mini-progress-bar {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  cursor: pointer;
  touch-action: none;
}

.mini-progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.mini-play-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  background: var(--accent-gradient);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  box-shadow: 0 4px 15px var(--accent-glow);
}

.mini-play-btn svg {
  width: 20px;
  height: 20px;
}

.mini-play-btn:active {
  transform: scale(0.92);
}
</style>
