<template>
  <div class="settings-view">
    <!-- 播放设置 -->
    <div class="glass-card">
      <div class="section-title">播放设置</div>
      <div class="settings-list">
        <label class="setting-item">
          <input type="checkbox" v-model="settings.autoPlayNext">
          <span>自动播放下一首</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" v-model="settings.autoScroll">
          <span>台词自动滚动</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" v-model="settings.crossPagePlay">
          <span>跨页播放（切换页面不停止播放）</span>
        </label>
      </div>
    </div>

    <!-- 账号安全（仅全栈模式） -->
    <div class="glass-card" v-if="settingsStore.hasBackend">
      <div class="section-title">账号安全</div>

      <div class="password-form">
        <div class="form-group">
          <label>当前密码</label>
          <input type="password" v-model="passwordForm.oldPassword" placeholder="请输入当前密码">
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码">
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <input type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码">
        </div>
        <button class="btn-primary" @click="changePassword" :disabled="changingPassword">
          {{ changingPassword ? '修改中...' : '修改密码' }}
        </button>
      </div>
    </div>

    <!-- 存储设置 -->
    <div class="glass-card">
      <div class="section-title">存储设置</div>

      <!-- 台词存储位置 -->
      <div class="form-group">
        <label>台词默认存储位置</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="settingsStore.subtitleStorage" value="local"
              @change="onStorageChange">
            <div class="radio-content">
              <span class="radio-label">浏览器本地</span>
              <span class="radio-hint">数据存储在当前浏览器，清除缓存会丢失</span>
            </div>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="settingsStore.subtitleStorage" value="server"
              @change="onStorageChange">
            <div class="radio-content">
              <span class="radio-label">服务器</span>
              <span class="radio-hint">数据持久保存在服务器，多设备可访问</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 存储统计 -->
      <div class="storage-stats" v-if="storageStats">
        <h4>存储概览</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">本地音频</span>
            <span class="stat-value">{{ storageStats.localAudioCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">服务器音频</span>
            <span class="stat-value">{{ storageStats.serverAudioCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">本地台词</span>
            <span class="stat-value">{{ storageStats.localLyricsCount }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">服务器台词</span>
            <span class="stat-value">{{ storageStats.serverLyricsCount }} 个</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据清理 -->
    <div class="glass-card">
      <div class="section-title">数据清理</div>

      <div class="cleanup-section">
        <h4>清理本地数据</h4>
        <p class="section-desc">以下操作仅影响当前浏览器存储的数据</p>

        <div class="cleanup-actions">
          <button class="btn-secondary" @click="clearLocalLyrics">
            清除本地台词
          </button>
          <button class="btn-secondary" @click="clearLocalAudio">
            清除本地音频
          </button>
        </div>
      </div>

      <div class="cleanup-section" v-if="settingsStore.hasBackend">
        <h4>清理服务器数据</h4>
        <p class="section-desc warning">注意：此操作不可恢复</p>

        <div class="cleanup-actions">
          <button class="btn-secondary" @click="clearServerLyrics">
            清除服务器台词
          </button>
          <button class="btn-secondary" @click="clearServerAudio">
            清除服务器音频
          </button>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="glass-card">
      <div class="section-title">使用说明</div>
      <div class="guide-buttons">
        <button class="btn-secondary" @click="showDeployGuide = true">全栈部署说明</button>
        <button class="btn-secondary" @click="showSttGuide = true">STT 模型设置</button>
        <button class="btn-secondary" @click="showAppGuide = true">APP 迁移说明</button>
      </div>
    </div>

    <!-- 全栈部署说明弹窗 -->
    <BaseModal v-model="showDeployGuide" title="全栈部署说明" width="560px">
      <div class="guide-body">
        <h5>最低服务器配置</h5>
        <ul>
          <li><strong>CPU</strong>：1 核</li>
          <li><strong>内存</strong>：512MB（推荐 1GB）</li>
          <li><strong>硬盘</strong>：10GB 起步（取决于你的音频文件大小）</li>
          <li><strong>系统</strong>：支持 Docker 的 Linux 发行版（Ubuntu / Debian / CentOS 均可）</li>
          <li><strong>网络</strong>：需要开放 8080（前端）和 3000（后端）端口</li>
        </ul>

        <h5>部署步骤</h5>
        <ol>
          <li>安装 Docker 和 Docker Compose</li>
          <li>创建项目目录并进入：<code>mkdir -p data/audio data/lyrics</code></li>
          <li>创建 <code>docker-compose.yml</code>，内容参考项目中的 <code>docker-compose.full.yml</code></li>
          <li>在同目录创建 <code>.env</code> 文件，设置端口：
            <pre>FRONTEND_PORT=8080
BACKEND_PORT=3000</pre>
          </li>
          <li>启动：<code>docker compose up -d</code></li>
          <li>首次访问会弹登录框，默认密码 <code>admin</code>，登录后记得改密码</li>
        </ol>

        <h5>常见问题</h5>
        <ul class="faq-list">
          <li>
            <strong>上传大音频文件报错（413 / 502）</strong>
            <p>Nginx 默认限制请求体大小。本项目已在 Nginx 配置中设置 <code>client_max_body_size 0</code>（无限制），如果你使用自定义 Nginx 反向代理，需要在代理配置中也加上这一项，否则上传大文件会被拒绝。</p>
          </li>
          <li>
            <strong>上传大文件时请求超时</strong>
            <p>大音频文件（>100MB）上传需要较长时间。如果前端报超时错误，检查是否有外层 Nginx / 防火墙设置了 <code>proxy_read_timeout</code> 或 <code>proxy_connect_timeout</code>，建议设为 300 秒以上。</p>
          </li>
          <li>
            <strong>容器重启后数据丢失</strong>
            <p>确认 <code>data</code> 目录已正确挂载到宿主机。运行 <code>docker compose down && docker compose up -d</code> 后检查 <code>data/</code> 目录下是否有 <code>music.db</code> 文件。</p>
          </li>
          <li>
            <strong>端口被占用</strong>
            <p>修改 <code>.env</code> 中的端口映射即可，例如将 <code>FRONTEND_PORT</code> 改为 <code>8081</code>。</p>
          </li>
          <li>
            <strong>SQLite 数据库损坏</strong>
            <p>极端情况下（如断电）数据库可能损坏。备份 <code>data/music.db</code> 文件后，可删除该文件并重启容器重建数据库（音频文件不受影响）。</p>
          </li>
        </ul>
      </div>
    </BaseModal>

    <!-- STT 模型设置弹窗 -->
    <BaseModal v-model="showSttGuide" title="STT 模型设置" width="520px">
      <div class="guide-body">
        <p><strong>⚠️ 重要：必须选择支持语音理解的模型</strong></p>
        <p>STT（语音转文字）并非所有模型都支持，需要选择专门处理音频的模型：</p>
        <ul>
          <li><strong>Groq</strong>：推荐 whisper-large-v3（速度快、效果好）</li>
          <li><strong>OpenAI</strong>：支持 Whisper 系列模型</li>
          <li><strong>Gemini</strong>：支持原生音频理解（推荐 gemini-2.0-flash 等多模态模型）</li>
          <li><strong>本地 Whisper</strong>：完全免费、无审查，需要自己部署</li>
        </ul>

        <p><strong>🚫 如果遇到空返回或拒绝响应</strong></p>
        <p>STT 服务通常比文字输入有更严格的内容审查。如果生成结果为空或被拒绝：</p>
        <ul>
          <li>尝试在「破限词配置」中加入适当的引导词</li>
          <li>或切换到本地部署方案</li>
        </ul>

        <p><strong>🏠 本地部署</strong></p>
        <p>如果你不想依赖云端服务，可以在本地部署 Whisper：</p>
        <ol>
          <li><strong>faster-whisper</strong>（推荐）：<code>pip install faster-whisper</code></li>
          <li><strong>whisper.cpp</strong>：轻量级 C++ 实现</li>
          <li>启动后会提供 OpenAI 兼容的 API 地址（通常是 <code>http://localhost:8080/v1</code>）</li>
          <li>在 STT 设置中选择「本地 Whisper」后，API 密钥留空即可</li>
        </ol>
      </div>
    </BaseModal>

    <!-- APP 迁移说明弹窗 -->
    <BaseModal v-model="showAppGuide" title="APP 迁移说明" width="520px">
      <div class="guide-body">
        <p>本项目可以打包为 Android 原生 APP，后端仍然部署在你的服务器上，前端通过 WebView 运行。</p>

        <h5>方案：Capacitor</h5>
        <p>Capacitor 是 Ionic 团队推出的跨平台方案，可以将现有的 Vue 3 网页应用直接打包为 Android APP，无需重写代码。</p>

        <h5>迁移步骤</h5>
        <ol>
          <li>在前端项目中安装 Capacitor：
            <pre>npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android
npx cap add android</pre>
          </li>
          <li>修改 API 地址配置：将 API base URL 从 <code>/api</code> 改为可配置的服务器地址（如 <code>http://你的服务器IP:3000/api</code>）</li>
          <li>构建并同步：
            <pre>npm run build
npx cap sync
npx cap open android</pre>
          </li>
          <li>在 Android Studio 中 Build → Generate Signed APK</li>
        </ol>

        <h5>需要适配的地方</h5>
        <ul>
          <li><strong>文件导入</strong>：手机端无法拖拽文件，需改用 Capacitor File Picker 插件选择本地文件</li>
          <li><strong>毛玻璃效果</strong>：现代 Android WebView 支持 <code>backdrop-filter</code>，低版本可能需要降级</li>
          <li><strong>键盘快捷键</strong>：Space 播放/暂停不适用于手机端，已有触屏操作替代</li>
        </ul>

        <h5>不需要改动的部分</h5>
        <ul>
          <li>后端代码完全不动</li>
          <li>Vue 组件、路由、状态管理逻辑 95%+ 直接复用</li>
          <li>音频播放、歌词渲染等核心功能正常运行</li>
        </ul>
      </div>
    </BaseModal>

    <!-- 确认弹窗 -->
    <ConfirmDialog ref="confirmRef" />

    <!-- Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useUnifiedLibraryStore } from '../stores/unifiedLibrary'
import { useUnifiedSubtitlesStore } from '../stores/unifiedSubtitles'
import { useLibraryStore } from '../stores/library'
import { useSubtitlesStore } from '../stores/subtitles'
import { storageApi, authApi } from '../api'
import BaseModal from '../components/BaseModal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Toast from '../components/Toast.vue'

const settingsStore = useSettingsStore()
const unifiedLibraryStore = useUnifiedLibraryStore()
const unifiedSubtitlesStore = useUnifiedSubtitlesStore()
const confirmRef = ref(null)
const toastRef = ref(null)

const storageStats = ref(null)

// 使用说明弹窗
const showDeployGuide = ref(false)
const showSttGuide = ref(false)
const showAppGuide = ref(false)

// 密码修改
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const changingPassword = ref(false)

async function changePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm

  if (!oldPassword) {
    toastRef.value?.error('请输入当前密码')
    return
  }
  if (!newPassword) {
    toastRef.value?.error('请输入新密码')
    return
  }
  if (newPassword.length < 4) {
    toastRef.value?.error('新密码至少需要4个字符')
    return
  }
  if (newPassword !== confirmPassword) {
    toastRef.value?.error('两次输入的密码不一致')
    return
  }

  changingPassword.value = true
  try {
    await authApi.changePassword(oldPassword, newPassword)
    toastRef.value?.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err) {
    toastRef.value?.error(err.message || '密码修改失败')
  } finally {
    changingPassword.value = false
  }
}

// 播放设置
const settings = reactive({
  autoPlayNext: localStorage.getItem('auto_play_next') !== 'false',
  autoScroll: localStorage.getItem('auto_scroll') !== 'false',
  crossPagePlay: localStorage.getItem('cross_page_play') !== 'false'
})

// 监听设置变化
watch(() => settings.autoPlayNext, (val) => localStorage.setItem('auto_play_next', val))
watch(() => settings.autoScroll, (val) => localStorage.setItem('auto_scroll', val))
watch(() => settings.crossPagePlay, (val) => localStorage.setItem('cross_page_play', val))

onMounted(async () => {
  await settingsStore.loadSettings()
  unifiedSubtitlesStore.setDefaultStorage(settingsStore.subtitleStorage)
  await loadStorageStats()
})

async function loadStorageStats() {
  await unifiedLibraryStore.loadAll()
  await unifiedSubtitlesStore.loadAll()

  storageStats.value = {
    localAudioCount: unifiedLibraryStore.localCount,
    serverAudioCount: unifiedLibraryStore.serverCount,
    localLyricsCount: unifiedSubtitlesStore.localCount,
    serverLyricsCount: unifiedSubtitlesStore.serverCount
  }
}

function onStorageChange() {
  settingsStore.saveSubtitleStorage(settingsStore.subtitleStorage)
  unifiedSubtitlesStore.setDefaultStorage(settingsStore.subtitleStorage)
}

async function clearLocalLyrics() {
  const confirmed = await confirmRef.value?.show({
    title: '清除确认',
    message: '确定要清除所有本地台词吗？',
    danger: true
  })
  if (confirmed) {
    try {
      const localStore = useSubtitlesStore()
      const localSubs = unifiedSubtitlesStore.localSubtitles
      for (const sub of localSubs) {
        await localStore.deleteSubtitle(sub.id)
      }
      await unifiedSubtitlesStore.loadAll()
      await loadStorageStats()
      toastRef.value?.success('本地台词已清除')
    } catch (err) {
      toastRef.value?.error('清除失败: ' + err.message)
    }
  }
}

async function clearLocalAudio() {
  const confirmed = await confirmRef.value?.show({
    title: '清除确认',
    message: '确定要清除所有本地音频吗？',
    danger: true
  })
  if (confirmed) {
    try {
      const libraryStore = useLibraryStore()
      const localAudios = unifiedLibraryStore.localAudios
      for (const audio of localAudios) {
        await libraryStore.removeAudioFile(audio.id)
      }
      await unifiedLibraryStore.loadAll()
      await loadStorageStats()
      toastRef.value?.success('本地音频已清除')
    } catch (err) {
      toastRef.value?.error('清除失败: ' + err.message)
    }
  }
}

async function clearServerLyrics() {
  const confirmed = await confirmRef.value?.show({
    title: '清除确认',
    message: '确定要清除所有服务器台词吗？此操作不可恢复！',
    danger: true
  })
  if (confirmed) {
    try {
      await storageApi.clearLyrics()
      await unifiedSubtitlesStore.loadAll()
      await loadStorageStats()
      toastRef.value?.success('服务器台词已清除')
    } catch (err) {
      toastRef.value?.error('清除失败: ' + err.message)
    }
  }
}

async function clearServerAudio() {
  const confirmed = await confirmRef.value?.show({
    title: '清除确认',
    message: '确定要清除所有服务器音频吗？此操作不可恢复！',
    danger: true
  })
  if (confirmed) {
    try {
      await storageApi.clearAudio()
      await unifiedLibraryStore.loadAll()
      await loadStorageStats()
      toastRef.value?.success('服务器音频已清除')
    } catch (err) {
      toastRef.value?.error('清除失败: ' + err.message)
    }
  }
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.glass-card {
  padding: 24px;
}

/* 播放设置 */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 8px 0;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
  cursor: pointer;
}

/* 表单组 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group input[type="password"] {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color var(--transition-fast);
}

.form-group input[type="password"]:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group input[type="password"]::placeholder {
  color: var(--text-muted);
}

/* 密码表单 */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.password-form .btn-primary {
  align-self: flex-start;
  margin-top: 4px;
}

.password-form .btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* 单选框组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.radio-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 107, 157, 0.3);
}

.radio-item input[type="radio"] {
  margin-top: 2px;
  accent-color: var(--accent-primary);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.radio-hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* 存储统计 */
.storage-stats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.storage-stats h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 数据清理 */
.cleanup-section {
  margin-bottom: 20px;
}

.cleanup-section:last-child {
  margin-bottom: 0;
}

.cleanup-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.section-desc.warning {
  color: var(--color-warning);
}

.cleanup-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 使用说明 */
.guide-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.guide-body {
  padding: 16px 0 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.guide-body h5 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 16px 0 8px 0;
}

.guide-body h5:first-child {
  margin-top: 0;
}

.guide-body ul,
.guide-body ol {
  padding-left: 20px;
  margin: 8px 0;
}

.guide-body li {
  margin-bottom: 6px;
}

.guide-body li p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.guide-body code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.guide-body pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0;
  line-height: 1.5;
}

.guide-body strong {
  color: var(--text-primary);
}

.faq-list {
  list-style: none;
  padding-left: 0 !important;
}

.faq-list li {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border-left: 3px solid var(--accent-primary);
}

.faq-list li p {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .cleanup-actions {
    flex-direction: column;
  }

  .cleanup-actions button {
    width: 100%;
  }
}
</style>
