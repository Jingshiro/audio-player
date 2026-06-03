const express = require('express')
const fs = require('fs')
const path = require('path')
const { getDb } = require('../db/init')

const router = express.Router()
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data/audio')

// GET /api/storage/stats - 获取存储统计
router.get('/stats', (req, res) => {
  try {
    const db = getDb()

    const audioCount = db.prepare('SELECT COUNT(*) as count FROM audios').get()
    const lyricsCount = db.prepare('SELECT COUNT(*) as count FROM lyrics').get()

    let audioSize = 0
    try {
      const files = fs.readdirSync(uploadDir)
      for (const file of files) {
        const filePath = path.join(uploadDir, file)
        const stat = fs.statSync(filePath)
        if (stat.isFile()) {
          audioSize += stat.size
        }
      }
    } catch (e) {
      console.error('读取音频目录失败:', e)
    }

    res.json({
      server: {
        audioCount: audioCount.count,
        lyricsCount: lyricsCount.count,
        audioSize: audioSize,
        audioSizeFormatted: formatSize(audioSize)
      }
    })
  } catch (e) {
    console.error('获取存储统计失败:', e)
    res.status(500).json({ error: '获取存储统计失败' })
  }
})

// POST /api/storage/clear-lyrics - 批量删除服务器台词
router.post('/clear-lyrics', (req, res) => {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM lyrics').run()
    res.json({
      success: true,
      deletedCount: result.changes
    })
  } catch (e) {
    console.error('清空台词失败:', e)
    res.status(500).json({ error: '清空台词失败' })
  }
})

// POST /api/storage/clear-audio - 批量删除服务器音频
router.post('/clear-audio', (req, res) => {
  try {
    const db = getDb()

    const audios = db.prepare('SELECT * FROM audios').all()
    for (const audio of audios) {
      const filePath = path.join(uploadDir, audio.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    const result = db.prepare('DELETE FROM audios').run()
    res.json({
      success: true,
      deletedCount: result.changes
    })
  } catch (e) {
    console.error('清空音频失败:', e)
    res.status(500).json({ error: '清空音频失败' })
  }
})

// POST /api/storage/clear-all - 清空所有服务器数据
router.post('/clear-all', (req, res) => {
  try {
    const db = getDb()

    const audios = db.prepare('SELECT * FROM audios').all()
    for (const audio of audios) {
      const filePath = path.join(uploadDir, audio.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    db.prepare('DELETE FROM lyrics').run()
    db.prepare('DELETE FROM audios').run()

    res.json({
      success: true,
      message: '所有服务器数据已清空'
    })
  } catch (e) {
    console.error('清空所有数据失败:', e)
    res.status(500).json({ error: '清空所有数据失败' })
  }
})

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

module.exports = router
