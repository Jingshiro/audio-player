const express = require('express')

const router = express.Router()

// POST /api/ai/stt - Proxy STT request
router.post('/stt', async (req, res) => {
  const { baseUrl, apiKey, model, audioBase64, audioFormat, systemPrompt } = req.body

  if (!baseUrl || !apiKey || !model || !audioBase64) {
    return res.status(400).json({ error: 'baseUrl, apiKey, model, and audioBase64 are required' })
  }

  try {
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

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    res.json({ content })
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

  try {
    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({
      role: 'user',
      content: `Translate the following LRC lyrics to ${targetLanguage || 'Chinese'}:\n\n${text}`
    })

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: !!stream
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    // Stream mode - pipe SSE to client
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

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
