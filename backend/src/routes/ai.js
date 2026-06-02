const express = require('express')

const router = express.Router()

// 判断 API 格式
function detectFormat(baseUrl) {
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (baseUrl.includes('xiaomimimo.com')) return 'mimo'
  return 'openai'
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

  if (!baseUrl || !apiKey || !model || !audioBase64) {
    return res.status(400).json({ error: 'baseUrl, apiKey, model, and audioBase64 are required' })
  }

  const format = detectFormat(baseUrl)

  try {
    if (format === 'gemini') {
      // Gemini API 格式
      const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      const contents = [{
        parts: [
          { text: systemPrompt || 'Please transcribe this audio to LRC format lyrics with timestamps.' },
          { inline_data: { mime_type: 'audio/mp3', data: audioBase64 } }
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

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: false })
      })

      if (!response.ok) {
        const error = await response.text()
        return res.status(response.status).json({ error })
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      res.json({ content })
    }
  } catch (err) {
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
