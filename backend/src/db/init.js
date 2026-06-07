const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

let db = null

function getDb() {
  if (!db) {
    // 处理 DATABASE_URL=file:./data/music.db 格式
    let dbPath = process.env.DATABASE_URL || './db/music.db'
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

  // 迁移：允许 lyrics.audio_id 为 NULL（STT 生成的台词可能无关联音频）
  const colInfo = database.pragma('table_info(lyrics)')
  const audioIdCol = colInfo.find(c => c.name === 'audio_id')
  if (audioIdCol && audioIdCol.notnull === 1) {
    console.log('[DB] 迁移 lyrics.audio_id: 移除 NOT NULL 约束...')
    database.exec(`
      CREATE TABLE IF NOT EXISTS lyrics_new (
        id TEXT PRIMARY KEY,
        title TEXT,
        language TEXT DEFAULT 'zh',
        content TEXT NOT NULL,
        format TEXT DEFAULT 'lrc',
        audio_id TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
      );
      INSERT INTO lyrics_new SELECT * FROM lyrics;
      DROP TABLE lyrics;
      ALTER TABLE lyrics_new RENAME TO lyrics;
      CREATE INDEX IF NOT EXISTS idx_lyrics_audio ON lyrics(audio_id);
    `)
  }

  console.log('[DB] Database initialized')
}

module.exports = { getDb, initDatabase }
