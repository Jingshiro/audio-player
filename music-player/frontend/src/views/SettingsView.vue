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

    <!-- 数据管理 -->
    <div class="glass-card">
      <div class="section-title">数据管理</div>
      <div class="data-actions">
        <button class="btn-secondary" @click="exportData">导出所有数据</button>
        <button class="btn-secondary" @click="importData">导入数据</button>
        <button class="btn-danger" @click="clearCache">清除缓存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

// 播放设置
const settings = reactive({
  autoPlayNext: localStorage.getItem('auto_play_next') !== 'false',
  autoScroll: localStorage.getItem('auto_scroll') !== 'false',
  crossPagePlay: localStorage.getItem('cross_page_play') !== 'false'
})

// 数据管理
function exportData() {
  const data = { settings }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audio-player-settings-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          if (data.settings) {
            Object.assign(settings, data.settings)
          }
          alert('数据导入成功')
        } catch (err) {
          alert('导入失败: ' + err.message)
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

function clearCache() {
  if (confirm('确定要清除所有缓存数据吗？此操作不可恢复。')) {
    localStorage.clear()
    location.reload()
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

/* 数据管理 */
.data-actions {
  display: flex;
  gap: 12px;
}
</style>
