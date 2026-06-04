const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Token 管理
let authToken = localStorage.getItem('auth_token') || null

export function setAuthToken(token) {
  authToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export function getAuthToken() {
  return authToken
}

// 检查后端是否可用
export async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}

// 通用请求函数（timeout 默认 3 分钟，可通过 options.timeout 自定义，单位 ms）
async function request(url, options = {}) {
  const { timeout: customTimeout, ...fetchOptions } = options
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers
  }

  // 自动带 token
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  // 超时控制
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), customTimeout || 180000)

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    })

    // 401 时清除 token
    if (response.status === 401) {
      setAuthToken(null)
      throw new Error('未登录或登录已过期')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

// Auth API
export const authApi = {
  login(password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  },
  logout() {
    return request('/auth/logout', { method: 'POST' })
  },
  check() {
    return request('/auth/check')
  },
  changePassword(oldPassword, newPassword) {
    return request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    })
  }
}

// Settings API
export const settingsApi = {
  get() {
    return request('/settings')
  },
  set(key, value) {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value })
    })
  },
  setBatch(settings) {
    return request('/settings/batch', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    })
  }
}

// Audio API
export const audioApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString()
    return request(`/audio${query ? `?${query}` : ''}`)
  },
  get(id) {
    return request(`/audio/${id}`)
  },
  upload(formData) {
    const headers = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    return fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      headers,
      body: formData
    }).then(async r => {
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      return data
    })
  },
  update(id, data) {
    return request(`/audio/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },
  delete(id) {
    return request(`/audio/${id}`, { method: 'DELETE' })
  },
  moveToFolder(id, folderId) {
    return request(`/audio/${id}/folder`, {
      method: 'PUT',
      body: JSON.stringify({ folder_id: folderId })
    })
  },
  setDefault(id) {
    return request(`/audio/${id}/default`, { method: 'PUT' })
  }
}

// Lyrics API
export const lyricsApi = {
  list(audioId) {
    const query = audioId ? `?audioId=${audioId}` : ''
    return request(`/lyrics${query}`)
  },
  get(id) {
    return request(`/lyrics/${id}`)
  },
  create(data) {
    return request('/lyrics', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  update(id, data) {
    return request(`/lyrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },
  delete(id) {
    return request(`/lyrics/${id}`, { method: 'DELETE' })
  },
  setDefault(id) {
    return request(`/lyrics/${id}/default`, { method: 'PUT' })
  }
}

// Folder API
export const folderApi = {
  list() {
    return request('/folders')
  },
  create(data) {
    return request('/folders', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  update(id, data) {
    return request(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },
  delete(id) {
    return request(`/folders/${id}`, { method: 'DELETE' })
  }
}

// Prompt Preset API
export const promptApi = {
  list() {
    return request('/prompts')
  },
  getDefault() {
    return request('/prompts/default')
  },
  get(id) {
    return request(`/prompts/${id}`)
  },
  create(data) {
    return request('/prompts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  update(id, data) {
    return request(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },
  delete(id) {
    return request(`/prompts/${id}`, { method: 'DELETE' })
  },
  setDefault(id) {
    return request(`/prompts/${id}/default`, { method: 'PUT' })
  }
}

// AI Proxy API
export const aiApi = {
  stt(data) {
    return request('/ai/stt', {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: 300000 // STT 耗时较长，给 5 分钟
    })
  },
  translate(data) {
    return request('/ai/translate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  models(data) {
    return request('/ai/models', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}

// Storage API
export const storageApi = {
  getStats() {
    return request('/storage/stats')
  },
  clearLyrics() {
    return request('/storage/clear-lyrics', { method: 'POST' })
  },
  clearAudio() {
    return request('/storage/clear-audio', { method: 'POST' })
  },
  clearAll() {
    return request('/storage/clear-all', { method: 'POST' })
  }
}
