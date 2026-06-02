/**
 * LRC 台词解析器
 * 支持标准 LRC 格式，包括时间标签和元数据
 */

// 时间标签正则：[mm:ss.xx] 或 [mm:ss.xxx]
const TIME_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

// 元数据正则：[ar:艺术家] [ti:标题] 等
const META_REGEX = /\[(ar|ti|al|by|offset|re|ve):(.+)\]/

/**
 * 解析 LRC 文本为台词数组
 * @param {string} text - LRC 文件内容
 * @returns {{ time: number, content: string }[]} 台词数组（已按时间排序）
 */
export function parseLRC(text) {
  if (!text || typeof text !== 'string') return []

  const lyrics = []
  const lines = text.split('\n')

  for (const line of lines) {
    const times = []
    let match

    // 提取所有时间标签
    while ((match = TIME_REGEX.exec(line)) !== null) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const ms = parseInt(match[3].padEnd(3, '0'), 10)
      times.push(min * 60 + sec + ms / 1000)
    }

    // 提取台词内容（去除所有时间标签）
    const content = line.replace(TIME_REGEX, '').trim()

    // 如果有时间标签且内容不为空，添加到台词数组
    if (times.length > 0 && content) {
      for (const time of times) {
        lyrics.push({ time, content })
      }
    }
  }

  // 按时间排序
  lyrics.sort((a, b) => a.time - b.time)

  return lyrics
}

/**
 * 从 LRC 文本中提取元数据
 * @param {string} text - LRC 文件内容
 * @returns {Object} 元数据对象
 */
export function extractMeta(text) {
  if (!text || typeof text !== 'string') return {}

  const meta = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const match = META_REGEX.exec(line)
    if (match) {
      meta[match[1]] = match[2].trim()
    }
  }

  return meta
}

/**
 * 将台词数组转换为 LRC 格式文本
 * @param {{ time: number, content: string }[]} lyrics - 台词数组
 * @param {Object} meta - 元数据（可选）
 * @returns {string} LRC 格式文本
 */
export function generateLRC(lyrics, meta = {}) {
  const lines = []

  // 添加元数据
  if (meta.ar) lines.push(`[ar:${meta.ar}]`)
  if (meta.ti) lines.push(`[ti:${meta.ti}]`)
  if (meta.al) lines.push(`[al:${meta.al}]`)
  if (meta.by) lines.push(`[by:${meta.by}]`)

  // 添加台词
  for (const lyric of lyrics) {
    const time = formatLRC_TIME(lyric.time)
    lines.push(`[${time}]${lyric.content}`)
  }

  return lines.join('\n')
}

/**
 * 格式化时间为 LRC 格式 [mm:ss.xx]
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
function formatLRC_TIME(seconds) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}

/**
 * 格式化时间为显示格式 mm:ss
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${String(sec).padStart(2, '0')}`
}

/**
 * 格式化时间为详细显示格式 mm:ss.xx
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
export function formatTimeDetailed(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00.00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}
