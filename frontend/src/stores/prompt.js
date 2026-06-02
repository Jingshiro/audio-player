import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePromptStore = defineStore('prompt', () => {
  // 破限词预设列表
  const presets = ref(JSON.parse(localStorage.getItem('prompt_presets') || '[]'))

  // 默认预设 ID
  const defaultPresetId = ref(localStorage.getItem('default_preset_id') || null)

  // 计算属性
  const defaultPreset = computed(() => {
    return presets.value.find(p => p.id === defaultPresetId.value) || null
  })

  // 生成唯一 ID
  function generateId() {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 保存到 localStorage
  function save() {
    localStorage.setItem('prompt_presets', JSON.stringify(presets.value))
    localStorage.setItem('default_preset_id', defaultPresetId.value || '')
  }

  // 创建新预设
  function createPreset(name, sttPrompt = '', translatePrompt = '') {
    const preset = {
      id: generateId(),
      name,
      sttPrompt,
      translatePrompt,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    presets.value.push(preset)
    save()
    return preset
  }

  // 更新预设
  function updatePreset(id, updates) {
    const preset = presets.value.find(p => p.id === id)
    if (preset) {
      Object.assign(preset, updates, { updatedAt: new Date().toISOString() })
      save()
    }
  }

  // 删除预设
  function deletePreset(id) {
    const index = presets.value.findIndex(p => p.id === id)
    if (index !== -1) {
      presets.value.splice(index, 1)
      if (defaultPresetId.value === id) {
        defaultPresetId.value = presets.value.length > 0 ? presets.value[0].id : null
      }
      save()
    }
  }

  // 设为默认
  function setDefault(id) {
    defaultPresetId.value = id
    save()
  }

  // 获取预设
  function getPreset(id) {
    return presets.value.find(p => p.id === id)
  }

  // 加载默认预设的破限词
  function loadDefaultPrompts() {
    const preset = defaultPreset.value
    if (preset) {
      return {
        sttPrompt: preset.sttPrompt,
        translatePrompt: preset.translatePrompt
      }
    }
    return { sttPrompt: '', translatePrompt: '' }
  }

  return {
    presets,
    defaultPresetId,
    defaultPreset,
    createPreset,
    updatePreset,
    deletePreset,
    setDefault,
    getPreset,
    loadDefaultPrompts
  }
})
