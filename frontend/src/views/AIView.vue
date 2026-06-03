<template>
  <div class="ai-view">
    <!-- API 预设管理 -->
    <div class="glass-card api-presets" v-if="aiStore.apiPresets.length > 0">
      <div class="section-title">已保存的 API 预设</div>
      <div class="preset-list">
        <div v-for="preset in aiStore.apiPresets" :key="preset.id" class="preset-item">
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-detail">{{ preset.baseUrl }}</span>
          <span class="preset-detail">{{ preset.model }}</span>
          <div class="preset-item-actions">
            <button class="btn-sm btn-secondary" @click="applyPresetTo(preset, 'stt')">用于STT</button>
            <button class="btn-sm btn-secondary" @click="applyPresetTo(preset, 'translate')">用于翻译</button>
            <button class="btn-sm btn-danger" @click="handleDeletePreset(preset.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- STT 模型配置 -->
    <div class="glass-card ai-settings">
      <div class="section-title">STT 模型配置</div>
      <div class="form-group">
        <label>服务提供商</label>
        <div class="preset-selector">
          <button v-for="preset in modelPresets" :key="preset.id"
            class="preset-btn" :class="{ active: aiStore.sttPresetId === preset.id }"
            @click="aiStore.selectProvider(preset.id, preset, 'stt')">{{ preset.name }}</button>
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label>API地址</label>
          <input type="text" class="input" v-model="aiStore.sttConfig.baseUrl" placeholder="https://api.openai.com/v1">
        </div>
        <div class="form-group">
          <label>API密钥</label>
          <input type="password" class="input" v-model="aiStore.sttConfig.apiKey" placeholder="sk-...">
        </div>
        <div class="form-group">
          <label>模型</label>
          <div class="model-select-row">
            <select class="select" v-model="aiStore.sttConfig.model" v-if="sttModels.length > 0">
              <option value="" disabled>请选择模型</option>
              <option v-for="m in sttModels" :key="m.id" :value="m.id">{{ m.id }}</option>
            </select>
            <input v-else type="text" class="input" v-model="aiStore.sttConfig.model" placeholder="输入模型名">
            <button class="btn-secondary btn-sm" @click="fetchModels('stt')" :disabled="isLoadingSttModels">
              {{ isLoadingSttModels ? '拉取中...' : '拉取' }}
            </button>
          </div>
        </div>
      </div>
      <div class="config-actions">
        <button class="btn-primary" @click="aiStore.saveSectionConfig('stt')">保存</button>
        <button class="btn-secondary" @click="saveAsApiPreset('stt')">另存预设</button>
      </div>
    </div>

    <!-- 翻译模型配置 -->
    <div class="glass-card ai-settings">
      <div class="section-title">翻译模型配置</div>
      <div class="form-group">
        <label>服务提供商</label>
        <div class="preset-selector">
          <button v-for="preset in modelPresets" :key="preset.id"
            class="preset-btn" :class="{ active: aiStore.translatePresetId === preset.id }"
            @click="aiStore.selectProvider(preset.id, preset, 'translate')">{{ preset.name }}</button>
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label>API地址</label>
          <input type="text" class="input" v-model="aiStore.translateConfig.baseUrl" placeholder="https://api.openai.com/v1">
        </div>
        <div class="form-group">
          <label>API密钥</label>
          <input type="password" class="input" v-model="aiStore.translateConfig.apiKey" placeholder="sk-...">
        </div>
        <div class="form-group">
          <label>模型</label>
          <div class="model-select-row">
            <select class="select" v-model="aiStore.translateConfig.model" v-if="translateModels.length > 0">
              <option value="" disabled>请选择模型</option>
              <option v-for="m in translateModels" :key="m.id" :value="m.id">{{ m.id }}</option>
            </select>
            <input v-else type="text" class="input" v-model="aiStore.translateConfig.model" placeholder="输入模型名">
            <button class="btn-secondary btn-sm" @click="fetchModels('translate')" :disabled="isLoadingTranslateModels">
              {{ isLoadingTranslateModels ? '拉取中...' : '拉取' }}
            </button>
          </div>
        </div>
      </div>
      <div class="config-actions">
        <button class="btn-primary" @click="aiStore.saveSectionConfig('translate')">保存</button>
        <button class="btn-secondary" @click="saveAsApiPreset('translate')">另存预设</button>
      </div>
    </div>

    <!-- 破限词配置 -->
    <div class="glass-card prompt-config">
      <div class="section-title">破限词配置</div>
      <div class="grid-2">
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
              <optgroup label="本地音频" v-if="localAudios.length > 0">
                <option v-for="audio in localAudios" :key="audio.id" :value="audio.id">
                  {{ audio.name }}
                </option>
              </optgroup>
              <optgroup label="服务器音频" v-if="serverAudios.length > 0">
                <option v-for="audio in serverAudios" :key="audio.id" :value="audio.id">
                  {{ audio.name }}
                </option>
              </optgroup>
            </select>
            <span class="form-hint" v-if="unifiedLibraryStore.audioFiles.length === 0">
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
            <select class="select" v-model="translateFrom" @change="saveTranslateLang('translate_from', translateFrom)">
              <option value="ja">日语</option>
              <option value="en">英语</option>
              <option value="ko">韩语</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div class="form-group">
            <label>目标语言</label>
            <select class="select" v-model="translateTo" @change="saveTranslateLang('translate_to', translateTo)">
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
                <optgroup label="本地台词" v-if="localSubtitles.length > 0">
                  <option v-for="sub in localSubtitles" :key="sub.id" :value="sub.id">
                    {{ sub.name }}
                  </option>
                </optgroup>
                <optgroup label="服务器台词" v-if="serverSubtitles.length > 0">
                  <option v-for="sub in serverSubtitles" :key="sub.id" :value="sub.id">
                    {{ sub.name }}
                  </option>
                </optgroup>
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
    <BaseModal v-model="showPresetManager" title="另存预设" width="400px">
      <div class="form-group">
        <label>预设名称</label>
        <input type="text" class="input" v-model="presetName" placeholder="输入预设名称">
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showPresetManager = false">取消</button>
        <button class="btn-primary" @click="saveAsPreset" :disabled="!presetName">保存</button>
      </template>
    </BaseModal>

    <!-- 确认弹窗 -->
    <ConfirmDialog ref="confirmRef" />

    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAIStore } from '../stores/ai'
import { usePromptStore } from '../stores/prompt'
import { useUnifiedLibraryStore } from '../stores/unifiedLibrary'
import { useUnifiedSubtitlesStore } from '../stores/unifiedSubtitles'
import { MODEL_PRESETS } from '../utils/modelPresets'
import { aiApi, checkBackend } from '../api'
import BaseModal from '../components/BaseModal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Toast from '../components/Toast.vue'

const aiStore = useAIStore()
const promptStore = usePromptStore()
const unifiedLibraryStore = useUnifiedLibraryStore()
const unifiedSubtitlesStore = useUnifiedSubtitlesStore()
const confirmRef = ref(null)
const toastRef = ref(null)

const hasBackend = ref(false)
const modelPresets = Object.values(MODEL_PRESETS)

const sttPrompt = ref(aiStore.sttPrompt)
const translatePrompt = ref(aiStore.translatePrompt)
const selectedAudioId = ref('')
const translateFrom = ref(localStorage.getItem('translate_from') || 'en')
const translateTo = ref(localStorage.getItem('translate_to') || 'zh')
const translateInput = ref('')
const translateSource = ref('text')
const selectedSubtitleId = ref('')
const translateLrcInputRef = ref(null)
const showPresetManager = ref(false)
const presetName = ref('')
const selectedPresetId = ref('')
const sttModels = ref([])
const translateModels = ref([])
const isLoadingSttModels = ref(false)
const isLoadingTranslateModels = ref(false)

// 合并为单个 onMounted
onMounted(async () => {
  hasBackend.value = await checkBackend()
  await unifiedLibraryStore.loadAll()
  await unifiedSubtitlesStore.loadAll()
  // 从服务器加载 API 预设
  if (hasBackend.value) {
    await aiStore.loadApiPresetsFromServer()
  }
})

async function saveAsApiPreset(section) {
  const cfg = section === 'stt' ? aiStore.sttConfig : aiStore.translateConfig
  // 使用 BaseModal 替代 window.prompt
  presetName.value = ''
  showPresetManager.value = true
  // 保存操作在 saveAsPreset 中处理, 这里记录 section
  pendingPresetSection.value = section
}

const pendingPresetSection = ref('')

function applyPresetTo(preset, section) { aiStore.applyApiPreset(preset, section) }

async function handleDeletePreset(id) {
  const confirmed = await confirmRef.value?.show({
    title: '删除确认',
    message: '确定删除此预设？',
    danger: true
  })
  if (confirmed) aiStore.deleteApiPreset(id)
}

const localAudios = computed(() => unifiedLibraryStore.localAudios)
const serverAudios = computed(() => unifiedLibraryStore.serverAudios)
const localSubtitles = computed(() => unifiedSubtitlesStore.localSubtitles)
const serverSubtitles = computed(() => unifiedSubtitlesStore.serverSubtitles)

// 追踪最后一次生成操作的类型
const lastGeneratedType = ref('')

function detectApiFormat(baseUrl) {
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (baseUrl.includes('groq.com')) return 'whisper'
  return 'openai'
}
function buildAuthHeaders(apiKey, format) {
  if (format === 'gemini') return { 'x-goog-api-key': apiKey }
  return { 'Authorization': `Bearer ${apiKey}` }
}

async function fetchModels(section) {
  const cfg = section === 'stt' ? aiStore.sttConfig : aiStore.translateConfig
  const setLoading = section === 'stt' ? (v) => { isLoadingSttModels.value = v } : (v) => { isLoadingTranslateModels.value = v }
  const setModels = section === 'stt' ? (v) => { sttModels.value = v } : (v) => { translateModels.value = v }
  if (!cfg.apiKey || !cfg.baseUrl) { toastRef.value?.warning('请先填写 API 地址和密钥'); return }
  setLoading(true)
  try {
    let models = []
    if (hasBackend.value) {
      const data = await aiApi.models({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey })
      models = data.data || []
    } else {
      const format = detectApiFormat(cfg.baseUrl)
      let url, headers = {}
      if (format === 'gemini') { url = `${cfg.baseUrl}/models?key=${cfg.apiKey}` }
      else { url = `${cfg.baseUrl.replace(/\/$/, '')}/models`; headers = buildAuthHeaders(cfg.apiKey, format) }
      const resp = await fetch(url, { headers })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      models = format === 'gemini' ? (data.models || []).map(m => ({ id: m.name.replace('models/', '') })) : (data.data || [])
    }
    setModels(models)
    if (models.length > 0 && !models.find(m => m.id === cfg.model)) cfg.model = models[0].id
  } catch (e) { console.error('拉取模型列表失败:', e); toastRef.value?.error('拉取模型列表失败: ' + e.message) }
  finally { setLoading(false) }
}

function savePrompts() {
  aiStore.saveSTTPrompt(sttPrompt.value)
  aiStore.saveTranslatePrompt(translatePrompt.value)
  toastRef.value?.success('破限词已保存')
}

function loadPreset() {
  if (!selectedPresetId.value) return
  const p = promptStore.getPreset(selectedPresetId.value)
  if (p) {
    sttPrompt.value = p.sttPrompt
    translatePrompt.value = p.translatePrompt
    aiStore.saveSTTPrompt(p.sttPrompt)
    aiStore.saveTranslatePrompt(p.translatePrompt)
  }
}

function saveAsPreset() {
  if (!presetName.value) return
  promptStore.createPreset(presetName.value, sttPrompt.value, translatePrompt.value)
  showPresetManager.value = false
  presetName.value = ''
  toastRef.value?.success('预设已保存')
}

function uint8ArrayToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const len = bytes.length; let result = ''
  for (let i = 0; i < len; i += 3) { const b1 = bytes[i], b2 = i + 1 < len ? bytes[i + 1] : 0, b3 = i + 2 < len ? bytes[i + 2] : 0; result += chars[b1 >> 2] + chars[((b1 & 3) << 4) | (b2 >> 4)] + (i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=') + (i + 2 < len ? chars[b3 & 63] : '=') }
  return result
}

async function startSTT() {
  const cfg = aiStore.sttConfig
  if (!selectedAudioId.value || !cfg.apiKey) { toastRef.value?.warning('请先配置STT的API密钥并选择音频文件'); return }
  aiStore.startGeneration()
  lastGeneratedType.value = 'stt'
  try {
    const audioItem = unifiedLibraryStore.audioFiles.find(a => a.id === selectedAudioId.value)
    if (!audioItem) throw new Error('未找到音频文件，请刷新列表')
    let fileBlob, fileName
    if (audioItem.source === 'local') {
      const d = await unifiedLibraryStore.getAudioWithUrl(selectedAudioId.value)
      if (!d?.fileBlob) throw new Error('无法加载本地音频')
      fileBlob = d.fileBlob; fileName = d.originalName || 'audio.wav'
    } else {
      fileBlob = await unifiedLibraryStore.getAudioBlob(selectedAudioId.value)
      if (!fileBlob) throw new Error('无法下载服务器音频')
      fileName = audioItem.originalName || 'audio.wav'
    }
    const base64 = uint8ArrayToBase64(new Uint8Array(await fileBlob.arrayBuffer()))
    const audioFormat = fileName.split('.').pop() || 'mp3'
    let systemPrompt = sttPrompt.value || '你是一个专业的语音转文字助手。请将音频内容转录为带有时间戳的 LRC 格式台词。'

    let content = ''
    if (hasBackend.value) {
      const result = await aiApi.stt({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, audioBase64: base64, audioFormat, systemPrompt })
      content = result.content || ''
    } else {
      const fmt = detectApiFormat(cfg.baseUrl)
      let body, url
      if (fmt === 'gemini') {
        url = `${cfg.baseUrl}/models/${cfg.model}:generateContent`
        body = JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, { inline_data: { mime_type: `audio/${audioFormat}`, data: base64 } }] }] })
      } else {
        url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
        body = JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: [{ type: 'input_audio', input_audio: { data: base64, format: audioFormat } }, { type: 'text', text: '请转录为 LRC 格式' }] }], stream: false })
      }
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(cfg.apiKey, fmt) }, body })
      if (!resp.ok) throw new Error(`API 错误 ${resp.status}`)
      const data = await resp.json()
      content = fmt === 'gemini' ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '') : (data.choices?.[0]?.message?.content || '')
    }
    if (content) aiStore.appendResult(content)
    else aiStore.appendResult('[空内容]')
    aiStore.stopGeneration()
  } catch (e) { console.error('STT 失败:', e); aiStore.stopGeneration(); toastRef.value?.error('STT 失败: ' + e.message) }
}

async function startTranslate() {
  const cfg = aiStore.translateConfig
  if (!translateInput.value || !cfg.apiKey) { toastRef.value?.warning('请先配置翻译API密钥并输入台词'); return }
  aiStore.startGeneration()
  lastGeneratedType.value = 'translate'
  try {
    let sp = translatePrompt.value || `翻译为${getLanguageName(translateTo.value)}，保持LRC格式`
    let content = ''
    if (hasBackend.value) {
      const r = await aiApi.translate({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, text: translateInput.value, targetLanguage: getLanguageName(translateTo.value), systemPrompt: sp, stream: false })
      content = r.content || ''
    } else {
      const fmt = detectApiFormat(cfg.baseUrl)
      let body, url
      if (fmt === 'gemini') { url = `${cfg.baseUrl}/models/${cfg.model}:generateContent`; body = JSON.stringify({ contents: [{ parts: [{ text: `${sp}\n\n${translateInput.value}` }] }] }) }
      else { url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`; body = JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: sp }, { role: 'user', content: translateInput.value }], stream: false }) }
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(cfg.apiKey, fmt) }, body })
      if (!resp.ok) throw new Error(`API 错误 ${resp.status}`)
      const data = await resp.json()
      content = fmt === 'gemini' ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '') : (data.choices?.[0]?.message?.content || '')
    }
    if (content) aiStore.appendResult(content)
    aiStore.stopGeneration()
  } catch (e) { console.error('翻译失败:', e); aiStore.stopGeneration(); toastRef.value?.error('翻译失败: ' + e.message) }
}

function onSubtitleSelect() { const s = unifiedSubtitlesStore.getSubtitle(selectedSubtitleId.value); translateInput.value = s?.content || '' }
function triggerTranslateLrcImport() { translateLrcInputRef.value?.click() }
function onTranslateLrcSelect(e) { const f = e.target.files[0]; if (f) importLrcToSubtitles(f); e.target.value = '' }
async function importLrcToSubtitles(file) {
  try { const t = await file.text(); const s = await unifiedSubtitlesStore.addSubtitle({ name: file.name.replace(/\.[^/.]+$/, ''), content: t, source: 'import' }); selectedSubtitleId.value = s.id; translateInput.value = s.content }
  catch (e) { toastRef.value?.error('导入失败: ' + e.message) }
}
async function handleDeleteSubtitle(id) {
  const confirmed = await confirmRef.value?.show({ title: '删除确认', message: '确定删除？', danger: true })
  if (confirmed) {
    await unifiedSubtitlesStore.deleteSubtitle(id)
    if (selectedSubtitleId.value === id) { selectedSubtitleId.value = ''; translateInput.value = '' }
  }
}
function saveTranslateLang(k, v) { localStorage.setItem(k, v) }
function getLanguageName(c) { return { ja: '日语', en: '英语', ko: '韩语', zh: '中文' }[c] || c }

async function saveResult() {
  if (!aiStore.generationResult) return
  const type = lastGeneratedType.value || 'stt'

  let baseName = '未知'
  if (type === 'translate' && selectedSubtitleId.value) {
    const src = unifiedSubtitlesStore.getSubtitle(selectedSubtitleId.value)
    if (src) baseName = src.name.replace(/^\[STT\]-/, '').replace(/\.[^.]+$/, '')
  } else if (selectedAudioId.value) {
    const audio = unifiedLibraryStore.audioFiles.find(a => a.id === selectedAudioId.value)
    if (audio) baseName = audio.name.replace(/\.[^.]+$/, '')
  }
  const prefix = type === 'translate' ? '[翻译]' : '[STT]'
  await unifiedSubtitlesStore.addSubtitle({
    name: prefix + '-' + baseName,
    content: aiStore.generationResult,
    source: type,
    audioId: selectedAudioId.value || null
  })
  toastRef.value?.success('台词已保存')
}

function retryGeneration() { aiStore.clearResult(); startSTT() }
function discardResult() { aiStore.clearResult() }
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

/* 配置操作按钮 */
.config-actions {
  display: flex;
  gap: 12px;
}

/* API 预设列表 */
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.preset-detail {
  font-size: 12px;
  color: var(--text-muted);
}

.preset-item-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
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

/* 破限词配置 */
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

/* 台词选择行 */
.subtitle-select-row {
  display: flex;
  gap: 8px;
}

.subtitle-select-row .select {
  flex: 1;
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

/* 响应式 */
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

  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
