const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const router = express.Router()

// GET /api/folders - Get folder tree
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM folders ORDER BY name').all()
  res.json(rows)
})

// POST /api/folders - Create folder
router.post('/', (req, res) => {
  const db = getDb()
  const { name, parent_id } = req.body

  if (!name) return res.status(400).json({ error: 'name is required' })

  // Verify parent exists if provided
  if (parent_id) {
    const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(parent_id)
    if (!parent) return res.status(404).json({ error: 'Parent folder not found' })
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)
  `).run(id, name, parent_id || null)

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id)
  res.status(201).json(folder)
})

// PUT /api/folders/:id - Rename folder
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Folder not found' })

  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id)

  const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/folders/:id - Delete folder (move audios to root)
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Folder not found' })

  // Move audios to root
  db.prepare('UPDATE audios SET folder_id = NULL WHERE folder_id = ?').run(req.params.id)
  // Move child folders to root
  db.prepare('UPDATE folders SET parent_id = NULL WHERE parent_id = ?').run(req.params.id)
  // Delete folder
  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id)

  res.json({ success: true })
})

module.exports = router
