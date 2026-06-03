<template>
  <Teleport to="body">
    <div class="toast-container" v-if="toasts.length > 0">
      <div v-for="t in toasts" :key="t.id"
        class="toast" :class="['toast-' + t.type, { leaving: t.leaving }]">
        <svg v-if="t.type === 'success'" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <svg v-else-if="t.type === 'error'" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <svg v-else-if="t.type === 'warning'" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>{{ t.message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

function addToast(message, type = 'info', duration = 3000) {
  const id = ++toastId
  toasts.value.push({ id, message, type, leaving: false })
  setTimeout(() => {
    const t = toasts.value.find(t => t.id === id)
    if (t) t.leaving = true
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 300)
  }, duration)
}

function success(message, duration) { addToast(message, 'success', duration) }
function error(message, duration) { addToast(message, 'error', duration) }
function warning(message, duration) { addToast(message, 'warning', duration) }
function info(message, duration) { addToast(message, 'info', duration) }

defineExpose({ success, error, warning, info })
</script>
