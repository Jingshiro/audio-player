<template>
  <div class="ai-view">
    <!-- AI 设置 -->
    <div class="glass-card ai-settings">
      <div class="section-title">AI 设置</div>

      <!-- 模型预设选择 -->
      <div class="form-group">
        <label>服务提供商</label>
        <div class="preset-selector">
          <button v-for="preset in modelPresets" :key="preset.id"
            class="preset-btn"
            :class="{ active: aiStore.selectedPreset === preset.id }"
            @click="selectPreset(preset.id)">
            {{ preset.name }}
          </button>
        </div>
      </div>

      <div class="settings-grid">
        <div class="form-group">
          <label>API地址</label>
          <input type="text" class="input" v-model="aiStore.config.baseUrl"
            :placeholder="currentPreset?.baseUrl || 'https://api.openai.com/v1'">
          <span class="form-hint" v-if="aiStore.selectedPreset === 'custom'">以 /v1 结尾</span>
        </div>
        <div class="form-group">
          <label>API密钥</label>
          <input type="password" class="input" v-model="aiStore.config.apiKey"
            placeholder="sk-...">
        </div>
        <div class="form-group">
          <label>模型</label>
          <div class="model-select-row">
            <template v-if="availableModels.length > 0">
              <select class="select" v-model="aiStore.config.model">
                <option value="" disabled>请选择模型</option>
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.id }}
                </option>
              </select>
            </template>
            <template v-else>
              <input type="text" class="input" v-model="aiStore.config.model"
                placeholder="请先拉取模型列表">
            </template>
            <button class="btn-secondary btn-sm" @click="fetchModels" :disabled="isLoadingModels">
              <svg viewBox="0 0 24 24" width="16" height="16" :class="{ spinning: isLoadingModels }">
                <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              {{ isLoadingModels ? '拉取中...' : '拉取模型列表' }}
            </button>
          </div>
        </div>
      </div>
      <button class="btn-primary" @click="saveConfig">保存配置</button>
    </div>

    <!-- 破限词配置 -->
    <div class="glass-card prompt-config">
      <div class="section-title">破限词配置</div>
      <div class="prompt-grid">
        <div class="form-group">
          <label>STT 破限词</label>
          <textarea class="textarea" v-model="sttPrompt"
            placeholder="在调用STT API时作为system prompt发送，用于突破语音识别的内容限制..."
            rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>翻译破限词</label>
          <textarea class="textarea" v-model="translatePrompt"
            placeholder="在调用翻译API时作为system prompt发送，用于突破翻译的内容限制..."
            rows="4"></textarea>
        </div>
      </div>
      <div class="prompt-actions">
        <button class="btn-secondary" @click="savePrompts">应用</button>
        <button class="btn-secondary" @click="showPresetManager = true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          另存预设
        </button>
        <select class="select preset-select" v-model="selectedPresetId" @change="loadPreset">
          <option value="">加载预设...</option>
          <option v-for="preset in promptStore.presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- STT 和翻译 -->
    <div class="tools-grid">
      <!-- STT 台词生成 -->
      <div class="glass-card tool-card">
        <div class="section-title">STT 台词生成</div>
        <div class="tool-content">
          <div class="form-group">
            <label>选择音频文件</label>
            <select class="select" v-model="selectedAudioId">
              <option value="">-- 从音频库选择 --</option>
              <option v-for="audio in libraryStore.audioFiles" :key="audio.id" :value="audio.id">
                {{ audio.name }}
              </option>
            </select>
            <span class="form-hint" v-if="libraryStore.audioFiles.length === 0">
              音频库为空，请先在「导入音频」中添加
            </span>
          </div>

          <button class="btn-primary" @click="startSTT"
            :disabled="!selectedAudioId || aiStore.isGenerating">
            {{ aiStore.isGenerating ? '生成中...' : '开始生成' }}
          </button>

          <div class="progress-bar" v-if="aiStore.isGenerating">
            <div class="progress-fill" :style="{ width: aiStore.generationProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 台词翻译 -->
      <div class="glass-card tool-card">
        <div class="section-title">台词翻译</div>
        <div class="tool-content">
          <div class="form-group">
            <label>源语言</label>
            <select class="select" v-model="translateFrom">
              <option value="ja">日语</option>
              <option value="en">英语</option>
              <option value="ko">韩语</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div class="form-group">
            <label>目标语言</label>
            <select class="select" v-model="translateTo">
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="ko">韩语</option>
            </select>
          </div>

          <!-- 输入方式切换 -->
          <div class="form-group">
            <label>台词来源</label>
            <div class="source-tabs">
              <button class="source-tab" :class="{ active: translateSource === 'text' }"
                @click="translateSource = 'text'">手动输入</button>
              <button class="source-tab" :class="{ active: translateSource === 'file' }"
                @click="translateSource = 'file'">从台词库选择</button>
            </div>
          </div>

          <!-- 手动输入 -->
          <div class="form-group" v-if="translateSource === 'text'">
            <textarea class="textarea" v-model="translateInput"
              placeholder="在此粘贴台词文本..."
              rows="4"></textarea>
          </div>

          <!-- 从台词库选择 -->
          <div class="form-group" v-if="translateSource === 'file'">
            <div class="subtitle-select-row">
              <select class="select" v-model="selectedSubtitleId" @change="onSubtitleSelect">
                <option value="">-- 选择台词 --</option>
                <option v-for="sub in subtitlesStore.subtitles" :key="sub.id" :value="sub.id">
                  {{ sub.name }}
                </option>
              </select>
              <button class="btn-secondary btn-sm" @click="triggerTranslateLrcImport"
                title="导入新的 LRC 文件">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                导入
              </button>
            </div>
            <input type="file" ref="translateLrcInputRef" accept=".lrc,.txt" style="display:none"
              @change="onTranslateLrcSelect">
          </div>

          <button class="btn-primary" @click="startTranslate"
            :disabled="!translateInput || aiStore.isGenerating">
            {{ aiStore.isGenerating ? '翻译中...' : '翻译' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 结果预览 -->
    <div class="glass-card result-preview" v-if="aiStore.generationResult">
      <div class="section-title">结果预览</div>
      <div class="result-content">
        <pre>{{ aiStore.generationResult }}</pre>
      </div>
      <div class="result-actions">
        <button class="btn-primary" @click="saveResult">保存到音频库</button>
        <button class="btn-secondary" @click="retryGeneration">重新生成</button>
        <button class="btn-danger" @click="discardResult">丢弃</button>
      </div>
    </div>

    <!-- 预设保存弹窗 -->
    <div class="modal-overlay" v-if="showPresetManager" @click.self="showPresetManager = false">
      <div class="modal glass-card">
        <div class="modal-header">
          <h3>另存预设</h3>
          <button class="close-btn" @click="showPresetManager = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>预设名称</label>
            <input type="text" class="input" v-model="presetName" placeholder="输入预设名称">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showPresetManager = false">取消</button>
          <button class="btn-primary" @click="saveAsPreset" :disabled="!presetName">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAIStore } from '../stores/ai'
import { usePromptStore } from '../stores/prompt'
import { useLibraryStore } from '../stores/library'
import { useSubtitlesStore } from '../stores/subtitles'
import { MODEL_PRESETS, getPreset } from '../utils/modelPresets'

const aiStore = useAIStore()
const promptStore = usePromptStore()
const libraryStore = useLibraryStore()
const subtitlesStore = useSubtitlesStore()

// 模型预设列表
const modelPresets = Object.values(MODEL_PRESETS)

// 当前选中的预设配置
const currentPreset = computed(() => getPreset(aiStore.selectedPreset))

// 破限词
const sttPrompt = ref(aiStore.sttPrompt)
const translatePrompt = ref(aiStore.translatePrompt)

// STT - 从音频库选择
const selectedAudioId = ref('')

// 翻译
const translateFrom = ref('ja')
const translateTo = ref('zh')
const translateInput = ref('')
const translateSource = ref('text') // 'text' 或 'file'
const selectedSubtitleId = ref('')
const translateLrcInputRef = ref(null)

// 破限词预设管理
const showPresetManager = ref(false)
const presetName = ref('')
const selectedPresetId = ref('')

// 模型列表（从 API 拉取的）
const availableModels = ref([])
const isLoadingModels = ref(false)

// 选择服务商预设
function selectPreset(presetId) {
  const preset = getPreset(presetId)
  aiStore.setPreset(presetId, {
    baseUrl: preset.baseUrl,
    defaultModel: preset.defaultModel
  })
}

// 加载音频库
onMounted(async () => {
  await libraryStore.loadFromDB()
  await subtitlesStore.loadAll()
})

async function fetchModels() {
  if (!aiStore.config.apiKey || !aiStore.config.baseUrl) {
    alert('请先填写 API 地址和密钥')
    return
  }

  isLoadingModels.value = true
  try {
    // 通过后端代理调用
    const data = await aiApi.models({
      baseUrl: aiStore.config.baseUrl,
      apiKey: aiStore.config.apiKey
    })

    availableModels.value = data.data || []

    if (availableModels.value.length > 0 && !availableModels.value.find(m => m.id === aiStore.config.model)) {
      aiStore.config.model = availableModels.value[0].id
    }
  } catch (error) {
    console.error('拉取模型列表失败:', error)
    alert('拉取模型列表失败: ' + error.message)
  } finally {
    isLoadingModels.value = false
  }
}

function saveConfig() {
  aiStore.saveConfig()
  alert('配置已保存')
}

function savePrompts() {
  aiStore.saveSTTPrompt(sttPrompt.value)
  aiStore.saveTranslatePrompt(translatePrompt.value)
  alert('破限词已保存')
}

// 预设管理
function loadPreset() {
  if (!selectedPresetId.value) return
  const preset = promptStore.getPreset(selectedPresetId.value)
  if (preset) {
    sttPrompt.value = preset.sttPrompt
    translatePrompt.value = preset.translatePrompt
    aiStore.saveSTTPrompt(preset.sttPrompt)
    aiStore.saveTranslatePrompt(preset.translatePrompt)
  }
}

function saveAsPreset() {
  if (!presetName.value) return
  promptStore.createPreset(presetName.value, sttPrompt.value, translatePrompt.value)
  showPresetManager.value = false
  presetName.value = ''
  alert('预设已保存')
}

// STT - 真正调用 AI API

// 获取当前 API 格式
function getApiFormat() {
  return currentPreset.value?.audioFormat || 'openai'
}

// 构建认证 headers
function getAuthHeaders() {
  const format = getApiFormat()
  if (format === 'mimo') {
    return { 'api-key': aiStore.config.apiKey }
  }
  if (format === 'gemini') {
    return { 'x-goog-api-key': aiStore.config.apiKey }
  }
  return { 'Authorization': `Bearer ${aiStore.config.apiKey}` }
}

// 获取音频的 MIME 类型
function getAudioMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const mimeMap = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'aiff': 'audio/aiff'
  }
  return mimeMap[ext] || 'audio/wav'
}

async function startSTT() {
  if (!selectedAudioId.value || !aiStore.config.apiKey) {
    alert('请先配置AI API密钥并选择音频文件')
    return
  }

  aiStore.startGeneration()

  try {
    // 从 IndexedDB 加载音频文件
    const audioData = await libraryStore.getAudioFileWithUrl(selectedAudioId.value)
    if (!audioData || !audioData.fileBlob) {
      throw new Error('无法加载音频文件')
    }

    // 将音频转为 base64
    const arrayBuffer = await audioData.fileBlob.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    const fileName = audioData.originalName || 'audio.wav'
    const audioFormat = fileName.split('.').pop() || 'mp3'

    // 构建 system prompt
    let systemPrompt = '你是一个专业的语音转文字助手。请将音频内容转录为带有时间戳的 LRC 格式台词。'
    if (sttPrompt.value) {
      systemPrompt = sttPrompt.value
    }

    // 通过后端代理调用
    const result = await aiApi.stt({
      baseUrl: aiStore.config.baseUrl,
      apiKey: aiStore.config.apiKey,
      model: aiStore.config.model,
      audioBase64: base64,
      audioFormat,
      systemPrompt
    })

    if (result.content) {
      aiStore.appendResult(result.content)
    }
    aiStore.stopGeneration()
  } catch (error) {
    console.error('STT 失败:', error)
    aiStore.stopGeneration()
    alert('STT 失败: ' + error.message)
  }
}

// 翻译 - 真正调用 AI API
async function startTranslate() {
  if (!translateInput.value || !aiStore.config.apiKey) {
    alert('请先配置AI API密钥并输入台词')
    return
  }

  aiStore.startGeneration()

  try {
    // 构建 system prompt
    let systemPrompt = `你是一个专业的翻译助手。请将台词从${getLanguageName(translateFrom.value)}翻译为${getLanguageName(translateTo.value)}。保持 LRC 时间戳格式不变，只翻译台词内容。`
    if (translatePrompt.value) {
      systemPrompt = translatePrompt.value
    }

    // 通过后端代理调用
    const result = await aiApi.translate({
      baseUrl: aiStore.config.baseUrl,
      apiKey: aiStore.config.apiKey,
      model: aiStore.config.model,
      text: translateInput.value,
      targetLanguage: getLanguageName(translateTo.value),
      systemPrompt,
      stream: false
    })

    if (result.content) {
      aiStore.appendResult(result.content)
    }
    aiStore.stopGeneration()
  } catch (error) {
    console.error('翻译失败:', error)
    aiStore.stopGeneration()
    alert('翻译失败: ' + error.message)
  }
}

// 从台词库选择
function onSubtitleSelect() {
  if (!selectedSubtitleId.value) {
    translateInput.value = ''
    return
  }
  const sub = subtitlesStore.getSubtitle(selectedSubtitleId.value)
  if (sub) {
    translateInput.value = sub.content
  }
}

// 导入 LRC 文件到台词库
function triggerTranslateLrcImport() {
  translateLrcInputRef.value?.click()
}

function onTranslateLrcSelect(e) {
  const file = e.target.files[0]
  if (file) importLrcToSubtitles(file)
  e.target.value = ''
}

async function importLrcToSubtitles(file) {
  try {
    const text = await file.text()
    const name = file.name.replace(/\.[^/.]+$/, '')
    const sub = await subtitlesStore.addSubtitle({
      name,
      content: text,
      source: 'import'
    })
    // 自动选中刚导入的
    selectedSubtitleId.value = sub.id
    translateInput.value = sub.content
  } catch (err) {
    console.error('导入失败:', err)
    alert('导入失败: ' + err.message)
  }
}

// 删除台词
async function deleteSubtitle(subtitleId) {
  if (confirm('确定要删除这个台词吗？')) {
    await subtitlesStore.deleteSubtitle(subtitleId)
    if (selectedSubtitleId.value === subtitleId) {
      selectedSubtitleId.value = ''
      translateInput.value = ''
    }
  }
}

function getLanguageName(code) {
  const names = { ja: '日语', en: '英语', ko: '韩语', zh: '中文' }
  return names[code] || code
}

async function saveResult() {
  const content = aiStore.generationResult
  if (!content) return

  // 获取音频名称用于命名
  const audioName = selectedAudioId.value
    ? libraryStore.audioFiles.find(a => a.id === selectedAudioId.value)?.name || '未知'
    : '未知'

  // 根据当前操作判断来源
  const source = translateInput.value ? 'translate' : 'stt'
  const prefix = source === 'stt' ? '[STT]' : '[翻译]'
  const subtitleName = `${prefix}-${audioName}`

  // 保存到台词库
  await subtitlesStore.addSubtitle({
    name: subtitleName,
    content,
    source,
    audioId: selectedAudioId.value || null
  })

  alert('台词已保存')
}

function retryGeneration() {
  aiStore.clearResult()
  startSTT()
}

function discardResult() {
  aiStore.clearResult()
}
</script>

<style scoped>
.ai-view {
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

/* 设置网格 */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* AI 设置提示 */
.settings-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 107, 157, 0.1);
  border: 1px solid rgba(255, 107, 157, 0.2);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--accent-primary);
}

.settings-hint svg {
  flex-shrink: 0;
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.model-select-row {
  display: flex;
  gap: 8px;
}

.model-select-row .select {
  flex: 1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* 台词选择器 */
.lyric-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lyric-picker-item {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.lyric-picker-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.lyric-picker-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.lyric-pick-btn {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lyric-pick-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.lyric-pick-btn.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
}

/* 文件拖放区域 */
.file-drop {
  padding: 16px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.file-drop:hover {
  border-color: var(--accent-primary);
  background: rgba(255, 107, 157, 0.05);
}

.file-drop svg {
  fill: var(--text-dim);
}

.file-drop p {
  font-size: 12px;
  margin: 0;
}

/* 台词库列表 */
.subtitle-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.subtitle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.subtitle-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.subtitle-item.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
}

.subtitle-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtitle-delete {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.subtitle-delete:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* 台词选择行 */
.subtitle-select-row {
  display: flex;
  gap: 8px;
}

.subtitle-select-row .select {
  flex: 1;
}

/* 破限词配置 */
.prompt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.prompt-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.preset-select {
  width: auto;
  min-width: 150px;
  flex: 1;
}

/* 服务提供商预设选择器 */
.preset-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preset-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.preset-btn.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
}

/* 台词来源切换 */
.source-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  padding: 4px;
}

.source-tab {
  flex: 1;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.source-tab:hover {
  color: var(--text-secondary);
}

.source-tab.active {
  background: var(--accent-gradient);
  color: white;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.tool-card {
  display: flex;
  flex-direction: column;
}

.tool-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 进度条 */
.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  transition: width 0.3s ease;
}

/* 结果预览 */
.result-preview {
  max-height: 400px;
}

.result-content {
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.result-content pre {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.result-actions {
  display: flex;
  gap: 12px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .prompt-grid {
    grid-template-columns: 1fr;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .prompt-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .prompt-actions .btn-secondary {
    width: 100%;
  }

  .preset-select {
    width: 100%;
    min-width: 0;
  }
}
</style>
