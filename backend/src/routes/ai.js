const express = require('express')

const router = express.Router()

// 判断 API 格式
function detectFormat(baseUrl) {
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (baseUrl.includes('xiaomimimo.com')) return 'mimo'
  return 'openai'
}

// 根据文件扩展名获取 MIME 类型
function getMimeType(format) {
  const map = {
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'aiff': 'audio/aiff',
    'webm': 'audio/webm',
    'opus': 'audio/ogg'
  }
  return map[format] || 'audio/mpeg'
}

// 构建认证头
function buildHeaders(apiKey, format) {
  if (format === 'gemini') return {}
  if (format === 'mimo') return { 'api-key': apiKey }
  return { 'Authorization': `Bearer ${apiKey}` }
}

// POST /api/ai/stt - Proxy STT request
router.post('/stt', async (req, res) => {
  const { baseUrl, apiKey, model, audioBase64, audioFormat, systemPrompt } = req.body
  const startTime = Date.now()

  console.log('[AI/STT] ===== 收到请求 =====')
  console.log('[AI/STT] baseUrl:', baseUrl)
  console.log('[AI/STT] model:', model)
  console.log('[AI/STT] audioFormat:', audioFormat)
  console.log('[AI/STT] audioBase64 length:', audioBase64?.length)
  console.log('[AI/STT] systemPrompt length:', systemPrompt?.length || 0)

  if (!baseUrl || !apiKey || !model || !audioBase64) {
    console.log('[AI/STT] ❌ 缺少必要参数')
    return res.status(400).json({ error: 'baseUrl, apiKey, model, and audioBase64 are required' })
  }

  const format = detectFormat(baseUrl)
  console.log('[AI/STT] 检测到 API 格式:', format)

  try {
    if (format === 'gemini') {
      // Gemini API 格式
      const mimeType = getMimeType(audioFormat)
      const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      const contents = [{
        parts: [
          { text: systemPrompt || 'Please transcribe this audio to LRC format lyrics with timestamps.' },
          { inline_data: { mime_type: mimeType, data: audioBase64 } }
        ]
      }]

      console.log('[AI/STT] 向 Gemini 发起请求:', geminiUrl.substring(0, 80) + '...')
      console.log('[AI/STT] 音频 MIME 类型:', mimeType)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2分钟超时

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))

      const elapsed = Date.now() - startTime
      console.log('[AI/STT] Gemini 响应状态:', response.status, '耗时:', elapsed + 'ms')

      if (!response.ok) {
        const error = await response.text()
        console.log('[AI/STT] ❌ Gemini 返回错误:', error.substring(0, 500))
        return res.status(response.status).json({ error })
      }

      const data = await response.json()
      console.log('[AI/STT] Gemini 响应 JSON keys:', Object.keys(data))
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log('[AI/STT] ✅ Gemini 返回内容长度:', content.length)
      if (content) {
        console.log('[AI/STT] 内容前200字:', content.substring(0, 200))
      } else {
        console.log('[AI/STT] ⚠️ 内容为空！完整响应:', JSON.stringify(data).substring(0, 2000))
      }
      res.json({ content })
    } else {
      // OpenAI / MiMo 兼容格式
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
      const apiUrl = `${cleanBaseUrl}/chat/completions`

      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: audioBase64,
              format: audioFormat || 'mp3'
            }
          },
          {
            type: 'text',
            text: 'Please transcribe this audio to LRC format lyrics with timestamps.'
          }
        ]
      })

      const headers = {
        'Content-Type': 'application/json',
        ...buildHeaders(apiKey, format)
      }

      const requestBody = JSON.stringify({ model, messages, stream: false })
      console.log('[AI/STT] 向 OpenAI 发起请求:', apiUrl)
      console.log('[AI/STT] 请求体大小:', Math.round(requestBody.length / 1024) + 'KB')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2分钟超时

      let response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: requestBody,
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeout)
      }

      const elapsed = Date.now() - startTime
      console.log('[AI/STT] AI 响应状态:', response.status, '耗时:', elapsed + 'ms')

      if (!response.ok) {
        const error = await response.text()
        console.log('[AI/STT] ❌ AI 返回错误 (status=' + response.status + '):', error.substring(0, 500))
        return res.status(response.status).json({ error: `AI error: ${error.substring(0, 300)}` })
      }

      const data = await response.json()
      console.log('[AI/STT] AI 响应 JSON keys:', Object.keys(data))
      const content = data.choices?.[0]?.message?.content || ''
      console.log('[AI/STT] ✅ AI 返回内容长度:', content.length)
      if (content) {
        console.log('[AI/STT] 内容前200字:', content.substring(0, 200))
      } else {
        console.log('[AI/STT] ⚠️ 内容为空！完整响应:', JSON.stringify(data).substring(0, 1000))
      }
      res.json({ content })
    }
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.log('[AI/STT] ❌ 异常 (耗时 ' + elapsed + 'ms):', err.message)
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 服务商响应超时（超过2分钟）' })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ai/translate - Proxy translation request
router.post('/translate', async (req, res) => {
  const { baseUrl, apiKey, model, text, targetLanguage, systemPrompt, stream } = req.body

  if (!baseUrl || !apiKey || !model || !text) {
    return res.status(400).json({ error: 'baseUrl, apiKey, model, and text are required' })
  }

  const format = detectFormat(baseUrl)

  try {
    if (format === 'gemini') {
      // Gemini API 格式
      const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      const prompt = systemPrompt || `Translate the following LRC lyrics to ${targetLanguage || 'Chinese'}:`
      const contents = [{
        parts: [
          { text: `${prompt}\n\n${text}` }
        ]
      }]

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      })

      if (!response.ok) {
        const error = await response.text()
        return res.status(response.status).json({ error })
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      res.json({ content })
    } else {
      // OpenAI / MiMo 兼容格式
      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({
        role: 'user',
        content: `Translate the following LRC lyrics to ${targetLanguage || 'Chinese'}:\n\n${text}`
      })

      const headers = {
        'Content-Type': 'application/json',
        ...buildHeaders(apiKey, format)
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: !!stream })
      })

      if (!response.ok) {
        const error = await response.text()
        return res.status(response.status).json({ error })
      }

      // Stream mode
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            res.write(chunk)
          }
        } catch (e) {
          // Client disconnected
        }
        res.end()
      } else {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''
        res.json({ content })
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ai/models - Proxy model list request
router.post('/models', async (req, res) => {
  const { baseUrl, apiKey } = req.body

  if (!baseUrl || !apiKey) {
    return res.status(400).json({ error: 'baseUrl and apiKey are required' })
  }

  const format = detectFormat(baseUrl)

  try {
    if (format === 'gemini') {
      // Gemini 模型列表
      const response = await fetch(`${baseUrl}/models?key=${apiKey}`)
      if (!response.ok) {
        const error = await response.text()
        return res.status(response.status).json({ error })
      }
      const data = await response.json()
      // 转换为 OpenAI 格式
      const models = (data.models || []).map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName
      }))
      res.json({ data: models })
    } else {
      const response = await fetch(`${baseUrl}/models`, {
        headers: buildHeaders(apiKey, format)
      })
      if (!response.ok) {
        const error = await response.text()
        return res.status(response.status).json({ error })
      }
      const data = await response.json()
      res.json(data)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
