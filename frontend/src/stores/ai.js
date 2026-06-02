import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, getAuthToken } from '../api'

export const useAIStore = defineStore('ai', () => {
  // ===== 保存的 API 预设 =====
  const apiPresets = ref(JSON.parse(localStorage.getItem('api_presets') || '[]'))

  function addApiPreset(name, baseUrl, apiKey, model) {
    const id = 'ap_' + Date.now()
    apiPresets.value.push({ id, name, baseUrl, apiKey, model })
    saveApiPresets()
  }

  function deleteApiPreset(id) {
    apiPresets.value = apiPresets.value.filter(p => p.id !== id)
    saveApiPresets()
  }

  function saveApiPresets() {
    localStorage.setItem('api_presets', JSON.stringify(apiPresets.value))
  }

  // ===== 兼容旧配置迁移 =====
  function migrateLegacy(key) {
    const old = localStorage.getItem('ai_' + key)
    if (old) localStorage.setItem('stt_' + key, old) && localStorage.setItem('translate_' + key, old)
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
    startGeneration, updateProgress, appendResult, stopGeneration, clearResult
  }
})
