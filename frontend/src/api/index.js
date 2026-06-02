const API_BASE = '/api'

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
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
    return fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json())
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
      body: JSON.stringify(data)
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
