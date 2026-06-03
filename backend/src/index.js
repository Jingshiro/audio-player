const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const { initDatabase } = require('./db/init')
const audioRoutes = require('./routes/audio')
const lyricsRoutes = require('./routes/lyrics')
const folderRoutes = require('./routes/folder')
const promptRoutes = require('./routes/prompt')
const aiRoutes = require('./routes/ai')
const authRoutes = require('./routes/auth')
const settingsRoutes = require('./routes/settings')
const storageRoutes = require('./routes/storage')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static files - serve uploaded audio
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data')
app.use('/data', express.static(uploadDir))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/audio', audioRoutes)
app.use('/api/lyrics', lyricsRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/prompts', promptRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/storage', storageRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

// Initialize database and start server
initDatabase()
authRoutes.initDefaultPassword()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] Server running on http://0.0.0.0:${PORT}`)
})
