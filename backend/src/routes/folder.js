const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const router = express.Router()

// GET /api/folders - Get folder tree
router.get('/', (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM folders ORDER BY name').all()
    res.json(rows)
  } catch (e) {
    console.error('获取文件夹失败:', e)
    res.status(500).json({ error: '获取文件夹失败' })
  }
})

// POST /api/folders - Create folder
router.post('/', (req, res) => {
  try {
    const db = getDb()
    const { name, parent_id } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' })
    }
    if (name.length > 255) {
      return res.status(400).json({ error: 'name 不能超过 255 个字符' })
    }

    if (parent_id) {
      const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(parent_id)
      if (!parent) return res.status(404).json({ error: '父文件夹不存在' })
    }

    const id = uuidv4()
    db.prepare(`
      INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)
    `).run(id, name, parent_id || null)

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id)
    res.status(201).json(folder)
  } catch (e) {
    console.error('创建文件夹失败:', e)
    res.status(500).json({ error: '创建文件夹失败' })
  }
})

// PUT /api/folders/:id - Rename folder
router.put('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '文件夹不存在' })

    const { name } = req.body
    if (!name) return res.status(400).json({ error: '名称不能为空' })

    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id)

    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (e) {
    console.error('更新文件夹失败:', e)
    res.status(500).json({ error: '更新文件夹失败' })
  }
})

// DELETE /api/folders/:id - Delete folder (move audios to root)
router.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '文件夹不存在' })

    db.prepare('UPDATE audios SET folder_id = NULL WHERE folder_id = ?').run(req.params.id)
    db.prepare('UPDATE folders SET parent_id = NULL WHERE parent_id = ?').run(req.params.id)
    db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id)

    res.json({ success: true })
  } catch (e) {
    console.error('删除文件夹失败:', e)
    res.status(500).json({ error: '删除文件夹失败' })
  }
})

module.exports = router
