// 简单的 token 认证中间件
// Token 存储在内存中，重启后失效

const crypto = require('crypto')
const tokens = new Map()

// 生成密码学安全的随机 token
function generateToken() {
  return crypto.randomBytes(32).toString('base64url')
}

// 添加 token
function addToken(token) {
  tokens.set(token, { createdAt: Date.now() })
}

// 验证 token
function verifyToken(token) {
  return tokens.has(token)
}

// 删除 token
function removeToken(token) {
  tokens.delete(token)
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
