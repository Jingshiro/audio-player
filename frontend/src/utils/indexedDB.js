/**
 * IndexedDB 存储管理器
 * 用于持久化存储音频文件（localStorage 放不下）
 */

const DB_NAME = 'audio-player-db'
const DB_VERSION = 2
const AUDIO_STORE = 'audio-files'

let db = null

/**
 * 打开数据库
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains(AUDIO_STORE)) {
        database.createObjectStore(AUDIO_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('subtitles')) {
        database.createObjectStore('subtitles', { keyPath: 'id' })
      }
    }
  })
}

/**
 * 保存音频文件到 IndexedDB
 */
export async function saveAudioFile(audioData) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([AUDIO_STORE], 'readwrite')
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.put(audioData)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 获取音频文件
 */
export async function getAudioFile(id) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([AUDIO_STORE], 'readonly')
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取所有音频文件（只返回元数据，不含 File 对象）
 */
export async function getAllAudioFiles() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([AUDIO_STORE], 'readonly')
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.getAll()
    request.onsuccess = () => {
      // 返回时去掉 File 对象（无法序列化），只保留元数据
      const files = request.result.map(f => ({
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        duration: f.duration,
        lyrics: f.lyrics || [],
        folderId: f.folderId,
        tags: f.tags || [],
        createdAt: f.createdAt,
        // 不返回 file 和 url，需要时再从 IndexedDB 加载
        hasFile: !!f.fileBlob
      }))
      resolve(files)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除音频文件
 */
export async function deleteAudioFile(id) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([AUDIO_STORE], 'readwrite')
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 更新音频文件
 */
export async function updateAudioFile(id, updates) {
  const existing = await getAudioFile(id)
  if (!existing) return null

  const updated = { ...existing, ...updates }
  return saveAudioFile(updated)
}

/**
 * 从 IndexedDB 加载音频文件并创建 Object URL
 */
export async function loadAudioFileById(id) {
  const data = await getAudioFile(id)
  if (!data || !data.fileBlob) return null

  // 从 Blob 创建 Object URL
  const url = URL.createObjectURL(data.fileBlob)
  return {
    ...data,
    url
  }
}
