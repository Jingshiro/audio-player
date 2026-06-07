const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const { requireAuth } = require('../middleware/auth')
const router = express.Router()
router.use(requireAuth)

// GET /api/prompts - List all presets
router.get('/', (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM prompt_presets ORDER BY created_at DESC').all()
    res.json(rows)
  } catch (e) {
    console.error('获取预设列表失败:', e)
    res.status(500).json({ error: '获取预设列表失败' })
  }
})

// GET /api/prompts/default - Get default preset
router.get('/default', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM prompt_presets WHERE is_default = 1 LIMIT 1').get()
    res.json(row || null)
  } catch (e) {
    console.error('获取默认预设失败:', e)
    res.status(500).json({ error: '获取默认预设失败' })
  }
})

// GET /api/prompts/:id - Get single preset
router.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: '预设不存在' })
    res.json(row)
  } catch (e) {
    console.error('获取预设失败:', e)
    res.status(500).json({ error: '获取预设失败' })
  }
})

// POST /api/prompts - Create preset
router.post('/', (req, res) => {
  try {
    const db = getDb()
    const { name, stt_prompt, translate_prompt, is_default } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' })
    }
    if (name.length > 255) {
      return res.status(400).json({ error: 'name 不能超过 255 个字符' })
    }

    const id = uuidv4()

    const transaction = db.transaction(() => {
      if (is_default) {
        db.prepare('UPDATE prompt_presets SET is_default = 0').run()
      }
      db.prepare(`
        INSERT INTO prompt_presets (id, name, stt_prompt, translate_prompt, is_default)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, stt_prompt || null, translate_prompt || null, is_default ? 1 : 0)
    })
    transaction()

    const preset = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(id)
    res.status(201).json(preset)
  } catch (e) {
    console.error('创建预设失败:', e)
    res.status(500).json({ error: '创建预设失败' })
  }
})

// PUT /api/prompts/:id - Update preset
router.put('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '预设不存在' })

    const { name, stt_prompt, translate_prompt, is_default } = req.body

    const transaction = db.transaction(() => {
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
    })
    transaction()

    const updated = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (e) {
    console.error('更新预设失败:', e)
    res.status(500).json({ error: '更新预设失败' })
  }
})

// DELETE /api/prompts/:id - Delete preset
router.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '预设不存在' })

    db.prepare('DELETE FROM prompt_presets WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('删除预设失败:', e)
    res.status(500).json({ error: '删除预设失败' })
  }
})

// PUT /api/prompts/:id/default - Set as default
router.put('/:id/default', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '预设不存在' })

    // 单条 SQL 原子操作，避免竞态
    db.prepare('UPDATE prompt_presets SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END').run(req.params.id)

    const updated = db.prepare('SELECT * FROM prompt_presets WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (e) {
    console.error('设置默认预设失败:', e)
    res.status(500).json({ error: '设置默认预设失败' })
  }
})

module.exports = router
