const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

let db = null

function getDb() {
  if (!db) {
    // 处理 DATABASE_URL=file:./data/music.db 格式
    let dbPath = process.env.DATABASE_URL || './data/music.db'
    if (dbPath.startsWith('file:')) {
      dbPath = dbPath.slice(5)
    }
    dbPath = path.resolve(dbPath)

    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

function initDatabase() {
  const database = getDb()
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  database.exec(schema)
  console.log('[DB] Database initialized')
}

module.exports = { getDb, initDatabase }
