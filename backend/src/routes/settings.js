const express = require('express')
const { getDb } = require('../db/init')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// 所有设置 API 都需要登录
router.use(requireAuth)

// GET /api/settings - 获取所有设置
router.get('/', (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare("SELECT key, value FROM settings WHERE key NOT IN ('auth_password', 'session_token')").all()

    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }

    res.json(settings)
  } catch (e) {
    console.error('获取设置失败:', e)
    res.status(500).json({ error: '获取设置失败' })
  }
})

// PUT /api/settings - 更新设置
router.put('/', (req, res) => {
  try {
    const { key, value } = req.body
    if (!key) {
      return res.status(400).json({ error: 'key 不能为空' })
    }

    if (key === 'auth_password' || key === 'session_token') {
      return res.status(400).json({ error: '该设置不允许通过此接口修改' })
    }

    const db = getDb()
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `).run(key, value, value)

    res.json({ success: true })
  } catch (e) {
    console.error('更新设置失败:', e)
    res.status(500).json({ error: '更新设置失败' })
  }
})

// PUT /api/settings/batch - 批量更新设置
router.put('/batch', (req, res) => {
  try {
    const { settings } = req.body
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings 对象不能为空' })
    }

    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `)

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'auth_password' || key === 'session_token') continue
        stmt.run(key, value, value)
      }
    })
    transaction()

    res.json({ success: true })
  } catch (e) {
    console.error('批量更新设置失败:', e)
    res.status(500).json({ error: '批量更新设置失败' })
  }
})

module.exports = router
