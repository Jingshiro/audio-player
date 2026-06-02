/**
 * 模型预设配置
 * 只预设 base URL 和认证方式，模型由用户自行选择
 */

export const MODEL_PRESETS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    audioFormat: 'openai'
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authType: 'x-goog-api-key',
    audioFormat: 'gemini'
  },
  mimo: {
    id: 'mimo',
    name: '小米 MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    authType: 'api-key',
    audioFormat: 'mimo'
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    authType: 'bearer',
    audioFormat: 'whisper',
    defaultModel: 'whisper-large-v3'
  },
  custom: {
    id: 'custom',
    name: '自定义（OpenAI 兼容）',
    baseUrl: '',
    authType: 'bearer',
    audioFormat: 'openai'
  }
}

export function getPresetOptions() {
  return Object.values(MODEL_PRESETS).map(p => ({
    id: p.id,
    name: p.name
  }))
}

export function getPreset(id) {
  return MODEL_PRESETS[id] || MODEL_PRESETS.custom
}
