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
  try {
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
  } catch (e) {
    console.error('获取音频列表失败:', e)
    res.status(500).json({ error: '获取音频列表失败' })
  }
})

// GET /api/audio/:id - Get single audio
router.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: '音频不存在' })
    res.json(row)
  } catch (e) {
    console.error('获取音频失败:', e)
    res.status(500).json({ error: '获取音频失败' })
  }
})

// GET /api/audio/:id/stream - Stream audio file
router.get('/:id/stream', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: '音频不存在' })

    const filePath = path.join(uploadDir, row.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' })

    const stat = fs.statSync(filePath)
    const fileSize = stat.size

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

      // 校验 Range 合法性
      if (isNaN(start) || start < 0 || start >= fileSize || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
        return res.end()
      }

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
  } catch (e) {
    console.error('流式传输音频失败:', e)
    res.status(500).json({ error: '流式传输音频失败' })
  }
})

// POST /api/audio/upload - Upload audio file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' })

    const db = getDb()
    const id = uuidv4()
    const { name, duration, folder_id } = req.body

    const audioName = (name || req.file.originalname).toString().slice(0, 255)
    const audioDuration = duration ? parseFloat(duration) : null

    db.prepare(`
      INSERT INTO audios (id, name, filename, original_name, duration, folder_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      audioName,
      req.file.filename,
      req.file.originalname,
      audioDuration,
      folder_id || null
    )

    const audio = db.prepare('SELECT * FROM audios WHERE id = ?').get(id)
    res.status(201).json(audio)
  } catch (e) {
    console.error('上传音频失败:', e)
    res.status(500).json({ error: '上传音频失败' })
  }
})

// PUT /api/audio/:id - Update audio metadata
router.put('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '音频不存在' })

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
  } catch (e) {
    console.error('更新音频失败:', e)
    res.status(500).json({ error: '更新音频失败' })
  }
})

// DELETE /api/audio/:id - Delete audio
router.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '音频不存在' })

    const filePath = path.join(uploadDir, existing.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    db.prepare('DELETE FROM audios WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('删除音频失败:', e)
    res.status(500).json({ error: '删除音频失败' })
  }
})

// PUT /api/audio/:id/folder - Move to folder
router.put('/:id/folder', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '音频不存在' })

    const { folder_id } = req.body
    db.prepare(`
      UPDATE audios SET folder_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(folder_id || null, req.params.id)

    const updated = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (e) {
    console.error('移动音频失败:', e)
    res.status(500).json({ error: '移动音频失败' })
  }
})

// PUT /api/audio/:id/default - Set as default
router.put('/:id/default', (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: '音频不存在' })

    // 单条 SQL 原子操作，避免竞态
    db.prepare('UPDATE audios SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END').run(req.params.id)

    const updated = db.prepare('SELECT * FROM audios WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (e) {
    console.error('设置默认音频失败:', e)
    res.status(500).json({ error: '设置默认音频失败' })
  }
})

module.exports = router
