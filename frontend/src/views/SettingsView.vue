<template>
  <div class="settings-view">
    <!-- 播放设置 -->
    <div class="glass-card">
      <div class="section-title">播放设置</div>
      <div class="settings-list">
        <label class="setting-item">
          <input type="checkbox" v-model="settings.autoPlayNext">
          <span>自动播放下一首</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" v-model="settings.autoScroll">
          <span>台词自动滚动</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" v-model="settings.crossPagePlay">
          <span>跨页播放（切换页面不停止播放）</span>
        </label>
      </div>
    </div>

    <!-- 存储设置 -->
    <div class="glass-card">
      <div class="section-title">存储设置</div>

      <!-- 台词存储位置 -->
      <div class="form-group">
        <label>台词默认存储位置</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="settingsStore.subtitleStorage" value="local"
              @change="onStorageChange">
            <div class="radio-content">
              <span class="radio-label">浏览器本地</span>
              <span class="radio-hint">数据存储在当前浏览器，清除缓存会丢失</span>
            </div>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="settingsStore.subtitleStorage" value="server"
              @change="onStorageChange">
            <div class="radio-content">
              <span class="radio-label">服务器</span>
              <span class="radio-hint">数据持久保存在服务器，多设备可访问</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 存储统计 -->
      <div class="storage-stats" v-if="storageStats">
        <h4>存储概览</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">本地音频</span>
            <span class="stat-value">{{ storageStats.localAudioCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">服务器音频</span>
            <span class="stat-value">{{ storageStats.serverAudioCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">本地台词</span>
            <span class="stat-value">{{ storageStats.localLyricsCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">服务器台词</span>
            <span class="stat-value">{{ storageStats.serverLyricsCount }} 个</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据清理 -->
    <div class="glass-card">
      <div class="section-title">数据清理</div>

      <div class="cleanup-section">
        <h4>清理本地数据</h4>
        <p class="section-desc">以下操作仅影响当前浏览器存储的数据</p>

        <div class="cleanup-actions">
          <button class="btn-secondary" @click="clearLocalLyrics">
            清除本地台词
          </button>
          <button class="btn-secondary" @click="clearLocalAudio">
            清除本地音频
          </button>
        </div>
      </div>

      <div class="cleanup-section" v-if="settingsStore.hasBackend">
        <h4>清理服务器数据</h4>
        <p class="section-desc warning">注意：此操作不可恢复</p>

        <div class="cleanup-actions">
          <button class="btn-secondary" @click="clearServerLyrics">
            清除服务器台词
          </button>
          <button class="btn-secondary" @click="clearServerAudio">
            清除服务器音频
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useUnifiedLibraryStore } from '../stores/unifiedLibrary'
import { useUnifiedSubtitlesStore } from '../stores/unifiedSubtitles'
import { useLibraryStore } from '../stores/library'
import { useSubtitlesStore } from '../stores/subtitles'
import { storageApi, audioApi } from '../api'

const settingsStore = useSettingsStore()
const unifiedLibraryStore = useUnifiedLibraryStore()
const unifiedSubtitlesStore = useUnifiedSubtitlesStore()

const storageStats = ref(null)

// 播放设置
const settings = reactive({
  autoPlayNext: localStorage.getItem('auto_play_next') !== 'false',
  autoScroll: localStorage.getItem('auto_scroll') !== 'false',
  crossPagePlay: localStorage.getItem('cross_page_play') !== 'false'
})

// 监听设置变化
import { watch } from 'vue'

watch(() => settings.autoPlayNext, (val) => localStorage.setItem('auto_play_next', val))
watch(() => settings.autoScroll, (val) => localStorage.setItem('auto_scroll', val))
watch(() => settings.crossPagePlay, (val) => localStorage.setItem('cross_page_play', val))

onMounted(async () => {
  await settingsStore.loadSettings()
  unifiedSubtitlesStore.setDefaultStorage(settingsStore.subtitleStorage)
  await loadStorageStats()
})

async function loadStorageStats() {
  // 先加载数据
  await unifiedLibraryStore.loadAll()
  await unifiedSubtitlesStore.loadAll()

  storageStats.value = {
    localAudioCount: unifiedLibraryStore.localCount,
    serverAudioCount: unifiedLibraryStore.serverCount,
    localLyricsCount: unifiedSubtitlesStore.localCount,
    serverLyricsCount: unifiedSubtitlesStore.serverCount
  }
}

function onStorageChange() {
  settingsStore.saveSubtitleStorage(settingsStore.subtitleStorage)
  unifiedSubtitlesStore.setDefaultStorage(settingsStore.subtitleStorage)
}

async function clearLocalLyrics() {
  if (confirm('确定要清除所有本地台词吗？')) {
    const localStore = useSubtitlesStore()
    const localSubs = unifiedSubtitlesStore.localSubtitles
    for (const sub of localSubs) {
      await localStore.deleteSubtitle(sub.id)
    }
    await unifiedSubtitlesStore.loadAll()
    await loadStorageStats()
    alert('本地台词已清除')
  }
}

async function clearLocalAudio() {
  if (confirm('确定要清除所有本地音频吗？')) {
    const libraryStore = useLibraryStore()
    const localAudios = unifiedLibraryStore.localAudios
    for (const audio of localAudios) {
      await libraryStore.removeAudioFile(audio.id)
    }
    await unifiedLibraryStore.loadAll()
    await loadStorageStats()
    alert('本地音频已清除')
  }
}

async function clearServerLyrics() {
  if (confirm('确定要清除所有服务器台词吗？此操作不可恢复！')) {
    try {
      await storageApi.clearLyrics()
      await unifiedSubtitlesStore.loadAll()
      await loadStorageStats()
      alert('服务器台词已清除')
    } catch (err) {
      alert('清除失败: ' + err.message)
    }
  }
}

async function clearServerAudio() {
  if (confirm('确定要清除所有服务器音频吗？此操作不可恢复！')) {
    try {
      await storageApi.clearAudio()
      await unifiedLibraryStore.loadAll()
      await loadStorageStats()
      alert('服务器音频已清除')
    } catch (err) {
      alert('清除失败: ' + err.message)
    }
  }
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.glass-card {
  padding: 24px;
}

/* 播放设置 */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 8px 0;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
  cursor: pointer;
}

/* 表单组 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* 单选框组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.radio-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 107, 157, 0.3);
}

.radio-item input[type="radio"] {
  margin-top: 2px;
  accent-color: var(--accent-primary);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.radio-hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* 存储统计 */
.storage-stats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.storage-stats h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 数据清理 */
.cleanup-section {
  margin-bottom: 20px;
}

.cleanup-section:last-child {
  margin-bottom: 0;
}

.cleanup-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.section-desc.warning {
  color: var(--color-warning);
}

.cleanup-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .cleanup-actions {
    flex-direction: column;
  }

  .cleanup-actions button {
    width: 100%;
  }
}
</style>
