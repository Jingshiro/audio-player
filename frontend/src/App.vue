<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img src="/icon.png" alt="Logo" class="logo-icon">
        <span class="logo-text">音声播放器</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/player" class="nav-item" :class="{ active: $route.path === '/player' }">
          <NavIcon name="player" :size="20" />
          <span>播放器</span>
        </router-link>

        <router-link to="/library" class="nav-item" :class="{ active: $route.path === '/library' }">
          <NavIcon name="folder" :size="20" />
          <span>资料库</span>
        </router-link>

        <router-link to="/ai" class="nav-item" :class="{ active: $route.path === '/ai' }">
          <NavIcon name="ai" :size="20" />
          <span>AI工具</span>
        </router-link>

        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
          <NavIcon name="settings" :size="20" />
          <span>设置</span>
        </router-link>
      </nav>

      <!-- 底部迷你播放信息 -->
      <div class="sidebar-footer" v-if="playerStore.currentTrack"
        @click="router.push('/player')">
        <div class="mini-info">
          <div class="mini-title">{{ playerStore.currentTrack.name }}</div>
          <div class="mini-status">{{ playerStore.isPlaying ? '播放中' : '已暂停' }}</div>
        </div>
        <button class="mini-play-btn" @click.stop="playerStore.togglePlay()" title="播放/暂停">
          <NavIcon :name="playerStore.isPlaying ? 'pause' : 'play'" :size="16" />
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 全局音频元素 -->
    <audio id="global-audio" ref="audioRef"></audio>

    <!-- 版权标签 -->
    <div class="copyright">
      <span>Design by 镜</span>
      <a href="https://github.com/Jingshiro/drama-player" target="_blank" rel="noopener" class="github-link" title="GitHub">
        <NavIcon name="github" :size="16" />
      </a>
    </div>

    <!-- 移动端底部导航栏 -->
    <nav class="mobile-nav">
      <router-link to="/player" class="mobile-nav-item" :class="{ active: $route.path === '/player' }">
        <NavIcon name="player" :size="22" />
        <span>播放器</span>
      </router-link>
      <router-link to="/library" class="mobile-nav-item" :class="{ active: $route.path === '/library' }">
        <NavIcon name="folder" :size="22" />
        <span>资料库</span>
      </router-link>
      <router-link to="/ai" class="mobile-nav-item" :class="{ active: $route.path === '/ai' }">
        <NavIcon name="ai" :size="22" />
        <span>AI工具</span>
      </router-link>
      <router-link to="/settings" class="mobile-nav-item" :class="{ active: $route.path === '/settings' }">
        <NavIcon name="settings" :size="22" />
        <span>设置</span>
      </router-link>
    </nav>

    <!-- 登录弹窗 -->
    <div class="login-overlay" v-if="showLogin">
      <div class="login-modal glass-card">
        <div class="login-header">
          <img src="/icon.png" alt="Logo" class="login-logo">
          <h2>登录</h2>
          <p>请输入密码访问全栈功能</p>
        </div>
        <form @submit.prevent="handleLogin">
          <input type="password" class="input" v-model="loginPassword"
            placeholder="密码" autofocus ref="loginInputRef">
          <div class="login-error" v-if="loginError">{{ loginError }}</div>
          <button type="submit" class="btn-primary login-btn" :disabled="isLogging">
            {{ isLogging ? '登录中...' : '登录' }}
          </button>
        </form>
        <div class="login-hint">
          默认密码: admin
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from './stores/player'
import { useLibraryStore } from './stores/library'
import { useAIStore } from './stores/ai'
import { usePromptStore } from './stores/prompt'
import { checkBackend, authApi, setAuthToken } from './api'
import NavIcon from './components/NavIcon.vue'

const router = useRouter()
const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const aiStore = useAIStore()
const promptStore = usePromptStore()
const audioRef = ref(null)

// 登录状态
const showLogin = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const isLogging = ref(false)
const loginInputRef = ref(null)

onMounted(async () => {
  if (audioRef.value) {
    playerStore.setAudioElement(audioRef.value)
  }
  // 加载音频库
  await libraryStore.loadFromDB()

  // 检测后端
  const hasBackend = await checkBackend()
  if (hasBackend) {
    // 检查是否已登录
    try {
      const { authenticated } = await authApi.check()
      if (!authenticated) {
        showLogin.value = true
      } else {
        // 已登录，加载服务器设置
        await aiStore.loadApiPresetsFromServer()
        await promptStore.loadFromServer()
      }
    } catch {
      showLogin.value = true
    }
  }
})

async function handleLogin() {
  if (!loginPassword.value) return
  isLogging.value = true
  loginError.value = ''
  try {
    const { token } = await authApi.login(loginPassword.value)
    setAuthToken(token)
    showLogin.value = false
    await aiStore.loadApiPresetsFromServer()
    await promptStore.loadFromServer()
  } catch (e) {
    loginError.value = e.message || '登录失败'
  } finally {
    isLogging.value = false
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: rgba(18, 18, 26, 0.8);
  backdrop-filter: var(--glass-blur) var(--glass-saturate);
  -webkit-backdrop-filter: var(--glass-blur) var(--glass-saturate);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
}

.sidebar-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  gap: 8px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
}

.logo-text {
  font-size: 14px;
  font-weight: 600;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航 */
.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-gradient);
  transform: scaleY(0);
  transition: transform var(--transition-normal);
  border-radius: 0 2px 2px 0;
}

.nav-item:hover {
  background: rgba(255, 107, 157, 0.06);
  color: var(--text-primary);
}

.nav-item:hover::before {
  transform: scaleY(0.5);
}

.nav-item.active {
  background: rgba(255, 107, 157, 0.12);
  color: var(--accent-primary);
}

.nav-item.active::before {
  transform: scaleY(1);
}

.nav-item :deep(svg) {
  flex-shrink: 0;
}

/* 底部迷你信息 */
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-footer:hover {
  background: rgba(255, 107, 157, 0.06);
}

.mini-info {
  flex: 1;
  overflow: hidden;
}

.mini-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-status {
  font-size: 11px;
  color: var(--text-muted);
}

.mini-play-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: var(--accent-gradient);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: transform var(--transition-fast);
}

.mini-play-btn:hover {
  transform: scale(1.1);
}

.mini-play-btn:active {
  transform: scale(0.95);
}

/* 主内容 */
.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 版权标签 */
.copyright {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-muted);
  z-index: 5;
  transition: all var(--transition-normal);
}

.copyright:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 107, 157, 0.2);
  color: var(--text-secondary);
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.github-link:hover {
  color: var(--accent-primary);
  background: rgba(255, 107, 157, 0.1);
}

/* 移动端底部导航栏 */
.mobile-nav {
  display: none;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(18, 18, 26, 0.95);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid var(--border-color);
    z-index: 100;
    padding: 0 8px;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 10px;
    font-weight: 500;
    transition: color var(--transition-fast);
    padding: 4px 0;
  }

  .mobile-nav-item.active {
    color: var(--accent-primary);
  }

  .mobile-nav-item :deep(svg) {
    opacity: 0.6;
    transition: opacity var(--transition-fast);
  }

  .mobile-nav-item.active :deep(svg) {
    opacity: 1;
  }

  .main-content {
    padding-bottom: 60px;
  }

  .copyright {
    display: none;
  }
}

/* 登录弹窗 */
.login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.login-modal {
  width: 360px;
  max-width: 85vw;
  padding: 44px;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.login-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

.login-modal form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-error {
  color: var(--color-error);
  font-size: 13px;
  text-align: center;
}

.login-btn {
  width: 100%;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 20px;
}
</style>
