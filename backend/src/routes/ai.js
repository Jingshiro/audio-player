const express = require('express')
const { spawn } = require('child_process')

const router = express.Router()

// 压缩音频：mono 16kHz 32kbps mp3，语音识别够用，体积降 90%+
function compressAudio(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ac', '1',           // mono
      '-ar', '16000',       // 16kHz sample rate
      '-b:a', '32k',        // 32kbps bitrate
      '-f', 'mp3',          // output mp3
      'pipe:1'              // stdout
    ])
    const chunks = []
    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk))
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)))
    ffmpeg.on('error', reject)
    ffmpeg.stdin.write(inputBuffer)
    ffmpeg.stdin.end()
  })
}

// 判断 API 格式
function detectFormat(baseUrl) {
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (baseUrl.includes('xiaomimimo.com')) return 'mimo'
  if (baseUrl.includes('groq.com')) return 'whisper'
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

  // 音频压缩：mono 16kHz 32kbps，语音识别足够用
  let compressedBase64 = audioBase64
  let finalFormat = audioFormat
  let compressedBuffer = null
  try {
    const rawBuffer = Buffer.from(audioBase64, 'base64')
    compressedBuffer = await compressAudio(rawBuffer)
    compressedBase64 = compressedBuffer.toString('base64')
    finalFormat = 'mp3' // 压缩输出统一为 mp3
    console.log('[AI/STT] 音频压缩: ' +
      Math.round(rawBuffer.length / 1024) + 'KB → ' +
      Math.round(compressedBuffer.length / 1024) + 'KB (' +
      Math.round(compressedBuffer.length / rawBuffer.length * 100) + '%)')
  } catch (e) {
    console.log('[AI/STT] ⚠️ 压缩失败，使用原始文件:', e.message)
  }

  const format = detectFormat(baseUrl)
  console.log('[AI/STT] 检测到 API 格式:', format)

  try {
    if (format === 'gemini') {
      // Gemini API 格式
      const mimeType = getMimeType(finalFormat)
      const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      const contents = [{
        parts: [
          { text: systemPrompt || 'Please transcribe this audio to LRC format lyrics with timestamps.' },
          { inline_data: { mime_type: mimeType, data: compressedBase64 } }
        ]
      }]

      console.log('[AI/STT] 向 Gemini 发起请求:', geminiUrl.substring(0, 80) + '...')
      console.log('[AI/STT] 音频 MIME 类型:', mimeType)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2分钟超时

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        }),
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

      // 检查是否被安全过滤器拦截
      if (data.promptFeedback?.blockReason) {
        const reason = data.promptFeedback.blockReason
        console.log('[AI/STT] ⛔ Gemini 安全拦截:', reason)
        return res.status(422).json({ error: `内容被 Gemini 安全过滤器拦截（${reason}）。建议切换为非 Gemini 服务商。` })
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log('[AI/STT] ✅ Gemini 返回内容长度:', content.length)
      if (content) {
        console.log('[AI/STT] 内容前200字:', content.substring(0, 200))
      } else {
        console.log('[AI/STT] ⚠️ 内容为空！完整响应:', JSON.stringify(data).substring(0, 2000))
      }
      const result = { content }
      if (!content) result._raw = data  // 空内容时附带原始响应，方便前端诊断
      res.json(result)
    } else if (format === 'whisper') {
      // Groq Whisper 转录 API（multipart/form-data 上传原始音频）
      const mimeType = getMimeType(finalFormat)
      const audioBuffer = compressedBuffer || Buffer.from(compressedBase64, 'base64')
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
      const apiUrl = `${cleanBaseUrl}/audio/transcriptions`

      console.log('[AI/STT] 使用 Whisper API:', apiUrl)
      console.log('[AI/STT] 音频大小:', Math.round(audioBuffer.length / 1024) + 'KB')

      // RFC 1867 multipart form data（纯 Buffer，不依赖 FormData）
      const boundary = '----WhisperBoundary' + Math.random().toString(36).substring(2)
      const CRLF = '\r\n'
      const fileHeader = Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="audio.${finalFormat}"${CRLF}` +
        `Content-Type: ${mimeType}${CRLF}${CRLF}`
      )
      const modelPart = Buffer.from(
        `${CRLF}--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
        `${model}${CRLF}` +
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}` +
        `verbose_json${CRLF}` +
        `--${boundary}--${CRLF}`
      )
      const body = Buffer.concat([fileHeader, audioBuffer, modelPart])

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))

      const elapsed = Date.now() - startTime
      console.log('[AI/STT] Whisper 响应状态:', response.status, '耗时:', elapsed + 'ms')

      if (!response.ok) {
        const error = await response.text()
        console.log('[AI/STT] ❌ Whisper 返回错误:', error.substring(0, 500))
        return res.status(response.status).json({ error: `Whisper error: ${error.substring(0, 300)}` })
      }

      const data = await response.json()
      console.log('[AI/STT] Whisper 响应 JSON keys:', Object.keys(data))

      // verbose_json 返回 { text, segments: [{start, end, text}], language }
      const content = data.text || ''
      console.log('[AI/STT] ✅ Whisper 返回内容长度:', content.length)
      if (content) {
        console.log('[AI/STT] 内容前200字:', content.substring(0, 200))
      } else {
        console.log('[AI/STT] ⚠️ 内容为空！完整响应:', JSON.stringify(data).substring(0, 1000))
      }
      const result2 = { content }
      if (!content) result2._raw = data
      res.json(result2)
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
              data: compressedBase64,
              format: finalFormat || 'mp3'
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
      const result = { content }
      if (!content) result._raw = data  // 空内容时附带原始响应
      res.json(result)
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
