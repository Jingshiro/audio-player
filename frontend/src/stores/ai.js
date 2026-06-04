import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, getAuthToken } from '../api'

export const useAIStore = defineStore('ai', () => {
  // ===== 保存的 API 预设 =====
  const apiPresets = ref((() => {
    try { return JSON.parse(localStorage.getItem('api_presets') || '[]') }
    catch { return [] }
  })())

  function addApiPreset(name, baseUrl, apiKey, model) {
    const id = 'ap_' + Date.now()
    apiPresets.value.push({ id, name, baseUrl, apiKey, model })
    saveApiPresets()
    syncApiPresetsToServer()
  }

  function deleteApiPreset(id) {
    apiPresets.value = apiPresets.value.filter(p => p.id !== id)
    saveApiPresets()
    syncApiPresetsToServer()
  }

  function saveApiPresets() {
    localStorage.setItem('api_presets', JSON.stringify(apiPresets.value))
  }

  // ===== 同步 API 预设到服务器 =====
  async function syncApiPresetsToServer() {
    if (!getAuthToken()) return
    try {
      await settingsApi.set('api_presets', JSON.stringify(apiPresets.value))
    } catch (e) {
      console.warn('同步 API 预设到服务器失败:', e)
    }
  }

  // ===== 从服务器加载所有设置（登录后调用） =====
  async function loadApiPresetsFromServer() {
    if (!getAuthToken()) return
    try {
      const settings = await settingsApi.get()
      // 合并 API 预设（去重）
      if (settings.api_presets) {
        const serverPresets = JSON.parse(settings.api_presets)
        const localIds = new Set(apiPresets.value.map(p => p.id))
        const serverOnly = serverPresets.filter(p => !localIds.has(p.id))
        apiPresets.value = [...apiPresets.value, ...serverOnly]
        saveApiPresets()
      }
      // 加载 STT 配置（服务器优先，确保跨设备一致）
      if (settings.stt_base_url) {
        sttConfig.value.baseUrl = settings.stt_base_url
        localStorage.setItem('stt_base_url', settings.stt_base_url)
      }
      if (settings.stt_api_key) {
        sttConfig.value.apiKey = settings.stt_api_key
        localStorage.setItem('stt_api_key', settings.stt_api_key)
      }
      if (settings.stt_model) {
        sttConfig.value.model = settings.stt_model
        localStorage.setItem('stt_model', settings.stt_model)
      }
      if (settings.stt_preset) {
        sttPresetId.value = settings.stt_preset
        localStorage.setItem('stt_preset', settings.stt_preset)
      }
      if (settings.stt_prompt) {
        sttPrompt.value = settings.stt_prompt
        localStorage.setItem('stt_prompt', settings.stt_prompt)
      }
      // 加载翻译配置（服务器优先）
      if (settings.translate_base_url) {
        translateConfig.value.baseUrl = settings.translate_base_url
        localStorage.setItem('translate_base_url', settings.translate_base_url)
      }
      if (settings.translate_api_key) {
        translateConfig.value.apiKey = settings.translate_api_key
        localStorage.setItem('translate_api_key', settings.translate_api_key)
      }
      if (settings.translate_model) {
        translateConfig.value.model = settings.translate_model
        localStorage.setItem('translate_model', settings.translate_model)
      }
      if (settings.translate_preset) {
        translatePresetId.value = settings.translate_preset
        localStorage.setItem('translate_preset', settings.translate_preset)
      }
      if (settings.translate_prompt) {
        translatePrompt.value = settings.translate_prompt
        localStorage.setItem('translate_prompt', settings.translate_prompt)
      }
    } catch (e) {
      console.warn('从服务器加载设置失败:', e)
    }
  }

  // ===== 兼容旧配置迁移 =====
  function migrateLegacy(key) {
    const old = localStorage.getItem('ai_' + key)
    if (old) {
      localStorage.setItem('stt_' + key, old)
      localStorage.setItem('translate_' + key, old)
    }
  }

  // ===== STT 独立配置 =====
  const sttPresetId = ref(localStorage.getItem('stt_preset') || '')
  const sttConfig = ref(loadSectionConfig('stt'))

  // ===== 翻译独立配置 =====
  const translatePresetId = ref(localStorage.getItem('translate_preset') || '')
  const translateConfig = ref(loadSectionConfig('translate'))

  function loadSectionConfig(section) {
    // 首次：从旧单配置迁移
    if (!localStorage.getItem(section + '_base_url')) {
      migrateLegacy('base_url')
      migrateLegacy('api_key')
      migrateLegacy('model')
    }
    return {
      baseUrl: localStorage.getItem(section + '_base_url') || 'https://api.openai.com/v1',
      apiKey: localStorage.getItem(section + '_api_key') || '',
      model: localStorage.getItem(section + '_model') || 'gpt-4o'
    }
  }

  // ===== 破限词（STT和翻译各自独立）=====
  const sttPrompt = ref(localStorage.getItem('stt_prompt') || '')
  const translatePrompt = ref(localStorage.getItem('translate_prompt') || '')

  // ===== 生成状态 =====
  const isGenerating = ref(false)
  const generationProgress = ref(0)
  const generationResult = ref('')

  // ===== 服务商预设选择 =====
  function selectProvider(presetId, presetConfig, section) {
    const cfg = section === 'stt' ? sttConfig : translateConfig
    cfg.value.baseUrl = presetConfig.baseUrl
    cfg.value.model = presetConfig.defaultModel || cfg.value.model
    if (section === 'stt') sttPresetId.value = presetId
    else translatePresetId.value = presetId
    saveSectionConfig(section)
  }

  // ===== 加载 API 预设 =====
  function applyApiPreset(preset, section) {
    const cfg = section === 'stt' ? sttConfig : translateConfig
    cfg.value.baseUrl = preset.baseUrl
    cfg.value.apiKey = preset.apiKey
    cfg.value.model = preset.model
    saveSectionConfig(section)
  }

  // ===== 持久化 =====
  function saveSectionConfig(section) {
    const cfg = section === 'stt' ? sttConfig : translateConfig
    localStorage.setItem(section + '_base_url', cfg.value.baseUrl)
    localStorage.setItem(section + '_api_key', cfg.value.apiKey)
    localStorage.setItem(section + '_model', cfg.value.model)
    localStorage.setItem(section + '_preset', section === 'stt' ? sttPresetId.value : translatePresetId.value)
    syncToServer()
  }

  // ===== 破限词持久化 =====
  function saveSTTPrompt(prompt) {
    sttPrompt.value = prompt
    localStorage.setItem('stt_prompt', prompt)
  }

  function saveTranslatePrompt(prompt) {
    translatePrompt.value = prompt
    localStorage.setItem('translate_prompt', prompt)
  }

  // ===== 服务器同步 =====
  async function syncToServer() {
    if (!getAuthToken()) return
    try {
      await settingsApi.setBatch({
        stt_base_url: sttConfig.value.baseUrl,
        stt_api_key: sttConfig.value.apiKey,
        stt_model: sttConfig.value.model,
        translate_base_url: translateConfig.value.baseUrl,
        translate_api_key: translateConfig.value.apiKey,
        translate_model: translateConfig.value.model,
        stt_prompt: sttPrompt.value,
        translate_prompt: translatePrompt.value
      })
    } catch (e) {
      console.warn('同步设置到服务器失败:', e)
    }
  }

  // ===== 生成控制 =====
  function startGeneration() {
    isGenerating.value = true
    generationProgress.value = 0
    generationResult.value = ''
  }
  function updateProgress(progress) { generationProgress.value = progress }
  function appendResult(text) { generationResult.value += text }
  function stopGeneration() {
    isGenerating.value = false
    generationProgress.value = 100
  }
  function clearResult() {
    generationResult.value = ''
    generationProgress.value = 0
  }

  return {
    apiPresets,
    sttPresetId, sttConfig,
    translatePresetId, translateConfig,
    sttPrompt, translatePrompt,
    isGenerating, generationProgress, generationResult,
    addApiPreset, deleteApiPreset, applyApiPreset,
    selectProvider, saveSectionConfig,
    saveSTTPrompt, saveTranslatePrompt,
    startGeneration, updateProgress, appendResult, stopGeneration, clearResult,
    loadApiPresetsFromServer
  }
})
