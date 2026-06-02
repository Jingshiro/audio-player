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
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
          </svg>
          <span>播放器</span>
        </router-link>

        <router-link to="/library" class="nav-item" :class="{ active: $route.path === '/library' }">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          <span>资料库</span>
        </router-link>

        <router-link to="/ai" class="nav-item" :class="{ active: $route.path === '/ai' }">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58s9.14-3.49 12.65 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z"/>
          </svg>
          <span>AI工具</span>
        </router-link>

        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span>设置</span>
        </router-link>
      </nav>

      <!-- 底部迷你播放信息 -->
      <div class="sidebar-footer" v-if="playerStore.currentTrack">
        <div class="mini-info">
          <div class="mini-title">{{ playerStore.currentTrack.name }}</div>
          <div class="mini-status">{{ playerStore.isPlaying ? '播放中' : '已暂停' }}</div>
        </div>
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
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
    </div>

    <!-- 移动端底部导航栏 -->
    <nav class="mobile-nav">
      <router-link to="/player" class="mobile-nav-item" :class="{ active: $route.path === '/player' }">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M8 5v14l11-7z"/>
        </svg>
        <span>播放器</span>
      </router-link>
      <router-link to="/library" class="mobile-nav-item" :class="{ active: $route.path === '/library' }">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
        </svg>
        <span>资料库</span>
      </router-link>
      <router-link to="/ai" class="mobile-nav-item" :class="{ active: $route.path === '/ai' }">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58s9.14-3.49 12.65 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z"/>
        </svg>
        <span>AI工具</span>
      </router-link>
      <router-link to="/settings" class="mobile-nav-item" :class="{ active: $route.path === '/settings' }">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from './stores/player'
import { useLibraryStore } from './stores/library'

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const audioRef = ref(null)

onMounted(async () => {
  if (audioRef.value) {
    playerStore.setAudioElement(audioRef.value)
  }
  // 加载音频库
  await libraryStore.loadFromDB()
})
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

.nav-item svg {
  flex-shrink: 0;
}

/* 底部迷你信息 */
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.mini-info {
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
  z-index: 100;
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

  .mobile-nav-item svg {
    opacity: 0.6;
    transition: opacity var(--transition-fast);
  }

  .mobile-nav-item.active svg {
    opacity: 1;
  }

  .main-content {
    padding-bottom: 60px;
  }

  .copyright {
    display: none;
  }
}
</style>
