import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, getAuthToken } from '../api'

export const useAIStore = defineStore('ai', () => {
  // 当前选择的预设 ID
  const selectedPreset = ref(localStorage.getItem('ai_preset') || 'custom')

  // AI 配置
  const config = ref({
    baseUrl: localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('ai_api_key') || '',
    model: localStorage.getItem('ai_model') || 'gpt-4o'
  })

  // 破限词
  const sttPrompt = ref(localStorage.getItem('stt_prompt') || '')
  const translatePrompt = ref(localStorage.getItem('translate_prompt') || '')

  // 生成状态
  const isGenerating = ref(false)
  const generationProgress = ref(0)
  const generationResult = ref('')

  // 是否已从服务器加载
  let loadedFromServer = false

  // 从服务器加载设置
  async function loadFromServer() {
    if (!getAuthToken()) return
    try {
      const settings = await settingsApi.get()
      if (settings.ai_preset) selectedPreset.value = settings.ai_preset
      if (settings.ai_base_url) config.value.baseUrl = settings.ai_base_url
      if (settings.ai_api_key) config.value.apiKey = settings.ai_api_key
      if (settings.ai_model) config.value.model = settings.ai_model
      if (settings.stt_prompt !== undefined) sttPrompt.value = settings.stt_prompt
      if (settings.translate_prompt !== undefined) translatePrompt.value = settings.translate_prompt
      loadedFromServer = true
    } catch (e) {
      console.warn('从服务器加载设置失败:', e)
    }
  }

  // 保存配置
  function saveConfig() {
    localStorage.setItem('ai_preset', selectedPreset.value)
    localStorage.setItem('ai_base_url', config.value.baseUrl)
    localStorage.setItem('ai_api_key', config.value.apiKey)
    localStorage.setItem('ai_model', config.value.model)
    syncToServer()
  }

  // 同步到服务器
  async function syncToServer() {
    if (!getAuthToken()) return
    try {
      await settingsApi.setBatch({
        ai_preset: selectedPreset.value,
        ai_base_url: config.value.baseUrl,
        ai_api_key: config.value.apiKey,
        ai_model: config.value.model
      })
    } catch (e) {
      console.warn('同步设置到服务器失败:', e)
    }
  }

  function updateConfig(newConfig) {
    Object.assign(config.value, newConfig)
    saveConfig()
  }

  function setPreset(presetId, presetConfig) {
    selectedPreset.value = presetId
    if (presetConfig) {
      config.value.baseUrl = presetConfig.baseUrl
      config.value.model = presetConfig.defaultModel
    }
    saveConfig()
  }

  // 保存破限词
  function saveSTTPrompt(prompt) {
    sttPrompt.value = prompt
    localStorage.setItem('stt_prompt', prompt)
    syncToServer()
  }

  function saveTranslatePrompt(prompt) {
    translatePrompt.value = prompt
    localStorage.setItem('translate_prompt', prompt)
    syncToServer()
  }

  // 生成控制
  function startGeneration() {
    isGenerating.value = true
    generationProgress.value = 0
    generationResult.value = ''
  }

  function updateProgress(progress) {
    generationProgress.value = progress
  }

  function appendResult(text) {
    generationResult.value += text
  }

  function stopGeneration() {
    isGenerating.value = false
    generationProgress.value = 100
  }

  function clearResult() {
    generationResult.value = ''
    generationProgress.value = 0
  }

  return {
    selectedPreset,
    config,
    sttPrompt,
    translatePrompt,
    isGenerating,
    generationProgress,
    generationResult,
    loadFromServer,
    saveConfig,
    updateConfig,
    setPreset,
    saveSTTPrompt,
    saveTranslatePrompt,
    startGeneration,
    updateProgress,
    appendResult,
    stopGeneration,
    clearResult
  }
})
