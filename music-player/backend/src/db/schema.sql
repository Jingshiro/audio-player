-- Audio Player Database Schema

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  duration REAL,
  folder_id TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lyrics (
  id TEXT PRIMARY KEY,
  title TEXT,
  language TEXT DEFAULT 'zh',
  content TEXT NOT NULL,
  format TEXT DEFAULT 'lrc',
  audio_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prompt_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stt_prompt TEXT,
  translate_prompt TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audios_folder ON audios(folder_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_audio ON lyrics(audio_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
