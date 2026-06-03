/**
 * 模型预设配置
 * 只预设 base URL 和认证方式，模型由用户自行选择
 */

export const MODEL_PRESETS = {
  // STT 首选：Groq（Whisper）
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    authType: 'bearer',
    audioFormat: 'whisper',
    defaultModel: 'whisper-large-v3'
  },
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
  // MiMo 价格太贵，暂时注释掉
  // mimo: {
  //   id: 'mimo',
  //   name: '小米 MiMo',
  //   baseUrl: 'https://api.xiaomimimo.com/v1',
  //   authType: 'api-key',
  //   audioFormat: 'mimo'
  // },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    authType: 'bearer',
    audioFormat: 'openai'
  },
  // 本地 Whisper 部署（faster-whisper / whisper.cpp 等）
  local_whisper: {
    id: 'local_whisper',
    name: '本地 Whisper',
    baseUrl: 'http://localhost:8080/v1',
    authType: 'none',
    audioFormat: 'openai',
    defaultModel: 'whisper-large-v3',
    tips: '需要先部署 faster-whisper 或 whisper.cpp 等本地服务'
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
