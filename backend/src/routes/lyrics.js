const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const router = express.Router()

// GET /api/lyrics - List lyrics (filter by audioId)
router.get('/', (req, res) => {
  const db = getDb()
  const { audioId } = req.query

  let sql = 'SELECT * FROM lyrics'
  const params = []

  if (audioId) {
    sql += ' WHERE audio_id = ?'
    params.push(audioId)
  }

  sql += ' ORDER BY created_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

// GET /api/lyrics/:id - Get single lyric
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Lyric not found' })
  res.json(row)
})

// POST /api/lyrics - Create lyric
router.post('/', (req, res) => {
  const db = getDb()
  const { audioId, title, language, content, format } = req.body

  if (!content) {
    return res.status(400).json({ error: 'content is required' })
  }

  // 如果提供了 audioId，验证音频是否存在
  if (audioId) {
    const audio = db.prepare('SELECT id FROM audios WHERE id = ?').get(audioId)
    if (!audio) return res.status(404).json({ error: 'Audio not found' })
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO lyrics (id, title, language, content, format, audio_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title || null,
    language || 'zh',
    content,
    format || 'lrc',
    audioId || null
  )

  const lyric = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(id)
  res.status(201).json(lyric)
})

// PUT /api/lyrics/:id - Update lyric
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lyric not found' })

  const { title, language, content, format } = req.body
  db.prepare(`
    UPDATE lyrics SET title = ?, language = ?, content = ?, format = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title !== undefined ? title : existing.title,
    language ?? existing.language,
    content ?? existing.content,
    format ?? existing.format,
    req.params.id
  )

  const updated = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/lyrics/:id - Delete lyric
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lyric not found' })

  db.prepare('DELETE FROM lyrics WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// POST /api/lyrics/batch - 批量创建台词
router.post('/batch', (req, res) => {
  const db = getDb()
  const { lyrics } = req.body

  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return res.status(400).json({ error: 'lyrics array is required' })
  }

  const results = []
  const insertStmt = db.prepare(`
    INSERT INTO lyrics (id, title, language, content, format, audio_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const id = uuidv4()
      insertStmt.run(
        id,
        item.title || null,
        item.language || 'zh',
        item.content,
        item.format || 'lrc',
        item.audioId || null
      )
      results.push({ id, ...item })
    }
  })

  try {
    insertMany(lyrics)
    res.status(201).json({ success: true, created: results })
  } catch (e) {
    console.error('批量创建台词失败:', e)
    res.status(500).json({ error: '批量创建台词失败' })
  }
})

// DELETE /api/lyrics/batch - 批量删除台词
router.delete('/batch', (req, res) => {
  const db = getDb()
  const { ids } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  try {
    const placeholders = ids.map(() => '?').join(',')
    const result = db.prepare(`DELETE FROM lyrics WHERE id IN (${placeholders})`).run(...ids)
    res.json({ success: true, deletedCount: result.changes })
  } catch (e) {
    console.error('批量删除台词失败:', e)
    res.status(500).json({ error: '批量删除台词失败' })
  }
})

// PUT /api/lyrics/:id/default - Set as default lyric for its audio
router.put('/:id/default', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lyric not found' })

  // Unset all defaults for this audio, then set this one
  db.prepare('UPDATE lyrics SET is_default = 0 WHERE audio_id = ?').run(existing.audio_id)
  db.prepare('UPDATE lyrics SET is_default = 1 WHERE id = ?').run(req.params.id)

  const updated = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(req.params.id)
  res.json(updated)
})

module.exports = router
