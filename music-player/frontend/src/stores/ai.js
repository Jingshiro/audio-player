import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  // 保存配置
  function saveConfig() {
    localStorage.setItem('ai_preset', selectedPreset.value)
    localStorage.setItem('ai_base_url', config.value.baseUrl)
    localStorage.setItem('ai_api_key', config.value.apiKey)
    localStorage.setItem('ai_model', config.value.model)
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
  }

  function saveTranslatePrompt(prompt) {
    translatePrompt.value = prompt
    localStorage.setItem('translate_prompt', prompt)
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
