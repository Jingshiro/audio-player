const express = require('express')
const crypto = require('crypto')
const { getDb } = require('../db/init')
const { generateToken, addToken, removeToken, requireAuth } = require('../middleware/auth')

const router = express.Router()

// 密码哈希（简单 SHA256，够用了）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// 初始化默认密码（如果数据库里没有）
function initDefaultPassword() {
  const db = getDb()
  const existing = db.prepare("SELECT value FROM settings WHERE key = 'auth_password'").get()
  if (!existing) {
    const defaultPassword = process.env.AUTH_PASSWORD || 'admin'
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
      'auth_password',
      hashPassword(defaultPassword)
    )
    console.log(`[Auth] 默认密码已设置（可在界面修改）`)
  }
}

// POST /api/auth/login - 登录
router.post('/login', (req, res) => {
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: '请输入密码' })
  }

  const db = getDb()
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'auth_password'").get()

  if (!stored || stored.value !== hashPassword(password)) {
    return res.status(401).json({ error: '密码错误' })
  }

  const token = generateToken()
  addToken(token)

  res.json({ token })
})

// POST /api/auth/logout - 登出
router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.slice(7)
  if (token) removeToken(token)
  res.json({ success: true })
})

// GET /api/auth/check - 检查登录状态
router.get('/check', (req, res) => {
  const token = req.headers.authorization?.slice(7)
  const authenticated = token ? require('../middleware/auth').verifyToken(token) : false
  res.json({ authenticated })
})

// PUT /api/auth/password - 修改密码
router.put('/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' })
  }

  const db = getDb()
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'auth_password'").get()

  if (!stored || stored.value !== hashPassword(oldPassword)) {
    return res.status(401).json({ error: '旧密码错误' })
  }

  db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'auth_password'").run(
    hashPassword(newPassword)
  )

  res.json({ success: true })
})

// 导出初始化函数
router.initDefaultPassword = initDefaultPassword

module.exports = router
