import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/player'
  },
  {
    path: '/player',
    name: 'Player',
    component: () => import('../views/PlayerView.vue')
  },
  {
    path: '/library',
    name: 'Library',
    component: () => import('../views/LibraryView.vue')
  },
  {
    path: '/ai',
    name: 'AI',
    component: () => import('../views/AIView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
