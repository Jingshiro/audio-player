const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const router = express.Router()

// GET /api/prompts - List all presets
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM prompt_presets ORDER BY created_at DESC').all()
  res.json(rows)
})

// GET /api/prompts/default - Get default preset
router.get('/default', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM prompt_presets WHERE is_default = 1 LIMIT 1').get()
  res.json(row || null)
})

// GET /api/prompts/:id - Get single preset
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Preset not found' })
  res.json(row)
})

// POST /api/prompts - Create preset
router.post('/', (req, res) => {
  const db = getDb()
  const { name, stt_prompt, translate_prompt, is_default } = req.body

  if (!name) return res.status(400).json({ error: 'name is required' })

  const id = uuidv4()

  // If setting as default, unset others first
  if (is_default) {
    db.prepare('UPDATE prompt_presets SET is_default = 0').run()
  }

  db.prepare(`
    INSERT INTO prompt_presets (id, name, stt_prompt, translate_prompt, is_default)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, stt_prompt || null, translate_prompt || null, is_default ? 1 : 0)

  const preset = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(id)
  res.status(201).json(preset)
})

// PUT /api/prompts/:id - Update preset
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Preset not found' })

  const { name, stt_prompt, translate_prompt, is_default } = req.body

  if (is_default) {
    db.prepare('UPDATE prompt_presets SET is_default = 0').run()
  }

  db.prepare(`
    UPDATE prompt_presets
    SET name = ?, stt_prompt = ?, translate_prompt = ?, is_default = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    stt_prompt !== undefined ? stt_prompt : existing.stt_prompt,
    translate_prompt !== undefined ? translate_prompt : existing.translate_prompt,
    is_default ? 1 : (is_default === false ? 0 : existing.is_default),
    req.params.id
  )

  const updated = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/prompts/:id - Delete preset
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Preset not found' })

  db.prepare('DELETE FROM prompt_presets WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// PUT /api/prompts/:id/default - Set as default
router.put('/:id/default', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Preset not found' })

  db.prepare('UPDATE prompt_presets SET is_default = 0').run()
  db.prepare('UPDATE prompt_presets SET is_default = 1 WHERE id = ?').run(req.params.id)

  const updated = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
  res.json(updated)
})

module.exports = router
