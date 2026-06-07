const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { getDb } = require('../db/init')
const { generateToken, addToken, removeToken, requireAuth } = require('../middleware/auth')

const router = express.Router()

const SALT_ROUNDS = 10

// 密码哈希（bcrypt，带盐）
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

// 密码验证（bcrypt 内部做常量时间比较，防时序攻击）
function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash)
}

// 初始化默认密码（如果数据库里没有）
function initDefaultPassword() {
  try {
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
  } catch (e) {
    console.error('[Auth] 初始化默认密码失败:', e)
  }
}

// POST /api/auth/login - 登录
router.post('/login', (req, res) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: '请输入密码' })
    }

    const db = getDb()
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'auth_password'").get()

    if (!stored || !comparePassword(password, stored.value)) {
      return res.status(401).json({ error: '密码错误' })
    }

    const token = generateToken()
    addToken(token)

    res.json({ token })
  } catch (e) {
    console.error('登录失败:', e)
    res.status(500).json({ error: '登录失败' })
  }
})

// POST /api/auth/logout - 登出
router.post('/logout', requireAuth, (req, res) => {
  try {
    const token = req.headers.authorization?.slice(7)
    if (token) removeToken(token)
    res.json({ success: true })
  } catch (e) {
    console.error('登出失败:', e)
    res.status(500).json({ error: '登出失败' })
  }
})

// GET /api/auth/check - 检查登录状态
router.get('/check', (req, res) => {
  try {
    const token = req.headers.authorization?.slice(7)
    const authenticated = token ? require('../middleware/auth').verifyToken(token) : false
    res.json({ authenticated })
  } catch (e) {
    console.error('检查登录状态失败:', e)
    res.status(500).json({ error: '检查登录状态失败' })
  }
})

// PUT /api/auth/password - 修改密码
router.put('/password', requireAuth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: '新密码至少需要 4 个字符' })
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: '新密码不能超过 128 个字符' })
    }

    const db = getDb()
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'auth_password'").get()

    if (!stored || !comparePassword(oldPassword, stored.value)) {
      return res.status(401).json({ error: '旧密码错误' })
    }

    db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'auth_password'").run(
      hashPassword(newPassword)
    )

    res.json({ success: true })
  } catch (e) {
    console.error('修改密码失败:', e)
    res.status(500).json({ error: '修改密码失败' })
  }
})

// 导出初始化函数
router.initDefaultPassword = initDefaultPassword

module.exports = router
