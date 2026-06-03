<template>
  <Teleport to="body">
    <div class="confirm-overlay" v-if="visible" @click.self="cancel">
      <div class="confirm-dialog glass-card">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="cancel">{{ cancelText }}</button>
          <button :class="danger ? 'btn-danger' : 'btn-primary'" @click="confirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref('确定')
const cancelText = ref('取消')
const danger = ref(false)
let resolvePromise = null

function show(opts) {
  title.value = opts.title || '确认'
  message.value = opts.message || ''
  confirmText.value = opts.confirmText || '确定'
  cancelText.value = opts.cancelText || '取消'
  danger.value = opts.danger || false
  visible.value = true
  return new Promise(resolve => { resolvePromise = resolve })
}

function confirm() {
  visible.value = false
  resolvePromise?.(true)
}

function cancel() {
  visible.value = false
  resolvePromise?.(false)
}

defineExpose({ show })
</script>
