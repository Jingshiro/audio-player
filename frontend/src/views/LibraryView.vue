<template>
  <div class="library-view">
    <!-- 顶部搜索栏 -->
    <div class="library-header">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input type="text" class="input" placeholder="搜索..."
          v-model="searchQuery" @input="onSearch">
      </div>
      <button class="btn-primary" @click="triggerImport">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        本地导入
      </button>
      <button v-if="serverAvailable" class="btn-primary" @click="triggerServerUpload">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
        </svg>
        上传到服务器
      </button>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button class="tab-item" :class="{ active: activeTab === 'audio' }"
        @click="activeTab = 'audio'">
        <svg viewBox="0 0 1024 1024" width="16" height="16" class="tab-icon">
          <path fill="currentColor" d="M849.408 6.656L411.648 140.8c-53.248 15.36-95.744 70.656-95.744 123.392v461.312S284.16 704 213.504 714.24C109.568 729.088 25.6 808.448 25.6 891.904s83.968 134.656 187.904 119.808c103.936-14.848 179.712-91.648 179.712-175.104v-445.44c0-36.864 44.544-52.736 44.544-52.736l387.072-121.344s43.008-14.336 43.008 25.088v367.616s-39.424-22.528-110.08-14.336c-103.936 12.8-187.904 90.624-187.904 174.08S653.824 905.728 757.76 893.44c103.936-12.8 187.904-90.624 187.904-174.08V74.752c-0.512-52.224-43.52-82.944-96.256-68.096z"/>
        </svg>
        音频 ({{ unifiedLibraryStore.audioFiles.length }})
      </button>
      <button class="tab-item" :class="{ active: activeTab === 'subtitles' }"
        @click="activeTab = 'subtitles'">
        <svg viewBox="0 0 1024 1024" width="16" height="16" class="tab-icon">
          <path fill="currentColor" d="M412.140319 16.584472l197.215394 0 0 74.054901-197.215394 0 0-74.054901Z"/>
          <path fill="currentColor" d="M857.76537 16.965245 678.479848 16.965245c-14.139397 0-25.613378 11.476012-25.613378 25.613378l0 76.841149-281.731925 0L371.134545 42.578623c0-14.136351-11.476012-25.613378-25.614393-25.613378L166.233615 16.965245c-67.772642 0-102.453511 34.678838-102.453511 102.453511l0 793.989328c0 67.798027 34.680869 102.451481 102.453511 102.451481l691.531755 0c67.774673 0 102.451481-34.654469 102.451481-102.451481L960.216851 119.419772C960.217866 51.62073 925.540043 16.965245 857.76537 16.965245zM780.927267 810.95762 243.06664 810.95762c-14.13432 0-25.612362-11.472966-25.612362-25.615409 0-14.158689 11.478043-25.609316 25.612362-25.609316l537.860627 0c14.141428 0 25.617439 11.449611 25.617439 25.609316C806.544707 799.48567 795.068695 810.95762 780.927267 810.95762zM780.927267 595.1757 243.06664 595.1757c-14.13432 0-25.612362-11.449611-25.612362-25.613378 0-14.139397 11.478043-25.613378 25.612362-25.613378l537.860627 0c14.141428 0 25.617439 11.473981 25.617439 25.613378C806.544707 583.725073 795.068695 595.1757 780.927267 595.1757zM780.927267 379.383627 243.06664 379.383627c-14.13432 0-25.612362-11.44555-25.612362-25.611347 0-14.140412 11.478043-25.614393 25.612362-25.614393l537.860627 0c14.141428 0 25.617439 11.473981 25.617439 25.614393C806.544707 367.938077 795.068695 379.383627 780.927267 379.383627z"/>
        </svg>
        台词 ({{ unifiedSubtitlesStore.subtitles.length }})
      </button>
    </div>

    <!-- 音频列表 -->
    <div class="content-area" v-if="activeTab === 'audio'">
      <!-- 来源筛选 -->
      <div class="filter-bar" v-if="unifiedLibraryStore.audioFiles.length > 0">
        <button class="filter-btn" :class="{ active: filterSource === 'all' }"
          @click="filterSource = 'all'">
          全部 ({{ unifiedLibraryStore.audioFiles.length }})
        </button>
        <button class="filter-btn" :class="{ active: filterSource === 'local' }"
          @click="filterSource = 'local'">
          本地 ({{ localCount }})
        </button>
        <button class="filter-btn" :class="{ active: filterSource === 'server' }"
          @click="filterSource = 'server'">
          服务器 ({{ serverCount }})
        </button>
      </div>

      <!-- 统一音频列表 -->
      <div class="item-list" v-if="unifiedLibraryStore.filteredFiles.length > 0">
        <div class="audio-item" v-for="audio in unifiedLibraryStore.filteredFiles" :key="audio.id"
          @dblclick="playAudio(audio)">
          <div class="item-icon" :class="audio.source === 'server' ? 'server-icon' : 'audio-icon'">
            <svg viewBox="0 0 1024 1024" width="24" height="24">
              <path fill="currentColor" d="M849.408 6.656L411.648 140.8c-53.248 15.36-95.744 70.656-95.744 123.392v461.312S284.16 704 213.504 714.24C109.568 729.088 25.6 808.448 25.6 891.904s83.968 134.656 187.904 119.808c103.936-14.848 179.712-91.648 179.712-175.104v-445.44c0-36.864 44.544-52.736 44.544-52.736l387.072-121.344s43.008-14.336 43.008 25.088v367.616s-39.424-22.528-110.08-14.336c-103.936 12.8-187.904 90.624-187.904 174.08S653.824 905.728 757.76 893.44c103.936-12.8 187.904-90.624 187.904-174.08V74.752c-0.512-52.224-43.52-82.944-96.256-68.096z"/>
            </svg>
          </div>
          <div class="item-info">
            <div class="item-name">{{ audio.name }}</div>
            <div class="item-meta">
              <span class="tag" :class="audio.source === 'server' ? 'server-tag' : 'local-tag'">
                {{ audio.source === 'server' ? '服务器' : '本地' }}
              </span>
              <span class="tag" v-if="getAudioSubtitles(audio.id).length > 0">
                {{ getAudioSubtitles(audio.id).length }} 个台词
              </span>
              <span class="tag default-tag" v-if="getDefaultSubtitle(audio.id)">
                默认: {{ getDefaultSubtitle(audio.id).name }}
              </span>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-secondary btn-sm" @click.stop="playAudio(audio)">播放</button>
            <button class="btn-danger btn-sm" @click.stop="deleteAudio(audio)">删除</button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-if="unifiedLibraryStore.filteredFiles.length === 0">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12H6v-2h8v2zm4-4H6v-2h12v2z"/></svg>
        <p>音频库为空</p>
      </div>
    </div>

    <!-- 台词列表 -->
    <div class="content-area" v-if="activeTab === 'subtitles'">
      <!-- 来源筛选 -->
      <div class="filter-bar" v-if="unifiedSubtitlesStore.subtitles.length > 0">
        <button class="filter-btn" :class="{ active: filterSource === 'all' }"
          @click="filterSource = 'all'">
          全部 ({{ unifiedSubtitlesStore.subtitles.length }})
        </button>
        <button class="filter-btn" :class="{ active: filterSource === 'local' }"
          @click="filterSource = 'local'">
          本地 ({{ localSubtitlesCount }})
        </button>
        <button class="filter-btn" :class="{ active: filterSource === 'server' }"
          @click="filterSource = 'server'">
          服务器 ({{ serverSubtitlesCount }})
        </button>
      </div>

      <div class="item-list" v-if="filteredSubtitles.length > 0">
        <div class="subtitle-item" v-for="sub in filteredSubtitles" :key="sub.id">
          <div class="item-icon subtitle-icon">
            <svg viewBox="0 0 1024 1024" width="24" height="24">
              <path fill="currentColor" d="M412.140319 16.584472l197.215394 0 0 74.054901-197.215394 0 0-74.054901Z"/>
              <path fill="currentColor" d="M857.76537 16.965245 678.479848 16.965245c-14.139397 0-25.613378 11.476012-25.613378 25.613378l0 76.841149-281.731925 0L371.134545 42.578623c0-14.136351-11.476012-25.613378-25.614393-25.613378L166.233615 16.965245c-67.772642 0-102.453511 34.678838-102.453511 102.453511l0 793.989328c0 67.798027 34.680869 102.451481 102.453511 102.451481l691.531755 0c67.774673 0 102.451481-34.654469 102.451481-102.451481L960.216851 119.419772C960.217866 51.62073 925.540043 16.965245 857.76537 16.965245zM780.927267 810.95762 243.06664 810.95762c-14.13432 0-25.612362-11.472966-25.612362-25.615409 0-14.158689 11.478043-25.609316 25.612362-25.609316l537.860627 0c14.141428 0 25.617439 11.449611 25.617439 25.609316C806.544707 799.48567 795.068695 810.95762 780.927267 810.95762zM780.927267 595.1757 243.06664 595.1757c-14.13432 0-25.612362-11.449611-25.612362-25.613378 0-14.139397 11.478043-25.613378 25.612362-25.613378l537.860627 0c14.141428 0 25.617439 11.473981 25.617439 25.613378C806.544707 583.725073 795.068695 595.1757 780.927267 595.1757zM780.927267 379.383627 243.06664 379.383627c-14.13432 0-25.612362-11.44555-25.612362-25.611347 0-14.140412 11.478043-25.614393 25.612362-25.614393l537.860627 0c14.141428 0 25.617439 11.473981 25.617439 25.614393C806.544707 367.938077 795.068695 379.383627 780.927267 379.383627z"/>
            </svg>
          </div>
          <div class="item-info">
            <div class="item-name" v-if="editingSubtitleId !== sub.id">{{ sub.name }}</div>
            <input v-else class="rename-input" v-model="editingName"
              @blur="saveRename(sub.id)" @keydown.enter="saveRename(sub.id)"
              @keydown.escape="cancelRename" ref="renameInputRef">
            <div class="item-meta">
              <span class="tag" :class="sub.source === 'server' ? 'server-tag' : 'local-tag'">
                {{ sub.source === 'server' ? '服务器' : '本地' }}
              </span>
              <span class="tag source-tag" :class="sub.source">{{ getSourceLabel(sub.source) }}</span>
              <span class="tag" v-if="sub.audioId">
                关联: {{ getAudioName(sub.audioId) }}
              </span>
              <span class="tag" v-else>未关联</span>
              <span class="tag default-tag" v-if="sub.isDefault">默认</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-secondary btn-sm" @click="startRename(sub)">重命名</button>
            <button class="btn-secondary btn-sm" @click="editSubtitle(sub)">编辑</button>
            <button class="btn-danger btn-sm" @click="deleteSubtitle(sub)">删除</button>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        <p>台词库为空</p>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input type="file" ref="fileInputRef" accept="audio/*" multiple style="display:none" @change="onFileImport">
    <input type="file" ref="serverFileInputRef" accept="audio/*" multiple style="display:none" @change="onServerUpload">

    <!-- 编辑台词弹窗 -->
    <BaseModal v-model="showEditModal" title="编辑台词">
      <div class="form-group">
        <label>名称</label>
        <input type="text" class="input" v-model="editingSubtitle.name">
      </div>
      <div class="form-group">
        <label>内容</label>
        <textarea class="textarea" v-model="editingSubtitle.content" rows="10"></textarea>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showEditModal = false">取消</button>
        <button class="btn-primary" @click="saveSubtitleEdit">保存</button>
      </template>
    </BaseModal>

    <!-- 确认弹窗 -->
    <ConfirmDialog ref="confirmRef" />

    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { useSubtitlesStore } from '../stores/subtitles'
import { usePlayerStore } from '../stores/player'
import { useUnifiedLibraryStore } from '../stores/unifiedLibrary'
import { useUnifiedSubtitlesStore } from '../stores/unifiedSubtitles'
import { parseLRC } from '../utils/lrcParser'
import { audioApi, checkBackend } from '../api'
import BaseModal from '../components/BaseModal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const libraryStore = useLibraryStore()
const subtitlesStore = useSubtitlesStore()
const playerStore = usePlayerStore()
const unifiedLibraryStore = useUnifiedLibraryStore()
const unifiedSubtitlesStore = useUnifiedSubtitlesStore()
const confirmRef = ref(null)
const toastRef = ref(null)

const fileInputRef = ref(null)
const serverFileInputRef = ref(null)
const searchQuery = ref('')
const activeTab = ref('audio')
const filterSource = ref('all')
const serverAvailable = ref(false)

// 搜索防抖
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    // 搜索直接使用本地 ref, filteredSubtitles 计算属性会自动响应
  }, 200)
}

// 重命名状态
const editingSubtitleId = ref(null)
const editingName = ref('')
const renameInputRef = ref(null)

// 编辑台词弹窗
const showEditModal = ref(false)
const editingSubtitle = ref(null)

// 过滤台词
const filteredSubtitles = computed(() => {
  let subs = unifiedSubtitlesStore.subtitles

  // 来源筛选
  if (filterSource.value !== 'all') {
    subs = subs.filter(s => s.source === filterSource.value)
  }

  // 搜索
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    subs = subs.filter(s =>
      s.name.toLowerCase().includes(query)
    )
  }

  return subs
})

// 计算属性
const localCount = computed(() => unifiedLibraryStore.localCount)
const serverCount = computed(() => unifiedLibraryStore.serverCount)
const localSubtitlesCount = computed(() => unifiedSubtitlesStore.localCount)
const serverSubtitlesCount = computed(() => unifiedSubtitlesStore.serverCount)

onMounted(async () => {
  await unifiedLibraryStore.loadAll()
  await unifiedSubtitlesStore.loadAll()
  serverAvailable.value = await checkBackend()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})

// 刷新数据
async function refreshData() {
  await unifiedLibraryStore.loadAll()
  await unifiedSubtitlesStore.loadAll()
}

function triggerImport() {
  fileInputRef.value?.click()
}

function triggerServerUpload() {
  serverFileInputRef.value?.click()
}

async function onFileImport(e) {
  const files = e.target.files
  for (const file of files) {
    if (file.type.startsWith('audio/')) {
      try {
        await libraryStore.addAudioFile(file)
        toastRef.value?.success(`已导入 ${file.name}`)
      } catch (err) {
        toastRef.value?.error(`导入失败: ${err.message}`)
      }
    }
  }
  e.target.value = ''
}

async function onServerUpload(e) {
  const files = e.target.files
  for (const file of files) {
    if (file.type.startsWith('audio/')) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        await audioApi.upload(formData)
        await refreshData()
        toastRef.value?.success('上传成功')
      } catch (err) {
        toastRef.value?.error('上传失败: ' + err.message)
      }
    }
  }
  e.target.value = ''
}

// 获取音频关联的台词
function getAudioSubtitles(audioId) {
  return unifiedSubtitlesStore.getSubtitlesByAudio(audioId)
}

// 获取音频的默认台词
function getDefaultSubtitle(audioId) {
  const subs = unifiedSubtitlesStore.getSubtitlesByAudio(audioId)
  return subs.find(s => s.isDefault) || null
}

// 获取音频名称
function getAudioName(audioId) {
  const audio = unifiedLibraryStore.audioFiles.find(a => a.id === audioId)
  return audio?.name || '未知'
}

// 获取来源标签
function getSourceLabel(source) {
  const labels = { stt: 'STT生成', translate: '翻译', import: '导入' }
  return labels[source] || source
}

async function playAudio(audio) {
  const audioData = await unifiedLibraryStore.getAudioWithUrl(audio.id)
  if (!audioData || !audioData.url) {
    toastRef.value?.error('无法加载音频文件')
    return
  }

  playerStore.loadTrack({ id: audio.id, name: audio.name, url: audioData.url })
  playerStore.play()

  // 加载默认台词
  const defaultSub = getDefaultSubtitle(audio.id)
  if (defaultSub) {
    const lyrics = parseLRC(defaultSub.content)
    playerStore.setLyrics(lyrics)
  }

  router.push('/player')
}

async function deleteAudio(audio) {
  const confirmed = await confirmRef.value?.show({
    title: '删除确认',
    message: `确定要删除 "${audio.name}" 吗？`,
    danger: true
  })
  if (confirmed) {
    try {
      await unifiedLibraryStore.removeAudio(audio.id)
      toastRef.value?.success('已删除')
    } catch (err) {
      toastRef.value?.error(`删除失败: ${err.message}`)
    }
  }
}

// 重命名台词
function startRename(sub) {
  editingSubtitleId.value = sub.id
  editingName.value = sub.name
  setTimeout(() => {
    renameInputRef.value?.[0]?.focus()
  }, 50)
}

function cancelRename() {
  editingSubtitleId.value = null
  editingName.value = ''
}

async function saveRename(id) {
  if (editingName.value.trim()) {
    try {
      await unifiedSubtitlesStore.renameSubtitle(id, editingName.value.trim())
      toastRef.value?.success('重命名成功')
    } catch (err) {
      toastRef.value?.error(`重命名失败: ${err.message}`)
    }
  }
  cancelRename()
}

// 编辑台词
function editSubtitle(sub) {
  editingSubtitle.value = { ...sub }
  showEditModal.value = true
}

async function saveSubtitleEdit() {
  if (editingSubtitle.value) {
    try {
      await unifiedSubtitlesStore.updateSubtitle(editingSubtitle.value.id, {
        name: editingSubtitle.value.name,
        content: editingSubtitle.value.content
      })
      showEditModal.value = false
      toastRef.value?.success('台词已保存')
    } catch (err) {
      toastRef.value?.error(`保存失败: ${err.message}`)
    }
  }
}

async function deleteSubtitle(sub) {
  const confirmed = await confirmRef.value?.show({
    title: '删除确认',
    message: `确定要删除 "${sub.name}" 吗？`,
    danger: true
  })
  if (confirmed) {
    try {
      await unifiedSubtitlesStore.deleteSubtitle(sub.id)
      toastRef.value?.success('已删除')
    } catch (err) {
      toastRef.value?.error(`删除失败: ${err.message}`)
    }
  }
}
</script>

<style scoped>
.library-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.library-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-box .input {
  padding-left: 40px;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-icon {
  flex-shrink: 0;
}

.tab-item:hover {
  color: var(--text-secondary);
}

.tab-item.active {
  background: var(--accent-gradient);
  color: white;
}

/* 内容区域 */
.content-area {
  flex: 1;
  overflow-y: auto;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.filter-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  color: var(--text-secondary);
}

.filter-btn.active {
  background: var(--accent-gradient);
  color: white;
}

/* 本地标签 */
.local-tag {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.25);
  color: var(--color-success);
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 列表项通用 */
.audio-item,
.subtitle-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.audio-item:hover {
  background: var(--bg-card-hover);
  border-color: rgba(255, 107, 157, 0.2);
}

.item-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.audio-icon {
  background: var(--accent-gradient);
}

.subtitle-icon {
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-tag.stt {
  background: rgba(255, 107, 157, 0.15);
  border-color: rgba(255, 107, 157, 0.25);
  color: var(--accent-primary);
}

.source-tag.translate {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.25);
  color: var(--color-info);
}

.source-tag.import {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.25);
  color: var(--color-warning);
}

.default-tag {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.25);
  color: var(--color-success);
}

.server-tag {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.25);
  color: var(--color-info);
}

.server-icon {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 重命名输入框 */
.rename-input {
  width: 100%;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  fill: var(--text-dim);
  margin-bottom: 16px;
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

/* 响应式 */
@media (max-width: 768px) {
  .library-view {
    padding: 16px;
    padding-bottom: 70px;
  }

  .library-header {
    flex-direction: column;
    gap: 12px;
  }

  .library-header .btn-primary {
    width: 100%;
  }

  .audio-item,
  .subtitle-item {
    flex-wrap: wrap;
    gap: 12px;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-light);
  }
}
</style>
