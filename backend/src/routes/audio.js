const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db/init')

const router = express.Router()

// Multer config
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data/audio')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 500) * 1024 * 1024 }
})

// GET /api/audio - List all audios
router.get('/', (req, res) => {
  const db = getDb()
  const { search, folder_id } = req.query

  let sql = 'SELECT * FROM audios WHERE 1=1'
  const params = []

  if (search) {
    sql += ' AND (name LIKE ? OR original_name LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  if (folder_id !== undefined) {
    if (folder_id === 'null' || folder_id === '') {
      sql += ' AND folder_id IS NULL'
    } else {
      sql += ' AND folder_id = ?'
      params.push(folder_id)
    }
  }

  sql += ' ORDER BY created_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

// GET /api/audio/:id - Get single audio
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Audio not found' })
  res.json(row)
})

// GET /api/audio/:id/stream - Stream audio file
router.get('/:id/stream', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Audio not found' })

  const filePath = path.join(uploadDir, row.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })

  const stat = fs.statSync(filePath)
  const fileSize = stat.size

  // 根据文件扩展名确定 Content-Type
  const ext = path.extname(row.filename).toLowerCase()
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
    '.webm': 'audio/webm'
  }
  const contentType = mimeTypes[ext] || 'audio/mpeg'

  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunksize = end - start + 1
    const file = fs.createReadStream(filePath, { start, end })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    }
    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    }
    res.writeHead(200, head)
    fs.createReadStream(filePath).pipe(res)
  }
})

// POST /api/audio/upload - Upload audio file
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const db = getDb()
  const id = uuidv4()
  const { name, duration, folder_id } = req.body

  db.prepare(`
    INSERT INTO audios (id, name, filename, original_name, duration, folder_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name || req.file.originalname,
    req.file.filename,
    req.file.originalname,
    duration ? parseFloat(duration) : null,
    folder_id || null
  )

  const audio = db.prepare('SELECT * FROM audios WHERE id = ?').get(id)
  res.status(201).json(audio)
})

// PUT /api/audio/:id - Update audio metadata
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Audio not found' })

  const { name, duration, folder_id } = req.body
  db.prepare(`
    UPDATE audios SET name = ?, duration = ?, folder_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    duration ?? existing.duration,
    folder_id !== undefined ? folder_id : existing.folder_id,
    req.params.id
  )

  const updated = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/audio/:id - Delete audio
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Audio not found' })

  // Delete physical file
  const filePath = path.join(uploadDir, existing.filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  // Delete from DB (cascade deletes lyrics)
  db.prepare('DELETE FROM audios WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// PUT /api/audio/:id/folder - Move to folder
router.put('/:id/folder', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Audio not found' })

  const { folder_id } = req.body
  db.prepare(`
    UPDATE audios SET folder_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(folder_id || null, req.params.id)

  const updated = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// PUT /api/audio/:id/default - Set as default
router.put('/:id/default', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Audio not found' })

  db.prepare('UPDATE audios SET is_default = 0').run()
  db.prepare('UPDATE audios SET is_default = 1 WHERE id = ?').run(req.params.id)

  const updated = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
  res.json(updated)
})

module.exports = router
