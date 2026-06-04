// 简单的 token 认证中间件
// Token 存储在数据库中，服务器重启后仍然有效

const crypto = require('crypto')
const { getDb } = require('../db/init')

// 生成密码学安全的随机 token
function generateToken() {
  return crypto.randomBytes(32).toString('base64url')
}

// 添加 token（存入数据库）
function addToken(token) {
  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run('session_token', token, token)
}

// 验证 token（从数据库查询）
function verifyToken(token) {
  if (!token) return false
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'session_token'").get()
    return row && row.value === token
  } catch {
    return false
  }
}

// 删除 token（从数据库移除）
function removeToken(token) {
  try {
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key = 'session_token'").run()
  } catch {}
}

// 认证中间件
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }

  const token = authHeader.slice(7)
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Token 无效或已过期' })
  }

  next()
}

module.exports = {
  generateToken,
  addToken,
  verifyToken,
  removeToken,
  requireAuth
}
