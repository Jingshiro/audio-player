import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { promptApi, getAuthToken } from '../api'

export const usePromptStore = defineStore('prompt', () => {
  // 破限词预设列表
  const presets = ref((() => {
    try { return JSON.parse(localStorage.getItem('prompt_presets') || '[]') }
    catch { return [] }
  })())

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
    // 同步到服务器
    if (getAuthToken()) {
      promptApi.create({
        name, stt_prompt: sttPrompt, translate_prompt: translatePrompt
      }).catch(() => {})
    }
    return preset
  }

  // 更新预设
  function updatePreset(id, updates) {
    const preset = presets.value.find(p => p.id === id)
    if (preset) {
      Object.assign(preset, updates, { updatedAt: new Date().toISOString() })
      save()
      // 同步到服务器
      if (getAuthToken()) {
        promptApi.update(id, {
          name: preset.name,
          stt_prompt: preset.sttPrompt,
          translate_prompt: preset.translatePrompt
        }).catch(() => {})
      }
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
      // 同步到服务器
      if (getAuthToken()) {
        promptApi.delete(id).catch(() => {})
      }
    }
  }

  // 设为默认
  function setDefault(id) {
    defaultPresetId.value = id
    save()
    // 同步到服务器
    if (getAuthToken()) {
      promptApi.setDefault(id).catch(() => {})
    }
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

  // ===== 服务器同步 =====
  async function loadFromServer() {
    if (!getAuthToken()) return
    try {
      const serverPresets = await promptApi.list()
      if (Array.isArray(serverPresets) && serverPresets.length > 0) {
        // 合并：以服务器数据为主，保留本地独有的
        const serverIds = new Set(serverPresets.map(p => p.id))
        const localOnly = presets.value.filter(p => !serverIds.has(p.id))
        presets.value = [
          ...serverPresets.map(p => ({
            id: p.id,
            name: p.name,
            sttPrompt: p.stt_prompt || '',
            translatePrompt: p.translate_prompt || '',
            isDefault: p.is_default === 1,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          })),
          ...localOnly
        ]
        // 同步默认预设
        const defaultServer = serverPresets.find(p => p.is_default === 1)
        if (defaultServer) {
          defaultPresetId.value = defaultServer.id
        }
        save()
      }
    } catch (e) {
      console.warn('从服务器加载破限词预设失败:', e)
    }
  }

  async function syncToServer() {
    if (!getAuthToken()) return
    try {
      // 逐个同步本地预设到服务器
      for (const preset of presets.value) {
        await promptApi.create({
          name: preset.name,
          stt_prompt: preset.sttPrompt,
          translate_prompt: preset.translatePrompt,
          is_default: preset.id === defaultPresetId.value
        }).catch(() => {
          // 如果已存在则更新
          promptApi.update(preset.id, {
            name: preset.name,
            stt_prompt: preset.sttPrompt,
            translate_prompt: preset.translatePrompt,
            is_default: preset.id === defaultPresetId.value
          }).catch(() => {})
        })
      }
    } catch (e) {
      console.warn('同步破限词预设到服务器失败:', e)
    }
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
    loadDefaultPrompts,
    loadFromServer,
    syncToServer
  }
})
