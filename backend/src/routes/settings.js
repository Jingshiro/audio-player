const express = require('express')
const { getDb } = require('../db/init')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// 所有设置 API 都需要登录
router.use(requireAuth)

// GET /api/settings - 获取所有设置
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare("SELECT key, value FROM settings WHERE key != 'auth_password'").all()

  // 转换为对象
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }

  res.json(settings)
})

// PUT /api/settings - 更新设置
router.put('/', (req, res) => {
  const { key, value } = req.body
  if (!key) {
    return res.status(400).json({ error: 'key is required' })
  }

  // 不允许直接修改密码
  if (key === 'auth_password') {
    return res.status(400).json({ error: '请使用 /api/auth/password 修改密码' })
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value)

  res.json({ success: true })
})

// PUT /api/settings/batch - 批量更新设置
router.put('/batch', (req, res) => {
  const { settings } = req.body
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'settings object is required' })
  }

  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `)

  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'auth_password') continue // 跳过密码
      stmt.run(key, value, value)
    }
  })

  transaction()
  res.json({ success: true })
})

module.exports = router
